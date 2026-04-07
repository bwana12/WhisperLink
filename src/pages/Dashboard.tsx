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
  BarChart3,
  Palette,
  Type,
  Send,
  Smile,
  Moon,
  Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate, cn } from '../lib/utils';
import toast from 'react-hot-toast';

interface Message {
  id: string;
  content: string;
  createdAt: Timestamp;
  isRead: boolean;
  recipientId: string;
  isReported?: boolean;
  reaction?: string;
  reply?: string;
  repliedAt?: Timestamp;
}

interface UserProfile {
  username: string;
  photoURL: string;
  themeColor?: string;
  profilePrompt?: string;
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];
const THEMES = ['#000000', '#2563eb', '#db2777', '#059669', '#7c3aed', '#ea580c'];

export default function Dashboard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'analytics' | 'settings'>('inbox');
  const [isDark, setIsDark] = useState(false);

  // Settings states
  const [newPrompt, setNewPrompt] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('');

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          setProfile(data);
          setNewPrompt(data.profilePrompt || '');
          setSelectedTheme(data.themeColor || '#000000');
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    };

    fetchProfile();
    document.title = 'Your Inbox | WhisperLink';

    const q = query(
      collection(db, 'messages'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(msgs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    });

    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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

  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      await updateDoc(doc(db, 'messages', messageId), { reaction: emoji });
      toast.success('Reaction added');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  const handleReply = async (messageId: string) => {
    const replyText = window.prompt('Enter your public reply:');
    if (!replyText) return;

    try {
      await updateDoc(doc(db, 'messages', messageId), { 
        reply: replyText,
        repliedAt: Timestamp.now()
      });
      toast.success('Reply posted');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `messages/${messageId}`);
    }
  };

  const saveSettings = async () => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        profilePrompt: newPrompt,
        themeColor: selectedTheme
      });
      toast.success('Settings saved');
      setProfile(prev => prev ? { ...prev, profilePrompt: newPrompt, themeColor: selectedTheme } : null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
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

  const stats = {
    total: messages.length,
    unread: messages.filter(m => !m.isRead).length,
    replied: messages.filter(m => m.reply).length,
    reported: messages.filter(m => m.isReported).length
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col md:flex-row transition-colors">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white dark:bg-zinc-900 border-r border-gray-200 dark:border-zinc-800 p-6 flex flex-col gap-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-xl flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-white dark:text-black" />
            </div>
            <span className="font-bold text-xl tracking-tight dark:text-white">WhisperLink</span>
          </div>
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-gray-500 dark:text-gray-400"
          >
            {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        <div className="flex-1 space-y-1">
          <button 
            onClick={() => setActiveTab('inbox')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
              activeTab === 'inbox' ? "bg-black text-white dark:bg-white dark:text-black" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
            )}
          >
            <Inbox className="w-5 h-5" />
            Inbox
            <span className={cn(
              "ml-auto px-2 py-0.5 rounded-full text-xs",
              activeTab === 'inbox' ? "bg-white/20" : "bg-gray-100 dark:bg-zinc-800"
            )}>
              {stats.unread}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
              activeTab === 'analytics' ? "bg-black text-white dark:bg-white dark:text-black" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
            )}
          >
            <BarChart3 className="w-5 h-5" />
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all",
              activeTab === 'settings' ? "bg-black text-white dark:bg-white dark:text-black" : "text-gray-500 hover:bg-gray-50 dark:hover:bg-zinc-800"
            )}
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>

        <div className="pt-6 border-t border-gray-100 dark:border-zinc-800">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl font-medium transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-12">
          {activeTab === 'inbox' && (
            <>
              <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2 dark:text-white">Your Inbox</h1>
                  <p className="text-gray-500 dark:text-gray-400">You have {messages.length} total messages.</p>
                </div>
                
                {profile && (
                  <div className="flex items-center gap-3 p-2 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800">
                    <div className="px-4 py-2">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Link</p>
                      <p className="text-sm font-medium dark:text-white">{window.location.host}/u/{profile.username}</p>
                    </div>
                    <button 
                      onClick={copyLink}
                      className="p-3 bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-gray-800 dark:hover:bg-gray-200 transition-all active:scale-95"
                    >
                      {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                )}
              </header>

              <div className="grid gap-4">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-40 bg-gray-200 dark:bg-zinc-800 animate-pulse rounded-3xl" />
                  ))
                ) : messages.length === 0 ? (
                  <div className="text-center py-20 bg-white dark:bg-zinc-900 rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800">
                    <div className="w-16 h-16 bg-gray-50 dark:bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Inbox className="w-8 h-8 text-gray-300 dark:text-zinc-700" />
                    </div>
                    <h3 className="text-xl font-bold mb-2 dark:text-white">No messages yet</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">Share your link to start receiving anonymous messages.</p>
                    <button 
                      onClick={copyLink}
                      className="px-8 py-3 bg-black dark:bg-white text-white dark:text-black rounded-full font-medium hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 mx-auto"
                    >
                      <Share2 className="w-5 h-5" />
                      Share Link
                    </button>
                  </div>
                ) : (
                  <AnimatePresence mode="popLayout">
                    {messages.map((message) => (
                      <motion.div
                        key={message.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => markAsRead(message.id, message.isRead)}
                        className={cn(
                          "group relative bg-white dark:bg-zinc-900 p-8 rounded-3xl border transition-all cursor-pointer",
                          message.isRead ? "border-gray-100 dark:border-zinc-800 opacity-80" : "border-black dark:border-white shadow-lg shadow-black/5"
                        )}
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center",
                              message.isRead ? "bg-gray-100 dark:bg-zinc-800 text-gray-400" : "bg-black dark:bg-white text-white dark:text-black"
                            )}>
                              {message.isRead ? <CheckCircle2 className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Anonymous Message</p>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                {formatDate(message.createdAt.toDate())}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleReply(message.id); }}
                              className="p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 rounded-lg transition-colors"
                              title="Reply"
                            >
                              <Send className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); reportMessage(message); }}
                              className="p-2 hover:bg-orange-50 dark:hover:bg-orange-900/20 text-orange-600 rounded-lg transition-colors"
                              title="Report"
                            >
                              <Flag className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); deleteMessage(message.id); }}
                              className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        <p className="text-xl font-medium leading-relaxed text-gray-900 dark:text-white mb-6">
                          {message.content}
                        </p>

                        {/* Reactions & Replies */}
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-800 p-1 rounded-full border border-gray-100 dark:border-zinc-700">
                            {REACTIONS.map(emoji => (
                              <button
                                key={emoji}
                                onClick={(e) => { e.stopPropagation(); handleReaction(message.id, emoji); }}
                                className={cn(
                                  "p-1.5 rounded-full hover:bg-white dark:hover:bg-zinc-700 transition-all text-sm",
                                  message.reaction === emoji && "bg-white dark:bg-zinc-600 shadow-sm scale-110"
                                )}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>

                          {message.reply && (
                            <div className="flex-1 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-1">Your Reply</p>
                              <p className="text-sm text-blue-900 dark:text-blue-100">{message.reply}</p>
                            </div>
                          )}
                        </div>

                        {message.isReported && (
                          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded-full uppercase tracking-wider">
                            <Flag className="w-3 h-3" />
                            Reported
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <h1 className="text-3xl font-bold tracking-tight dark:text-white">Analytics</h1>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {[
                  { label: 'Total Messages', value: stats.total, icon: MessageSquare, color: 'text-blue-500' },
                  { label: 'Unread', value: stats.unread, icon: Inbox, color: 'text-orange-500' },
                  { label: 'Replied', value: stats.replied, icon: Send, color: 'text-green-500' },
                  { label: 'Reported', value: stats.reported, icon: Flag, color: 'text-red-500' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-gray-100 dark:border-zinc-800 shadow-sm">
                    <stat.icon className={cn("w-6 h-6 mb-4", stat.color)} />
                    <p className="text-3xl font-bold dark:text-white">{stat.value}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  </div>
                ))}
              </div>
              
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800">
                <h3 className="text-xl font-bold mb-6 dark:text-white">Growth Overview</h3>
                <div className="h-64 flex items-end gap-2">
                  {/* Mock chart */}
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-black dark:bg-white rounded-t-lg transition-all hover:opacity-80"
                      style={{ height: `${Math.random() * 100}%` }}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-4 text-xs text-gray-400 uppercase font-bold tracking-widest">
                  <span>Jan</span>
                  <span>Dec</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-12">
              <h1 className="text-3xl font-bold tracking-tight dark:text-white">Settings</h1>
              
              <div className="space-y-8">
                <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Type className="w-5 h-5 text-gray-400" />
                    <h3 className="text-xl font-bold dark:text-white">Profile Prompt</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Customize the question visitors see when they visit your link.
                  </p>
                  <input 
                    type="text"
                    maxLength={100}
                    placeholder="e.g., Tell me a secret..."
                    className="w-full px-6 py-4 bg-gray-50 dark:bg-zinc-800 rounded-2xl border-2 border-transparent focus:border-black dark:focus:border-white transition-all outline-none dark:text-white"
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                  />
                </section>

                <section className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-100 dark:border-zinc-800 space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Palette className="w-5 h-5 text-gray-400" />
                    <h3 className="text-xl font-bold dark:text-white">Profile Theme</h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Choose a primary color for your public profile page.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    {THEMES.map(color => (
                      <button
                        key={color}
                        onClick={() => setSelectedTheme(color)}
                        className={cn(
                          "w-12 h-12 rounded-2xl transition-all active:scale-95 border-4",
                          selectedTheme === color ? "border-black dark:border-white scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </section>

                <button 
                  onClick={saveSettings}
                  className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-3xl text-lg font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-xl shadow-black/10"
                >
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
