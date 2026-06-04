import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
import { systemAPI } from '../api/system';
import { useAuth } from '../context/AuthContext';

export default function GlobalWelcomeMessage() {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only show if user is logged in
    if (!user) return;

    const fetchSetting = async () => {
      try {
        const res = await systemAPI.getSetting('welcome_message');
        if (res && res.value) {
          const msg = res.value.trim();
          if (msg) {
            // Check if dismissed
            const dismissedMsg = localStorage.getItem('dismissed_welcome_message');
            if (dismissedMsg !== msg) {
              setMessage(msg);
              setIsVisible(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load global welcome message', err);
      }
    };
    
    // Slight delay so it doesn't block immediate dashboard render
    const timer = setTimeout(fetchSetting, 1000);
    return () => clearTimeout(timer);
  }, [user]);

  const handleDismiss = () => {
    localStorage.setItem('dismissed_welcome_message', message);
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/40 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative"
            dir="rtl"
          >
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold">הודעת מערכת</h2>
            </div>
            
            <div className="p-6">
              <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-center font-medium">
                {message}
              </div>
              
              <button
                onClick={handleDismiss}
                className="mt-8 w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors"
              >
                הבנתי, תודה!
              </button>
            </div>
            
            <button
              onClick={handleDismiss}
              className="absolute top-4 left-4 p-1.5 bg-black/10 hover:bg-black/20 rounded-full text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
