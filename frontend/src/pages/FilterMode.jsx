import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, Zap, RotateCcw } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewAPI } from '../api/review';
import { progressAPI } from '../api/progress';

const UNKNOWNS_TARGET = 10;

const FilterMode = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const unitNum = parseInt(id, 10);

  const [words, setWords] = useState([]);
  const [index, setIndex] = useState(0);
  const [unknowns, setUnknowns] = useState([]);   // collected "don't know" words
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [slideDir, setSlideDir] = useState(null); // 'left' | 'right'
  const [done, setDone] = useState(false);         // all words exhausted without 10 unknowns
  const [isFlipped, setIsFlipped] = useState(false); // show Hebrew translation

  useEffect(() => {
    reviewAPI.getFilterWords(unitNum)
      .then((data) => {
        setWords(data.words || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [unitNum]);

  // Once 10 unknowns are collected, auto-redirect
  useEffect(() => {
    if (unknowns.length >= UNKNOWNS_TARGET) {
      navigate(`/unit/${unitNum}/review`, { state: { words: unknowns } });
    }
  }, [unknowns, navigate, unitNum]);

  const currentWord = words[index];
  const remaining = words.length - index;

  const handleChoice = async (isKnown) => {
    if (isSubmitting || !currentWord) return;
    setIsSubmitting(true);
    setSlideDir(isKnown ? 'right' : 'left');

    try {
      // Save to backend: Known → MASTERED, Unknown → LEARNING
      await progressAPI.triageWord(currentWord.word_id, isKnown);

      await new Promise((r) => setTimeout(r, 320));

      setIsFlipped(false);

      if (!isKnown) {
        setUnknowns((prev) => [...prev, { ...currentWord, is_new: true }]);
      }

      const nextIndex = index + 1;
      if (nextIndex >= words.length) {
        setDone(true);
      } else {
        setIndex(nextIndex);
      }
    } catch (err) {
      console.error('Failed to save choice:', err);
    } finally {
      setIsSubmitting(false);
      setSlideDir(null);
    }
  };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading words…</p>
        </div>
      </div>
    );
  }

  // ── No words / all mastered ────────────────────────────────
  if (!loading && words.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unit Complete!</h2>
          <p className="text-gray-500 mb-6">
            You've already mastered all words in Unit {unitNum}. Try the quiz to consolidate your knowledge.
          </p>
          <button
            onClick={() => navigate(`/unit/${unitNum}`)}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold"
          >
            Back to Unit
          </button>
        </motion.div>
      </div>
    );
  }

  // ── All words exhausted, fewer than 10 unknowns ────────────
  if (done || (!currentWord && !loading)) {
    const count = unknowns.length;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">{count > 0 ? '📚' : '🌟'}</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {count > 0 ? `${count} word${count > 1 ? 's' : ''} to review` : 'All words known!'}
          </h2>
          <p className="text-gray-500 mb-6">
            {count > 0
              ? `You flagged ${count} unknown word${count > 1 ? 's' : ''}. Head to Review Session to study them.`
              : `You knew every word in Unit ${unitNum}. Amazing!`}
          </p>
          <div className="space-y-3">
            {count > 0 && (
              <button
                onClick={() => navigate(`/unit/${unitNum}/review`, { state: { words: unknowns } })}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold"
              >
                Go to Review Session
              </button>
            )}
            <button
              onClick={() => navigate(`/unit/${unitNum}`)}
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Back to Unit
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  const progressPct = (unknowns.length / UNKNOWNS_TARGET) * 100;

  // ── Main filter UI ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/unit/${unitNum}`)}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Zap className="w-4 h-4 text-yellow-500" />
          <span className="font-semibold text-gray-800 flex-1">Filter Words — Unit {unitNum}</span>
          <span className="text-sm text-gray-500">{remaining} left</span>
        </div>

        {/* "Unknowns collected" progress bar */}
        <div className="max-w-xl mx-auto px-4 pb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Unknown words collected</span>
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
          <AnimatePresence mode="wait">
            {currentWord && (
              <motion.div
                key={currentWord.word_id}
                initial={{ opacity: 0, scale: 0.85, y: 20 }}
                animate={{
                  opacity: slideDir ? 0 : 1,
                  scale: slideDir ? 0.8 : 1,
                  x: slideDir === 'left' ? -300 : slideDir === 'right' ? 300 : 0,
                  rotate: slideDir === 'left' ? -15 : slideDir === 'right' ? 15 : 0,
                }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ duration: 0.3, type: 'spring', stiffness: 200 }}
                className="text-center"
              >
                {/* ── Flip card ── */}
                <div
                  className="relative cursor-pointer mb-4"
                  style={{ perspective: '1000px', minHeight: '220px' }}
                  onClick={() => !isSubmitting && setIsFlipped((f) => !f)}
                >
                  <motion.div
                    animate={{ rotateY: isFlipped ? 180 : 0 }}
                    transition={{ duration: 0.5, type: 'spring', stiffness: 120 }}
                    style={{ transformStyle: 'preserve-3d', position: 'relative', minHeight: '220px' }}
                  >
                    {/* Front — English */}
                    <div
                      className="absolute inset-0 bg-white rounded-3xl shadow-2xl p-8 flex flex-col items-center justify-center"
                      style={{ backfaceVisibility: 'hidden' }}
                    >
                      <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-5">
                        Do you know this word?
                      </div>
                      <div className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
                        {currentWord.english}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-400">
                        <RotateCcw className="w-4 h-4" />
                        Tap to reveal translation
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
                      <div className="text-5xl font-bold text-white mb-6 leading-tight" dir="rtl">
                        {currentWord.hebrew}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-white/60">
                        <RotateCcw className="w-4 h-4" />
                        Tap to flip back
                      </div>
                    </div>
                  </motion.div>
                </div>

                {/* Swipe hint labels */}
                <div className="flex justify-between text-xs text-gray-300 font-medium mb-4 px-2">
                  <span className="text-red-300">← Don't Know</span>
                  <span className="text-green-300">Know It →</span>
                </div>

                {/* Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleChoice(false)}
                    disabled={isSubmitting}
                    className="bg-gradient-to-br from-red-500 to-rose-600 text-white py-5 rounded-2xl
                               font-semibold text-base hover:shadow-lg hover:-translate-y-0.5
                               transform transition-all disabled:opacity-50 active:scale-95"
                  >
                    <XCircle className="w-6 h-6 mx-auto mb-1" />
                    I Don't Know
                  </button>
                  <button
                    onClick={() => handleChoice(true)}
                    disabled={isSubmitting}
                    className="bg-gradient-to-br from-green-500 to-emerald-600 text-white py-5 rounded-2xl
                               font-semibold text-base hover:shadow-lg hover:-translate-y-0.5
                               transform transition-all disabled:opacity-50 active:scale-95"
                  >
                    <CheckCircle className="w-6 h-6 mx-auto mb-1" />
                    I Know It
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
