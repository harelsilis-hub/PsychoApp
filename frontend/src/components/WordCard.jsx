import { motion } from 'framer-motion';
import { CheckCircle2, XCircle } from 'lucide-react';

const WordCard = ({ word, onKnow, onDontKnow, loading, questionNumber }) => {
  return (
    <motion.div
      key={word.id}
      initial={{ opacity: 0, scale: 0.9, rotateY: -10 }}
      animate={{ opacity: 1, scale: 1, rotateY: 0 }}
      exit={{ opacity: 0, scale: 0.9, rotateY: 10 }}
      transition={{ duration: 0.4 }}
      className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
    >
      {/* Question Number Badge */}
      <div className="flex justify-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold"
        >
          Question {questionNumber}
        </motion.div>
      </div>

      {/* Word Display */}
      <div className="text-center mb-8">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="text-sm text-gray-500 mb-2 uppercase tracking-wider">English</div>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
            {word.english}
          </h2>
          <div className="text-sm text-gray-400">
            Difficulty: {word.difficulty_rank}
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="pt-6 border-t border-gray-200"
        >
          <div className="text-sm text-gray-500 mb-2 uppercase tracking-wider">עברית</div>
          <h3 className="text-4xl md:text-5xl font-bold text-gray-700" dir="rtl">
            {word.hebrew}
          </h3>
        </motion.div>
      </div>

      {/* Question */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mb-8"
      >
        <p className="text-xl text-gray-600">
          Do you know this word?
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="grid grid-cols-2 gap-4"
      >
        {/* I Know This */}
        <button
          onClick={onKnow}
          disabled={loading}
          className="group relative bg-gradient-to-br from-green-500 to-emerald-600 text-white py-6 rounded-2xl font-semibold text-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="relative flex items-center justify-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            <span>I Know This</span>
          </div>
        </button>

        {/* I Don't Know */}
        <button
          onClick={onDontKnow}
          disabled={loading}
          className="group relative bg-gradient-to-br from-red-500 to-rose-600 text-white py-6 rounded-2xl font-semibold text-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
        >
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
          <div className="relative flex items-center justify-center gap-2">
            <XCircle className="w-6 h-6" />
            <span>I Don't Know</span>
          </div>
        </button>
      </motion.div>

      {/* Loading Overlay */}
      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 bg-white bg-opacity-50 backdrop-blur-sm rounded-3xl flex items-center justify-center"
        >
          <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}
    </motion.div>
  );
};

export default WordCard;
