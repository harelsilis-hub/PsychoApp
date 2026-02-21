import { motion } from 'framer-motion';
import { Trophy, TrendingUp, CheckCircle, XCircle, Target, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SessionComplete = ({ stats, backPath = '/' }) => {
  const navigate = useNavigate();

  const accuracy = stats.total > 0
    ? Math.round(((stats.perfect + stats.good) / stats.total) * 100)
    : 0;

  const getEncouragement = () => {
    if (accuracy >= 90) return "Outstanding work!";
    if (accuracy >= 75) return "Great job!";
    if (accuracy >= 60) return "Good progress!";
    return "Keep practicing!";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8"
      >
        {/* Trophy Icon */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-center mb-6"
        >
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-10 h-10 text-yellow-500" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Session Complete!
          </h2>
          <p className="text-lg text-gray-600 mt-2">
            {getEncouragement()}
          </p>
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4 mb-8"
        >
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Words Reviewed</span>
              <span className="text-2xl font-bold text-gray-900">{stats.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Accuracy</span>
              <span className="text-2xl font-bold text-green-600">{accuracy}%</span>
            </div>
          </div>

          {/* Breakdown */}
          <div className="grid grid-cols-3 gap-4 pt-4">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-center"
            >
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.perfect}</div>
              <div className="text-xs text-gray-600">Perfect</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.good}</div>
              <div className="text-xs text-gray-600">Good</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="text-center"
            >
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stats.failed}</div>
              <div className="text-xs text-gray-600">Retry</div>
            </motion.div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="space-y-3"
        >
          <button
            onClick={() => navigate(backPath)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-semibold text-lg hover:shadow-lg transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          >
            <span>Done</span>
            <ArrowRight className="w-5 h-5" />
          </button>

          {stats.failed > 0 && (
            <div className="text-center text-sm text-gray-600">
              <Target className="w-4 h-4 inline-block mr-1" />
              You'll see the {stats.failed} retry word{stats.failed > 1 ? 's' : ''} again tomorrow
            </div>
          )}
        </motion.div>

        {/* Encouragement */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-6 text-center text-xs text-gray-500"
        >
          <p>Consistency is key! Come back tomorrow to maintain your progress.</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default SessionComplete;
