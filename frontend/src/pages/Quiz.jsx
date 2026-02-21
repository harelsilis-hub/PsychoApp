import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Brain, CheckCircle, XCircle, Trophy, ArrowRight } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewAPI } from '../api/review';

const QUESTIONS_PER_QUIZ = 10;

/** Shuffle an array in-place (Fisher-Yates) and return it */
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Build quiz questions.
 * primaryWords  = LEARNING words (shown first — just studied)
 * secondaryWords = REVIEW/MASTERED words (fill remaining slots)
 * distractorPool = all available words for wrong-answer options
 * Each question stores word_id so SM-2 can be updated on answer.
 */
function buildQuestions(primaryWords, secondaryWords, distractorPool) {
  const ordered = [...primaryWords, ...shuffle([...secondaryWords])];
  if (ordered.length === 0) return [];

  const pool = distractorPool.length >= 4 ? distractorPool : [...distractorPool, ...ordered];
  const questions = [];
  const take = Math.min(QUESTIONS_PER_QUIZ, ordered.length);

  for (let i = 0; i < take; i++) {
    const correct = ordered[i];

    const distractors = shuffle(
      pool.filter((w) => w.word_id !== correct.word_id && w.hebrew !== correct.hebrew)
    ).slice(0, 3);

    while (distractors.length < 3) {
      distractors.push({ word_id: -distractors.length, hebrew: '—' });
    }

    const options = shuffle([
      { hebrew: correct.hebrew, isCorrect: true },
      ...distractors.map((d) => ({ hebrew: d.hebrew, isCorrect: false })),
    ]);

    questions.push({ word_id: correct.word_id, english: correct.english, correct: correct.hebrew, options });
  }

  return questions;
}

// ─── Result screen ─────────────────────────────────────────────────────────────

const QuizResult = ({ score, total, onRetry, onBack }) => {
  const pct = Math.round((score / total) * 100);
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎯' : pct >= 50 ? '📚' : '💪';
  const msg   = pct >= 90 ? 'Outstanding!' : pct >= 70 ? 'Great work!' : pct >= 50 ? 'Good effort!' : 'Keep practising!';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
      >
        <div className="text-5xl mb-3">{emoji}</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">{msg}</h2>
        <p className="text-gray-500 mb-6">
          You scored <span className="font-bold text-purple-600">{score} / {total}</span> ({pct}%)
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-green-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-green-600">{score}</div>
            <div className="text-xs text-gray-500">Correct</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-red-500">{total - score}</div>
            <div className="text-xs text-gray-500">Incorrect</div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            <ArrowRight className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={onBack}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
          >
            Back to Unit
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Quiz ─────────────────────────────────────────────────────────────────

const Quiz = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const unitNum = parseInt(id, 10);

  const [questions, setQuestions]     = useState([]);
  const [qIndex, setQIndex]           = useState(0);
  const [selected, setSelected]       = useState(null);   // hebrew string chosen
  const [score, setScore]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [quizDone, setQuizDone]       = useState(false);
  const [noWords, setNoWords]         = useState(false);

  const loadQuiz = async () => {
    setLoading(true);
    setQuizDone(false);
    setQIndex(0);
    setScore(0);
    setSelected(null);

    try {
      // Fetch both pools in parallel
      const [filterRes, learnedRes] = await Promise.all([
        reviewAPI.getFilterWords(unitNum),   // NEW + LEARNING words
        reviewAPI.getLearnedWords(unitNum),  // REVIEW + MASTERED words
      ]);

      const allFilterWords  = filterRes.words  || [];
      const learningWords   = allFilterWords.filter((w) => w.status === 'Learning');
      const reviewedWords   = learnedRes.words || [];

      if (learningWords.length === 0 && reviewedWords.length === 0) {
        setNoWords(true);
        setLoading(false);
        return;
      }

      // LEARNING words come first, then REVIEW/MASTERED fill the remaining slots
      const distractorPool = [...allFilterWords, ...reviewedWords];
      setQuestions(buildQuestions(learningWords, reviewedWords, distractorPool));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuiz(); }, [unitNum]);

  const currentQ = questions[qIndex];
  const isAnswered = selected !== null;

  const handleSelect = async (opt) => {
    if (isAnswered) return;
    setSelected(opt.hebrew);
    if (opt.isCorrect) setScore((s) => s + 1);
    // Submit to SM-2: correct → quality 4 (good recall), wrong → quality 1 (failed)
    try {
      await reviewAPI.submitReview(currentQ.word_id, opt.isCorrect ? 4 : 1);
    } catch (err) {
      console.error('SM-2 update failed:', err);
    }
  };

  const handleNext = () => {
    setSelected(null);
    if (qIndex + 1 >= questions.length) {
      setQuizDone(true);
    } else {
      setQIndex(qIndex + 1);
    }
  };

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Building your quiz…</p>
        </div>
      </div>
    );
  }

  // ── Not enough learned words ────────────────────────────
  if (noWords || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <Brain className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Words to Quiz Yet</h2>
          <p className="text-gray-500 mb-6">
            Use Filter Words to mark words you don't know — they'll appear here first.
            Words you progress through SM-2 reviews will also be added automatically.
          </p>
          <button
            onClick={() => navigate(`/unit/${unitNum}`)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold"
          >
            Back to Unit
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Quiz complete ───────────────────────────────────────
  if (quizDone) {
    return (
      <QuizResult
        score={score}
        total={questions.length}
        onRetry={loadQuiz}
        onBack={() => navigate(`/unit/${unitNum}`)}
      />
    );
  }

  const progressPct = (qIndex / questions.length) * 100;

  // ── Question UI ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/unit/${unitNum}`)} className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <Brain className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-gray-800 flex-1">Practice Quiz — Unit {unitNum}</span>
          <span className="text-sm text-gray-500 font-medium">
            {qIndex + 1} / {questions.length}
          </span>
        </div>
        <div className="h-1.5 bg-gray-100">
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-green-400 to-emerald-500"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              {/* Question */}
              <div className="bg-white rounded-3xl shadow-xl p-7 mb-5 text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  What is the Hebrew translation?
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">{currentQ.english}</div>
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 text-sm font-semibold ${
                      selected === currentQ.correct ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {selected === currentQ.correct ? '✓ Correct!' : `✗ Correct answer: ${currentQ.correct}`}
                  </motion.div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {currentQ.options.map((opt, i) => {
                  let style = 'bg-white border-2 border-gray-200 text-gray-800 hover:border-purple-400 hover:bg-purple-50';
                  if (isAnswered) {
                    if (opt.isCorrect)                  style = 'bg-green-500 border-2 border-green-500 text-white';
                    else if (opt.hebrew === selected)   style = 'bg-red-500 border-2 border-red-500 text-white';
                    else                                style = 'bg-white border-2 border-gray-200 text-gray-400 opacity-60';
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(opt)}
                      disabled={isAnswered}
                      className={`${style} rounded-2xl p-4 font-bold text-lg transition-all
                                 text-center leading-tight shadow-sm hover:shadow-md
                                 disabled:cursor-default`}
                      dir="rtl"
                    >
                      {opt.hebrew}
                    </button>
                  );
                })}
              </div>

              {/* Next button (appears after answering) */}
              {isAnswered && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-4
                             rounded-2xl font-semibold text-base shadow hover:shadow-md transition-all
                             flex items-center justify-center gap-2"
                >
                  {qIndex + 1 >= questions.length ? (
                    <><Trophy className="w-4 h-4" /> See Results</>
                  ) : (
                    <>Next <ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
