import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Floating "+XP" animation that appears briefly and floats upward.
 * Props:
 *   xp       – number of XP earned (required, > 0)
 *   onDone   – callback after animation ends (optional)
 *   x        – optional horizontal offset from center (default 0)
 */
const XpFloater = ({ xp, onDone, x = 0 }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onDone) onDone();
    }, 1400);
    return () => clearTimeout(timer);
  }, [onDone]);

  if (!xp || xp <= 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.9 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: '72px',
            right: '16px',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          <div className="bg-gradient-to-r from-violet-500 to-indigo-600 text-white
                          px-3 py-1.5 rounded-full font-black text-sm shadow-lg shadow-indigo-300/50
                          flex items-center gap-1 whitespace-nowrap">
            <span className="text-yellow-300">⚡</span>
            +{xp} XP
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XpFloater;
