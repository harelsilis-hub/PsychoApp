import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, ArrowRight, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { progressAPI } from '../api/progress';
import { useAuth } from '../context/AuthContext';

const UNIT_TOTALS = {
  1: 283, 2: 376, 3: 359, 4: 379, 5: 384,
  6: 386, 7: 387, 8: 404, 9: 388, 10: 396,
};

const DAILY_GOAL = 15;

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [unitStats, setUnitStats] = useState(null);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    progressAPI.getUnitStats()
      .then(setUnitStats)
      .catch((err) => console.error('Failed to load unit stats:', err));
    progressAPI.getUserStats()
      .then(setUserStats)
      .catch((err) => console.error('Failed to load user stats:', err));
  }, []);

  const getUnitData = (unitNum) => {
    const total = UNIT_TOTALS[unitNum];
    if (!unitStats) return { learned: 0, total, percent: 0 };
    const found = unitStats.units.find((u) => u.unit === unitNum);
    return found || { learned: 0, total, percent: 0 };
  };

  const overallPercent = unitStats?.overall_percent ?? 0;
  const totalLearned  = unitStats?.total_learned ?? 0;
  const totalWords    = unitStats?.total_words ?? 3742;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500 font-medium">Hello {user?.email?.split('@')[0]} 👋</p>
              <h1 className="text-xl font-bold text-gray-900">Psychometric Vocabulary</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Streak counter */}
            <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-3 py-1.5 rounded-xl">
              <span className="text-lg">🔥</span>
              <div>
                <div className="text-sm font-bold text-orange-600">{userStats?.current_streak ?? 0}</div>
                <div className="text-xs text-orange-400">day streak</div>
              </div>
            </div>

            {/* Daily goal progress */}
            <div className="min-w-[130px]">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Daily goal</span>
                <span className="font-semibold">{userStats?.daily_words_reviewed ?? 0}/{DAILY_GOAL}</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${Math.min(100, ((userStats?.daily_words_reviewed ?? 0) / DAILY_GOAL) * 100)}%` }}
                  className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full"
                />
              </div>
            </div>

            {/* Overall progress badge */}
            <div className="text-right">
              <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                {overallPercent}%
              </div>
              <div className="text-xs text-gray-500">
                {totalLearned.toLocaleString()} / {totalWords.toLocaleString()} learned
              </div>
            </div>
            <button
              onClick={logout}
              title="Log out"
              className="p-2 text-gray-400 hover:text-gray-700 transition-colors rounded-lg hover:bg-gray-100"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Thin overall progress bar */}
        <div className="h-1.5 bg-gray-100">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${overallPercent}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
          />
        </div>
      </div>

      {/* ── Unit Grid ───────────────────────────────────────────── */}
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <p className="text-sm text-gray-500 font-medium uppercase tracking-wider mb-6">
          Choose a unit to study
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((unit, idx) => {
            const { learned, total, percent } = getUnitData(unit);
            return (
              <motion.div
                key={unit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="bg-white rounded-2xl shadow-md p-5 flex flex-col cursor-pointer
                           hover:shadow-xl hover:-translate-y-1 transition-all group"
                onClick={() => navigate(`/unit/${unit}`)}
              >
                {/* Unit number circle */}
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl
                               flex items-center justify-center mb-3 shadow
                               group-hover:scale-110 transition-transform">
                  <span className="text-white text-lg font-bold">{unit}</span>
                </div>

                <div className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
                  Unit {unit}
                </div>
                <div className="text-xs text-gray-400 mb-3">
                  {total} words
                </div>

                {/* Per-unit progress bar */}
                <div className="mt-auto">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-500">{learned} learned</span>
                    <span className="text-xs font-semibold text-purple-600">{percent}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.8, delay: idx * 0.04 + 0.3, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1 text-xs font-semibold text-purple-600
                               group-hover:text-purple-800 transition-colors mt-3">
                  Open <ArrowRight className="w-3 h-3" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
