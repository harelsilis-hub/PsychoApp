import { useRegisterSW } from 'virtual:pwa-register/react';
import { motion, AnimatePresence } from 'framer-motion';

const UpdateBanner = () => {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999]
                     flex items-center gap-3
                     bg-white border border-violet-200
                     rounded-2xl px-4 py-2.5
                     shadow-xl shadow-violet-200/50
                     text-sm font-bold text-gray-800 whitespace-nowrap"
        >
          <span>🎉 עדכון זמין</span>
          <button
            onClick={() => updateServiceWorker(true)}
            className="px-3 py-1 rounded-xl
                       bg-gradient-to-r from-violet-500 to-indigo-600
                       text-white text-xs font-black
                       hover:shadow-lg transition-shadow duration-200"
          >
            רענן ←
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default UpdateBanner;
