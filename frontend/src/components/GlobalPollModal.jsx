import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, PieChart, Check } from 'lucide-react';
import { pollsAPI } from '../api/polls';
import { useAuth } from '../context/AuthContext';

export default function GlobalPollModal() {
  const { user } = useAuth();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchPoll = async () => {
      try {
        const res = await pollsAPI.getActivePoll();
        if (res && res.poll) {
          setPoll(res.poll);
          setIsVisible(true);
        }
      } catch (err) {
        console.error('Failed to load active poll', err);
      }
    };
    
    // Slight delay so it doesn't block immediate dashboard render
    const timer = setTimeout(fetchPoll, 1500);
    return () => clearTimeout(timer);
  }, [user]);

  const handleVote = async () => {
    if (selectedOption === null || !poll) return;
    
    setIsSubmitting(true);
    try {
      await pollsAPI.vote(poll.id, selectedOption);
      setIsVisible(false);
    } catch (err) {
      console.error('Failed to submit vote', err);
      setIsVisible(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && poll && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative"
            dir="rtl"
          >
            <div className="bg-gradient-to-r from-violet-500 to-fuchsia-600 p-6 text-white text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <PieChart className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold">סקר משתמשים חדש!</h2>
              <p className="text-sm text-violet-100 mt-1 opacity-90">הדעתכם חשובה לנו</p>
            </div>
            
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-800 text-center mb-6 leading-snug">
                {poll.question}
              </h3>
              
              <div className="space-y-3">
                {poll.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-right px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-between ${
                      selectedOption === idx 
                        ? 'border-violet-500 bg-violet-50 text-violet-700 font-bold' 
                        : 'border-gray-200 bg-white text-gray-700 hover:border-violet-300 hover:bg-gray-50'
                    }`}
                  >
                    <span>{option}</span>
                    {selectedOption === idx && (
                      <Check className="w-5 h-5 text-violet-500" />
                    )}
                  </button>
                ))}
              </div>
              
              <button
                onClick={handleVote}
                disabled={selectedOption === null || isSubmitting}
                className="mt-6 w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? 'שולח...' : 'הצבע עכשיו'}
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
