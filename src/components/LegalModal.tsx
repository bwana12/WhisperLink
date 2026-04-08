import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, MessageCircle, Shield, FileText } from 'lucide-react';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'privacy' | 'terms' | 'contact';
}

export default function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  const content = {
    privacy: {
      title: 'Privacy Policy',
      icon: <Shield className="w-6 h-6 text-indigo-500" />,
      body: (
        <div className="space-y-4 text-gray-600">
          <p>At WhisperLink, your privacy is our top priority. We've designed our platform to be as anonymous as possible.</p>
          <h4 className="font-bold text-black">Data Collection</h4>
          <p>We do not store IP addresses, device fingerprints, or any metadata that could identify the sender of a message. We only store the content of the message and the recipient's identifier.</p>
          <h4 className="font-bold text-black">Message Security</h4>
          <p>Messages are stored securely in our database and are only accessible by the recipient. Once a message is deleted by the recipient, it is permanently removed from our servers.</p>
          <h4 className="font-bold text-black">Third-Party Services</h4>
          <p>We use Firebase for authentication and database management. We use Google Gemini for optional AI content moderation to keep our community safe.</p>
        </div>
      )
    },
    terms: {
      title: 'Terms of Service',
      icon: <FileText className="w-6 h-6 text-indigo-500" />,
      body: (
        <div className="space-y-4 text-gray-600">
          <p>By using WhisperLink, you agree to the following terms:</p>
          <h4 className="font-bold text-black">Acceptable Use</h4>
          <p>WhisperLink is intended for honest feedback and fun interactions. Harassment, bullying, or illegal content is strictly prohibited.</p>
          <h4 className="font-bold text-black">Anonymity</h4>
          <p>While we protect your identity, you are responsible for the content you send. Do not use the platform to cause harm.</p>
          <h4 className="font-bold text-black">Disclaimer</h4>
          <p>WhisperLink is provided "as is" without any warranties. We are not responsible for any emotional distress or consequences resulting from messages received on the platform.</p>
        </div>
      )
    },
    contact: {
      title: 'Contact Us',
      icon: <Mail className="w-6 h-6 text-indigo-500" />,
      body: (
        <div className="space-y-6">
          <p className="text-gray-600">Have questions or feedback? Reach out to the developer directly.</p>
          <div className="space-y-4">
            <a 
              href="https://wa.me/265899195843" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">
                <MessageCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">WhatsApp</p>
                <p className="font-medium">0899195843</p>
              </div>
            </a>
            <a 
              href="mailto:onganimwase1@gmail.com"
              className="flex items-center gap-4 p-4 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Email</p>
                <p className="font-medium">onganimwase1@gmail.com</p>
              </div>
            </a>
          </div>
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-400">Developed by <span className="font-bold text-gray-600">Bwana Mwase</span></p>
          </div>
        </div>
      )
    }
  };

  const current = content[type];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-lg bg-white rounded-[2.5rem] overflow-hidden shadow-2xl"
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  {current.icon}
                  <h2 className="text-2xl font-bold">{current.title}</h2>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                {current.body}
              </div>
            </div>
            <div className="p-6 bg-gray-50 flex justify-end">
              <button 
                onClick={onClose}
                className="px-8 py-3 bg-black text-white rounded-full font-bold hover:bg-gray-800 transition-all"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
