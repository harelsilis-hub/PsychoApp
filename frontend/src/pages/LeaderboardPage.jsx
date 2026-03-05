import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Trophy, Flame, Star } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { leaderboardAPI } from '../api/leaderboard';
import { useAuth } from '../context/AuthContext';

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

export function getLevelInfo(xp) {
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

// ── Podium card ────────────────────────────────────────────────────────────────
const PodiumCard = ({ entry, position, isMe }) => {
  const medals = ['🥇', '🥈', '🥉'];
  const heights = ['h-24', 'h-16', 'h-12'];
  const sizes = ['text-4xl', 'text-3xl', 'text-2xl'];

  return (
    <div className={`flex flex-col items-center gap-2 ${position === 0 ? '-mt-4' : ''}`}>
      <div className={`relative ${isMe ? 'ring-2 ring-violet-400 rounded-full' : ''}`}>
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center font-black text-white shadow-lg ${sizes[position]}`}
          style={{ background: `linear-gradient(135deg, ${entry.level_color}aa, ${entry.level_color})` }}
        >
          {(entry.display_name?.[0] || '?').toUpperCase()}
        </div>
        <span className="absolute -bottom-1 -right-1 text-xl">{medals[position]}</span>
      </div>
      <p className={`font-black text-gray-900 text-sm text-center max-w-[80px] truncate ${isMe ? 'text-violet-600' : ''}`}>
        {entry.display_name}
      </p>
      <p className="text-xs font-bold" style={{ color: entry.level_color }}>{entry.level_title}</p>
      <p className="text-xs font-semibold text-gray-500 tabular-nums">
        {(entry.weekly_xp ?? entry.xp ?? 0).toLocaleString()} XP
      </p>
      <div className={`w-full ${heights[position]} bg-gradient-to-t from-gray-200 to-gray-100 rounded-t-lg flex items-end justify-center pb-1`}>
        <span className="text-2xl font-black text-gray-400">{position + 1}</span>
      </div>
    </div>
  );
};

// ── Row ────────────────────────────────────────────────────────────────────────
const LeaderRow = ({ entry, isMe, type }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    className={`flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
      isMe
        ? 'bg-violet-50 border-violet-200'
        : 'bg-white/70 border-gray-100 hover:bg-white'
    }`}
  >
    {/* Rank badge */}
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
      isMe ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600'
    }`}>
      {entry.rank}
    </div>

    {/* Avatar */}
    <div
      className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm shrink-0 shadow"
      style={{ background: `linear-gradient(135deg, ${entry.level_color}99, ${entry.level_color})` }}
    >
      {(entry.display_name?.[0] || '?').toUpperCase()}
    </div>

    {/* Name + level */}
    <div className="flex-1 min-w-0">
      <p className={`font-bold text-sm truncate ${isMe ? 'text-violet-700' : 'text-gray-900'}`}>
        {entry.display_name} {isMe && <span className="text-xs font-semibold text-violet-400">(אתה)</span>}
      </p>
      <p className="text-xs font-semibold" style={{ color: entry.level_color }}>{entry.level_title}</p>
    </div>

    {/* XP + streak */}
    <div className="text-right shrink-0">
      <p className="text-sm font-black text-gray-800 tabular-nums">
        {(type === 'weekly' ? (entry.weekly_xp ?? 0) : entry.xp).toLocaleString()}
        <span className="text-xs font-semibold text-gray-400 ml-1">XP</span>
      </p>
      {entry.streak > 0 && (
        <p className="text-xs text-orange-400 font-semibold">🔥 {entry.streak}</p>
      )}
    </div>
  </motion.div>
);

// ── Main component ─────────────────────────────────────────────────────────────
const LeaderboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [type, setType] = useState('alltime');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    leaderboardAPI.getLeaderboard(type, 20)
      .then(setData)
      .catch(() => setError('לא ניתן לטעון את לוח המובילים'))
      .finally(() => setLoading(false));
  }, [type]);

  const entries = data?.entries ?? [];
  const userEntry = data?.user_entry;
  const top3 = entries.slice(0, 3);
  const rest = entries.slice(3);
  const userInTop = entries.some((e) => e.user_id === user?.id);

  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]   // 2nd, 1st, 3rd for visual podium shape
    : top3;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <Trophy className="w-5 h-5 text-yellow-500" />
          <span className="font-black text-gray-900 flex-1">לוח המובילים</span>

          {/* Weekly / All-time toggle */}
          <div className="flex bg-gray-100 rounded-xl p-0.5 gap-0.5">
            {['alltime', 'weekly'].map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  type === t
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'alltime' ? 'כל הזמנים' : 'שבועי'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="w-12 h-12 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {error && (
          <div className="text-center py-20 text-gray-400">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <AnimatePresence mode="wait">
            <motion.div
              key={type}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Podium — only when 3+ entries */}
              {top3.length >= 3 && (
                <div className="flex items-end justify-center gap-4 mb-8 px-4">
                  {podiumOrder.map((entry, i) => {
                    const pos = [1, 0, 2][i];
                    return (
                      <PodiumCard
                        key={entry.user_id}
                        entry={entry}
                        position={pos}
                        isMe={entry.user_id === user?.id}
                      />
                    );
                  })}
                </div>
              )}

              {/* All rows: start from rank 4 if podium shown, else all */}
              {entries.length > 0 && (
                <div className="space-y-2 mb-6">
                  {(top3.length >= 3 ? rest : entries).map((entry) => (
                    <LeaderRow
                      key={entry.user_id}
                      entry={entry}
                      isMe={entry.user_id === user?.id}
                      type={type}
                    />
                  ))}
                </div>
              )}

              {entries.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <Star className="w-12 h-12 mx-auto mb-3 text-gray-200" />
                  <p className="font-semibold">עדיין אין נתונים</p>
                  <p className="text-sm mt-1">התחל ללמוד כדי להופיע כאן!</p>
                </div>
              )}

              {/* Your rank (if not in top 20) */}
              {userEntry && !userInTop && (
                <div className="mt-6 border-t border-gray-100 pt-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">הדירוג שלך</p>
                  <LeaderRow entry={userEntry} isMe type={type} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
