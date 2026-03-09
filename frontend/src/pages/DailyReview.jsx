import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, CalendarCheck, XCircle, Trophy } from 'lucide-react';
import SoundToggle from '../components/SoundToggle';
import { useNavigate } from 'react-router-dom';
import { reviewAPI } from '../api/review';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build multiple-choice questions from a word list */
function buildQuestions(words) {
  if (words.length === 0) return [];
  const pool = words.length >= 4 ? words : [...words, ...words, ...words, ...words];

  return shuffle([...words]).map((correct) => {
    const distractors = shuffle(
      pool.filter((w) => w.word_id !== correct.word_id && w.hebrew !== correct.hebrew)
    ).slice(0, 3);

    while (distractors.length < 3) {
      distractors.push({ word_id: -distractors.length, hebrew: '—' });
    }

    return {
      word_id: correct.word_id,
      english: correct.english,
      correct: correct.hebrew,
      options: shuffle([
        { hebrew: correct.hebrew, isCorrect: true },
        ...distractors.map((d) => ({ hebrew: d.hebrew, isCorrect: false })),
      ]),
    };
  });
}

// ─── Results screen ───────────────────────────────────────────────────────────

const DailyResult = ({ score, skipped, total, onRetry, onBack, onCram }) => {
  const wrong = total - score - skipped;
  const pct   = Math.round((score / total) * 100);
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
          ענית נכון על{' '}
          <span className="font-bold text-violet-600">{score} / {total}</span>{' '}
          ({pct}%)
        </p>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-green-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-green-600">{score}</div>
            <div className="text-xs text-gray-500 mt-1">נכון</div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-red-500">{wrong}</div>
            <div className="text-xs text-gray-500 mt-1">שגוי</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-gray-400">{skipped}</div>
            <div className="text-xs text-gray-500 mt-1">לא ידעתי</div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onCram}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold shadow-lg shadow-amber-200/50 hover:-translate-y-0.5 hover:shadow-xl transition-all"
          >
            🔥 מצב חרישה — עוד סיבוב!
          </button>
          <button
            onClick={onRetry}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl font-semibold"
          >
            נסה שוב
          </button>
          <button
            onClick={onBack}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold"
          >
            חזרה לדשבורד
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main DailyReview ─────────────────────────────────────────────────────────

const DailyReview = () => {
  const navigate         = useNavigate();
  const { language }     = useLanguage();
  const { playCorrect, playWrong, playDontKnow } = useSound();

  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex]       = useState(0);
  const [answers, setAnswers]     = useState({});   // qIndex → hebrew | '__DONT_KNOW__'
  const [score, setScore]         = useState(0);
  const [skipped, setSkipped]     = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [quizDone, setQuizDone]   = useState(false);
  const [noWords, setNoWords]     = useState(false);
  const [levelUpToast, setLevelUpToast] = useState(null);
  const [goalReached, setGoalReached]   = useState(false);

  const prevIds = useRef(new Set());

  const loadQuiz = async () => {
    setLoading(true);
    setQuizDone(false);
    setQIndex(0);
    setAnswers({});
    setScore(0);
    setSkipped(0);
    setNoWords(false);
    setError(null);

    try {
      const data  = await reviewAPI.getDailyReview(200, language);
      const words = data.words || [];

      if (words.length === 0) {
        setNoWords(true);
        return;
      }

      // Deprioritise words seen last round by shuffling them to the back
      const fresh  = words.filter((w) => !prevIds.current.has(w.word_id));
      const recent = words.filter((w) =>  prevIds.current.has(w.word_id));
      const ordered = [...shuffle(fresh), ...shuffle(recent)];

      const qs = buildQuestions(ordered);
      prevIds.current = new Set(qs.map((q) => q.word_id));
      setQuestions(qs);
    } catch (err) {
      console.error('Failed to load daily review:', err);
      setError('שגיאה בטעינת החזרה היומית. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuiz(); }, [language]);

  const currentQ   = questions[qIndex];
  const selected   = answers[qIndex] ?? null;
  const isAnswered = selected !== null;

  const handleSelect = (opt) => {
    if (isAnswered) return;
    if (opt.isCorrect) playCorrect(); else playWrong();
    setAnswers((prev) => ({ ...prev, [qIndex]: opt.hebrew }));
    if (opt.isCorrect) setScore((s) => s + 1);

    reviewAPI.submitReview(currentQ.word_id, opt.isCorrect ? 4 : 1, true)
      .then((result) => {
        if (result?.goal_reached) {
          setGoalReached(true);
          setTimeout(() => setGoalReached(false), 3000);
        }
        if (result?.level_up && result?.new_level_title) {
          setLevelUpToast(result.new_level_title);
          setTimeout(() => setLevelUpToast(null), 3500);
        }
      })
      .catch((err) => console.error('SM-2 update failed:', err));
  };

  const handleDontKnow = () => {
    if (isAnswered) return;
    playDontKnow();
    setAnswers((prev) => ({ ...prev, [qIndex]: '__DONT_KNOW__' }));
    setSkipped((s) => s + 1);
    reviewAPI.submitReview(currentQ.word_id, 0, true)
      .catch((err) => console.error('SM-2 update failed:', err));
  };

  const handleNext = () => {
    if (qIndex + 1 >= questions.length) {
      setQuizDone(true);
    } else {
      setQIndex((i) => i + 1);
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">בונה את החזרה היומית...</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
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
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl font-semibold"
          >
            נסה שוב
          </button>
        </motion.div>
      </div>
    );
  }

  // ── No due words ──────────────────────────────────────────────────────────
  if (noWords) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אתה מעודכן לחלוטין!</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            אין מילים שמחכות לחזרה כרגע. חזור מחר לסשן החזרה הבא.
          </p>

          {/* Cram Mode CTA */}
          <div className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl text-right">
            <p className="text-xs text-amber-700 leading-relaxed">
              תרגול אקסטרה שלא משפיע על תאריכי החזרה של האלגוריתם, אבל נותן לכם עוד נקודות לטבלת המובילים והזדמנות לחזק מילים קשות!
            </p>
          </div>
          <button
            onClick={() => navigate('/cram')}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold mb-3 shadow-lg shadow-amber-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all"
          >
            🔥 מצב חרישה
          </button>

          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold"
          >
            חזרה לדשבורד ←
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Quiz done ─────────────────────────────────────────────────────────────
  if (quizDone) {
    return (
      <DailyResult
        score={score}
        skipped={skipped}
        total={questions.length}
        onRetry={loadQuiz}
        onBack={() => navigate('/')}
        onCram={() => navigate('/cram')}
      />
    );
  }

  const progressPct  = (qIndex / questions.length) * 100;
  const isDontKnow   = selected === '__DONT_KNOW__';

  // ── Quiz UI ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">

      {/* Level-up toast */}
      <AnimatePresence>
        {levelUpToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50
                       bg-gradient-to-r from-violet-600 to-indigo-600 text-white
                       px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold"
          >
            🎉 עלית לדרגה {levelUpToast}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily goal toast */}
      <AnimatePresence>
        {goalReached && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50
                       bg-orange-500 text-white px-6 py-3 rounded-2xl shadow-xl
                       flex items-center gap-2 font-semibold"
          >
            🔥 מטרה יומית הושגה! הרצף הוארך!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <CalendarCheck className="w-4 h-4 text-violet-600" />
          <span className="font-semibold text-gray-800 flex-1">חזרה יומית</span>
          <span className="text-sm text-gray-500 font-medium">
            {qIndex + 1} / {questions.length}
          </span>
          <SoundToggle />
        </div>
        <div className="h-1.5 bg-gray-100">
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-600"
          />
        </div>
      </div>

      {/* Body */}
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
              {/* Question card */}
              <div className="bg-white rounded-3xl shadow-xl p-7 mb-5 text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  מה התרגום לעברית?
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {currentQ.english}
                </div>
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 text-sm font-semibold ${
                      selected === currentQ.correct ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {selected === currentQ.correct
                      ? '✓ נכון!'
                      : `✗ תשובה נכונה: ${currentQ.correct}`}
                  </motion.div>
                )}
              </div>

              {/* Options grid */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {currentQ.options.map((opt, i) => {
                  let style = 'bg-white border-2 border-gray-200 text-gray-800 hover:border-violet-400 hover:bg-violet-50';
                  if (isAnswered) {
                    if (opt.isCorrect)
                      style = 'bg-green-500 border-2 border-green-500 text-white';
                    else if (!isDontKnow && opt.hebrew === selected)
                      style = 'bg-red-500 border-2 border-red-500 text-white';
                    else
                      style = 'bg-white border-2 border-gray-200 text-gray-400 opacity-60';
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(opt)}
                      disabled={isAnswered}
                      dir="rtl"
                      className={`${style} rounded-2xl p-4 font-bold text-lg transition-all
                                 text-center leading-tight shadow-sm hover:shadow-md
                                 disabled:cursor-default`}
                    >
                      {opt.hebrew}
                    </button>
                  );
                })}
              </div>

              {/* Don't Know */}
              {(!isAnswered || isDontKnow) && (
                <button
                  onClick={handleDontKnow}
                  disabled={isAnswered}
                  className={`w-full mb-3 py-2.5 rounded-2xl border-2 text-sm font-semibold transition-all
                    ${isDontKnow
                      ? 'border-red-400 bg-red-50 text-red-500 cursor-default'
                      : 'border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-500'
                    }`}
                >
                  {isDontKnow ? '✗ לא ידעתי' : 'לא יודע'}
                </button>
              )}

              {/* SM-2 hint */}
              {isAnswered && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center text-xs text-gray-400 mb-2"
                >
                  שגוי ← מרווח קצר יותר · נכון ← מרווח ארוך יותר
                </motion.p>
              )}

              {/* Next button */}
              {isAnswered && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white
                             py-4 rounded-2xl font-semibold text-base shadow
                             hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {qIndex + 1 >= questions.length
                    ? <><Trophy className="w-4 h-4" /> ראה תוצאות</>
                    : 'הבא ←'}
                </motion.button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DailyReview;
