import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, Moon, Sun, ShieldCheck, Volume2, VolumeX, Trophy, Menu, Bell, BellOff, Accessibility, Share2 } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { progressAPI } from '../api/progress';
import { reviewAPI } from '../api/review';
import { customWordsAPI } from '../api/customWords';
import { subscribeToPush } from '../api/push';
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
  const [myWordsStats, setMyWordsStats] = useState({ total: 0, learned: 0, percent: 0 });
  const [dailyDueCount, setDailyDueCount] = useState(null); // null = loading
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [notifEnabled, setNotifEnabled] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted'
  );

  const handleEnableNotifications = async () => {
    try {
      await subscribeToPush();
      setNotifEnabled(true);
    } catch (err) {
      console.warn('[Push]', err.message);
    }
  };

  // Auto-prompt for notification permission on first visit
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      handleEnableNotifications();
    }
  }, []);

  useEffect(() => {
    progressAPI.getUnitStats(language)
      .then(setUnitStats)
      .catch((err) => console.error('Failed to load unit stats:', err));
    progressAPI.getUserStats()
      .then(setUserStats)
      .catch((err) => console.error('Failed to load user stats:', err));
    customWordsAPI.getStats(language)
      .then(setMyWordsStats)
      .catch((err) => console.error('Failed to load my-words stats:', err));
    reviewAPI.getDailyCount(language)
      .then((data) => setDailyDueCount(data.count ?? 0))
      .catch(() => setDailyDueCount(0));
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
  const regularUnits = availableUnits.filter(u => u <= 10);
  const extraUnits   = availableUnits.filter(u => u > 10);

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
    <div className="h-[100dvh] flex flex-col relative bg-gray-50">

      {/* ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• HEADER ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג•ג• */}
      <div className="shrink-0 z-20 sticky top-0 bg-gray-50 px-4 sm:px-5 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
        <div className="max-w-6xl mx-auto flex flex-wrap items-stretch gap-2 sm:gap-3">

          {/* ג"€ג"€ Module 1: Greeting ג"€ג"€ */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 min-w-0 flex items-center gap-3 sm:gap-4
                       bg-white
                       border border-gray-200/70
                       rounded-[20px] sm:rounded-[24px] px-4 sm:px-5 py-2.5 sm:py-3
                       shadow-xl shadow-violet-200/30"
          >
            <img src="/logo.jpg" alt="Mila" className="hidden sm:block w-12 h-12 shrink-0 object-contain" />
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
            className="tour-streak hidden sm:flex items-center gap-2.5
                       bg-white
                       border border-gray-200/70
                       rounded-[24px] px-4 py-3
                       shadow-xl shadow-orange-200/30"
          >
            {/* Glowing fire */}
            <div className="relative shrink-0">
              <div className="absolute inset-0 bg-orange-400/30 rounded-full blur-xl scale-[1.5]" />
              <span className="relative text-[28px] leading-none drop-shadow-[0_0_8px_rgba(251,146,60,0.6)]">
                🔥
              </span>
            </div>
            <div className="leading-none">
              <p className="text-3xl font-black text-gray-900 tabular-nums">{streak}</p>
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
            className="hidden sm:flex items-center gap-3
                       bg-white
                       border border-gray-200/70
                       rounded-[24px] px-4 py-3
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
                       bg-white
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

          {/* ── Share button ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.19, ease: [0.22, 1, 0.36, 1] }}
            className="shrink-0"
          >
            <button
              onClick={async () => {
                const url = window.location.origin;
                if (navigator.share) {
                  try { await navigator.share({ title: 'PsychoApp', url }); } catch {}
                } else {
                  await navigator.clipboard.writeText(url);
                  alert('הקישור הועתק ללוח!');
                }
              }}
              className="h-full bg-gradient-to-r from-violet-500 to-indigo-600
                         rounded-[20px] sm:rounded-[24px] px-4
                         flex items-center justify-center gap-2
                         text-white font-black text-sm
                         hover:opacity-90 transition-all duration-200
                         shadow-xl shadow-violet-300/40"
            >
              <Share2 className="w-5 h-5" />
              <span className="hidden sm:inline">שתף</span>
            </button>
          </motion.div>

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
              className="h-full bg-white border border-gray-200/70
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
                             bg-white
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

                  {/* Notifications */}
                  <button
                    onClick={() => { handleEnableNotifications(); }}
                    className="w-full flex items-center gap-3 px-4 py-3
                               text-sm font-medium text-gray-700 hover:bg-gray-50
                               transition-colors duration-150 text-right"
                  >
                    {notifEnabled
                      ? <Bell className="w-4 h-4 text-violet-500 shrink-0" />
                      : <BellOff className="w-4 h-4 text-gray-300 shrink-0" />}
                    <span>{notifEnabled ? 'התראות פעילות' : 'הפעל התראות'}</span>
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

                  {/* Accessibility */}
                  <div className="h-px bg-gray-100 mx-3" />
                  <button
                    onClick={() => { setMenuOpen(false); document.getElementById('userwayAccessibilityIcon')?.click(); }}
                    className="w-full flex items-center gap-3 px-4 py-3
                               text-sm font-medium text-gray-700 hover:bg-gray-50
                               transition-colors duration-150 text-right"
                  >
                    <Accessibility className="w-4 h-4 text-blue-500 shrink-0" />
                    <span>נגישות</span>
                  </button>

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
                          bg-white border border-gray-200/70
                          rounded-xl px-2 py-2 shadow-md shadow-orange-200/20">
            <span className="text-base leading-none shrink-0">🔥</span>
            <div className="leading-none min-w-0">
              <p className="text-sm font-black text-gray-900 tabular-nums">{streak}</p>
              <p className="text-[8px] font-bold text-orange-400 uppercase mt-0.5">רצף</p>
            </div>
          </div>

          {/* Daily */}
          <div className="flex-1 flex items-center gap-1
                          bg-white border border-gray-200/70
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
                          bg-white border border-gray-200/70
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
                        bg-yellow-50
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
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto max-w-6xl mx-auto w-full px-4 sm:px-5 pt-2 pb-2 flex flex-col gap-2">

        {/* ── Daily Review banner ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0"
        >
          {dailyDueCount === null ? (
            <div className="w-full h-11 rounded-[16px] bg-white/60 animate-pulse" />
          ) : dailyDueCount > 0 ? (
            <button
              onClick={() => navigate('/daily-review')}
              className="relative w-full flex items-center gap-3 px-4 py-2.5 text-right
                         bg-gradient-to-r from-violet-600 to-indigo-600
                         rounded-[16px] overflow-hidden
                         shadow-lg shadow-indigo-300/40
                         hover:-translate-y-0.5 active:scale-[0.98]
                         transition-all duration-200 group"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0
                              translate-x-[-100%] group-hover:translate-x-[100%]
                              transition-transform duration-700 ease-in-out" />
              <div className="relative shrink-0">
                <span className="absolute inline-flex h-full w-full rounded-full bg-white/40 animate-ping" />
                <span className="relative flex h-7 w-7 items-center justify-center rounded-lg bg-white/20 text-base">📅</span>
              </div>
              <p className="flex-1 min-w-0 text-sm font-black text-white text-right">
                חזרה יומית — {dailyDueCount} מילים מחכות
              </p>
              <span className="shrink-0 px-3 py-1 rounded-lg bg-white text-violet-700 text-xs font-black">
                {dailyDueCount} מילים ←
              </span>
            </button>
          ) : (
            <div className="space-y-1.5">
              <div className="w-full flex items-center gap-2.5 px-4 py-2 text-right
                              bg-emerald-50/90 border border-emerald-200/70 rounded-[16px]">
                <span className="text-sm shrink-0">✅</span>
                <p className="text-sm font-black text-emerald-700">חזרה יומית הושלמה — כל הכבוד!</p>
              </div>
              <button
                onClick={() => navigate('/cram')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2
                           bg-gradient-to-r from-amber-500 to-orange-500
                           text-white text-sm font-black rounded-[16px]
                           shadow-md shadow-amber-200/50
                           hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                🔥 מצב חרישה — תרגול אקסטרה לחיזוק מילים קשות
              </button>
            </div>
          )}
        </motion.div>

        {/* Section title + Language selector */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.25 }}
          className="shrink-0"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 font-medium tabular-nums">
              {totalLearned.toLocaleString()} / {totalWords.toLocaleString()} נלמדו
            </p>
            <h1 className="text-sm font-black text-gray-800 tracking-tight">היחידות שלך</h1>
          </div>

          <div className="tour-language grid grid-cols-2 gap-2">
            <motion.button
              onClick={() => switchLanguage('en')}
              whileTap={{ scale: 0.97 }}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200 text-right ${
                language === 'en'
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-600 border-transparent shadow-lg shadow-indigo-300/40'
                  : 'bg-white border-gray-200 hover:border-violet-300'
              }`}
            >
              <span className="text-base leading-none shrink-0">🔤</span>
              <div className="leading-tight text-right flex-1 min-w-0">
                <p className={`text-xs font-black ${language === 'en' ? 'text-white' : 'text-gray-800'}`}>אנגלית</p>
                <p className={`text-[10px] font-medium mt-0.5 truncate ${language === 'en' ? 'text-white/75' : 'text-gray-400'}`}>
                  English ← עברית · {language === 'en' ? totalWords.toLocaleString() : '3,742'} מילים
                </p>
              </div>
              {language === 'en' && (
                <span className="shrink-0 w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white" />
                </span>
              )}
            </motion.button>

            <motion.button
              onClick={() => switchLanguage('he')}
              whileTap={{ scale: 0.97 }}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all duration-200 text-right ${
                language === 'he'
                  ? 'bg-gradient-to-br from-violet-500 to-indigo-600 border-transparent shadow-lg shadow-indigo-300/40'
                  : 'bg-white border-gray-200 hover:border-violet-300'
              }`}
            >
              <span className="text-base leading-none shrink-0">📖</span>
              <div className="leading-tight text-right flex-1 min-w-0">
                <p className={`text-xs font-black ${language === 'he' ? 'text-white' : 'text-gray-800'}`}>עברית</p>
                <p className={`text-[10px] font-medium mt-0.5 truncate ${language === 'he' ? 'text-white/75' : 'text-gray-400'}`}>
                  מילה ← הגדרה · {language === 'he' ? totalWords.toLocaleString() : '1,703'} מילים
                </p>
              </div>
              {language === 'he' && (
                <span className="shrink-0 w-4 h-4 rounded-full bg-white/25 flex items-center justify-center">
                  <span className="w-2 h-2 rounded-full bg-white" />
                </span>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ג"€ג"€ Unit grid ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ג"€ */}
        {/* ─── My Words tile ──────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="shrink-0"
        >
          <button
            onClick={() => navigate('/my-words')}
            className="w-full flex items-center gap-2.5 px-3 py-2
                       bg-white border border-gray-200/70 rounded-[14px]
                       shadow-sm hover:shadow-md hover:border-pink-200
                       hover:-translate-y-0.5 active:scale-[0.98]
                       transition-all duration-200 text-right group"
          >
            <div className="w-8 h-8 shrink-0 rounded-lg
                            bg-gradient-to-br from-rose-500 to-pink-500
                            flex items-center justify-center shadow-sm">
              <span className="text-white text-sm">📌</span>
            </div>
            <div className="flex-1 min-w-0 text-right">
              <p className="text-xs font-black text-gray-900">המילים שלי</p>
              <p className="text-[10px] font-medium text-gray-400 mt-0.5">
                {myWordsStats.total > 0
                  ? `${myWordsStats.total} מילים · ${myWordsStats.learned} נלמדו`
                  : 'הוסף מילים משלך ועקוב אחרי ההתקדמות'}
              </p>
            </div>
            {myWordsStats.total > 0 && (
              <div className="shrink-0 w-20 hidden sm:block">
                <div className="flex justify-end text-[10px] font-bold mb-0.5">
                  <span className="text-rose-500">{myWordsStats.percent}%</span>
                </div>
                <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${myWordsStats.percent}%` }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 to-pink-500"
                  />
                </div>
              </div>
            )}
            <div className="shrink-0 px-2.5 py-1 rounded-lg
                            text-[10px] font-black text-white
                            bg-gradient-to-r from-rose-500 to-pink-500">
              {myWordsStats.total === 0 ? 'התחל' : 'פתח'} ←
            </div>
          </button>
        </motion.div>

        <div className="grid grid-cols-2 landscape:grid-cols-5 md:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2">
          {regularUnits.map((unit, idx) => {
            const { learned, total, percent } = getUnitData(unit);
            const started   = learned > 0;
            const completed = percent >= 100;
            const btnLabel  = completed ? `חזרה ${unit}` : started ? `המשך ${unit}` : `התחל ${unit}`;
            const numColor  = completed ? 'text-emerald-500' : 'text-violet-600';
            const barGrad   = completed
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
              : 'bg-gradient-to-r from-violet-500 to-indigo-600';
            const btnClass  = completed
              ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white'
              : started
              ? 'bg-gradient-to-r from-violet-500 to-indigo-600 text-white'
              : 'bg-white border border-violet-300 text-violet-600';

            return (
              <motion.div
                key={unit}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.035, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="group lg:h-full"
              >
                <button
                  onClick={() => navigate(`/unit/${unit}`)}
                  className="w-full h-full flex flex-col gap-1.5 p-3 sm:p-3
                             bg-white border border-gray-200/70 rounded-[18px]
                             shadow-sm hover:shadow-md hover:border-violet-200
                             hover:-translate-y-0.5 active:scale-[0.97]
                             transition-all duration-200"
                >
                  <div className="flex items-start justify-between leading-none">
                    <span className={`text-[32px] sm:text-[28px] lg:text-[32px] font-black leading-none tabular-nums ${numColor}`}>
                      {unit}
                    </span>
                    {completed && <span className="text-sm mt-0.5">✅</span>}
                  </div>

                  <div className="-mt-1 text-right">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-tight">
                      יחידה {unit}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{total} מילים</p>
                  </div>

                  <div className="mt-auto space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-400">{learned} נלמדו</span>
                      <span className={`text-xs font-black tabular-nums
                        ${completed ? 'text-emerald-500' : 'text-violet-600'}`}>
                        {percent}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.9, delay: idx * 0.035 + 0.2, ease: 'easeOut' }}
                        className={`h-full rounded-full ${barGrad}`}
                      />
                    </div>
                  </div>

                  <div className={`w-full py-2 rounded-xl text-center
                                  text-sm font-black
                                  ${btnClass}`}>
                    {btnLabel}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {/* ── Expansion Pack units (Unit 11+) — full-width premium banner ── */}
        {extraUnits.map((unit, idx) => {
          const { learned, total, percent } = getUnitData(unit);
          const started   = learned > 0;
          const completed = percent >= 100;
          const btnLabel  = completed ? 'חזרה' : started ? 'המשך' : 'התחל';

          return (
            <motion.div
              key={unit}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38 + idx * 0.07, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0"
            >
              <button
                onClick={() => navigate(`/unit/${unit}`)}
                className="relative w-full overflow-hidden
                           flex items-center gap-4 px-4 py-3.5
                           rounded-[18px] text-right
                           bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500
                           shadow-lg shadow-orange-300/40
                           hover:-translate-y-0.5 hover:shadow-xl hover:shadow-orange-300/50
                           active:scale-[0.98] transition-all duration-200 group"
              >
                {/* Shimmer sweep */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0
                                translate-x-[-100%] group-hover:translate-x-[100%]
                                transition-transform duration-700 ease-in-out pointer-events-none" />

                {/* Icon badge */}
                <div className="shrink-0 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm
                                flex flex-col items-center justify-center shadow-inner">
                  <span className="text-xl leading-none">✨</span>
                  <span className="text-[10px] font-black text-white/90 leading-none mt-0.5">{unit}</span>
                </div>

                {/* Text block */}
                <div className="flex-1 min-w-0 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-[10px] font-black text-white/70 uppercase tracking-widest">EXPANSION PACK</span>
                    <span className="text-xs font-black text-white bg-white/20 px-2 py-0.5 rounded-full">חדש</span>
                  </div>
                  <p className="text-base font-black text-white leading-tight">מילים נוספות</p>
                  <p className="text-xs font-medium text-white/75 mt-0.5">{total} מילים · {learned} נלמדו</p>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden w-full">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 1.0, delay: 0.5, ease: 'easeOut' }}
                      className="h-full rounded-full bg-white/80"
                    />
                  </div>
                </div>

                {/* Right: percent + CTA */}
                <div className="shrink-0 flex flex-col items-center gap-2">
                  <p className="text-2xl font-black text-white tabular-nums leading-none">{percent}%</p>
                  <div className="px-4 py-1.5 bg-white text-orange-600 rounded-xl text-xs font-black
                                  shadow-md shadow-black/10">
                    {btnLabel} ←
                  </div>
                </div>
              </button>
            </motion.div>
          );
        })}
      </main>
    </div>
  );
};

export default Dashboard;
