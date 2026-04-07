import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  Timestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { MessageSquare, Send, Shield, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface UserProfile {
  userId: string;
  username: string;
  photoURL: string;
}

export default function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchUser = async () => {
      if (!username) return;
      try {
        const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const userData = snapshot.docs[0].data() as UserProfile;
          setUser(userData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'users');
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [username]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !message.trim() || sending) return;

    setSending(true);
    try {
      await addDoc(collection(db, 'messages'), {
        recipientId: user.userId,
        content: message.trim(),
        createdAt: Timestamp.now(),
        isRead: false,
      });
      setSent(true);
      setMessage('');
      toast.success('Message sent anonymously!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'messages');
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
                      src={user.photoURL} 
                      alt={user.username}
                      className="w-24 h-24 rounded-3xl object-cover border-4 border-white shadow-xl"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-black rounded-xl flex items-center justify-center shadow-lg">
                      <MessageSquare className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">Send a message to @{user.username}</h1>
                  <p className="text-gray-500">They will never know who sent it. Be honest, be kind.</p>
                </div>

                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div className="relative">
                    <textarea
                      required
                      rows={6}
                      maxLength={500}
                      placeholder="Write your anonymous message here..."
                      className="w-full p-8 bg-gray-50 rounded-[2rem] border-2 border-transparent focus:border-black focus:bg-white transition-all outline-none text-xl font-medium resize-none"
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
                    className="w-full py-5 bg-black text-white rounded-[2rem] text-lg font-bold hover:bg-gray-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                  >
                    {sending ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
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
                <div className="w-20 h-20 bg-black text-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl">
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
        </div>
      </main>
    </div>
  );
}
