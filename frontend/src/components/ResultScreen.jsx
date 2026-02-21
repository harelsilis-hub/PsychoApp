import { motion } from 'framer-motion';
import { Trophy, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ResultScreen = ({ finalLevel, questionCount, onReset }) => {
  const navigate = useNavigate();

  // Determine achievement level
  const getAchievement = (level) => {
    if (level >= 80) return { title: 'Master', color: 'from-yellow-400 to-orange-500', emoji: '🏆' };
    if (level >= 60) return { title: 'Advanced', color: 'from-purple-400 to-pink-500', emoji: '⭐' };
    if (level >= 40) return { title: 'Intermediate', color: 'from-blue-400 to-cyan-500', emoji: '💫' };
    if (level >= 20) return { title: 'Beginner', color: 'from-green-400 to-emerald-500', emoji: '🌱' };
    return { title: 'Starter', color: 'from-gray-400 to-gray-500', emoji: '🎯' };
  };

  const achievement = getAchievement(finalLevel);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12">
          {/* Celebration Animation */}
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
              Placement Complete!
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
                {finalLevel}
              </div>
              <div className="text-xl font-semibold opacity-90">
                {achievement.title}
              </div>
            </div>
          </motion.div>

          {/* Statistics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="grid grid-cols-3 gap-4 mb-8"
          >
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">{questionCount}</div>
              <div className="text-sm text-gray-600">Questions</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">±2</div>
              <div className="text-sm text-gray-600">Accuracy</div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-900">98%</div>
              <div className="text-sm text-gray-600">Confidence</div>
            </div>
          </motion.div>

          {/* Features Unlocked */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 mb-8"
          >
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              What's Next
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Start learning with personalized word recommendations
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Use spaced repetition (SM-2) for optimal retention
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Create and share memory associations
                </span>
              </li>
            </ul>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            className="grid md:grid-cols-2 gap-4"
          >
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={onReset}
              className="border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-semibold hover:border-gray-400 hover:bg-gray-50 transition-all"
            >
              Take Test Again
            </button>
          </motion.div>

          {/* Info Note */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-6 text-center text-sm text-gray-500"
          >
            Your level has been saved to your profile
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default ResultScreen;
