import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Gamepad2, XCircle, Trophy, Timer, Flame, Globe } from 'lucide-react';
import SoundToggle from '../components/SoundToggle';
import { useNavigate } from 'react-router-dom';
import { reviewAPI } from '../api/review';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const MatchingGame = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { playCorrect, playWrong } = useSound();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noWords, setNoWords] = useState(false);
  const [levelUpToast, setLevelUpToast] = useState(null);

  const [englishCards, setEnglishCards] = useState([]);
  const [hebrewCards, setHebrewCards] = useState([]);

  const [selectedEnglish, setSelectedEnglish] = useState(null);
  const [selectedHebrew, setSelectedHebrew] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState(new Set());
  const [wrongEnglish, setWrongEnglish] = useState(null);
  const [wrongHebrew, setWrongHebrew] = useState(null);

  const [boardComplete, setBoardComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [penaltySeconds, setPenaltySeconds] = useState(0);
  const [showPenalty, setShowPenalty] = useState(false);
  const [endStats, setEndStats] = useState(null);

  const loadGame = async () => {
    setLoading(true);
    setBoardComplete(false);
    setSelectedEnglish(null);
    setSelectedHebrew(null);
    setMatchedPairs(new Set());
    setWrongEnglish(null);
    setWrongHebrew(null);
    setNoWords(false);
    setError(null);
    setEndStats(null);
    setPenaltySeconds(0);
    setStartTime(null);
    setElapsedTime(0);

    try {
      // Fetch up to 50 weakest words to ensure variety
      const data = await reviewAPI.getCramWords(50, language);
      const allWords = data.words || [];

      if (allWords.length === 0) {
        setNoWords(true);
        return;
      }

      // Pick 6 random words from the pool
      const gameWords = shuffle(allWords).slice(0, 6);

      setEnglishCards(shuffle([...gameWords]));
      setHebrewCards(shuffle([...gameWords]));
      setStartTime(Date.now());
    } catch (err) {
      console.error('Failed to load game:', err);
      setError('שגיאה בטעינת המילים. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval;
    if (startTime && !boardComplete) {
      interval = setInterval(() => {
        setElapsedTime(Date.now() - startTime + (penaltySeconds * 1000));
      }, 100);
    }
    return () => clearInterval(interval);
  }, [startTime, boardComplete, penaltySeconds]);

  useEffect(() => {
    loadGame();
  }, [language]);

  useEffect(() => {
    if (selectedEnglish && selectedHebrew) {
      if (selectedEnglish === selectedHebrew) {
        // Correct Match
        playCorrect();
        const matchedId = selectedEnglish;
        setMatchedPairs((prev) => new Set(prev).add(matchedId));
        setSelectedEnglish(null);
        setSelectedHebrew(null);

        // Submit Cram (XP)
        reviewAPI.submitCram(matchedId, 4)
          .catch((err) => console.error('Matching game submit failed:', err));
      } else {
        // Wrong Match
        playWrong();
        setPenaltySeconds(p => p + 1);
        
        setShowPenalty(true);
        setTimeout(() => setShowPenalty(false), 800);

        const eId = selectedEnglish;
        const hId = selectedHebrew;
        setWrongEnglish(eId);
        setWrongHebrew(hId);
        setSelectedEnglish(null);
        setSelectedHebrew(null);

        setTimeout(() => {
          setWrongEnglish(null);
          setWrongHebrew(null);
        }, 800);
      }
    }
  }, [selectedEnglish, selectedHebrew, playCorrect, playWrong]);

  // Check if board is complete
  useEffect(() => {
    if (englishCards.length > 0 && matchedPairs.size === englishCards.length && !boardComplete) {
      const finalTimeSeconds = Number(((Date.now() - startTime + (penaltySeconds * 1000)) / 1000).toFixed(1));
      
      reviewAPI.submitMatchingTime(finalTimeSeconds, 0)
        .then(res => {
          setEndStats({
            time: finalTimeSeconds,
            personalBest: res.personal_best,
            isNewBest: res.is_new_best,
            globalRank: res.global_rank,
            xpEarned: res.xp_earned,
            levelUp: res.level_up,
            newLevelTitle: res.new_level_title,
          });

          if (res.level_up && res.new_level_title) {
            setLevelUpToast(res.new_level_title);
            setTimeout(() => setLevelUpToast(null), 3500);
          }

          if (res.is_new_best) {
            confetti({
              particleCount: 150,
              spread: 100,
              origin: { y: 0.5 }
            });
          }
        })
        .catch(err => console.error('Failed to submit time:', err));

      setTimeout(() => {
        setBoardComplete(true);
      }, 500);
    }
  }, [matchedPairs, englishCards, boardComplete, startTime, penaltySeconds]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">מכין את המשחק...</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
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
            onClick={loadGame}
            className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-3 rounded-xl font-semibold"
          >
            נסה שוב
          </button>
        </motion.div>
      </div>
    );
  }

  // ── No Words ───────────────────────────────────────────────────────────────
  if (noWords) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">📚</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">אין מילים למשחק</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            צריך לסיים לפחות יחידה אחת בחזרה היומית כדי שיהיו מילים לשחק איתן.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white py-3 rounded-xl font-semibold"
          >
            חזרה לדשבורד ←
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50/50">
      <AnimatePresence>
        {levelUpToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 z-50
                       bg-gradient-to-r from-indigo-500 to-purple-500 text-white
                       px-6 py-3 rounded-2xl shadow-xl flex items-center gap-2 font-bold"
          >
            🎉 עלית לדרגה {levelUpToast}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
            <Gamepad2 className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-gray-800 hidden sm:inline">התאמת מילים</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {/* Timer */}
            <div className="relative flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full font-mono font-bold">
              <Timer className="w-4 h-4" />
              {(elapsedTime / 1000).toFixed(1)}s

              <AnimatePresence>
                {showPenalty && (
                  <motion.div
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: 1, y: -25, scale: 1.2 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="absolute -top-2 left-1/2 -translate-x-1/2 text-red-500 font-black text-sm pointer-events-none drop-shadow-md"
                  >
                    +1s
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <SoundToggle />
          </div>
        </div>
      </div>

      {/* Game Board */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-2 sm:p-4 flex flex-col justify-center">
        {!boardComplete ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-6 relative">
            {/* Hebrew Column */}
            <div className="flex flex-col gap-2 sm:gap-3">
              {hebrewCards.map((word) => {
                const id = word.word_id;
                const isMatched = matchedPairs.has(id);
                const isSelected = selectedHebrew === id;
                const isWrong = wrongHebrew === id;

                return (
                  <motion.button
                    key={`he-${id}`}
                    layout
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: isMatched ? 0 : 1, opacity: isMatched ? 0 : 1 }}
                    whileHover={!isMatched ? { scale: 1.02 } : {}}
                    whileTap={!isMatched ? { scale: 0.98 } : {}}
                    onClick={() => !isMatched && setSelectedHebrew(id)}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg leading-tight transition-colors border-2 shadow-sm
                      ${isSelected ? 'bg-purple-50 border-purple-500 text-purple-700' : ''}
                      ${isWrong ? 'bg-red-50 border-red-500 text-red-600 animate-[shake_0.4s_ease-in-out]' : ''}
                      ${!isSelected && !isWrong ? 'bg-white border-gray-200 text-gray-800 hover:border-purple-300' : ''}
                      ${isMatched ? 'pointer-events-none' : ''}
                    `}
                    dir="rtl"
                  >
                    {word.hebrew}
                  </motion.button>
                );
              })}
            </div>

            {/* English Column */}
            <div className="flex flex-col gap-2 sm:gap-3">
              {englishCards.map((word) => {
                const id = word.word_id;
                const isMatched = matchedPairs.has(id);
                const isSelected = selectedEnglish === id;
                const isWrong = wrongEnglish === id;

                return (
                  <motion.button
                    key={`en-${id}`}
                    layout
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: isMatched ? 0 : 1, opacity: isMatched ? 0 : 1 }}
                    whileHover={!isMatched ? { scale: 1.02 } : {}}
                    whileTap={!isMatched ? { scale: 0.98 } : {}}
                    onClick={() => !isMatched && setSelectedEnglish(id)}
                    className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl font-bold text-sm sm:text-lg leading-tight transition-colors border-2 shadow-sm
                      ${isSelected ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : ''}
                      ${isWrong ? 'bg-red-50 border-red-500 text-red-600 animate-[shake_0.4s_ease-in-out]' : ''}
                      ${!isSelected && !isWrong ? 'bg-white border-gray-200 text-gray-800 hover:border-indigo-300' : ''}
                      ${isMatched ? 'pointer-events-none' : ''}
                    `}
                    dir="ltr"
                  >
                    {word.english}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 text-center max-w-sm mx-auto w-full"
          >
            {endStats?.isNewBest ? (
              <Globe className="w-16 h-16 text-blue-500 mx-auto mb-4 animate-bounce" />
            ) : (
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            )}
            
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {endStats?.isNewBest ? 'שיא אישי חדש!' : 'כל הכבוד!'}
            </h2>
            <p className="text-gray-500 mb-6">התאמת את כל המילים בהצלחה!</p>
            
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3 text-right">
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-600 font-medium">הזמן שלך:</span>
                <span className="font-mono font-bold text-xl text-indigo-600">
                  {endStats?.time ? `${endStats.time}s` : '...'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-600 font-medium">שיא אישי:</span>
                <span className="font-mono font-bold text-gray-800">
                  {endStats?.personalBest ? `${endStats.personalBest}s` : '...'}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                <span className="text-gray-600 font-medium">דירוג עולמי:</span>
                <span className="font-bold text-blue-600">
                  {endStats?.globalRank ? `#${endStats.globalRank}` : '...'}
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={loadGame}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <Gamepad2 className="w-5 h-5" />
                שחק שוב
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                חזרה לדשבורד
              </button>
            </div>
          </motion.div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          50% { transform: translateX(5px); }
          75% { transform: translateX(-5px); }
        }
      `}} />
    </div>
  );
};

export default MatchingGame;
