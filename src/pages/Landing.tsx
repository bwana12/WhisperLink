import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { MessageSquare, Shield, Zap, ArrowRight, ChevronDown } from 'lucide-react';
import { useAuth } from '../components/AuthProvider';
import LegalModal from '../components/LegalModal';

export default function Landing() {
  const { user } = useAuth();
  const [modalType, setModalType] = React.useState<'privacy' | 'terms' | 'contact' | null>(null);

  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    document.title = 'WhisperLink | Anonymous Messaging';
  }, []);

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">WhisperLink</span>
          </div>
          <div className="flex items-center gap-6">
            {user ? (
              <Link
                to="/dashboard"
                className="px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all active:scale-95"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/auth" className="text-sm font-medium hover:text-gray-600 transition-colors">
                  Sign In
                </Link>
                <Link
                  to="/auth"
                  className="px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800 transition-all active:scale-95"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-40 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-8 leading-[0.9]">
              Honest feedback.<br />
              <span className="text-gray-400">Completely anonymous.</span>
            </h1>
            <p className="max-w-2xl mx-auto text-xl text-gray-600 mb-12 leading-relaxed">
              Create your personal link and receive messages from your friends and followers. 
              No names, no profiles, just pure honesty.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/auth"
                className="w-full sm:w-auto px-8 py-4 bg-black text-white rounded-full text-lg font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 group"
              >
                Create your link
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button 
                onClick={scrollToHowItWorks}
                className="w-full sm:w-auto px-8 py-4 border border-gray-200 rounded-full text-lg font-medium hover:bg-gray-50 transition-all"
              >
                How it works
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="how-it-works" className="py-20 px-6 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Privacy First</h3>
              <p className="text-gray-600 leading-relaxed">
                We don't store IP addresses or metadata. Your identity and the sender's identity are protected.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Real-time Inbox</h3>
              <p className="text-gray-600 leading-relaxed">
                Get notified instantly when you receive a new message. Manage your inbox with ease.
              </p>
            </div>
            <div className="space-y-4">
              <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Easy Sharing</h3>
              <p className="text-gray-600 leading-relaxed">
                Share your unique link on Instagram, Twitter, or WhatsApp with a single click.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold">WhisperLink</span>
          </div>
          <div className="flex gap-8 text-sm text-gray-500">
            <button onClick={() => setModalType('privacy')} className="hover:text-black transition-colors">Privacy</button>
            <button onClick={() => setModalType('terms')} className="hover:text-black transition-colors">Terms</button>
            <button onClick={() => setModalType('contact')} className="hover:text-black transition-colors">Contact</button>
          </div>
          <p className="text-sm text-gray-400">© 2026 WhisperLink. All rights reserved.</p>
        </div>
      </footer>

      <LegalModal 
        isOpen={!!modalType} 
        onClose={() => setModalType(null)} 
        type={modalType || 'privacy'} 
      />
    </div>
  );
}
