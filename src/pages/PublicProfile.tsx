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
  limit
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { moderateContent } from '../services/geminiService';
import { MessageSquare, Send, Shield, ArrowLeft, Loader2, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { formatDate, cn } from '../lib/utils';

interface UserProfile {
  userId: string;
  username: string;
  photoURL: string;
  themeColor?: string;
  profilePrompt?: string;
}

interface PublicMessage {
  id: string;
  content: string;
  createdAt: Timestamp;
  reply?: string;
  reaction?: string;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [publicMessages, setPublicMessages] = useState<PublicMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');
  const [moderating, setModerating] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!username) return;
      try {
        // Fetch user
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data() as UserProfile;
          setUser(userData);
          document.title = `Send a message to @${userData.username} | WhisperLink`;

          // Fetch public replies for social proof
          const mq = query(
            collection(db, 'messages'),
            where('recipientId', '==', userData.userId),
            where('reply', '!=', ''),
            orderBy('reply'), // Required for inequality filter
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const mSnapshot = await getDocs(mq);
          const msgs = mSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as PublicMessage[];
          setPublicMessages(msgs);
        }
      } catch (error) {
        console.error("Fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !message.trim() || sending) return;

    // Simple rate limiting (one message per session for now)
    const lastSent = sessionStorage.getItem(`sent_${user.userId}`);
    if (lastSent && Date.now() - parseInt(lastSent) < 60000) {
      toast.error('Please wait a minute before sending another message.');
      return;
    }

    setSending(true);
    setModerating(true);

    try {
      // AI Moderation
      const moderation = await moderateContent(message.trim());
      if (!moderation.isSafe) {
        toast.error(moderation.reason || 'Message contains inappropriate content.');
        setSending(false);
        setModerating(false);
        return;
      }

      setModerating(false);

      await addDoc(collection(db, 'messages'), {
        recipientId: user.userId,
        content: message.trim(),
        createdAt: Timestamp.now(),
        isRead: false,
      });

      sessionStorage.setItem(`sent_${user.userId}`, Date.now().toString());
      setSent(true);
      setMessage('');
      toast.success('Message sent anonymously!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
    } finally {
      setSending(false);
      setModerating(false);
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

  const themeColor = user.themeColor || '#000000';

  return (
    <div className="min-h-screen bg-white selection:bg-black selection:text-white">
      {/* Header */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">Back to WhisperLink</span>
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Secure & Anonymous</span>
          </div>
        </div>
      </nav>

      <main className="pt-40 pb-20 px-6">
        <div className="max-w-xl mx-auto space-y-20">
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
                      src={user.photoURL} 
                      alt={user.username}
                      className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                    <div 
                      className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                      style={{ backgroundColor: themeColor }}
                    >
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">
                    {user.profilePrompt || `Send a message to @${user.username}`}
                  </h1>
                  <p className="text-gray-500">They will never know who sent it. Be honest, be kind.</p>
                </div>

                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div className="relative">
                    <textarea
                      required
                      rows={6}
                      maxLength={500}
                      placeholder="Write your anonymous message here..."
                      className="w-full p-8 bg-gray-50 rounded-[2rem] border-2 border-transparent focus:bg-white transition-all outline-none text-xl font-medium resize-none"
                      style={{ borderColor: sending ? themeColor : 'transparent' }}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                    <div className="absolute bottom-6 right-8 text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {message.length} / 500
                    </div>
                  </div>

                  <button
                    disabled={sending || !message.trim()}
                    type="submit"
                    className="w-full py-5 text-white rounded-[2rem] text-lg font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group shadow-xl shadow-black/5"
                    style={{ backgroundColor: themeColor }}
                  >
                    {sending ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin" />
                        {moderating && <span>AI Moderating...</span>}
                      </div>
                    ) : (
                      <>
                        Send Anonymously
                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                      </>
                    )}
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 text-gray-400">
                  <Shield className="w-4 h-4" />
                  <p className="text-sm">Your IP and identity are not stored.</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-20 bg-gray-50 rounded-[3rem] border border-gray-100"
              >
                <div 
                  className="w-20 h-20 text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl"
                  style={{ backgroundColor: themeColor }}
                >
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-bold tracking-tight mb-4">Message Sent!</h2>
                <p className="text-gray-500 mb-12 max-w-xs mx-auto">
                  Your message has been delivered to @{user.username} anonymously.
                </p>
                <div className="space-y-4">
                  <button 
                    onClick={() => setSent(false)}
                    className="w-full max-w-xs py-4 bg-white border border-gray-200 rounded-full font-bold hover:bg-gray-100 transition-all"
                  >
                    Send another
                  </button>
                  <div className="block">
                    <Link to="/auth" className="text-sm font-bold text-gray-400 hover:text-black transition-colors uppercase tracking-widest">
                      Create your own link
                    </Link>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Public Replies (Social Proof) */}
          {publicMessages.length > 0 && (
            <div className="space-y-8">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-gray-100" />
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recent Replies</h3>
                <div className="h-px flex-1 bg-gray-100" />
              </div>

              <div className="space-y-6">
                {publicMessages.map((msg) => (
                  <div key={msg.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-5 h-5 text-gray-300" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-1">{msg.content}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatDate(msg.createdAt.toDate())}
                          {msg.reaction && <span className="ml-2 bg-gray-50 px-2 py-0.5 rounded-full">{msg.reaction}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="ml-14 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                      <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-1">@{user.username} replied</p>
                      <p className="text-sm text-blue-900">{msg.reply}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
