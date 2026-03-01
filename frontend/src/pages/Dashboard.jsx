import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Brain, LogOut, Moon, Sun, ShieldCheck } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { progressAPI } from '../api/progress';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const UNIT_TOTALS = {
  1: 283, 2: 376, 3: 359, 4: 379, 5: 384,
  6: 386, 7: 387, 8: 404, 9: 388, 10: 396,
};

const DAILY_GOAL = 15;

/* ג”€ג”€ג”€ Circular progress ring ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */
const Ring = ({ pct, size = 56, stroke = 5, gradient = ['#7c3aed', '#4f46e5'] }) => {
  const r   = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const id = `grad-${gradient[0].replace('#', '')}`;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <defs>
        <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={gradient[0]} />
          <stop offset="100%" stopColor={gradient[1]} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#e5e7eb" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={`url(#${id})`} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  );
};

/* ג”€ג”€ג”€ Dashboard ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const [unitStats, setUnitStats] = useState(null);
  const [userStats, setUserStats] = useState(null);

  useEffect(() => {
    progressAPI.getUnitStats()
      .then(setUnitStats)
      .catch((err) => console.error('Failed to load unit stats:', err));
    progressAPI.getUserStats()
      .then(setUserStats)
      .catch((err) => console.error('Failed to load user stats:', err));
  }, [location.key]);

  const getUnitData = (unitNum) => {
    const total = UNIT_TOTALS[unitNum];
    if (!unitStats) return { learned: 0, total, percent: 0 };
    const found = unitStats.units.find((u) => u.unit === unitNum);
    return found || { learned: 0, total, percent: 0 };
  };

  const overallPercent = unitStats?.overall_percent ?? 0;
  const totalLearned   = unitStats?.total_learned  ?? 0;
  const totalWords     = unitStats?.total_words    ?? 3742;
  const streak         = userStats?.current_streak ?? 0;
  const reviewed       = userStats?.daily_words_reviewed ?? 0;
  const goalPct        = Math.min(100, (reviewed / DAILY_GOAL) * 100);
  const username       = user?.email?.split('@')[0] ?? 'there';

  return (
    <div className="min-h-[100dvh] md:h-[100dvh] md:overflow-hidden flex flex-col relative"
         style={{ background: 'transparent' }}>

      {/* ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• HEADER ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• */}
      <div className="shrink-0 z-20 sticky top-0 px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-stretch gap-2 sm:gap-3">

          {/* ג”€ג”€ Module 1: Greeting ג”€ג”€ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4
                       bg-white/55 backdrop-blur-2xl
                       border border-gray-200/70
                       rounded-[20px] sm:rounded-[24px] px-4 sm:px-5 py-3 sm:py-4
                       shadow-xl shadow-violet-200/30"
          >
            <div className="w-12 h-12 shrink-0 rounded-2xl
                            bg-gradient-to-br from-violet-500 to-indigo-600
                            flex items-center justify-center
                            shadow-lg shadow-indigo-400/50">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.14em]">
                אוצר מילים פסיכומטרי
              </p>
              <p className="text-xl font-black text-gray-900 leading-tight truncate">
                שלום,{' '}
                <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                  {username}
                </span>{' '}
                👋
              </p>
            </div>
          </motion.div>

          {/* ג”€ג”€ Module 2: Streak ג”€ג”€ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
            className="hidden sm:flex items-center gap-3.5
                       bg-white/55 backdrop-blur-2xl
                       border border-gray-200/70
                       rounded-[24px] px-6 py-4
                       shadow-xl shadow-orange-200/30"
          >
            {/* Glowing fire */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-orange-400/40 rounded-full blur-2xl scale-[2]" />
              <span className="relative text-[42px] leading-none drop-shadow-[0_0_12px_rgba(251,146,60,0.7)]">
                🔥
              </span>
            </div>
            <div className="leading-none">
              <p className="text-5xl font-black text-gray-900 tabular-nums">{streak}</p>
              <p className="text-[10px] font-bold text-orange-400 uppercase tracking-[0.14em] mt-1">
                ימי רצף
              </p>
            </div>
          </motion.div>

          {/* ג”€ג”€ Module 3: Goal + Mastery ג”€ג”€ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.14, ease: [0.22, 1, 0.36, 1] }}
            className="hidden sm:flex items-center gap-4
                       bg-white/55 backdrop-blur-2xl
                       border border-gray-200/70
                       rounded-[24px] px-6 py-4
                       shadow-xl shadow-violet-200/30"
          >
            {/* Daily goal ring */}
            <div className="relative shrink-0 flex items-center justify-center">
              <Ring pct={goalPct} size={60} stroke={6} gradient={['#fb923c', '#fbbf24']} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black text-gray-700 tabular-nums leading-none">
                  {reviewed}
                </span>
              </div>
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.12em]">יומי</p>
              <p className="text-sm font-black text-gray-800 tabular-nums">{reviewed}/{DAILY_GOAL}</p>
            </div>

            <div className="w-px h-8 bg-gray-200 mx-1 shrink-0" />

            {/* Overall mastery ring */}
            <div className="relative shrink-0 flex items-center justify-center">
              <Ring pct={overallPercent} size={60} stroke={6} gradient={['#7c3aed', '#6366f1']} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-black text-violet-700 tabular-nums leading-none">
                  {overallPercent}%
                </span>
              </div>
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.12em]">שליטה</p>
              <p className="text-sm font-black text-gray-800 tabular-nums">
                {totalLearned.toLocaleString()}
              </p>
            </div>
          </motion.div>

          {/* ג”€ג”€ Dark mode toggle ג”€ג”€ */}
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.19, ease: [0.22, 1, 0.36, 1] }}
            onClick={toggle}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="bg-white/55 backdrop-blur-2xl border border-gray-200/70
                       rounded-[20px] sm:rounded-[24px] px-3 sm:px-4 shadow-xl shadow-gray-200/30
                       flex items-center justify-center
                       text-gray-400 hover:text-gray-800
                       hover:bg-white/75 transition-all duration-200"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </motion.button>

         {/* ג”€ג”€ Logout ג”€ג”€ */}
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            onClick={logout}
            title="Log out"
            className="bg-white/55 backdrop-blur-2xl border border-gray-200/70
                       rounded-[20px] sm:rounded-[24px] px-3 sm:px-4 shadow-xl shadow-gray-200/30
                       flex items-center justify-center
                       text-gray-400 hover:text-gray-800
                       hover:bg-white/75 transition-all duration-200"
          >
            <LogOut className="w-5 h-5" />
          </motion.button>

          {/* Admin link — only visible to admin users */}
          {user?.is_admin && (
            <motion.button
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={() => navigate('/admin')}
              title="Admin panel"
              className="bg-violet-600 backdrop-blur-2xl border border-violet-500/50
                         rounded-[20px] sm:rounded-[24px] px-3 sm:px-4 shadow-xl shadow-violet-300/40
                         flex items-center justify-center gap-1.5
                         text-white hover:bg-violet-700
                         transition-all duration-200"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline text-xs font-bold uppercase tracking-wide">ניהול</span>
            </motion.button>
          )}
        </div>

        {/* Mobile-only stats row */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="sm:hidden max-w-6xl mx-auto mt-2 flex gap-2"
        >
          {/* Streak chip */}
          <div className="flex-1 flex items-center gap-2
                          bg-white/55 backdrop-blur-2xl border border-gray-200/70
                          rounded-2xl px-3 py-2.5 shadow-md shadow-orange-200/20">
            <span className="text-2xl leading-none">🔥</span>
            <div className="leading-none">
              <p className="text-lg font-black text-gray-900 tabular-nums">{streak}</p>
              <p className="text-[9px] font-bold text-orange-400 uppercase tracking-wide mt-0.5">רצף</p>
            </div>
          </div>

          {/* Daily chip */}
          <div className="flex-1 flex items-center gap-2
                          bg-white/55 backdrop-blur-2xl border border-gray-200/70
                          rounded-2xl px-3 py-2.5 shadow-md shadow-orange-200/10">
            <div className="relative shrink-0">
              <Ring pct={goalPct} size={34} stroke={3} gradient={['#fb923c', '#fbbf24']} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-black text-gray-700 tabular-nums leading-none">{reviewed}</span>
              </div>
            </div>
            <div className="leading-none">
              <p className="text-sm font-black text-gray-900 tabular-nums">{reviewed}/{DAILY_GOAL}</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">יומי</p>
            </div>
          </div>

          {/* Mastery chip */}
          <div className="flex-1 flex items-center gap-2
                          bg-white/55 backdrop-blur-2xl border border-gray-200/70
                          rounded-2xl px-3 py-2.5 shadow-md shadow-violet-200/20">
            <div className="relative shrink-0">
              <Ring pct={overallPercent} size={34} stroke={3} gradient={['#7c3aed', '#6366f1']} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[8px] font-black text-violet-700 tabular-nums leading-none">{overallPercent}%</span>
              </div>
            </div>
            <div className="leading-none">
              <p className="text-sm font-black text-gray-900 tabular-nums">{overallPercent}%</p>
              <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mt-0.5">שליטה</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• BODY ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• */}
      <main className="relative z-10 md:flex-1 md:min-h-0 max-w-6xl mx-auto w-full px-4 sm:px-5 pt-3 pb-6 sm:pb-4 flex flex-col">

        {/* Section title */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="mb-3 shrink-0"
        >
          <h1 className="text-xl font-black text-gray-900 tracking-tight">היחידות שלך</h1>
          <p className="text-sm text-gray-600 mt-0.5 font-medium">
            {totalLearned.toLocaleString()} &thinsp;/&thinsp; {totalWords.toLocaleString()} מילים נלמדו
          </p>
        </motion.div>

        {/* ג”€ג”€ Unit grid ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ג”€ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 md:flex-1 md:min-h-0 lg:grid-rows-2 gap-2 sm:gap-3">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((unit, idx) => {
            const { learned, total, percent } = getUnitData(unit);
            const started   = learned > 0;
            const completed = percent >= 100;

            const btnLabel  = completed ? `חזרה ${unit}` : started ? `המשך ${unit}` : `התחל ${unit}`;
            const numGrad   = completed
              ? 'from-emerald-400 to-teal-500'
              : 'from-violet-600 to-indigo-500';
            const barGrad   = completed
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
              : 'bg-gradient-to-r from-violet-500 to-indigo-600';
            const btnGrad   = completed
              ? 'from-emerald-400 to-teal-500 shadow-emerald-300/50'
              : started
              ? 'from-violet-500 to-indigo-600 shadow-indigo-300/50'
              : 'from-gray-300 to-gray-400 shadow-gray-200/50';

            return (
              <motion.div
                key={unit}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="group md:h-full"
              >
                <button
                  onClick={() => navigate(`/unit/${unit}`)}
                  className="w-full md:h-full text-left flex flex-col gap-1.5 p-3 sm:p-4
                             bg-white/90 backdrop-blur-xl
                             border border-gray-200/70
                             rounded-[22px]
                             shadow-md shadow-gray-200/40
                             hover:shadow-xl hover:shadow-violet-200/50
                             hover:-translate-y-1
                             hover:bg-white
                             hover:ring-2 hover:ring-violet-400/25
                             active:scale-[0.97]
                             transition-all duration-300"
                >
                  {/* Gradient unit number */}
                  <div className="flex items-start justify-between leading-none">
                    <span
                      className={`text-[32px] sm:text-[40px] md:text-[52px] font-black leading-[1] tracking-tighter
                                  bg-gradient-to-br ${numGrad} bg-clip-text text-transparent`}
                    >
                      {unit}
                    </span>
                    {completed && (
                      <span className="text-lg mt-1">✅</span>
                    )}
                  </div>

                  {/* Unit label */}
                  <div className="-mt-1">
                    <p className="text-sm font-bold text-gray-600 uppercase tracking-[0.14em]">
                      יחידה {unit}
                    </p>
                    <p className="text-sm text-gray-500 font-medium mt-0.5">{total} מילים</p>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1 mt-auto">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-600">{learned} נלמדו</span>
                      <span className={`text-sm font-black tabular-nums
                        ${completed ? 'text-emerald-500' : 'text-violet-600'}`}>
                        {percent}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.9, delay: idx * 0.04 + 0.2, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barGrad}`}
                      />
                    </div>
                  </div>

                  {/* CTA button */}
                  <div
                    className={`w-full py-2 rounded-xl text-center
                                text-sm font-black text-white uppercase tracking-[0.12em]
                                bg-gradient-to-r ${btnGrad}
                                shadow-sm
                                group-hover:shadow-md transition-shadow duration-300`}
                  >
                    {btnLabel}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
