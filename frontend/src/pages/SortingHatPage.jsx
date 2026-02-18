import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ArrowRight, CheckCircle2, XCircle, Sparkles, Trophy } from 'lucide-react';
import { sortingAPI } from '../api/sorting';
import WordCard from '../components/WordCard';
import ProgressBar from '../components/ProgressBar';
import ResultScreen from '../components/ResultScreen';

const SortingHatPage = () => {
  const [stage, setStage] = useState('start'); // start, testing, complete, error
  const [session, setSession] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isRegressionCheck, setIsRegressionCheck] = useState(false);

  // For demo purposes - in production, get from auth context
  const userId = 1;

  const startTest = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sortingAPI.startPlacementTest(userId);
      setSession(data.session);
      setCurrentWord(data.word);
      setStage('testing');
    } catch (err) {
      console.error('Failed to start test:', err);
      setError('Failed to start the placement test. Please make sure the backend is running.');
      setStage('error');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (isKnown) => {
    setLoading(true);
    setError(null);
    try {
      const data = await sortingAPI.submitAnswer(userId, isKnown);
      setSession(data.session);

      if (data.is_complete) {
        setStage('complete');
      } else {
        setCurrentWord(data.word);
        // Check if message indicates regression check
        setIsRegressionCheck(data.message?.includes('Regression check') || false);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetTest = () => {
    setStage('start');
    setSession(null);
    setCurrentWord(null);
    setError(null);
    setIsRegressionCheck(false);
  };

  // Start Screen
  if (stage === 'start') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <Brain className="w-10 h-10 text-white" />
              </motion.div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                The Sorting Hat
              </h1>
              <p className="text-xl text-gray-600">
                Adaptive Vocabulary Placement Test
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Smart Algorithm</h3>
                  <p className="text-gray-600">Binary search with regression checks for 95-98% accuracy</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ArrowRight className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Quick & Efficient</h3>
                  <p className="text-gray-600">Determine your level in just 10-15 questions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Trophy className="w-4 h-4 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Personalized</h3>
                  <p className="text-gray-600">Get your exact vocabulary level for optimal learning</p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-3">How it works:</h3>
              <ol className="space-y-2 text-gray-600">
                <li>1. We'll show you a word in English and Hebrew</li>
                <li>2. Tell us if you know the word or not</li>
                <li>3. We'll adapt to your level in real-time</li>
                <li>4. Get your personalized vocabulary level!</li>
              </ol>
            </div>

            {/* Start Button */}
            <button
              onClick={startTest}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                'Begin Placement Test'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Error Screen
  if (stage === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={resetTest}
            className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  // Testing Screen
  if (stage === 'testing' && currentWord && session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col">
        {/* Header with Progress */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900">Sorting Hat</span>
              </div>
              <div className="text-sm text-gray-600">
                Question {session.question_count + 1} of 20
              </div>
            </div>
            <ProgressBar
              current={session.question_count + 1}
              total={20}
            />
            {isRegressionCheck && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 text-xs text-purple-600 font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Regression check
              </motion.div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full">
            <WordCard
              word={currentWord}
              onKnow={() => submitAnswer(true)}
              onDontKnow={() => submitAnswer(false)}
              loading={loading}
              questionNumber={session.question_count + 1}
            />

            {/* Range Info */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center mt-6 text-sm text-gray-500"
            >
              Current range: Level {session.current_min} - {session.current_max}
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (stage === 'complete' && session) {
    return (
      <ResultScreen
        finalLevel={session.final_level}
        questionCount={session.question_count}
        onReset={resetTest}
      />
    );
  }

  return null;
};

export default SortingHatPage;
