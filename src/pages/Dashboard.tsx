import React, { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  addDoc, 
  getDoc,
  Timestamp,
  limit
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../components/AuthProvider';
import { 
  MessageSquare, 
  LogOut, 
  Trash2, 
  Flag, 
  CheckCircle2, 
  Clock, 
  Share2, 
  ExternalLink,
  Copy,
  Check,
  Inbox,
  User as UserIcon,
  Settings,
  Moon,
  Sun,
  Palette,
  BarChart3,
  Play,
  Heart,
  Smile,
  Zap,
  Angry,
  Sparkles,
  Plus,
  X,
  ShieldAlert,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate, cn } from '../lib/utils';
import toast from 'react-hot-toast';
import AnalyticsChart from '../components/AnalyticsChart';
import StoryGenerator from '../components/StoryGenerator';
import { THEMES } from '../constants/themes';

interface Message {
  id: string;
  content: string;
  createdAt: Timestamp;
  isRead: boolean;
  recipientId: string;
  isReported?: boolean;
  reactions?: Record<string, number>;
  reply?: string;
  isVoice?: boolean;
  voiceUrl?: string;
  voiceData?: string;
  status?: string;
}

interface UserProfile {
  username: string;
  photoURL: string;
  theme?: string;
  prompts?: string[];
  blacklist?: string[];
  isDarkMode?: boolean;
  avatarConfig?: string;
}

interface AnalyticsData {
  date: string;
  visits: number;
  messagesReceived: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analytics, setAnalytics] = useState<AnalyticsData[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'analytics' | 'settings'>('inbox');
  const [selectedStoryMessage, setSelectedStoryMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!user || !db) {
      if (!db) setLoading(false);
      return;
    }

    // Fetch user profile
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      } finally {
        // Ensure loading is only finished after profile is at least attempted
        setLoading(false);
      }
    };

    fetchProfile();
    document.title = 'Your Inbox | WhisperLink';

    // Listen for messages
    const q = query(
      collection(db, 'messages'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);

      // Mark unread as read receipt (delivered -> read)
      msgs.forEach(msg => {
        if (msg.status === 'delivered') {
          updateDoc(doc(db, 'messages', msg.id), { status: 'read' });
        }
      });
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    // Listen for analytics
    const aq = query(
      collection(db, 'analytics'),
      where('userId', '==', user.uid),
      orderBy('date', 'desc'),
      limit(7)
    );

    const unsubscribeAnalytics = onSnapshot(aq, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as AnalyticsData);
      setAnalytics(data);
    }, (error) => {
      console.error("Analytics error:", error);
      // Don't throw here to avoid crashing the whole dashboard if analytics fail
    });

    return () => {
      unsubscribeMessages();
      unsubscribeAnalytics();
    };
  }, [user]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
    } catch (error) {
      toast.error('Failed to sign out');
    }
  };

  const markAsRead = async (messageId: string, currentStatus: boolean) => {
    if (currentStatus) return;
    try {
      await updateDoc(doc(db, 'messages', messageId), { isRead: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    try {
      await deleteDoc(doc(db, 'messages', messageId));
      toast.success('Message deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `messages/${messageId}`);
    }
  };

  const reportMessage = async (message: Message) => {
    const reason = window.prompt('Why are you reporting this message?');
    if (!reason) return;

    try {
      await addDoc(collection(db, 'reports'), {
        messageId: message.id,
        recipientId: user?.uid,
        reason,
        createdAt: new Date(),
      });
      await updateDoc(doc(db, 'messages', message.id), { isReported: true });
      toast.success('Report submitted');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reports');
    }
  };

  const copyLink = () => {
    if (!profile) return;
    const link = `${window.location.origin}/u/${profile.username}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), updates);
      setProfile(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Settings updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  const handleReply = async (messageId: string) => {
    if (!replyText.trim()) return;
    try {
      await updateDoc(doc(db, 'messages', messageId), { reply: replyText.trim() });
      setReplyingTo(null);
      setReplyText('');
      toast.success('Reply posted to your public profile!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    const newReactions = { ...(message.reactions || {}) };
    newReactions[emoji] = (newReactions[emoji] || 0) + 1;
    
    try {
      await updateDoc(doc(db, 'messages', messageId), { reactions: newReactions });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col md:flex-row transition-colors duration-500",
      profile?.isDarkMode ? "bg-slate-950 text-white" : "bg-gray-50 text-black"
    )}>
      {/* Sidebar */}
      <aside className={cn(
        "w-full md:w-80 border-r p-6 flex flex-col gap-8 transition-colors",
        profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              profile?.isDarkMode ? "bg-indigo-500" : "bg-black"
            )}>
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">WhisperLink</span>
          </div>
          <button 
            onClick={() => updateProfile({ isDarkMode: !profile?.isDarkMode })}
            className={cn(
              "p-2 rounded-lg transition-all",
              profile?.isDarkMode ? "bg-slate-800 text-yellow-400" : "bg-gray-100 text-gray-500"
            )}
          >
            {profile?.isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('inbox')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
              activeTab === 'inbox' 
                ? (profile?.isDarkMode ? "bg-indigo-500 text-white" : "bg-black text-white") 
                : (profile?.isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-50")
            )}
          >
            <Inbox className="w-5 h-5" />
            Inbox
            <span className={cn(
              "ml-auto px-2 py-0.5 rounded-full text-xs",
              activeTab === 'inbox' ? "bg-white/20" : (profile?.isDarkMode ? "bg-slate-800" : "bg-gray-100")
            )}>
              {messages.filter(m => !m.isRead).length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
              activeTab === 'analytics' 
                ? (profile?.isDarkMode ? "bg-indigo-500 text-white" : "bg-black text-white") 
                : (profile?.isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-50")
            )}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
              activeTab === 'settings' 
                ? (profile?.isDarkMode ? "bg-indigo-500 text-white" : "bg-black text-white") 
                : (profile?.isDarkMode ? "text-slate-400 hover:bg-slate-800" : "text-gray-500 hover:bg-gray-50")
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>

        <div className={cn("pt-6 border-t", profile?.isDarkMode ? "border-slate-800" : "border-gray-100")}>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-500/10 rounded-xl font-medium transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-12">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">
                {activeTab === 'inbox' ? 'Your Inbox' : activeTab === 'analytics' ? 'Activity Insights' : 'Profile Settings'}
              </h1>
              <p className={profile?.isDarkMode ? "text-slate-400" : "text-gray-500"}>
                {activeTab === 'inbox' ? `You have ${messages.length} total whispers.` : 'Manage your WhisperLink experience.'}
              </p>
            </div>
            
            {profile && (
              <div className={cn(
                "flex items-center gap-3 p-2 rounded-2xl shadow-sm border transition-colors",
                profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
              )}>
                <div className="px-4 py-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Link</p>
                  <p className="text-sm font-medium">{window.location.host}/u/{profile.username}</p>
                </div>
                <button 
                  onClick={copyLink}
                  className={cn(
                    "p-3 text-white rounded-xl transition-all active:scale-95",
                    profile?.isDarkMode ? "bg-indigo-600 hover:bg-indigo-500" : "bg-black hover:bg-gray-800"
                  )}
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            )}
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'inbox' && (
              <motion.div
                key="inbox"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="grid gap-4"
              >
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={cn("h-40 animate-pulse rounded-3xl", profile?.isDarkMode ? "bg-slate-900" : "bg-gray-200")} />
                  ))
                ) : messages.length === 0 ? (
                  <div className={cn(
                    "text-center py-20 rounded-3xl border border-dashed",
                    profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-200"
                  )}>
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Inbox className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No whispers yet</h3>
                    <p className="text-gray-500 mb-8">Share your link to start receiving anonymous messages.</p>
                    <button 
                      onClick={copyLink}
                      className={cn(
                        "px-8 py-3 text-white rounded-full font-medium transition-all flex items-center justify-center gap-2 mx-auto",
                        profile?.isDarkMode ? "bg-indigo-600 hover:bg-indigo-500" : "bg-black hover:bg-gray-800"
                      )}
                    >
                      <Share2 className="w-5 h-5" />
                      Share Link
                    </button>
                  </div>
                ) : (
                  messages.map((message) => (
                    <motion.div
                      key={message.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => markAsRead(message.id, message.isRead)}
                      className={cn(
                        "group relative p-8 rounded-3xl border transition-all cursor-pointer",
                        profile?.isDarkMode 
                          ? (message.isRead ? "bg-slate-900/50 border-slate-800 opacity-80" : "bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/5")
                          : (message.isRead ? "bg-white border-gray-100 opacity-80" : "bg-white border-black shadow-lg shadow-black/5")
                      )}
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            message.isRead 
                              ? (profile?.isDarkMode ? "bg-slate-800 text-slate-600" : "bg-gray-100 text-gray-400") 
                              : (profile?.isDarkMode ? "bg-indigo-500 text-white" : "bg-black text-white")
                          )}>
                            {message.isRead ? <CheckCircle2 className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Anonymous Whisper</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <Clock className="w-3 h-3" />
                              {formatDate(message.createdAt.toDate())}
                              {message.status === 'read' && (
                                <span className="flex items-center gap-1 text-indigo-400">
                                  <Check size={12} /> Read
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedStoryMessage(message); }}
                            className="p-2 hover:bg-indigo-500/10 text-indigo-400 rounded-lg transition-colors"
                            title="Generate Story Image"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); reportMessage(message); }}
                            className="p-2 hover:bg-orange-500/10 text-orange-400 rounded-lg transition-colors"
                            title="Report Message"
                          >
                            <Flag className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); deleteMessage(message.id); }}
                            className="p-2 hover:bg-red-500/10 text-red-400 rounded-lg transition-colors"
                            title="Delete Message"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {message.isVoice && (message.voiceUrl || message.voiceData) ? (
                          <div className={cn(
                            "p-4 rounded-2xl flex items-center gap-4",
                            profile?.isDarkMode ? "bg-slate-800" : "bg-gray-50"
                          )}>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const audio = new Audio(message.voiceUrl || message.voiceData);
                                audio.play();
                              }}
                              className={cn(
                                "w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg",
                                profile?.isDarkMode ? "bg-indigo-600" : "bg-black"
                              )}
                            >
                              <Play size={20} fill="currentColor" />
                            </button>
                            <div className="flex-1">
                              <p className="text-sm font-bold uppercase tracking-widest opacity-40">Voice Whisper</p>
                              <div className="h-1 bg-gray-200 rounded-full mt-2 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 10, ease: 'linear' }}
                                  className="h-full bg-indigo-500"
                                />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className={cn(
                            "text-xl font-medium leading-relaxed",
                            profile?.isDarkMode ? "text-slate-200" : "text-gray-900"
                          )}>
                            {message.content}
                          </p>
                        )}

                        {/* Reactions */}
                        <div className="flex flex-wrap gap-2">
                          {['❤️', '😂', '😮', '😡'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={(e) => { e.stopPropagation(); handleReaction(message.id, emoji); }}
                              className={cn(
                                "px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-2",
                                message.reactions?.[emoji] 
                                  ? (profile?.isDarkMode ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-indigo-50 text-indigo-600 border border-indigo-100")
                                  : (profile?.isDarkMode ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-gray-50 text-gray-500 hover:bg-gray-100")
                              )}
                            >
                              <span>{emoji}</span>
                              {message.reactions?.[emoji] && <span className="font-bold">{message.reactions[emoji]}</span>}
                            </button>
                          ))}
                        </div>

                        {/* Reply Section */}
                        {message.reply ? (
                          <div className={cn(
                            "mt-6 p-6 rounded-2xl border-l-4",
                            profile?.isDarkMode ? "bg-slate-800 border-indigo-500" : "bg-gray-50 border-black"
                          )}>
                            <p className="text-xs font-bold uppercase tracking-widest opacity-40 mb-2">Your Public Reply</p>
                            <p className="font-medium">{message.reply}</p>
                          </div>
                        ) : replyingTo === message.id ? (
                          <div className="mt-6 space-y-3">
                            <textarea
                              autoFocus
                              placeholder="Write your public reply..."
                              className={cn(
                                "w-full p-4 rounded-2xl border-2 outline-none transition-all",
                                profile?.isDarkMode ? "bg-slate-800 border-slate-700 focus:border-indigo-500" : "bg-gray-50 border-transparent focus:border-black"
                              )}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => { e.stopPropagation(); handleReply(message.id); }}
                                className={cn(
                                  "px-6 py-2 text-white rounded-full text-sm font-bold transition-all",
                                  profile?.isDarkMode ? "bg-indigo-600 hover:bg-indigo-500" : "bg-black hover:bg-gray-800"
                                )}
                              >
                                Post Reply
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setReplyingTo(null); }}
                                className={cn(
                                  "px-6 py-2 rounded-full text-sm font-bold transition-all",
                                  profile?.isDarkMode ? "bg-slate-800 text-slate-400" : "bg-gray-100 text-gray-500"
                                )}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => { e.stopPropagation(); setReplyingTo(message.id); }}
                            className={cn(
                              "mt-4 text-sm font-bold uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity",
                              profile?.isDarkMode ? "text-indigo-400" : "text-black"
                            )}
                          >
                            Reply Publicly
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className={cn(
                    "p-8 rounded-[2.5rem] border",
                    profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                  )}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Visits (7d)</p>
                    <h3 className="text-4xl font-bold">{analytics.reduce((acc, curr) => acc + curr.visits, 0)}</h3>
                  </div>
                  <div className={cn(
                    "p-8 rounded-[2.5rem] border",
                    profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                  )}>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Total Whispers (7d)</p>
                    <h3 className="text-4xl font-bold">{analytics.reduce((acc, curr) => acc + curr.messagesReceived, 0)}</h3>
                  </div>
                </div>

                <div className={cn(
                  "p-8 rounded-[2.5rem] border",
                  profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                )}>
                  <h3 className="text-xl font-bold mb-8">Activity Over Time</h3>
                  <AnalyticsChart data={analytics} />
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Theme Selector */}
                <section className={cn(
                  "p-8 rounded-[2.5rem] border",
                  profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                )}>
                  <div className="flex items-center gap-3 mb-8">
                    <Palette className="text-indigo-500" />
                    <h3 className="text-xl font-bold">Profile Theme</h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.values(THEMES).map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => updateProfile({ theme: theme.id })}
                        className={cn(
                          "p-4 rounded-2xl border-2 transition-all text-left group",
                          profile?.theme === theme.id ? "border-indigo-500 bg-indigo-500/5" : "border-transparent hover:bg-gray-50"
                        )}
                      >
                        <div className={cn("w-full aspect-square rounded-xl mb-3", theme.background)} />
                        <p className="text-sm font-bold">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Prompts Management */}
                <section className={cn(
                  "p-8 rounded-[2.5rem] border",
                  profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                )}>
                  <div className="flex items-center gap-3 mb-8">
                    <Sparkles className="text-yellow-500" />
                    <h3 className="text-xl font-bold">Prompt Templates</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Add a new prompt (e.g., Ask me anything about...)"
                        className={cn(
                          "flex-1 p-4 rounded-2xl border-2 outline-none transition-all",
                          profile?.isDarkMode ? "bg-slate-800 border-slate-700 focus:border-indigo-500" : "bg-gray-50 border-transparent focus:border-black"
                        )}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = e.currentTarget.value.trim();
                            if (val) {
                              updateProfile({ prompts: [...(profile?.prompts || []), val] });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {profile?.prompts?.map((prompt, i) => (
                        <div key={i} className={cn(
                          "px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium",
                          profile?.isDarkMode ? "bg-slate-800" : "bg-gray-100"
                        )}>
                          {prompt}
                          <button 
                            onClick={() => updateProfile({ prompts: profile.prompts?.filter((_, idx) => idx !== i) })}
                            className="hover:text-red-500"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Blacklist Management */}
                <section className={cn(
                  "p-8 rounded-[2.5rem] border",
                  profile?.isDarkMode ? "bg-slate-900 border-slate-800" : "bg-white border-gray-100"
                )}>
                  <div className="flex items-center gap-3 mb-8">
                    <ShieldAlert className="text-red-500" />
                    <h3 className="text-xl font-bold">Word Blacklist</h3>
                  </div>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      placeholder="Add a blocked word..."
                      className={cn(
                        "w-full p-4 rounded-2xl border-2 outline-none transition-all",
                        profile?.isDarkMode ? "bg-slate-800 border-slate-700 focus:border-indigo-500" : "bg-gray-50 border-transparent focus:border-black"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = e.currentTarget.value.trim();
                          if (val) {
                            updateProfile({ blacklist: [...(profile?.blacklist || []), val] });
                            e.currentTarget.value = '';
                          }
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-2">
                      {profile?.blacklist?.map((word, i) => (
                        <div key={i} className="px-4 py-2 bg-red-500/10 text-red-500 rounded-full flex items-center gap-2 text-sm font-bold">
                          {word}
                          <button onClick={() => updateProfile({ blacklist: profile.blacklist?.filter((_, idx) => idx !== i) })}>
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Story Generator Modal */}
      {selectedStoryMessage && profile && (
        <StoryGenerator 
          message={selectedStoryMessage.content}
          username={profile.username}
          onClose={() => setSelectedStoryMessage(null)}
        />
      )}
    </div>
  );
}
