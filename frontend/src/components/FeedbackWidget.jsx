import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquarePlus, X, Send, CheckCircle } from 'lucide-react';
import { adminAPI } from '../api/admin';

const CATEGORIES = [
  { value: 'bug',     label: '🐛 דיווח על באג' },
  { value: 'idea',    label: '💡 רעיון לשיפור' },
  { value: 'general', label: '💬 הערה כללית' },
];

const FeedbackWidget = () => {
  const [open, setOpen]         = useState(false);
  const [category, setCategory] = useState('general');
  const [message, setMessage]   = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);

  const handleSubmit = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await adminAPI.submitFeedback({ message, category });
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setOpen(false);
        setMessage('');
        setCategory('general');
      }, 2000);
    } catch (err) {
      console.error('Feedback failed:', err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-50">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mb-3 w-72 bg-white rounded-2xl shadow-2xl border border-gray-200/70 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-indigo-50">
              <span className="font-bold text-gray-800 text-sm">שלח משוב</span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {sent ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-8 gap-2"
              >
                <CheckCircle className="w-10 h-10 text-green-500" />
                <p className="text-sm font-semibold text-gray-700">תודה! המשוב נשלח.</p>
              </motion.div>
            ) : (
              <div className="p-4 space-y-3">
                {/* Category */}
                <div className="flex gap-1.5 flex-wrap">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setCategory(c.value)}
                      className={`text-xs px-2.5 py-1.5 rounded-full font-medium transition-all ${
                        category === c.value
                          ? 'bg-violet-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>

                {/* Message */}
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="ספר לי מה חשבת..."
                  rows={3}
                  dir="rtl"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-400"
                />

                {/* Submit */}
                <button
                  onClick={handleSubmit}
                  disabled={!message.trim() || sending}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  {sending ? 'שולח...' : 'שלח'}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        className="w-12 h-12 bg-gradient-to-br from-violet-600 to-indigo-600 text-white rounded-full shadow-lg shadow-indigo-300/50 flex items-center justify-center hover:shadow-xl transition-shadow"
      >
        <MessageSquarePlus className="w-5 h-5" />
      </motion.button>
    </div>
  );
};

export default FeedbackWidget;
