import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Target, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useNavigate } from 'react-router-dom';

const WhatsNewModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // New key so it shows up for everyone!
    const hasSeen = localStorage.getItem('hasSeenUpdate_sentence_completion_v1');
    if (!hasSeen) {
      const timer = setTimeout(() => {
        setIsOpen(true);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.5 },
          colors: ['#4F46E5', '#EC4899', '#10B981', '#F59E0B']
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenUpdate_sentence_completion_v1', 'true');
  };

  const handlePlayClick = () => {
    handleClose();
    navigate('/sentence-completion');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            dir="rtl"
          >
            {/* Header Area */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-8 text-white text-center relative shrink-0">
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md shadow-inner border border-white/30">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-tight leading-tight">
                🎉 הוספנו השלמת משפטים!
              </h2>
            </div>

            {/* Content Area */}
            <div className="p-8 space-y-6 text-center">
              <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed font-medium">
                אחרי הרבה זמן שעמלנו ועבדנו על הפיצ'ר שנבחר ברוב קולות על ידכם, הוספנו לכם סוף סוף השלמת משפטים! ✨
              </p>
              
              <div className="flex justify-center items-center gap-4 py-2">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
                  <Target className="w-6 h-6" />
                </div>
                <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-2xl text-green-600 dark:text-green-400">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>

              <p className="text-gray-800 dark:text-gray-100 font-bold text-xl">
                תהנו והמון בהצלחה! 🎯📚
              </p>
            </div>

            {/* Footer Area */}
            <div className="p-6 pt-0 shrink-0 bg-white dark:bg-gray-800">
              <button
                onClick={handlePlayClick}
                className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-black text-lg py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2"
              >
                בואו נשחק! 🚀
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WhatsNewModal;
