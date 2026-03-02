import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, ArrowRight, XCircle, Heart, Users, MessageSquare, BookOpen, Crown, ChevronDown } from 'lucide-react';
import { useNavigate, useSearchParams, useParams, useLocation } from 'react-router-dom';
import apiClient from '../api/client';
import { reviewAPI } from '../api/review';
import FlashCard from '../components/FlashCard';
import StudyCard from '../components/StudyCard';
import SessionComplete from '../components/SessionComplete';

// ─── Community Sidebar ────────────────────────────────────────────────────────

const CommunitySidebar = ({ wordId, refreshTrigger }) => {
  const [associations, setAssociations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [likedIds, setLikedIds] = useState(new Set());

  const fetchAssociations = useCallback(async () => {
    if (!wordId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/v1/associations/${wordId}/community`);
      const sorted = [...res.data].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0));
      setAssociations(sorted);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [wordId]);

  useEffect(() => { setLikedIds(new Set()); fetchAssociations(); }, [fetchAssociations]);
  useEffect(() => { if (refreshTrigger > 0) fetchAssociations(); }, [refreshTrigger, fetchAssociations]);

  const handleLike = async (assocId) => {
    if (likedIds.has(assocId)) return;
    try {
      const res = await apiClient.post(`/v1/associations/${wordId}/like/${assocId}`);
      setLikedIds((prev) => new Set([...prev, assocId]));
      setAssociations((prev) =>
        [...prev.map((a) => a.id === assocId ? { ...a, likes: res.data.likes } : a)]
          .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
      );
    } catch { /* silent */ }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100 flex-shrink-0">
        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
          <Users className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">עזרי זיכרון של הקהילה</h3>
          <p className="text-xs text-gray-400">
            {associations.length > 0
              ? `${associations.length} טיפ${associations.length > 1 ? 'ים' : ''} — הכי אהובים ראשונים`
              : 'הכי אהובים ראשונים'}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : associations.length === 0 ? (
          <div className="text-center py-10 px-4">
            <MessageSquare className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400 font-medium">אין עדיין אסוציאציות</p>
            <p className="text-xs text-gray-300 mt-1">היה הראשון! שמור את שלך על הכרטיס.</p>
          </div>
        ) : (
          associations.map((assoc, i) => {
            const isTop = i === 0 && assoc.likes > 0;
            return (
              <div
                key={assoc.id}
                className={`border rounded-xl p-3 shadow-sm ${
                  isTop ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'
                }`}
              >
                {isTop && (
                  <div className="flex items-center gap-1 mb-2">
                    <Crown className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">הכי אהוב</span>
                  </div>
                )}
                <p className="text-sm text-gray-700 leading-relaxed mb-2">"{assoc.text}"</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{assoc.user_label}</span>
                  <button
                    onClick={() => handleLike(assoc.id)}
                    disabled={likedIds.has(assoc.id)}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-all ${
                      likedIds.has(assoc.id) ? 'bg-red-50 text-red-400' : 'text-gray-400 hover:bg-red-50 hover:text-red-400'
                    }`}
                  >
                    <Heart className={`w-3.5 h-3.5 ${likedIds.has(assoc.id) ? 'fill-red-400' : ''}`} />
                    <span>{assoc.likes}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// ─── Main ReviewSession ────────────────────────────────────────────────────────

const ReviewSession = () => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { id: unitId } = useParams();           // present when path is /unit/:id/review
  const [searchParams]  = useSearchParams();    // ?unit=X legacy support

  const [sessionWords, setSessionWords]   = useState([]);
  const [currentIndex, setCurrentIndex]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [isSubmitting, setIsSubmitting]   = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [associationRefresh, setAssociationRefresh] = useState(0);
  const [sessionStats, setSessionStats]   = useState({ total: 0, reviewed: 0, perfect: 0, good: 0, failed: 0 });
  const [noUnknowns, setNoUnknowns]       = useState(false);
  const [goalReached, setGoalReached]     = useState(false);
  const [mobileAssocOpen, setMobileAssocOpen] = useState(false);


  // Words can be passed directly from FilterMode via router state
  const stateWords = location.state?.words;
  const isStudyMode = false; // always use FlashCard

  const backPath = unitId ? `/unit/${unitId}` : '/';

  useEffect(() => { loadSession(); }, []);

  const loadSession = async () => {
    try {
      setLoading(true);
      setError(null);

      // ① Post-filter mode: words passed as state
      if (stateWords && stateWords.length > 0) {
        setSessionWords(stateWords);
        setSessionStats((p) => ({ ...p, total: stateWords.length }));
        return;
      }

      // ② Unit route mode: /unit/:id/review with no state → show only LEARNING (unknown) words
      const unit = unitId ? parseInt(unitId, 10) : parseInt(searchParams.get('unit') || '0', 10);
      if (unit > 0) {
        const data = await reviewAPI.getAllLearningWords();
        const unknownWords = (data.words || [])
          .filter((w) => w.unit === unit)
          .map((w) => ({ ...w, is_new: false }));

        if (unknownWords.length === 0) {
          setNoUnknowns(true);
          return;
        }
        setSessionWords(unknownWords);
        setSessionStats((p) => ({ ...p, total: unknownWords.length }));
        return;
      }

      // ③ Fallback: regular due-words session
      const data = await reviewAPI.getReviewSession();
      if (data.words.length === 0) { navigate('/'); return; }
      setSessionWords(data.words);
      setSessionStats((p) => ({ ...p, total: data.words.length }));

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
    window.speechSynthesis?.cancel(); // stop any TTS playing
    const currentWord = sessionWords[currentIndex];

    // Advance immediately (optimistic UI)
    setSessionStats((prev) => {
      const updated = { ...prev, reviewed: prev.reviewed + 1 };
      if (quality === 5)               updated.perfect += 1;
      else if (quality >= 3)           updated.good    += 1;
      else                             updated.failed  += 1;
      return updated;
    });

    if (currentIndex < sessionWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setSessionComplete(true);
    }

    setIsSubmitting(false);

    // Fire-and-forget API call in background
    reviewAPI.submitReview(currentWord.word_id, quality)
      .then((result) => {
        if (result.goal_reached) {
          setGoalReached(true);
          setTimeout(() => setGoalReached(false), 3000);
        }
      })
      .catch((err) => {
        console.error('Submit failed:', err);
      });
  };

  const handleRate       = (q) => handleSubmit(q);
  const handleKnown      = () => handleSubmit(4);
  const handleUnknown    = () => handleSubmit(1);
  const handleAssocSaved = () => setAssociationRefresh((n) => n + 1);

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
  const progressPct = (sessionStats.reviewed / sessionStats.total) * 100;
  const sessionTitle = isStudyMode ? 'סשן חזרה' : unitId ? `חזרה — יחידה ${unitId}` : 'סשן חזרה';

  // ── Main UI ────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col">
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
            <div className="text-sm text-gray-500 font-medium">
              {sessionStats.reviewed} <span className="text-gray-300">/</span> {sessionStats.total}
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
      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex gap-6">
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
                    onAssociationSaved={handleAssocSaved}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Mobile-only associations panel — below the card buttons */}
            <div className="lg:hidden mt-4">
              <button
                onClick={() => setMobileAssocOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/70 backdrop-blur border border-gray-100 rounded-2xl shadow-sm text-sm font-semibold text-gray-700"
              >
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  עזרי זיכרון של הקהילה
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${mobileAssocOpen ? 'rotate-180' : ''}`} />
              </button>
              <AnimatePresence>
                {mobileAssocOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white/70 backdrop-blur border border-gray-100 border-t-0 rounded-b-2xl shadow-sm p-4 max-h-72 overflow-y-auto">
                      <CommunitySidebar
                        wordId={currentWord?.word_id}
                        refreshTrigger={associationRefresh}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Associations sidebar — always on RIGHT, scrollable */}
        <div className="hidden lg:flex flex-col flex-shrink-0 w-72 xl:w-80">
          <div className="bg-white/70 backdrop-blur border border-gray-100 rounded-2xl shadow-sm p-4 sticky top-24 flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <CommunitySidebar
              wordId={currentWord?.word_id}
              refreshTrigger={associationRefresh}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewSession;
