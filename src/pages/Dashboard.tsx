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
  Timestamp
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
  Settings
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
}

interface UserProfile {
  username: string;
  photoURL: string;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    // Fetch user profile
    const fetchProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setProfile(userDoc.data() as UserProfile);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
      }
    };

    fetchProfile();

    // Listen for messages
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

  const shareToWhatsApp = (content: string) => {
    const text = `Check out this anonymous message I received on WhisperLink: "${content}"`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-80 bg-white border-r border-gray-200 p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">WhisperLink</span>
        </div>

        <div className="flex-1 space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-3 bg-black text-white rounded-xl font-medium transition-all">
            <Inbox className="w-5 h-5" />
            Inbox
            <span className="ml-auto bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {messages.filter(m => !m.isRead).length}
            </span>
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-all">
            <UserIcon className="w-5 h-5" />
            Profile
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 text-gray-500 hover:bg-gray-50 rounded-xl font-medium transition-all">
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>

        <div className="pt-6 border-t border-gray-100">
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50 rounded-xl font-medium transition-all"
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
              <h1 className="text-3xl font-bold tracking-tight mb-2">Your Inbox</h1>
              <p className="text-gray-500">You have {messages.length} total messages.</p>
            </div>
            
            {profile && (
              <div className="flex items-center gap-3 p-2 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="px-4 py-2">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Your Link</p>
                  <p className="text-sm font-medium">{window.location.host}/u/{profile.username}</p>
                </div>
                <button 
                  onClick={copyLink}
                  className="p-3 bg-black text-white rounded-xl hover:bg-gray-800 transition-all active:scale-95"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            )}
          </header>

          {/* Messages Grid */}
          <div className="grid gap-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-40 bg-gray-200 animate-pulse rounded-3xl" />
              ))
            ) : messages.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Inbox className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold mb-2">No messages yet</h3>
                <p className="text-gray-500 mb-8">Share your link to start receiving anonymous messages.</p>
                <button 
                  onClick={copyLink}
                  className="px-8 py-3 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 mx-auto"
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
                      "group relative bg-white p-8 rounded-3xl border transition-all cursor-pointer",
                      message.isRead ? "border-gray-100 opacity-80" : "border-black shadow-lg shadow-black/5"
                    )}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center",
                          message.isRead ? "bg-gray-100 text-gray-400" : "bg-black text-white"
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
                          onClick={(e) => { e.stopPropagation(); shareToWhatsApp(message.content); }}
                          className="p-2 hover:bg-green-50 text-green-600 rounded-lg transition-colors"
                          title="Share to WhatsApp"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); reportMessage(message); }}
                          className="p-2 hover:bg-orange-50 text-orange-600 rounded-lg transition-colors"
                          title="Report Message"
                        >
                          <Flag className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteMessage(message.id); }}
                          className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                          title="Delete Message"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xl font-medium leading-relaxed text-gray-900">
                      {message.content}
                    </p>
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
        </div>
      </main>
    </div>
  );
}
