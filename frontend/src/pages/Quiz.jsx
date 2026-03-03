import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Brain, CheckCircle, XCircle, Trophy, ChevronRight } from 'lucide-react';
import SoundToggle from '../components/SoundToggle';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewAPI } from '../api/review';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';

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
 * Build quiz questions from learned words (status = REVIEW or MASTERED).
 * learnedWords   = words the user has already learned, used as question targets
 * distractorPool = same pool used as wrong-answer options
 * recentIds      = Set of word_ids shown in the previous quiz round (shown last)
 * Each question stores word_id so SM-2 can be updated on answer.
 * Priority: due words → scheduled-fresh → scheduled-recent (just reviewed this session)
 */
function buildQuestions(learnedWords, distractorPool, recentIds = new Set()) {
  const now = new Date();
  const due            = learnedWords.filter(w => !w.next_review || new Date(w.next_review) <= now);
  const scheduledFresh = learnedWords.filter(w => w.next_review && new Date(w.next_review) > now && !recentIds.has(w.word_id));
  const scheduledRecent= learnedWords.filter(w => w.next_review && new Date(w.next_review) > now &&  recentIds.has(w.word_id));
  const ordered = [...shuffle([...due]), ...shuffle([...scheduledFresh]), ...shuffle([...scheduledRecent])];
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

const QuizResult = ({ score, skipped, total, onRetry, onBack }) => {
  const wrong = total - score - skipped;
  const pct = Math.round((score / total) * 100);
  const emoji = pct >= 90 ? '🏆' : pct >= 70 ? '🎯' : pct >= 50 ? '📚' : '💪';
  const msg   = pct >= 90 ? 'מצוין!' : pct >= 70 ? 'כל הכבוד!' : pct >= 50 ? 'מאמץ טוב!' : 'המשך להתאמן!';

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
      >
        <div className="text-5xl mb-3">{emoji}</div>
        <h2 className="text-3xl font-bold text-gray-900 mb-1">{msg}</h2>
        <p className="text-gray-500 mb-6">
          ענית נכון על <span className="font-bold text-purple-600">{score} / {total}</span> ({pct}%)
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-green-600">{score}</div>
            <div className="text-xs text-gray-500">נכון</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-red-500">{wrong}</div>
            <div className="text-xs text-gray-500">שגוי</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-gray-400">{skipped}</div>
            <div className="text-xs text-gray-500">לא ידעתי</div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2"
          >
            נסה שוב
          </button>
          <button
            onClick={onBack}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
          >
            חזרה ליחידה
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
  const { language } = useLanguage();
  const { playCorrect, playWrong, playDontKnow } = useSound();

  const [questions, setQuestions]     = useState([]);
  const [qIndex, setQIndex]           = useState(0);
  const [answers, setAnswers]         = useState({});     // qIndex → hebrew string or '__DONT_KNOW__'
  const [animDir, setAnimDir]         = useState(1);      // 1 = forward, -1 = backward
  const [score, setScore]             = useState(0);
  const [skipped, setSkipped]         = useState(0);
  const [loading, setLoading]         = useState(true);
  const [quizDone, setQuizDone]       = useState(false);
  const [noWords, setNoWords]         = useState(false);
  const [error, setError]             = useState(null);

  // Track word IDs from the last round so they're deprioritised on retry
  const prevQuizIds = useRef(new Set());

  const loadQuiz = async () => {
    setLoading(true);
    setQuizDone(false);
    setQIndex(0);
    setAnswers({});
    setAnimDir(1);
    setScore(0);
    setSkipped(0);
    setNoWords(false);
    setError(null);

    try {
      const res = await reviewAPI.getAllLearnedWords(language);
      const learnedWords = res.words || [];

      if (learnedWords.length === 0) {
        setNoWords(true);
        setLoading(false);
        return;
      }

      // Build questions, deprioritising words seen in the previous round
      const qs = buildQuestions(learnedWords, learnedWords, prevQuizIds.current);
      // Record this round's word IDs so next retry pushes them to the back
      prevQuizIds.current = new Set(qs.map(q => q.word_id));
      setQuestions(qs);
    } catch (err) {
      console.error(err);
      setError('Failed to load quiz. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuiz(); }, [unitNum]);

  const currentQ = questions[qIndex];
  const selected = answers[qIndex] ?? null;
  const isAnswered = selected !== null;

  const handleSelect = async (opt) => {
    if (isAnswered) return;
    if (opt.isCorrect) playCorrect(); else playWrong();
    setAnswers((prev) => ({ ...prev, [qIndex]: opt.hebrew }));
    if (opt.isCorrect) setScore((s) => s + 1);
    // Submit to SM-2: correct → quality 4 (good recall), wrong → quality 1 (failed)
    try {
      await reviewAPI.submitReview(currentQ.word_id, opt.isCorrect ? 4 : 1);
    } catch (err) {
      console.error('SM-2 update failed:', err);
    }
  };

  const handleDontKnow = async () => {
    if (isAnswered) return;
    playDontKnow();
    setAnswers((prev) => ({ ...prev, [qIndex]: '__DONT_KNOW__' }));
    setSkipped((s) => s + 1);
    // quality 0 = complete blackout — hardest penalty, resets interval
    try {
      await reviewAPI.submitReview(currentQ.word_id, 0);
    } catch (err) {
      console.error('SM-2 update failed:', err);
    }
  };

  const handleNext = () => {
    setAnimDir(1);
    if (qIndex + 1 >= questions.length) {
      setQuizDone(true);
    } else {
      setQIndex(qIndex + 1);
    }
  };

  const handleBack = () => {
    if (qIndex > 0) {
      setAnimDir(-1);
      setQIndex((q) => q - 1);
    }
  };

  // ── Loading ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">בונה את הבוחן...</p>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">משהו השתבש</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <button
            onClick={loadQuiz}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-xl font-semibold"
          >
            נסה שוב
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Not enough learned words ────────────────────────────
  if (noWords || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <Brain className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אין מילים לבחינה עדיין</h2>
          <p className="text-gray-500 mb-6">
            הבוחן בוחן מילים שסימנת כ<strong>ידועות</strong> בסשן חזרה. עבור דרך סינון מילים ← סשן חזרה וסמן מילים כ"ידועות" — הן יופיעו כאן.
          </p>
          <button
            onClick={() => navigate(`/unit/${unitNum}`)}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold"
          >
            חזרה ליחידה
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
        skipped={skipped}
        total={questions.length}
        onRetry={loadQuiz}
        onBack={() => navigate(`/unit/${unitNum}`)}
      />
    );
  }

  const progressPct = (qIndex / questions.length) * 100;

  // ── Question UI ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(`/unit/${unitNum}`)} className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowRight className="w-5 h-5" />
          </button>
          <Brain className="w-4 h-4 text-green-600" />
          <span className="font-semibold text-gray-800 flex-1">בוחן תרגול — יחידה {unitNum}</span>
          <span className="text-sm text-gray-500 font-medium">
            {qIndex + 1} / {questions.length}
          </span>
          {qIndex > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-700 px-2.5 py-1 rounded-full text-xs font-bold transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
              קודם
            </button>
          )}
          <SoundToggle />
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
              initial={{ opacity: 0, x: 40 * animDir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 * animDir }}
              transition={{ duration: 0.3 }}
            >
              {/* Question */}
              <div className="bg-white rounded-3xl shadow-xl p-7 mb-5 text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  מה התרגום לעברית?
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
                    {selected === currentQ.correct ? '✓ נכון!' : `✗ תשובה נכונה: ${currentQ.correct}`}
                  </motion.div>
                )}
              </div>

              {/* Options */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {currentQ.options.map((opt, i) => {
                  const isDontKnow = selected === '__DONT_KNOW__';
                  let style = 'bg-white border-2 border-gray-200 text-gray-800 hover:border-purple-400 hover:bg-purple-50';
                  if (isAnswered) {
                    if (opt.isCorrect)                                    style = 'bg-green-500 border-2 border-green-500 text-white';
                    else if (!isDontKnow && opt.hebrew === selected)      style = 'bg-red-500 border-2 border-red-500 text-white';
                    else                                                   style = 'bg-white border-2 border-gray-200 text-gray-400 opacity-60';
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

              {/* Don't Know button — hidden only when user picked an option */}
              {(!isAnswered || selected === '__DONT_KNOW__') && (
                <button
                  onClick={handleDontKnow}
                  disabled={isAnswered}
                  className={`w-full mb-3 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all
                    ${selected === '__DONT_KNOW__'
                      ? 'border-red-400 bg-red-50 text-red-500 cursor-default'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                    }`}
                >
                  {selected === '__DONT_KNOW__' ? '✗ לא ידעתי' : 'לא יודע'}
                </button>
              )}

              {/* SM-2 hint (appears after answering) */}
              {isAnswered && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs text-gray-400 mb-2"
                >
                  שגוי ← מרווח קצר יותר · נכון ← מרווח ארוך יותר
                </motion.p>
              )}

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
                    <><Trophy className="w-4 h-4" /> ראה תוצאות</>
                  ) : (
                    <>הבא</>
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
