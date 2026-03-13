import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, CheckCircle, XCircle, Trophy } from 'lucide-react';
import SoundToggle from '../components/SoundToggle';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewAPI } from '../api/review';
import { authAPI } from '../api/auth';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';
import SuccessReferralCard from '../components/SuccessReferralCard';

/** Fisher-Yates shuffle — returns a new shuffled array */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build 4 answer options for a given word using the distractor pool */
function buildOptions(currentWord, pool) {
  const distractors = shuffle(
    pool.filter((w) => w.word_id !== currentWord.word_id && w.hebrew !== currentWord.hebrew)
  ).slice(0, 3);

  while (distractors.length < 3) {
    distractors.push({ word_id: -(distractors.length + 1), hebrew: '—' });
  }

  return shuffle([
    { hebrew: currentWord.hebrew, isCorrect: true },
    ...distractors.map((d) => ({ hebrew: d.hebrew, isCorrect: false })),
  ]);
}

// ─── Session Complete screen ──────────────────────────────────────────────────

const AcquisitionComplete = ({ graduated, total, onBack }) => {
  const [referralLink, setReferralLink] = useState('');
  useEffect(() => {
    authAPI.getReferralStats().then(d => setReferralLink(d.referral_link)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
      >
        <div className="text-5xl mb-3">🎓</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-1">סיימת את הבוחן!</h2>
        <p className="text-gray-500 mb-6">
          הסמכת{' '}
          <span className="font-bold text-violet-600">{graduated}</span>{' '}
          מתוך{' '}
          <span className="font-bold text-gray-700">{total}</span>{' '}
          מילים לחזרה היומית.
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-green-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-green-600">{graduated}</div>
            <div className="text-xs text-gray-500 mt-1">הוסמכו לחזרה</div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4">
            <div className="text-2xl font-bold text-amber-500">{total - graduated}</div>
            <div className="text-xs text-gray-500 mt-1">נשארו בתור</div>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6 leading-relaxed">
          המילים שהוסמכו יופיעו בחזרה היומית מחר.
          המילים שלא הוסמכו יחכו לך בבוחן הבא.
        </p>

        {referralLink && (
          <div className="mb-4 text-right">
            <SuccessReferralCard referralLink={referralLink} />
          </div>
        )}

        <button
          onClick={onBack}
          className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-3 rounded-xl font-semibold"
        >
          חזרה ליחידה ←
        </button>
      </motion.div>
    </div>
  );
};

// ─── Main AcquisitionQuiz ─────────────────────────────────────────────────────

const AcquisitionQuiz = () => {
  const navigate        = useNavigate();
  const { id }          = useParams();
  const unitNum         = parseInt(id, 10);
  const { language }    = useLanguage();
  const { playCorrect, playWrong } = useSound();

  // Queue: queue[0] is always the current word.
  // Correct → remove from front. Wrong → move from front to back.
  const [queue, setQueue]               = useState([]);
  const [distractorPool, setDistractorPool] = useState([]);
  const [options, setOptions]           = useState([]);

  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [sessionDone, setSessionDone]   = useState(false);
  const [noWords, setNoWords]           = useState(false);

  const [selectedAnswer, setSelectedAnswer] = useState(null); // { hebrew, isCorrect } | null
  const [isAnswered, setIsAnswered]         = useState(false);

  const [graduatedCount, setGraduatedCount] = useState(0);
  const [totalInitial, setTotalInitial]     = useState(0);
  const [levelUpToast, setLevelUpToast]     = useState(null);

  // ── Load quiz data ────────────────────────────────────────────────────────
  const loadQuiz = async () => {
    setLoading(true);
    setError(null);
    setSessionDone(false);
    setNoWords(false);
    setGraduatedCount(0);
    setSelectedAnswer(null);
    setIsAnswered(false);

    try {
      const [acqData, unitData] = await Promise.all([
        reviewAPI.getAcquisitionWords(unitNum, language),
        reviewAPI.getUnitWords(unitNum, 500, language),
      ]);

      const acqWords      = acqData.words  || [];
      const allUnitWords  = unitData.words || [];

      if (acqWords.length === 0) {
        setNoWords(true);
        setTotalInitial(0);
        return;
      }

      const shuffled = shuffle(acqWords);
      setQueue(shuffled);
      setTotalInitial(shuffled.length);
      setDistractorPool(allUnitWords);
      setOptions(buildOptions(shuffled[0], allUnitWords));
    } catch (err) {
      console.error('Failed to load acquisition quiz:', err);
      setError('שגיאה בטעינת הבוחן. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadQuiz(); }, [unitNum, language]);

  // ── Answer handler ────────────────────────────────────────────────────────
  const handleAnswer = (opt) => {
    if (isAnswered) return;
    setSelectedAnswer(opt);
    setIsAnswered(true);
    if (opt.isCorrect) playCorrect(); else playWrong();

    const currentWord = queue[0];
    const quality     = opt.isCorrect ? 4 : 1;

    // Fire-and-forget acquisition submit
    reviewAPI.submitAcquisition(currentWord.word_id, quality)
      .then((result) => {
        if (result?.level_up && result?.new_level_title) {
          setLevelUpToast(result.new_level_title);
          setTimeout(() => setLevelUpToast(null), 3500);
        }
      })
      .catch((err) => console.error('Acquisition submit failed:', err));
  };

  const handleDontKnow = () => {
    if (isAnswered) return;
    setSelectedAnswer({ hebrew: null, isCorrect: false, isDontKnow: true });
    setIsAnswered(true);
    playWrong();

    const currentWord = queue[0];
    reviewAPI.submitAcquisition(currentWord.word_id, 0)
      .catch((err) => console.error('Acquisition submit failed:', err));
  };

  // ── Advance to next word ──────────────────────────────────────────────────
  const handleNext = () => {
    const isCorrect = selectedAnswer?.isCorrect === true;
    const current   = queue[0];

    let newQueue;
    if (isCorrect) {
      // Graduate — remove from queue
      newQueue = queue.slice(1);
      setGraduatedCount((c) => c + 1);
    } else {
      // Wrong — move to end so user tries again later
      newQueue = [...queue.slice(1), current];
    }

    setQueue(newQueue);
    setSelectedAnswer(null);
    setIsAnswered(false);

    if (newQueue.length === 0) {
      setSessionDone(true);
    } else {
      setOptions(buildOptions(newQueue[0], distractorPool));
    }
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">בונה את הבוחן...</p>
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
            className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white py-3 rounded-xl font-semibold"
          >
            נסה שוב
          </button>
        </motion.div>
      </div>
    );
  }

  // ── No acquisition words ──────────────────────────────────────────────────
  if (noWords) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אין מילים לרכישה</h2>
          <p className="text-gray-500 mb-7 text-sm leading-relaxed">
            כל המילים ביחידה זו כבר הוסמכו לחזרה היומית. כדאי לסנן מילים חדשות תחילה.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/unit/${unitNum}/filter`)}
              className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white py-3 rounded-xl font-semibold"
            >
              ← סנן מילים חדשות
            </button>
            <button
              onClick={() => navigate(`/unit/${unitNum}`)}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              חזרה ליחידה
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Session done ──────────────────────────────────────────────────────────
  if (sessionDone) {
    return (
      <AcquisitionComplete
        graduated={graduatedCount}
        total={totalInitial}
        onBack={() => navigate(`/unit/${unitNum}`)}
      />
    );
  }

  // ── Quiz UI ───────────────────────────────────────────────────────────────
  const currentWord  = queue[0];
  const progressPct  = totalInitial > 0 ? (graduatedCount / totalInitial) * 100 : 0;
  const isDontKnow   = selectedAnswer?.isDontKnow === true;

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

      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/unit/${unitNum}`)}
            className="text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <Zap className="w-4 h-4 text-amber-500" />
          <span className="font-semibold text-gray-800 flex-1">
            רכישת יחידה {unitNum}
          </span>
          {/* Graduated counter */}
          <div className="flex items-center gap-1.5 bg-green-50 px-2.5 py-1 rounded-full">
            <CheckCircle className="w-3.5 h-3.5 text-green-500" />
            <span className="text-xs font-bold text-green-600">{graduatedCount} / {totalInitial}</span>
          </div>
          {/* Queue depth */}
          <span className="text-sm text-gray-400 font-medium hidden sm:block">
            {queue.length} בתור
          </span>
          <SoundToggle />
        </div>
        {/* Graduation progress bar */}
        <div className="h-1.5 bg-gray-100">
          <motion.div
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.4 }}
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
          />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentWord.word_id + '-' + queue.length}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              {/* Question card */}
              <div className="bg-white rounded-3xl shadow-xl p-7 mb-5 text-center">
                <div className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">
                  מה התרגום לעברית?
                </div>
                <div className="text-4xl font-bold text-gray-900 mb-2">
                  {currentWord.english}
                </div>

                {/* Feedback after answering */}
                {isAnswered && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`mt-4 text-sm font-semibold ${
                      selectedAnswer?.isCorrect ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {selectedAnswer?.isCorrect
                      ? '✓ מעולה! המילה הוסמכה לחזרה היומית 🎓'
                      : `✗ תשובה נכונה: ${currentWord.hebrew} — המילה תחזור לבוחן`}
                  </motion.div>
                )}

                {/* Queue indicator when word will loop back */}
                {isAnswered && !selectedAnswer?.isCorrect && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-amber-500 font-medium"
                  >
                    המילה עברה לסוף התור — תראה אותה שוב
                  </motion.p>
                )}
              </div>

              {/* Answer options */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                {options.map((opt, i) => {
                  let style =
                    'bg-white border-2 border-gray-200 text-gray-800 hover:border-amber-400 hover:bg-amber-50';
                  if (isAnswered) {
                    if (opt.isCorrect)
                      style = 'bg-green-500 border-2 border-green-500 text-white';
                    else if (!isDontKnow && opt.hebrew === selectedAnswer?.hebrew)
                      style = 'bg-red-500 border-2 border-red-500 text-white';
                    else
                      style = 'bg-white border-2 border-gray-200 text-gray-400 opacity-60';
                  }
                  return (
                    <button
                      key={i}
                      onClick={() => handleAnswer(opt)}
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

              {/* Don't Know button */}
              {!isAnswered && (
                <button
                  onClick={handleDontKnow}
                  className="w-full mb-3 py-2.5 rounded-2xl border-2 border-gray-200
                             text-sm font-semibold text-gray-400
                             hover:border-gray-300 hover:text-gray-500 transition-all"
                >
                  לא יודע
                </button>
              )}

              {/* Don't-Know state feedback */}
              {isDontKnow && (
                <div className="w-full mb-3 py-2.5 rounded-2xl border-2 border-red-200
                                text-sm font-semibold text-red-400 text-center bg-red-50">
                  ✗ התשובה הייתה: {currentWord.hebrew}
                </div>
              )}

              {/* Next button */}
              {isAnswered && (
                <motion.button
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={handleNext}
                  className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white
                             py-4 rounded-2xl font-semibold text-base shadow
                             hover:shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {queue.length === 1 && selectedAnswer?.isCorrect ? (
                    <><Trophy className="w-4 h-4" /> סיים</>
                  ) : (
                    'הבא ←'
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

export default AcquisitionQuiz;
