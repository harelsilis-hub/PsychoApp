import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Trophy, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { sortingAPI } from '../api/sorting';

const PlacementTest = () => {
  const navigate = useNavigate();
  const [stage, setStage] = useState('loading'); // loading, testing, complete, error
  const [session, setSession] = useState(null);
  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]); // 4 options: 1 correct + 3 distractors
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [feedback, setFeedback] = useState(null); // 'correct' or 'incorrect'
  const [countdown, setCountdown] = useState(3);


  // Helper function to calculate level from difficulty_rank (1-100 → 1-20)
  const calculateLevel = (difficultyRank) => {
    return Math.ceil(difficultyRank / 5);
  };

  useEffect(() => {
    startTest();
  }, []);

  // Auto-redirect to dashboard after test completion
  useEffect(() => {
    if (stage === 'complete') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            navigate('/dashboard');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [stage, navigate]);

  const startTest = async () => {
    try {
      const data = await sortingAPI.startPlacementTest();
      setSession(data.session);
      setCurrentWord(data.word);

      // Shuffle options (1 correct + 3 distractors)
      const allOptions = [data.word, ...data.distractors];
      const shuffled = allOptions.sort(() => Math.random() - 0.5);
      setOptions(shuffled);

      setStage('testing');
    } catch (err) {
      console.error('Failed to start test:', err);
      setError('Failed to start the placement test. Please ensure the backend is running.');
      setStage('error');
    }
  };

  const handleAnswerSelect = async (selectedOption) => {
    if (isSubmitting || selectedAnswer) return; // Prevent double clicks

    setSelectedAnswer(selectedOption);
    setIsSubmitting(true);

    // Check if answer is correct
    const isCorrect = selectedOption.id === currentWord.id;
    setFeedback(isCorrect ? 'correct' : 'incorrect');

    // Wait a moment to show feedback
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      // Submit answer to backend (is_known = isCorrect)
      const data = await sortingAPI.submitAnswer(isCorrect);
      setSession(data.session);

      if (data.is_complete) {
        setStage('complete');
      } else {
        // Prepare next question
        setCurrentWord(data.word);
        const allOptions = [data.word, ...data.distractors];
        const shuffled = allOptions.sort(() => Math.random() - 0.5);
        setOptions(shuffled);

        // Reset for next question
        setSelectedAnswer(null);
        setFeedback(null);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer. Please try again.');
      setStage('error');
    }
  };

  const handleDontKnow = async () => {
    if (isSubmitting) return; // Prevent double clicks

    setIsSubmitting(true);

    try {
      // Submit as "don't know" (is_known = false)
      const data = await sortingAPI.submitAnswer(false);
      setSession(data.session);

      if (data.is_complete) {
        setStage('complete');
      } else {
        // Prepare next question
        setCurrentWord(data.word);
        const allOptions = [data.word, ...data.distractors];
        const shuffled = allOptions.sort(() => Math.random() - 0.5);
        setOptions(shuffled);

        // Reset for next question
        setSelectedAnswer(null);
        setFeedback(null);
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error('Failed to submit answer:', err);
      setError('Failed to submit answer. Please try again.');
      setStage('error');
    }
  };

  const getAchievement = (level) => {
    if (level >= 17) return { title: 'Master', color: 'from-yellow-400 to-orange-500', emoji: '🏆' };
    if (level >= 13) return { title: 'Advanced', color: 'from-purple-400 to-pink-500', emoji: '⭐' };
    if (level >= 9) return { title: 'Intermediate', color: 'from-blue-400 to-cyan-500', emoji: '💫' };
    if (level >= 5) return { title: 'Beginner', color: 'from-green-400 to-emerald-500', emoji: '🌱' };
    return { title: 'Starter', color: 'from-gray-400 to-gray-500', emoji: '🎯' };
  };

  // Loading Screen
  if (stage === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading your test...</p>
        </div>
      </div>
    );
  }

  // Error Screen
  if (stage === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">❌</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
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
      <div className="min-h-screen flex flex-col">
        {/* Progress Header */}
        <div className="bg-white shadow-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900">Placement Test</span>
              </div>
              <div className="text-sm text-gray-600">
                Question {session.question_count + 1} of 20
              </div>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((session.question_count + 1) / 20) * 100}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-purple-600 to-blue-600"
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-3xl w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentWord.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3 }}
                className="bg-white rounded-3xl shadow-2xl p-8 md:p-12"
              >
                {/* English Word - Large Display */}
                <div className="text-center mb-12">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-sm text-gray-500 mb-4 uppercase tracking-wider">
                      Select the correct Hebrew translation
                    </div>
                    <h2 className="text-6xl md:text-7xl font-bold text-gray-900 mb-4">
                      {currentWord.english}
                    </h2>
                    <div className="text-sm text-gray-400">
                      Level {calculateLevel(currentWord.difficulty_rank)} of 20
                    </div>
                  </motion.div>
                </div>

                {/* Answer Options Grid - 4 Buttons */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                  className="grid grid-cols-1 md:grid-cols-2 gap-4"
                >
                  {options.map((option, index) => {
                    const isSelected = selectedAnswer?.id === option.id;
                    const isCorrect = option.id === currentWord.id;
                    const showFeedback = selectedAnswer && feedback;

                    let buttonClass = "relative group bg-white border-2 border-gray-300 text-gray-900 py-6 rounded-2xl font-semibold text-xl hover:border-purple-400 hover:shadow-md transition-all disabled:cursor-not-allowed";

                    if (showFeedback) {
                      if (isSelected && isCorrect) {
                        buttonClass = "relative bg-gradient-to-br from-green-500 to-emerald-600 text-white py-6 rounded-2xl font-semibold text-xl shadow-lg";
                      } else if (isSelected && !isCorrect) {
                        buttonClass = "relative bg-gradient-to-br from-red-500 to-rose-600 text-white py-6 rounded-2xl font-semibold text-xl shadow-lg";
                      } else if (!isSelected && isCorrect) {
                        buttonClass = "relative bg-gradient-to-br from-green-500 to-emerald-600 text-white py-6 rounded-2xl font-semibold text-xl shadow-lg";
                      }
                    }

                    return (
                      <motion.button
                        key={option.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        onClick={() => handleAnswerSelect(option)}
                        disabled={isSubmitting || selectedAnswer}
                        className={buttonClass}
                      >
                        <span dir="rtl" className="text-2xl">
                          {option.hebrew}
                        </span>
                      </motion.button>
                    );
                  })}
                </motion.div>

                {/* I Don't Know Button */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.9 }}
                  className="mt-6"
                >
                  <button
                    onClick={handleDontKnow}
                    disabled={isSubmitting || selectedAnswer}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-4 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <span>I Don't Know</span>
                    <span className="text-sm opacity-75">(Skip)</span>
                  </button>
                </motion.div>

                {/* Loading Indicator */}
                {isSubmitting && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-6 text-center text-gray-500"
                  >
                    Loading next question...
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (stage === 'complete' && session) {
    const achievement = getAchievement(session.final_level);

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className="max-w-2xl w-full"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
            {/* Celebration */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 mx-auto mb-6 text-6xl"
              >
                {achievement.emoji}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-4xl md:text-5xl font-bold text-gray-900 mb-3"
              >
                Test Complete!
              </motion.h1>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-xl text-gray-600"
              >
                Your vocabulary level has been determined
              </motion.p>
            </div>

            {/* Level Display */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-8"
            >
              <div className={`bg-gradient-to-r ${achievement.color} rounded-2xl p-8 text-center text-white shadow-lg`}>
                <div className="text-sm font-semibold mb-2 opacity-90 uppercase tracking-wider">
                  Your Level
                </div>
                <div className="text-7xl font-bold mb-2">
                  {session.final_level}
                </div>
                <div className="text-xl font-semibold opacity-90">
                  {achievement.title}
                </div>
                <div className="text-sm opacity-75 mt-2">
                  of 20 levels
                </div>
              </div>
            </motion.div>

            {/* Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="grid grid-cols-2 gap-4 mb-8"
            >
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">{session.question_count}</div>
                <div className="text-sm text-gray-600">Questions</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-gray-900">±2</div>
                <div className="text-sm text-gray-600">Accuracy</div>
              </div>
            </motion.div>

            {/* Action Button with Countdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
              >
                <span>Continue to Dashboard</span>
                {countdown > 0 && <span className="text-sm opacity-75">({countdown}s)</span>}
                <ArrowRight className="w-5 h-5" />
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
};

export default PlacementTest;
