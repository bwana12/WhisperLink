import React, { useRef } from 'react';
import { toPng } from 'html-to-image';
import { motion } from 'motion/react';
import { Download, Share2, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface StoryGeneratorProps {
  message: string;
  username: string;
  onClose: () => void;
}

export default function StoryGenerator({ message, username, onClose }: StoryGeneratorProps) {
  const storyRef = useRef<HTMLDivElement>(null);

  const downloadStory = async () => {
    if (storyRef.current === null) return;
    
    try {
      const dataUrl = await toPng(storyRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = `whisperlink-${username}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Story image downloaded!');
    } catch (err) {
      console.error('Failed to generate story image', err);
      toast.error('Failed to generate image');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative max-w-sm w-full"
      >
        <button 
          onClick={onClose}
          className="absolute -top-12 right-0 p-2 text-white hover:bg-white/10 rounded-full transition-colors"
        >
          <X size={24} />
        </button>

        {/* Story Preview Area */}
        <div 
          ref={storyRef}
          className="aspect-[9/16] w-full bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-3xl overflow-hidden flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 w-full shadow-2xl">
            <p className="text-white text-xl font-medium leading-relaxed mb-4">
              "{message}"
            </p>
            <div className="h-px bg-white/20 w-12 mx-auto mb-4" />
            <p className="text-white/60 text-sm font-mono">
              whisperlink.app/u/{username}
            </p>
          </div>
          
          <div className="mt-12">
            <div className="bg-white text-black px-4 py-2 rounded-full text-sm font-bold shadow-lg">
              Send me anonymous messages!
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex gap-4">
          <button
            onClick={downloadStory}
            className="flex-1 bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
          >
            <Download size={20} />
            Download for Story
          </button>
        </div>
      </motion.div>
    </div>
  );
}
