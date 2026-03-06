import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, Trash2, BookOpen, Brain, X, Bookmark } from 'lucide-react';
import SoundToggle from '../components/SoundToggle';
import { useNavigate } from 'react-router-dom';
import { customWordsAPI } from '../api/customWords';

const STATUS_LABEL = {
  Learning: { text: 'לומד',   color: 'bg-amber-100 text-amber-700' },
  Review:   { text: 'חזרה',   color: 'bg-violet-100 text-violet-700' },
  Mastered: { text: 'שולט',   color: 'bg-emerald-100 text-emerald-700' },
  New:      { text: 'חדש',    color: 'bg-gray-100 text-gray-500' },
};

const MyWordsDetail = () => {
  const navigate = useNavigate();
  const [words, setWords]         = useState([]);
  const [stats, setStats]         = useState({ total: 0, learned: 0, percent: 0 });
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newWord, setNewWord]     = useState({ english: '', hebrew: '' });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const loadData = async () => {
    try {
      const [wordsData, statsData] = await Promise.all([
        customWordsAPI.listWords(),
        customWordsAPI.getStats(),
      ]);
      setWords(wordsData.words);
      setStats(statsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAdd = async () => {
    if (!newWord.english.trim() || !newWord.hebrew.trim()) {
      setError('יש למלא את שני השדות');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const created = await customWordsAPI.createWord(newWord.english.trim(), newWord.hebrew.trim());
      setWords((prev) => [created, ...prev]);
      setStats((prev) => ({ ...prev, total: prev.total + 1 }));
      setNewWord({ english: '', hebrew: '' });
      setShowModal(false);
    } catch (e) {
      setError('שגיאה בשמירה, נסה שוב');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (wordId) => {
    try {
      await customWordsAPI.deleteWord(wordId);
      const deleted = words.find((w) => w.id === wordId);
      setWords((prev) => prev.filter((w) => w.id !== wordId));
      if (deleted && (deleted.status === 'Review' || deleted.status === 'Mastered')) {
        setStats((prev) => ({ ...prev, total: prev.total - 1, learned: prev.learned - 1 }));
      } else {
        setStats((prev) => ({ ...prev, total: prev.total - 1 }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const completed = stats.percent >= 100 && stats.total > 0;
  const barGrad   = completed
    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
    : 'bg-gradient-to-r from-rose-500 to-pink-500';

  const actions = [
    {
      icon:       <BookOpen className="w-5 h-5 text-white" />,
      iconBg:     'bg-gradient-to-br from-violet-500 to-indigo-600',
      iconShadow: 'shadow-indigo-300/60',
      topBar:     'from-violet-500 to-indigo-600',
      title:      'שינון ולמידה',
      subtitle:   'חזור על המילים שלך.',
      detail:     'למידה ממוקדת בעזרת כרטיסיות: קרא, הפוך, ושנן את המילים שהוספת עד שהכל יושב טוב.',
      cta:        'התחל שינון',
      btnGrad:    'from-violet-500 to-indigo-600',
      btnShadow:  'shadow-indigo-200/60',
      onClick:    () => navigate('/unit/my-words/review'),
      disabled:   stats.total === 0,
    },
    {
      icon:       <Brain className="w-5 h-5 text-white" />,
      iconBg:     'bg-gradient-to-br from-emerald-400 to-teal-500',
      iconShadow: 'shadow-emerald-300/60',
      topBar:     'from-emerald-400 to-teal-500',
      title:      'בוחן ומעקב',
      subtitle:   'רגע האמת.',
      detail:     'בחן את עצמך על המילים שכבר למדת. רק מילים שעברו שינון יופיעו בבוחן.',
      cta:        'התחל בוחן',
      btnGrad:    'from-emerald-400 to-teal-500',
      btnShadow:  'shadow-emerald-200/60',
      onClick:    () => navigate('/unit/my-words/quiz'),
      disabled:   stats.learned === 0,
    },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col relative" style={{ background: 'transparent' }}>

      {/* ── Add Word Modal ─────────────────────────────────── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 text-right"
            >
              <div className="flex justify-between items-start mb-5">
                <button
                  onClick={() => { setShowModal(false); setError(''); setNewWord({ english: '', hebrew: '' }); }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-500
                                flex items-center justify-center shadow-lg shadow-pink-200/60">
                  <Plus className="w-6 h-6 text-white" />
                </div>
              </div>

              <h2 className="text-xl font-black text-gray-900 mb-1">הוסף מילה חדשה</h2>
              <p className="text-sm text-gray-500 mb-5">הוסף מילה והגדרה שלה ללמידה.</p>

              <div className="space-y-3 mb-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                    מילה / מושג
                  </label>
                  <input
                    type="text"
                    value={newWord.english}
                    onChange={(e) => setNewWord((p) => ({ ...p, english: e.target.value }))}
                    placeholder="לדוגמה: ephemeral"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200
                               focus:border-rose-400 focus:outline-none
                               text-gray-900 placeholder-gray-400 text-sm font-medium
                               bg-gray-50 focus:bg-white transition-all"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">
                    הגדרה / תרגום
                  </label>
                  <input
                    type="text"
                    value={newWord.hebrew}
                    onChange={(e) => setNewWord((p) => ({ ...p, hebrew: e.target.value }))}
                    placeholder="לדוגמה: ארעי, חולף"
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200
                               focus:border-rose-400 focus:outline-none
                               text-gray-900 placeholder-gray-400 text-sm font-medium
                               bg-gray-50 focus:bg-white transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500 font-medium mb-3 text-right">{error}</p>
              )}

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={handleAdd}
                  disabled={saving}
                  className="w-full py-3.5 rounded-2xl font-black text-white text-sm
                             bg-gradient-to-r from-rose-500 to-pink-500
                             shadow-md shadow-pink-200/60
                             hover:shadow-xl transition-all duration-200
                             disabled:opacity-60"
                >
                  {saving ? 'שומר...' : 'הוסף מילה ←'}
                </button>
                <button
                  onClick={() => { setShowModal(false); setError(''); setNewWord({ english: '', hebrew: '' }); }}
                  className="w-full py-3 rounded-2xl font-semibold text-sm text-gray-600
                             bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="relative z-20 shrink-0 sticky top-0 px-5 pt-4 pb-3">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto
                     bg-white/90 backdrop-blur-2xl border border-gray-200/70
                     rounded-2xl px-4 py-3
                     shadow-xl shadow-gray-300/30
                     flex items-center gap-4"
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 shrink-0 text-gray-700 hover:text-gray-900 transition-colors duration-200"
          >
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm font-bold">יחידות</span>
          </button>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-pink-500
                            flex items-center justify-center shadow-md shadow-pink-400/40">
              <Bookmark className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-gray-900">המילים שלי</p>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">{stats.total} מילים</p>
            </div>
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-5 shrink-0">
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 tabular-nums leading-none">{stats.learned}</p>
              <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wide mt-0.5">נלמד</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 tabular-nums leading-none">{stats.total - stats.learned}</p>
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mt-0.5">נותר</p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" />

          <div className="hidden sm:block shrink-0 w-36">
            <div className="flex justify-between text-[10px] font-bold mb-1.5">
              <span className="text-gray-600 uppercase tracking-wide">התקדמות</span>
              <span className={`tabular-nums ${completed ? 'text-emerald-500' : 'text-rose-500'}`}>
                {stats.percent}%
              </span>
            </div>
            <div className="h-[6px] bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.percent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${barGrad}`}
              />
            </div>
          </div>

          <SoundToggle className="shrink-0" />
        </motion.div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 px-5 pt-4 pb-8 flex flex-col">
        <div className="max-w-5xl mx-auto w-full flex flex-col gap-5">

          {/* Action cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {actions.map((action, i) => (
              <motion.button
                key={action.title}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 + i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                onClick={action.disabled ? undefined : action.onClick}
                disabled={action.disabled}
                className={`flex flex-col text-right w-full
                           bg-white/90 backdrop-blur-xl border border-gray-200/70
                           rounded-[24px] overflow-hidden
                           shadow-lg shadow-gray-200/60
                           transition-all duration-300 group
                           ${action.disabled
                             ? 'opacity-50 cursor-not-allowed'
                             : 'hover:shadow-2xl hover:shadow-gray-300/60 hover:-translate-y-1.5 hover:bg-white active:scale-[0.98]'
                           }`}
              >
                <div className={`h-[5px] shrink-0 bg-gradient-to-r ${action.topBar}`} />
                <div className="flex flex-col gap-3 p-5 flex-1">
                  <div className="flex items-center gap-3.5">
                    <div className={`w-11 h-11 shrink-0 rounded-2xl ${action.iconBg}
                                     flex items-center justify-center
                                     shadow-lg ${action.iconShadow}
                                     group-hover:scale-110 transition-transform duration-300`}>
                      {action.icon}
                    </div>
                    <div className="leading-tight">
                      <h3 className="text-[16px] font-black text-gray-900">{action.title}</h3>
                      <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{action.subtitle}</p>
                    </div>
                  </div>
                  <p className="text-[12.5px] text-gray-600 leading-relaxed flex-1">{action.detail}</p>
                  <div className={`w-full py-2.5 rounded-2xl text-center
                                   text-[11px] font-black text-white uppercase tracking-[0.12em]
                                   bg-gradient-to-r ${action.btnGrad}
                                   shadow-md ${action.btnShadow}
                                   group-hover:shadow-xl transition-shadow duration-300`}>
                    {action.cta} ←
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {/* Words list section */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="bg-white/90 backdrop-blur-xl border border-gray-200/70
                       rounded-[24px] shadow-lg shadow-gray-200/40 overflow-hidden"
          >
            {/* List header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-sm font-black text-gray-900">רשימת המילים</h2>
                <p className="text-[11px] font-medium text-gray-500 mt-0.5">
                  {stats.total} מילים · {stats.learned} נלמדו
                </p>
              </div>
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                           bg-gradient-to-r from-rose-500 to-pink-500
                           text-white text-xs font-black uppercase tracking-wider
                           shadow-md shadow-pink-200/60
                           hover:shadow-lg transition-all duration-200 active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                הוסף מילה
              </button>
            </div>

            {/* List body */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-rose-400 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : words.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-6">
                <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
                  <Bookmark className="w-8 h-8 text-rose-300" />
                </div>
                <p className="text-gray-700 font-bold text-base mb-1">אין מילים עדיין</p>
                <p className="text-gray-400 text-sm mb-5">הוסף מילים שאתה רוצה ללמוד ותעקוב אחרי ההתקדמות שלך.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-2xl
                             bg-gradient-to-r from-rose-500 to-pink-500
                             text-white text-sm font-black shadow-md shadow-pink-200/60"
                >
                  <Plus className="w-4 h-4" />
                  הוסף מילה ראשונה
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                <AnimatePresence>
                  {words.map((word, idx) => {
                    const badge = STATUS_LABEL[word.status] ?? STATUS_LABEL.New;
                    return (
                      <motion.div
                        key={word.id}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        transition={{ delay: idx * 0.02, duration: 0.25 }}
                        className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{word.english_word}</p>
                          <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{word.hebrew_translation}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full ${badge.color}`}>
                          {badge.text}
                        </span>
                        <button
                          onClick={() => handleDelete(word.id)}
                          className="shrink-0 text-gray-300 hover:text-red-400
                                     opacity-0 group-hover:opacity-100
                                     transition-all duration-200 p-1 rounded-lg hover:bg-red-50"
                          title="מחק מילה"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
};

export default MyWordsDetail;
