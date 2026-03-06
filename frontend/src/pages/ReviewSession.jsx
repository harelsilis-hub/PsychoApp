import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ArrowRight, XCircle, BookOpen, ChevronRight } from 'lucide-react';
import SoundToggle from '../components/SoundToggle';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import { reviewAPI } from '../api/review';
import { customWordsAPI } from '../api/customWords';
import FlashCard from '../components/FlashCard';
import StudyCard from '../components/StudyCard';
import SessionComplete from '../components/SessionComplete';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';

// ─── Main ReviewSession ────────────────────────────────────────────────────────

const ReviewSession = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { id: unitId } = useParams();           // present when path is /unit/:id/review
  const [searchParams]  = useSearchParams();    // ?unit=X legacy support
  const { language } = useLanguage();
  const { playCorrect, playWrong } = useSound();

  const [sessionWords, setSessionWords]   = useState([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [ratings, setRatings]             = useState({});   // index → quality
  const [sessionTotal, setSessionTotal]   = useState(0);
  const [noUnknowns, setNoUnknowns]       = useState(false);
  const [goalReached, setGoalReached]     = useState(false);
  const [levelUpToast, setLevelUpToast]   = useState(null);

  // Derived session stats from ratings map (correct even after re-rating)
  const ratingValues = Object.values(ratings);
  const sessionStats = {
    total:    sessionTotal,
    reviewed: ratingValues.length,
    perfect:  ratingValues.filter((q) => q === 5).length,
    good:     ratingValues.filter((q) => q >= 3 && q < 5).length,
    failed:   ratingValues.filter((q) => q < 3).length,
  };


  // Words can be passed directly from FilterMode via router state
  const stateWords = location.state?.words;
  const isStudyMode = false; // always use FlashCard

  const isMyWords = unitId === 'my-words';
  const backPath = isMyWords ? '/my-words' : unitId ? `/unit/${unitId}` : '/';

  useEffect(() => { loadSession(); }, []);

  const loadSession = async () => {
    try {
      setLoading(true);
      setError(null);
      setRatings({});
      setCurrentIndex(0);

      // ① Post-filter mode: words passed as state
      if (stateWords && stateWords.length > 0) {
        setSessionWords(stateWords);
        setSessionTotal(stateWords.length);
        return;
      }

      // ② My Words mode: /unit/my-words/review
      if (isMyWords) {
        const data = await customWordsAPI.getReviewWords();
        const reviewWords = data.words || [];
        if (reviewWords.length === 0) {
          setNoUnknowns(true);
          return;
        }
        setSessionWords(reviewWords);
        setSessionTotal(reviewWords.length);
        return;
      }

      // ③ Unit route mode: /unit/:id/review with no state → show only LEARNING (unknown) words
      const unit = unitId ? parseInt(unitId, 10) : parseInt(searchParams.get('unit') || '0', 10);
      if (unit > 0) {
        const data = await reviewAPI.getAllLearningWords(language);
        const unknownWords = (data.words || [])
          .filter((w) => w.unit === unit)
          .map((w) => ({ ...w, is_new: false }));

        if (unknownWords.length === 0) {
          setNoUnknowns(true);
          return;
        }
        setSessionWords(unknownWords);
        setSessionTotal(unknownWords.length);
        return;
      }

      // ③ Fallback: regular due-words session
      const data = await reviewAPI.getReviewSession(20, language);
      if (data.words.length === 0) { navigate('/'); return; }
      setSessionWords(data.words);
      setSessionTotal(data.words.length);

    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load review session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Shared submit: quality 4 = Known, quality 1 = Unknown
  const handleSubmit = (quality) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    window.speechSynthesis?.cancel();
    if (quality >= 3) playCorrect(); else playWrong();
    const currentWord = sessionWords[currentIndex];

    // Track rating — overwrites previous rating for this card if re-rating
    setRatings((prev) => ({ ...prev, [currentIndex]: quality }));

    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionComplete(true);
    }

    setIsSubmitting(false);

    // Fire-and-forget API call in background
    const submitFn = isMyWords ? customWordsAPI.submitReview : reviewAPI.submitReview;
    submitFn(currentWord.word_id, quality)
      .then((result) => {
        if (result.goal_reached) {
          setGoalReached(true);
          setTimeout(() => setGoalReached(false), 3000);
        }
        if (result?.xp_earned > 0) {
        }
        if (result?.level_up && result?.new_level_title) {
          setLevelUpToast(result.new_level_title);
          setTimeout(() => setLevelUpToast(null), 3500);
        }
      })
      .catch((err) => {
        console.error('Submit failed:', err);
      });
  };

  const handleRate       = (q) => handleSubmit(q);
  const handleKnown      = () => handleSubmit(4);
  const handleUnknown    = () => handleSubmit(1);
  const handleBack       = () => { if (currentIndex > 0) setCurrentIndex((i) => i - 1); };

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-500">טוען את הסשן שלך...</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">שגיאה</h2>
          <p className="text-gray-500 mb-6">{error}</p>
          <div className="space-y-3">
            <button onClick={loadSession} className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold">נסה שוב</button>
            <button onClick={() => navigate(backPath)} className="w-full bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-semibold">חזרה</button>
          </div>
        </div>
      </div>
    );
  }

  // ── No unknown words ──────────────────────────────────────
  if (noUnknowns) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אין מילים לא ידועות עדיין</h2>
          <p className="text-gray-500 mb-7 text-sm leading-relaxed">
            עדיין לא סימנת מילים כ"לא יודע" ביחידה זו.
            סנן את המילים תחילה כדי לבנות את רשימת החזרה שלך.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate(`/unit/${unitId}/filter`)}
              className="w-full bg-gradient-to-r from-yellow-400 to-orange-400 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              ← סנן מילים
            </button>
            <button
              onClick={() => navigate(`/unit/${unitId}/quiz`)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
            >
              ← בוחן תרגול
            </button>
            <button
              onClick={() => navigate(backPath)}
              className="w-full bg-gray-100 text-gray-600 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              חזרה ליחידה
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Session Complete ───────────────────────────────────────
  if (sessionComplete) {
    return <SessionComplete stats={sessionStats} backPath={backPath} />;
  }

  const currentWord = sessionWords[currentIndex];
  const progressPct = (currentIndex / sessionWords.length) * 100;
  const sessionTitle = isStudyMode ? 'סשן חזרה' : unitId ? `חזרה — יחידה ${unitId}` : 'סשן חזרה';

  // ── Main UI ────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] md:min-h-screen flex flex-col overflow-hidden">

      {/* Level-up toast */}
      <AnimatePresence>
        {levelUpToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold"
          >
            🎉 עלית לדרגה {levelUpToast}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Daily goal celebration toast */}
      <AnimatePresence>
        {goalReached && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-orange-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-semibold"
          >
            🔥 מטרה יומית הושגה! הרצף הוארך!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(backPath)}
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 transition-colors text-sm font-medium"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה
            </button>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-gray-800">{sessionTitle}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">
                {currentIndex + 1} <span className="text-gray-300">/</span> {sessionWords.length}
              </span>
              {currentIndex > 0 && (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 bg-purple-100 hover:bg-purple-200 text-purple-700 px-2.5 py-1 rounded-full text-xs font-bold transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  קודם
                </button>
              )}
              <SoundToggle />
            </div>
          </div>
          <div className="mt-2.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Body — two-column layout for both unit and regular review */}
      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 sm:px-6 py-2 md:py-6 flex gap-6 overflow-y-auto md:overflow-visible">
        {/* Main card area */}
        <div className="flex-1 min-w-0 flex flex-col items-center">
          <div className="w-full max-w-xl">
            <AnimatePresence mode="wait">
              {currentWord && (
                <motion.div
                  key={currentWord.word_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <FlashCard
                    word={currentWord}
                    isNew={currentWord.is_new}
                    onRate={handleRate}
                  />
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </div>

      </div>
    </div>
  );
};

export default ReviewSession;
