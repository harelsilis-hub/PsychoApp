import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CheckCircle, XCircle, Zap, RotateCcw, BookOpen, Flag } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewAPI } from '../api/review';
import { progressAPI } from '../api/progress';
import { useLanguage } from '../context/LanguageContext';

const UNKNOWNS_TARGET = 15;

const FilterMode = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const unitNum = parseInt(id, 10);
  const { language } = useLanguage();

  // Words stored as a queue — we shift from the front
  const [queue, setQueue] = useState([]);
  const [unknowns, setUnknowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exitDir, setExitDir] = useState(null);       // 'left' | 'right' — drives fly-off anim
  const [isFlipped, setIsFlipped] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [autoRedirecting, setAutoRedirecting] = useState(false);
  const [flagToast, setFlagToast] = useState(false);

  // Ref-based gate: prevents double-fire without causing re-renders that lock the UI
  const swipingRef = useRef(false);

  // Latest unknowns for the redirect closure
  const unknownsRef = useRef([]);
  useEffect(() => { unknownsRef.current = unknowns; }, [unknowns]);

  // Gate the redirect so it fires exactly once
  const redirectFiredRef = useRef(false);

  useEffect(() => {
    reviewAPI.getFilterWords(unitNum, language)
      .then((data) => {
        setQueue(data.words || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [unitNum, language]);

  // Once 10 unknowns are collected, show toast then navigate
  useEffect(() => {
    if (unknowns.length >= UNKNOWNS_TARGET && !redirectFiredRef.current) {
      redirectFiredRef.current = true;
      setAutoRedirecting(true);
      setTimeout(() => {
        navigate(`/unit/${unitNum}/review`, { state: { words: unknownsRef.current } });
      }, 1800);
    }
  }, [unknowns.length, navigate, unitNum]);

  const currentWord = queue[0] ?? null;
  const remaining   = queue.length;

  const handleDragEnd = (_, info) => {
    if (swipingRef.current || !currentWord || autoRedirecting) return;
    if (info.offset.x < -80 || info.velocity.x < -500) {
      handleChoice(false);
    } else if (info.offset.x > 80 || info.velocity.x > 500) {
      handleChoice(true);
    }
  };

  const handleFlag = async (e) => {
    e.stopPropagation();
    if (!currentWord || flagToast) return;
    try {
      await reviewAPI.flagWord(currentWord.word_id);
      setFlagToast(true);
      setTimeout(() => setFlagToast(false), 2500);
    } catch (err) {
      console.error('Flag failed:', err);
    }
  };

  const handleChoice = (isKnown) => {
    if (swipingRef.current || !currentWord || autoRedirecting) return;
    swipingRef.current = true;

    // 1. Optimistic update — collect unknowns before the server responds
    if (!isKnown) {
      setUnknowns((prev) => [...prev, { ...currentWord, is_new: true }]);
    }

    // 2. Start the fly-off animation immediately
    setExitDir(isKnown ? 'right' : 'left');

    // 3. Fire API in the background — no await, never blocks the UI
    progressAPI.triageWord(currentWord.word_id, isKnown)
      .catch((err) => console.error('Background triage failed:', err));

    // 4. After the card animation completes (~180ms), pop it and reset
    setTimeout(() => {
      setQueue((prev) => prev.slice(1));
      setExitDir(null);
      setIsFlipped(false);
      setFlagToast(false);
      swipingRef.current = false;
    }, 180);
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">טוען מילים...</p>
        </div>
      </div>
    );
  }

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await progressAPI.resetUnitProgress(unitNum);
      const data = await reviewAPI.getFilterWords(unitNum);
      setQueue(data.words || []);
      setUnknowns([]);
      redirectFiredRef.current = false;
    } catch (err) {
      console.error('Reset failed:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // ── No words / all mastered ────────────────────────────────
  if (!loading && queue.length === 0 && unknowns.length === 0 && !autoRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">היחידה הושלמה!</h2>
          <p className="text-gray-500 mb-6">
            כבר שלטת בכל המילים ביחידה {unitNum}. נסה את הבוחן לביסוס הידע.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/unit/${unitNum}`)}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold"
            >
              חזרה ליחידה
            </button>
            <button
              onClick={handleReset}
              disabled={isResetting}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {isResetting ? 'מאפס...' : 'אפס וסנן מחדש'}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── All words exhausted with some unknowns (< 10) ──────────
  if (!loading && queue.length === 0 && !autoRedirecting) {
    const count = unknowns.length;
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">{count > 0 ? '📚' : '🌟'}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {count > 0 ? `${count} מילים לחזרה` : 'כל המילים ידועות!'}
          </h2>
          <p className="text-gray-500 mb-6">
            {count > 0
              ? `סימנת ${count} מילה${count > 1 ? '' : ''} לא ידועה. עבור לסשן החזרה ללמוד אותן.`
              : `ידעת כל מילה ביחידה ${unitNum}. מדהים!`}
          </p>
          <div className="space-y-3">
            {count > 0 && (
              <button
                onClick={() => navigate(`/unit/${unitNum}/review`, { state: { words: unknowns } })}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold"
              >
                עבור לסשן החזרה
              </button>
            )}
            <button
              onClick={() => navigate(`/unit/${unitNum}`)}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              חזרה ליחידה
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPct = (unknowns.length / UNKNOWNS_TARGET) * 100;

  // ── Main filter UI ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Auto-redirect toast overlay ─────────────────────── */}
      <AnimatePresence>
        {autoRedirecting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.75, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              className="bg-white rounded-3xl shadow-2xl p-8 mx-4 max-w-xs w-full text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.12, type: 'spring', stiffness: 300, damping: 18 }}
                className="w-16 h-16 bg-gradient-to-br from-violet-500 to-indigo-600
                           rounded-full flex items-center justify-center mx-auto mb-5
                           shadow-lg shadow-indigo-300/60"
              >
                <BookOpen className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-xl font-black text-gray-900 mb-1.5">
                נאספו 10 מילים!
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                עובר לסשן החזרה...
              </p>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.6, ease: 'linear' }}
                  className="h-full bg-gradient-to-r from-violet-500 to-indigo-600 rounded-full"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/unit/${unitNum}`)}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold text-gray-800 flex-1">סינון מילים — יחידה {unitNum}</span>
          <span className="text-sm text-gray-500">{remaining} נותרו</span>
        </div>

        {/* "Unknowns collected" progress bar */}
        <div className="max-w-xl mx-auto px-4 pb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>מילים לא ידועות שנאספו</span>
            <span className="font-semibold text-red-500">{unknowns.length} / {UNKNOWNS_TARGET}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.3 }}
              className="h-full bg-gradient-to-r from-red-400 to-orange-400 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-sm w-full">
          <AnimatePresence>
            {currentWord && (
              <motion.div
                key={currentWord.word_id}
                drag={!autoRedirecting ? 'x' : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={handleDragEnd}
                initial={{ opacity: 0, scale: 0.9, y: 12 }}
                animate={{
                  opacity: exitDir ? 0 : 1,
                  scale:   exitDir ? 0.85 : 1,
                  x:       exitDir === 'left' ? -320 : exitDir === 'right' ? 320 : 0,
                  rotate:  exitDir === 'left' ? -12   : exitDir === 'right' ? 12  : 0,
                }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="text-center touch-none"
              >
                {/* ── Flip card ── */}
                <div
                  className="relative cursor-pointer mb-4"
                  style={{ perspective: '1000px', minHeight: '220px' }}
                  onClick={() => !exitDir && setIsFlipped((f) => !f)}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.45, type: 'spring', stiffness: 130 }}
                    style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: '220px' }}
                  >
                    {/* Front — English */}
                    <div
                      className="absolute inset-0 bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">
                        האם אתה מכיר מילה זו?
                      </div>
                      <div className="text-3xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        {currentWord.english}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <RotateCcw className="w-4 h-4" />
                        הקש לחשיפת התרגום
                      </div>
                    </div>

                    {/* Back — Hebrew */}
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center"
                      style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-widest text-white/60 mb-5">
                        עברית
                      </div>
                      <div className="text-3xl sm:text-5xl font-bold text-white mb-6 leading-tight" dir="rtl">
                        {currentWord.hebrew}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-white/60">
                        <RotateCcw className="w-4 h-4" />
                        הקש לחזרה
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Swipe hint labels */}
                <div dir="ltr" className="flex justify-between text-xs text-gray-300 font-medium mb-4 px-2">
                  <span className="text-red-300">← לא יודע</span>
                  <span className="text-green-300">יודע →</span>
                </div>

                {/* Buttons — Know It first so it appears on the RIGHT in RTL */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleChoice(true)}
                    className="bg-gradient-to-br from-green-500 to-emerald-600 text-white py-3.5 sm:py-5 rounded-2xl
                               font-semibold text-base hover:shadow-lg hover:-translate-y-0.5
                               transform transition-all active:scale-95"
                  >
                    <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                    יודע
                  </button>
                  <button
                    onClick={() => handleChoice(false)}
                    className="bg-gradient-to-br from-red-500 to-rose-600 text-white py-3.5 sm:py-5 rounded-2xl
                               font-semibold text-base hover:shadow-lg hover:-translate-y-0.5
                               transform transition-all active:scale-95"
                  >
                    <XCircle className="w-6 h-6 mx-auto mb-1" />
                    לא יודע
                  </button>
                </div>

                {/* Report mistake */}
                <div className="flex justify-center pt-1">
                  <button
                    onClick={handleFlag}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                      flagToast
                        ? 'bg-red-50 text-red-500 font-medium'
                        : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    {flagToast ? 'דווח — תודה!' : 'דיווח על שגיאה'}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default FilterMode;
