import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gamepad2, Keyboard, Sparkles, X, Smartphone, MessageSquarePlus } from 'lucide-react';
import confetti from 'canvas-confetti';

const WhatsNewModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if the user has already seen this specific update
    const hasSeen = localStorage.getItem('hasSeenUpdate_final_1');
    if (!hasSeen) {
      // Small delay to let the dashboard load first
      const timer = setTimeout(() => {
        setIsOpen(true);
        // Pop some celebratory confetti when it opens
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4F46E5', '#9333EA', '#10B981']
        });
      }, 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenUpdate_final_1', 'true');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
            dir="rtl"
          >
            {/* Header Area */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white text-center relative shrink-0">
              <button 
                onClick={handleClose}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 backdrop-blur-md">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold">מה חדש בעדכון?</h2>
              <p className="text-indigo-100 mt-1 text-sm">הגרסה החדשה הגיעה עם שדרוגים מטורפים!</p>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6 overflow-y-auto">
              <div className="flex gap-4 items-start">
                <div className="bg-purple-100 p-3 rounded-2xl text-purple-600 shrink-0">
                  <Gamepad2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">משחק התאמה חדש!</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mt-1">
                    משחק התאמת מילים חדש לגמרי! התחרו מול השעון והיזהרו מטעויות. האם תצליחו לשבור את השיא העולמי?
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-indigo-100 p-3 rounded-2xl text-indigo-600 shrink-0">
                  <Keyboard className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">קיצורי מקלדת</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mt-1">
                    עכשיו אפשר לענות על השאלות במהירות שיא בעזרת המקשים 1-4. לחצו על רווח או Enter כדי לעבור לשאלה הבאה.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-green-100 p-3 rounded-2xl text-green-600 shrink-0">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">הורדה למסך הבית</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mt-1">
                    זכרו שאפשר (ומומלץ!) להתקין את האפליקציה ישירות למסך הבית שלכם לחוויה חלקה, מהירה וללא הסחות דעת.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-blue-100 p-3 rounded-2xl text-blue-600 shrink-0 shadow-sm border border-blue-200">
                  <MessageSquarePlus className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">אנחנו מחכים לפידבק שלכם!</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mt-1">
                    יש לכם רעיון? מצאתם באג? לחצו על הכפתור הכחול למטה בכל שלב כדי לשלוח לנו הודעה. אנחנו קוראים הכל!
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Area */}
            <div className="p-6 pt-0 shrink-0 bg-white">
              <button
                onClick={handleClose}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3.5 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98]"
              >
                מדהים, בואו נתחיל! 🚀
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default WhatsNewModal;
