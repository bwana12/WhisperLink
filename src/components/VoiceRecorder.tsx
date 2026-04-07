import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

interface VoiceRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onRecordingComplete, onCancel }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        onRecordingComplete(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          if (prev >= 10) { // Max 10 seconds
            stopRecording();
            return 10;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      toast.error('Could not access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-[2rem] p-6 flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-white font-bold text-lg mb-1">
          {isRecording ? 'Recording...' : audioBlob ? 'Voice Note Ready' : 'Record Voice Whisper'}
        </p>
        <p className="text-white/60 text-sm">Max 10 seconds</p>
      </div>

      <div className="flex items-center gap-6">
        {!isRecording && !audioBlob ? (
          <button
            onClick={startRecording}
            className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-all shadow-lg hover:scale-110"
          >
            <Mic size={32} />
          </button>
        ) : isRecording ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-red-500 text-white rounded-full flex items-center justify-center animate-pulse">
              <Square size={24} fill="currentColor" />
            </div>
            <div className="text-white font-mono text-xl">{duration}s</div>
            <button 
              onClick={stopRecording}
              className="px-6 py-2 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm font-bold transition-colors"
            >
              Stop
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 text-white rounded-full flex items-center justify-center">
              <Mic size={24} />
            </div>
            <button 
              onClick={() => {
                setAudioBlob(null);
                setDuration(0);
                onCancel();
              }}
              className="p-3 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-500 rounded-full transition-all"
            >
              <Trash2 size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
