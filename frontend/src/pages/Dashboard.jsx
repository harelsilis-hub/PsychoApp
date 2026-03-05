import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Moon, Sun, ShieldCheck, Volume2, VolumeX, Trophy, Menu } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { progressAPI } from '../api/progress';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';

// ── Level helper (mirrors backend LEVELS) ──────────────────────────────────────
const LEVELS = [
  [0,      'Bronze I',      '#CD7F32'],
  [4000,   'Bronze II',     '#CD7F32'],
  [12000,  'Bronze III',    '#CD7F32'],
  [30000,  'Silver I',      '#C0C0C0'],
  [70000,  'Silver II',     '#C0C0C0'],
  [130000, 'Silver III',    '#C0C0C0'],
  [200000, 'Gold I',        '#FFD700'],
  [280000, 'Gold II',       '#FFD700'],
  [370000, 'Gold III',      '#FFD700'],
  [460000, 'Platinum I',    '#00CED1'],
  [530000, 'Platinum II',   '#00CED1'],
  [580000, 'Platinum III',  '#00CED1'],
  [610000, 'Diamond I',     '#00BFFF'],
  [640000, 'Diamond II',    '#00BFFF'],
  [660000, 'Champion',      '#FFD700'],
];

function getLevelInfo(xp) {
  let levelNum = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i][0]) levelNum = i;
    else break;
  }
  const [xpStart, title, color] = LEVELS[levelNum];
  const xpNext = levelNum + 1 < LEVELS.length ? LEVELS[levelNum + 1][0] : null;
  const progressPct = xpNext
    ? Math.min(100, Math.round(((xp - xpStart) / (xpNext - xpStart)) * 100))
    : 100;
  return { levelNum, title, color, xp, xpNext, progressPct };
}

// Fallback English totals — overridden by server data when available
const UNIT_TOTALS_EN = {
  1: 283, 2: 376, 3: 359, 4: 379, 5: 384,
  6: 386, 7: 387, 8: 404, 9: 388, 10: 396,
};

const DAILY_GOAL = 15;

/* ג"€ג"€ג"€ Circular progress ring ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ */
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

/* ג"€ג"€ג"€ Dashboard ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ */
const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const { language, switchLanguage } = useLanguage();
  const { soundEnabled, toggleSound } = useSound();
  const [unitStats, setUnitStats] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    progressAPI.getUnitStats(language)
      .then(setUnitStats)
      .catch((err) => console.error('Failed to load unit stats:', err));
    progressAPI.getUserStats()
      .then(setUserStats)
      .catch((err) => console.error('Failed to load user stats:', err));
  }, [location.key, language]);

  const getUnitData = (unitNum) => {
    const fallbackTotal = language === 'en' ? (UNIT_TOTALS_EN[unitNum] ?? 0) : 0;
    if (!unitStats) return { learned: 0, total: fallbackTotal, percent: 0 };
    const found = unitStats.units.find((u) => u.unit === unitNum);
    return found || { learned: 0, total: fallbackTotal, percent: 0 };
  };

  // Derive available unit numbers from server data (supports any number of units)
  const availableUnits = unitStats?.units?.map((u) => u.unit) ??
    Array.from({ length: 10 }, (_, i) => i + 1);

  const overallPercent = unitStats?.overall_percent ?? 0;
  const totalLearned   = unitStats?.total_learned  ?? 0;
  const totalWords     = unitStats?.total_words    ?? (language === 'en' ? 3742 : 0);
  const streak         = userStats?.current_streak ?? 0;
  const reviewed       = userStats?.daily_words_reviewed ?? 0;
  const goalPct        = Math.min(100, (reviewed / DAILY_GOAL) * 100);
  const username       = user?.display_name || (user?.email?.split('@')[0] ?? 'there');
  const xp             = userStats?.xp ?? 0;
  const levelInfo      = getLevelInfo(xp);

  return (
    <div className="h-[100dvh] flex flex-col relative"
         style={{ background: 'transparent' }}>

      {/* ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• HEADER ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• */}
      <div className="shrink-0 z-20 sticky top-0 px-4 sm:px-5 pt-3 sm:pt-4 pb-2 sm:pb-3">
        <div className="max-w-6xl mx-auto flex flex-wrap items-stretch gap-2 sm:gap-3">

          {/* ג"€ג"€ Module 1: Greeting ג"€ג"€ */}
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
            <img src="/mila_logo.png" alt="Mila" className="hidden sm:block w-12 h-12 shrink-0 object-contain" />
            <div className="min-w-0">
              <p className="hidden sm:block text-[11px] font-bold text-gray-600 uppercase tracking-[0.14em]">
                אוצר מילים פסיכומטרי
              </p>
              <p className="text-base sm:text-xl font-black text-gray-900 leading-tight truncate">
                שלום,{' '}
                <span className="bg-gradient-to-r from-violet-600 to-indigo-500 bg-clip-text text-transparent">
                  {username}
                </span>{' '}
                👋
              </p>
            </div>
          </motion.div>

          {/* ג"€ג"€ Module 2: Streak ג"€ג"€ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.07, ease: [0.22, 1, 0.36, 1] }}
            className="tour-streak hidden sm:flex items-center gap-3.5
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

          {/* ג"€ג"€ Module 3: Goal + Mastery ג"€ג"€ */}
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

          {/* ── Module 4: XP bar + leaderboard link ── */}
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => navigate('/leaderboard')}
            title="לוח המובילים"
            className="hidden sm:flex items-center gap-2.5
                       bg-white/55 backdrop-blur-2xl
                       border border-gray-200/70
                       rounded-[24px] px-4 py-3
                       shadow-xl shadow-violet-200/30
                       hover:bg-white/75 transition-all duration-200 w-44"
          >
            <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                <span className="text-[11px] font-black" style={{ color: levelInfo.color }}>
                  {levelInfo.title}
                </span>
                <span className="text-[10px] font-semibold text-gray-500 tabular-nums">
                  · {xp.toLocaleString()} XP
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(levelInfo.progressPct, 3)}%` }}
                  transition={{ duration: 1.0, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${levelInfo.color}88, ${levelInfo.color})` }}
                />
              </div>
            </div>
          </motion.button>

          {/* ── Menu button ── */}
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="relative shrink-0"
          >
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="h-full bg-white/55 backdrop-blur-2xl border border-gray-200/70
                         rounded-[20px] sm:rounded-[24px] px-4
                         flex items-center justify-center
                         text-gray-500 hover:text-gray-900
                         hover:bg-white/75 transition-all duration-200
                         shadow-xl shadow-gray-200/30"
            >
              <Menu className="w-5 h-5" />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-[calc(100%+8px)] w-52 z-50
                             bg-white/95 backdrop-blur-2xl
                             border border-gray-200/70
                             rounded-2xl shadow-2xl shadow-gray-300/40
                             overflow-hidden"
                >
                  {/* Leaderboard — mobile only */}
                  <button
                    onClick={() => { setMenuOpen(false); navigate('/leaderboard'); }}
                    className="sm:hidden w-full flex items-center gap-3 px-4 py-3
                               text-sm font-medium text-gray-700 hover:bg-gray-50
                               transition-colors duration-150 text-right"
                  >
                    <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
                    <span>לוח המובילים</span>
                    <span className="mr-auto text-[11px] font-bold" style={{ color: levelInfo.color }}>
                      {levelInfo.title}
                    </span>
                  </button>
                  <div className="sm:hidden h-px bg-gray-100 mx-3" />

                  {/* Sound */}
                  <button
                    onClick={() => { toggleSound(); }}
                    className="w-full flex items-center gap-3 px-4 py-3
                               text-sm font-medium text-gray-700 hover:bg-gray-50
                               transition-colors duration-150 text-right"
                  >
                    {soundEnabled
                      ? <Volume2 className="w-4 h-4 text-violet-500 shrink-0" />
                      : <VolumeX className="w-4 h-4 text-gray-300 shrink-0" />}
                    <span>{soundEnabled ? 'כבה צלילים' : 'הפעל צלילים'}</span>
                  </button>

                  {/* Dark mode */}
                  <button
                    onClick={() => { toggle(); }}
                    className="w-full flex items-center gap-3 px-4 py-3
                               text-sm font-medium text-gray-700 hover:bg-gray-50
                               transition-colors duration-150 text-right"
                  >
                    {isDark
                      ? <Sun className="w-4 h-4 text-amber-400 shrink-0" />
                      : <Moon className="w-4 h-4 text-indigo-400 shrink-0" />}
                    <span>{isDark ? 'מצב בהיר' : 'מצב כהה'}</span>
                  </button>

                  {/* Admin */}
                  {user?.is_admin && (
                    <>
                      <div className="h-px bg-gray-100 mx-3" />
                      <button
                        onClick={() => { setMenuOpen(false); navigate('/admin'); }}
                        className="w-full flex items-center gap-3 px-4 py-3
                                   text-sm font-medium text-violet-600 hover:bg-violet-50
                                   transition-colors duration-150 text-right"
                      >
                        <ShieldCheck className="w-4 h-4 shrink-0" />
                        <span>פאנל ניהול</span>
                      </button>
                    </>
                  )}

                  {/* Logout */}
                  <div className="h-px bg-gray-100 mx-3" />
                  <button
                    onClick={() => { setMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-4 py-3
                               text-sm font-medium text-red-500 hover:bg-red-50
                               transition-colors duration-150 text-right"
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span>התנתק</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

        </div>

        {/* Mobile-only stats row */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.12 }}
          className="sm:hidden landscape:hidden max-w-6xl mx-auto mt-2 flex gap-1.5"
        >
          {/* Streak */}
          <div className="tour-streak-mobile flex-1 flex items-center gap-1
                          bg-white/55 backdrop-blur-2xl border border-gray-200/70
                          rounded-xl px-2 py-2 shadow-md shadow-orange-200/20">
            <span className="text-base leading-none shrink-0">🔥</span>
            <div className="leading-none min-w-0">
              <p className="text-sm font-black text-gray-900 tabular-nums">{streak}</p>
              <p className="text-[8px] font-bold text-orange-400 uppercase mt-0.5">רצף</p>
            </div>
          </div>

          {/* Daily */}
          <div className="flex-1 flex items-center gap-1
                          bg-white/55 backdrop-blur-2xl border border-gray-200/70
                          rounded-xl px-2 py-2 shadow-md shadow-orange-200/10">
            <div className="relative shrink-0">
              <Ring pct={goalPct} size={26} stroke={2.5} gradient={['#fb923c', '#fbbf24']} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[7px] font-black text-gray-700 leading-none">{reviewed}</span>
              </div>
            </div>
            <div className="leading-none min-w-0">
              <p className="text-[11px] font-black text-gray-900 tabular-nums">{reviewed}/{DAILY_GOAL}</p>
              <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5">יומי</p>
            </div>
          </div>

          {/* Mastery */}
          <div className="flex-1 flex items-center gap-1
                          bg-white/55 backdrop-blur-2xl border border-gray-200/70
                          rounded-xl px-2 py-2 shadow-md shadow-violet-200/20">
            <div className="relative shrink-0">
              <Ring pct={overallPercent} size={26} stroke={2.5} gradient={['#7c3aed', '#6366f1']} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[7px] font-black text-violet-700 leading-none">{overallPercent}%</span>
              </div>
            </div>
            <div className="leading-none min-w-0">
              <p className="text-[11px] font-black text-gray-900 tabular-nums">{overallPercent}%</p>
              <p className="text-[8px] font-bold text-gray-500 uppercase mt-0.5">שליטה</p>
            </div>
          </div>

          {/* Leaderboard */}
          <button
            onClick={() => navigate('/leaderboard')}
            className="flex-1 flex items-center gap-1
                        bg-yellow-50/80 backdrop-blur-2xl
                        border border-yellow-300/60
                        rounded-xl px-2 py-2 shadow-md shadow-yellow-200/30
                        active:scale-95 transition-transform duration-100"
          >
            <Trophy className="w-3.5 h-3.5 text-yellow-500 shrink-0" />
            <div className="leading-none min-w-0">
              <p className="text-[10px] font-black truncate" style={{ color: levelInfo.color }}>
                {levelInfo.title}
              </p>
              <p className="text-[8px] font-bold text-yellow-600 uppercase mt-0.5">לוח ›</p>
            </div>
          </button>
        </motion.div>
      </div>

      {/* ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• BODY ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto max-w-6xl mx-auto w-full px-4 sm:px-5 pt-3 pb-6 sm:pb-4 flex flex-col">

        {/* Section title + Language selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="mb-3 shrink-0"
        >
          <div className="flex items-baseline justify-between mb-3">
            <h1 className="text-xl font-black text-gray-900 tracking-tight">היחידות שלך</h1>
            <p className="text-sm text-gray-600 font-medium">
              {totalLearned.toLocaleString()} / {totalWords.toLocaleString()} נלמדו
            </p>
          </div>

          {/* ── Bold language selector ── */}
          <div className="tour-language grid grid-cols-2 gap-2.5">
            {/* English option */}
            <motion.button
              onClick={() => switchLanguage('en')}
              whileTap={{ scale: 0.97 }}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-250 text-right ${
                language === 'en'
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-600 border-transparent shadow-xl shadow-indigo-300/50 text-white'
                  : 'bg-white/80 border-gray-200 text-gray-500 hover:border-violet-300 hover:bg-white'
              }`}
            >
              {language === 'en' && (
                <motion.div
                  layoutId="lang-active-bg"
                  className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 -z-10"
                />
              )}
              <span className="text-2xl leading-none">🔤</span>
              <div className="leading-tight text-right flex-1">
                <p className={`text-sm font-black tracking-tight ${language === 'en' ? 'text-white' : 'text-gray-800'}`}>
                  אנגלית
                </p>
                <p className={`text-[11px] font-semibold mt-0.5 ${language === 'en' ? 'text-white/75' : 'text-gray-400'}`}>
                  English &larr; עברית &nbsp;·&nbsp; {language === 'en' ? totalWords.toLocaleString() : '3,742'} מילים
                </p>
              </div>
              {language === 'en' && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                </span>
              )}
            </motion.button>

            {/* Hebrew option */}
            <motion.button
              onClick={() => switchLanguage('he')}
              whileTap={{ scale: 0.97 }}
              className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all duration-250 text-right ${
                language === 'he'
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-600 border-transparent shadow-xl shadow-indigo-300/50 text-white'
                  : 'bg-white/80 border-gray-200 text-gray-500 hover:border-violet-300 hover:bg-white'
              }`}
            >
              <span className="text-2xl leading-none">📖</span>
              <div className="leading-tight text-right flex-1">
                <p className={`text-sm font-black tracking-tight ${language === 'he' ? 'text-white' : 'text-gray-800'}`}>
                  עברית
                </p>
                <p className={`text-[11px] font-semibold mt-0.5 ${language === 'he' ? 'text-white/75' : 'text-gray-400'}`}>
                  מילה &larr; הגדרה &nbsp;·&nbsp; {language === 'he' ? totalWords.toLocaleString() : '1,703'} מילים
                </p>
              </div>
              {language === 'he' && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-white" />
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ג"€ג"€ Unit grid ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ */}
        <div className="grid grid-cols-2 landscape:grid-cols-5 md:grid-cols-3 lg:grid-cols-5 lg:flex-1 lg:min-h-0 lg:grid-rows-2 gap-2 sm:gap-3">
          {availableUnits.map((unit, idx) => {
            const { learned, total, percent } = getUnitData(unit);
            const started   = learned > 0;
            const completed = percent >= 100;

            const btnLabel  = completed ? `חזרה ${unit}` : started ? `המשך ${unit}` : `התחל ${unit}`;
            const numColor  = completed
              ? 'text-emerald-500'
              : started
              ? 'text-violet-600'
              : 'text-gray-400';
            const barGrad   = completed
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
              : 'bg-gradient-to-r from-violet-500 to-indigo-600';
            const btnClass  = completed
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-sm shadow-emerald-200/60'
              : started
              ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-sm shadow-indigo-200/60'
              : 'bg-white border-2 border-violet-300 text-violet-500';

            return (
              <motion.div
                key={unit}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="group lg:h-full"
              >
                <button
                  onClick={() => navigate(`/unit/${unit}`)}
                  className="w-full lg:h-full text-left flex flex-col gap-1.5 p-3 sm:p-4
                             bg-white/90 backdrop-blur-xl
                             border border-gray-200/70
                             rounded-[22px] overflow-visible
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
                      className={`text-[32px] landscape:text-[22px] sm:text-[40px] md:text-[52px] font-black leading-tight tracking-tighter ${numColor}`}
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
                                text-sm font-black uppercase tracking-[0.12em]
                                ${btnClass}
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
