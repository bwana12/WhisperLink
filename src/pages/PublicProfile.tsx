import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp,
  orderBy,
  limit,
  doc,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  MessageSquare, 
  Send, 
  Shield, 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  Mic, 
  AlertCircle,
  Sparkles,
  RefreshCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { moderateContent } from '../services/moderationService';
import { trackVisit, trackMessage } from '../services/analyticsService';
import { THEMES } from '../constants/themes';
import VoiceRecorder from '../components/VoiceRecorder';

interface UserProfile {
  userId: string;
  username: string;
  photoURL: string;
  theme?: string;
  prompts?: string[];
  blacklist?: string[];
  avatarConfig?: string;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [publicMessages, setPublicMessages] = useState<any[]>([]);
  const [showFeed, setShowFeed] = useState(false);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(
      collection(db, 'messages'),
      where('recipientId', '==', user.userId),
      where('reply', '!=', null),
      orderBy('reply'),
      limit(10)
    );
    getDocs(q).then(snapshot => {
      setPublicMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }).catch(error => {
      console.error("Error fetching public feed:", error);
    });
  }, [user]);

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const fetchUser = async () => {
      if (!username || !db) {
        if (!db) setLoading(false);
        return;
      }
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data() as UserProfile;
          setUser(userData);
          document.title = `Send a message to @${userData.username} | WhisperLink`;
          
          // Track visit (non-blocking)
          trackVisit(userData.userId).catch(err => console.error('Analytics error:', err));

          // Set up real-time listener for this user
          unsubscribe = onSnapshot(doc(db, 'users', userDoc.id), (docSnap) => {
            if (docSnap.exists()) {
              const updatedData = docSnap.data() as UserProfile;
              setUser(updatedData);
            }
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    return () => unsubscribe();
  }, [username]);

  // Pick random prompt when user prompts change
  useEffect(() => {
    if (user?.prompts && user.prompts.length > 0) {
      // Only pick a new one if we don't have one or if the current one was removed
      if (!activePrompt || !user.prompts.includes(activePrompt)) {
        setActivePrompt(user.prompts[Math.floor(Math.random() * user.prompts.length)]);
      }
    } else {
      setActivePrompt(null);
    }
  }, [user?.prompts]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!message.trim() && !voiceBlob) || sending) return;

    // Rate limiting check (client-side)
    const lastSent = localStorage.getItem(`last_sent_${user.userId}`);
    if (lastSent && Date.now() - parseInt(lastSent) < 60000) {
      toast.error('Please wait 60 seconds between messages.');
      return;
    }

    // Blacklist check
    if (user.blacklist && message) {
      const lowerMessage = message.toLowerCase();
      const isBlocked = user.blacklist.some(word => lowerMessage.includes(word.toLowerCase()));
      if (isBlocked) {
        toast.error('Your message contains blocked words.');
        return;
      }
    }

    setSending(true);
    const sendToast = toast.loading('Sending your whisper...');
    
    try {
      // AI Moderation
      if (message.trim()) {
        const moderation = await moderateContent(message);
        if (!moderation.isSafe) {
          toast.dismiss(sendToast);
          toast.error(`Message blocked: ${moderation.reason}`);
          setSending(false);
          return;
        }
      }

      let voiceUrl = '';
      let voiceBase64 = '';
      
      if (voiceBlob) {
        try {
          if (!storage) throw new Error('Storage not initialized');
          
          const voiceRef = ref(storage, `voices/${user.userId}/${Date.now()}.webm`);
          
          // Add a timeout to the upload
          const uploadPromise = uploadBytes(voiceRef, voiceBlob);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Upload timeout')), 10000)
          );
          
          await Promise.race([uploadPromise, timeoutPromise]);
          voiceUrl = await getDownloadURL(voiceRef);
        } catch (storageError) {
          console.error('Storage upload failed, falling back to Base64:', storageError);
          
          if (voiceBlob.size > 800000) {
            throw new Error('Voice message too large. Please record a shorter message.');
          }
          
          voiceBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(voiceBlob);
            // Timeout for reader
            setTimeout(() => reject(new Error('File reading timeout')), 5000);
          });
        }
      }

      const messageData = {
        recipientId: user.userId,
        content: message.trim() || '🎤 Voice Whisper',
        createdAt: Timestamp.now(),
        isRead: false,
        isVoice: !!voiceBlob,
        voiceUrl: voiceUrl,
        voiceData: voiceBase64,
        status: 'delivered'
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Track message (non-blocking)
      trackMessage(user.userId).catch(err => console.error('Analytics error:', err));
      
      localStorage.setItem(`last_sent_${user.userId}`, Date.now().toString());

      setSent(true);
      setMessage('');
      setVoiceBlob(null);
      toast.dismiss(sendToast);
      toast.success('Whisper sent anonymously!');
    } catch (error: any) {
      toast.dismiss(sendToast);
      console.error('Send error:', error);
      if (error.message?.includes('timeout')) {
        toast.error('Connection timed out. Please try again.');
      } else {
        toast.error('Failed to send whisper. Please check your connection.');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-10 h-10 animate-spin text-gray-200" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
          <MessageSquare className="w-10 h-10 text-gray-300" />
        </div>
        <h1 className="text-3xl font-bold mb-2">User not found</h1>
        <p className="text-gray-500 mb-8">The link you followed might be broken or the user has changed their username.</p>
        <Link to="/" className="px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all">
          Go Home
        </Link>
      </div>
    );
  }

  const theme = THEMES[user.theme || 'default'] || THEMES.default;

  return (
    <div className={`min-h-screen ${theme.background} selection:bg-black selection:text-white transition-colors duration-700`}>
      {/* Header */}
      <nav className={`fixed top-0 w-full z-50 ${theme.background}/80 backdrop-blur-md border-b border-black/5`}>
        <div className="max-w-3xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className={`flex items-center gap-2 group ${theme.text}`}>
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">WhisperLink</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span className={`text-xs font-bold ${theme.text} opacity-40 uppercase tracking-widest`}>Secure & Anonymous</span>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-20 px-6">
        <div className="max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {!sent ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="text-center">
                  <div className="relative inline-block mb-6">
                    <img 
                      src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} 
                      alt={user.username}
                      className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className={`absolute -bottom-2 -right-2 w-8 h-8 ${theme.accent} rounded-xl flex items-center justify-center shadow-lg`}>
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h1 className={`text-3xl font-bold tracking-tight mb-2 ${theme.text}`}>Send a whisper to @{user.username}</h1>
                  
                  {activePrompt && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="mt-4 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl inline-flex flex-col items-center gap-2"
                    >
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-yellow-500" />
                        <button 
                          onClick={() => {
                            setMessage(activePrompt);
                            setIsVoiceMode(false);
                            toast.success('Prompt applied!');
                          }}
                          className={`text-sm font-medium ${theme.text} hover:opacity-80 transition-opacity text-left`}
                        >
                          {activePrompt}
                        </button>
                        <button 
                          onClick={() => {
                            if (user.prompts) {
                              setActivePrompt(user.prompts[Math.floor(Math.random() * user.prompts.length)]);
                            }
                          }}
                          className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                          title="New prompt"
                        >
                          <RefreshCcw size={14} className={theme.text} />
                        </button>
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest opacity-40 ${theme.text}`}>Click text to use as template</p>
                    </motion.div>
                  )}
                </div>

                <div className="flex justify-center gap-4 mb-8">
                  <button
                    onClick={() => setIsVoiceMode(false)}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${!isVoiceMode ? theme.accent + ' text-white' : 'bg-white/10 ' + theme.text}`}
                  >
                    Text
                  </button>
                  <button
                    onClick={() => setIsVoiceMode(true)}
                    className={`px-6 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isVoiceMode ? theme.accent + ' text-white' : 'bg-white/10 ' + theme.text}`}
                  >
                    <Mic size={16} />
                    Voice
                  </button>
                </div>

                {isVoiceMode ? (
                  <VoiceRecorder 
                    onRecordingComplete={(blob) => setVoiceBlob(blob)}
                    onCancel={() => setVoiceBlob(null)}
                  />
                ) : (
                  <form onSubmit={handleSendMessage} className="space-y-4">
                    <div className="relative">
                      <textarea
                        required
                        rows={6}
                        maxLength={1000}
                        placeholder="Write your anonymous whisper here..."
                        className={`w-full p-8 ${theme.card} rounded-[2rem] border-2 border-transparent focus:border-black transition-all outline-none text-xl font-medium resize-none ${theme.text}`}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                      />
                      <div className={`absolute bottom-6 right-8 text-xs font-bold ${theme.text} opacity-40 uppercase tracking-widest`}>
                        {message.length} / 1000
                      </div>
                    </div>
                  </form>
                )}

                <button
                  disabled={sending || (!message.trim() && !voiceBlob)}
                  onClick={handleSendMessage}
                  className={`w-full py-5 ${theme.button} ${theme.buttonText} rounded-[2rem] text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-xl`}
                >
                  {sending ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <>
                      {isVoiceMode ? 'Send Voice Whisper' : 'Send Anonymously'}
                      <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </>
                  )}
                </button>

                <div className={`flex items-center justify-center gap-2 ${theme.text} opacity-40`}>
                  <Shield className="w-4 h-4" />
                  <p className="text-sm">Your identity is protected by AI moderation.</p>
                </div>

                {publicMessages.length > 0 && (
                  <div className="pt-12">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className={`text-xl font-bold ${theme.text}`}>Public Feed</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${theme.accent} text-white`}>
                        {publicMessages.length} Replies
                      </span>
                    </div>
                    <div className="space-y-4">
                      {publicMessages.map(msg => (
                        <div key={msg.id} className={`${theme.card} p-6 rounded-3xl border shadow-sm`}>
                          <p className={`text-lg font-medium mb-4 ${theme.text}`}>"{msg.content}"</p>
                          <div className={`p-4 rounded-2xl ${theme.background} border border-black/5`}>
                            <p className={`text-xs font-bold uppercase tracking-widest opacity-40 mb-2 ${theme.text}`}>Reply from @{user.username}</p>
                            <p className={`font-medium ${theme.text}`}>{msg.reply}</p>
                          </div>
                          {msg.reactions && (
                            <div className="flex gap-2 mt-4">
                              {Object.entries(msg.reactions).map(([emoji, count]) => (
                                <div key={emoji} className={`px-2 py-1 rounded-full text-xs bg-white/10 border border-white/20 ${theme.text}`}>
                                  {emoji} {count as number}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`text-center py-20 ${theme.card} rounded-[3rem] border shadow-2xl`}
              >
                <div className={`w-20 h-20 ${theme.accent} text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl`}>
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className={`text-3xl font-bold tracking-tight mb-4 ${theme.text}`}>Whisper Sent!</h2>
                <p className={`${theme.text} opacity-60 mb-12 max-w-xs mx-auto`}>
                  Your message has been delivered to @{user.username} anonymously.
                </p>
                <div className="space-y-4 px-8">
                  <button 
                    onClick={() => setSent(false)}
                    className={`w-full py-4 bg-white/10 border border-white/20 rounded-full font-bold hover:bg-white/20 transition-all ${theme.text}`}
                  >
                    Send another
                  </button>
                  <div className="block">
                    <Link to="/auth" className={`text-sm font-bold ${theme.text} opacity-40 hover:opacity-100 transition-opacity uppercase tracking-widest`}>
                      Create your own link
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
