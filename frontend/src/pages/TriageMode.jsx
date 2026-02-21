import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Brain, ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { progressAPI } from '../api/progress';

const TriageMode = () => {
  const navigate = useNavigate();
  const [currentWord, setCurrentWord] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slideDirection, setSlideDirection] = useState(null); // 'left' or 'right'
  const [showMemoryAid, setShowMemoryAid] = useState(false);


  useEffect(() => {
    loadNextWord();
  }, []);

  const loadNextWord = async () => {
    try {
      setLoading(true);
      setError(null);
      setShowMemoryAid(false);
      const data = await progressAPI.getNextTriageWord();
      setCurrentWord(data.word);
      setRemaining(data.remaining);
    } catch (err) {
      console.error('Failed to load word:', err);
      if (err.response?.status === 404) {
        // No more words - triage complete
        setError('complete');
      } else {
        setError('Failed to load next word. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = async (isKnown) => {
    if (isSubmitting || !currentWord) return;

    setIsSubmitting(true);
    setSlideDirection(isKnown ? 'right' : 'left');

    // If user doesn't know, show memory aid placeholder briefly
    if (!isKnown) {
      setShowMemoryAid(true);
    }

    try {
      await progressAPI.triageWord(currentWord.id, isKnown);

      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 500));

      // Load next word
      await loadNextWord();
    } catch (err) {
      console.error('Failed to submit choice:', err);
      setError('Failed to save your choice. Please try again.');
    } finally {
      setIsSubmitting(false);
      setSlideDirection(null);
    }
  };

  // Loading Screen
  if (loading && !currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading words...</p>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (error === 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">
            Triage Complete!
          </h2>
          <p className="text-gray-600 mb-8">
            You've sorted all words at your level. Your learning queue is ready!
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Back to Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  // Error Screen
  if (error && error !== 'complete') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={loadNextWord}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main Triage Interface
  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Back</span>
            </button>
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-900">Triage Mode</span>
            </div>
            <div className="text-sm text-gray-600">
              {remaining} remaining
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
        <div className="max-w-2xl w-full">
          <AnimatePresence mode="wait">
            {currentWord && (
              <motion.div
                key={currentWord.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: slideDirection ? 0 : 1,
                  scale: slideDirection ? 0.8 : 1,
                  x: slideDirection === 'left' ? -1000 : slideDirection === 'right' ? 1000 : 0,
                  rotate: slideDirection === 'left' ? -30 : slideDirection === 'right' ? 30 : 0,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.5, type: 'spring' }}
                className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
              >
                {/* Word Display */}
                <div className="text-center mb-8">
                  <div className="text-sm text-gray-500 mb-2 uppercase tracking-wider">
                    Do you know this word?
                  </div>
                  <h2 className="text-6xl md:text-7xl font-bold text-gray-900 mb-4">
                    {currentWord.english}
                  </h2>
                  <div className="text-sm text-gray-400">
                    Unit {currentWord.unit}
                  </div>
                </div>

                {/* Hebrew Translation */}
                <div className="bg-gray-50 rounded-2xl p-6 mb-8 text-center">
                  <div className="text-sm text-gray-500 mb-2 uppercase tracking-wider">
                    עברית
                  </div>
                  <div className="text-4xl font-bold text-gray-700" dir="rtl">
                    {currentWord.hebrew}
                  </div>
                </div>

                {/* Memory Aid Placeholder */}
                <AnimatePresence>
                  {showMemoryAid && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-6 mb-8"
                    >
                      <div className="flex items-start gap-3">
                        <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-1" />
                        <div>
                          <div className="font-semibold text-gray-900 mb-2">
                            Memory Aid (Coming Soon)
                          </div>
                          <div className="text-gray-600 text-sm">
                            AI-generated memory associations will help you remember this word!
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {/* I Don't Know */}
                  <button
                    onClick={() => handleChoice(false)}
                    disabled={isSubmitting}
                    className="group relative bg-gradient-to-br from-red-500 to-rose-600 text-white py-6 rounded-2xl font-semibold text-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="relative flex items-center justify-center gap-2">
                      <XCircle className="w-6 h-6" />
                      <span>I Don't Know</span>
                    </div>
                  </button>

                  {/* I Know This */}
                  <button
                    onClick={() => handleChoice(true)}
                    disabled={isSubmitting}
                    className="group relative bg-gradient-to-br from-green-500 to-emerald-600 text-white py-6 rounded-2xl font-semibold text-lg hover:shadow-xl transform hover:-translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="relative flex items-center justify-center gap-2">
                      <CheckCircle className="w-6 h-6" />
                      <span>I Know This</span>
                    </div>
                  </button>
                </div>

                {/* Help Text */}
                <div className="mt-6 text-center text-sm text-gray-500">
                  <p>Left: Add to Learning Queue | Right: Mark as Mastered</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TriageMode;
