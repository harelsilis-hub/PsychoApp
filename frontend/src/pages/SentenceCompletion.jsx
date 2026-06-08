import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Puzzle, XCircle, Trophy, Sparkles, Flag } from 'lucide-react';
import SoundToggle from '../components/SoundToggle';
import { useNavigate } from 'react-router-dom';
import { wordsAPI } from '../api/words';
import { reviewAPI } from '../api/review';
import confetti from 'canvas-confetti';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';

const SentenceCompletion = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { playCorrect, playWrong } = useSound();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [noWords, setNoWords] = useState(false);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState([]);
  
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);

  const [levelUpToast, setLevelUpToast] = useState(null);

  const [flagToast, setFlagToast] = useState(false);
  const [flagExpanded, setFlagExpanded] = useState(false);
  const [flagReason, setFlagReason] = useState('');

  const loadGame = async () => {
    setLoading(true);
    setError(null);
    setNoWords(false);
    setCurrentIndex(0);
    setScore(0);
    setWrongAnswers([]);
    setSelectedAnswer(null);
    setIsCorrect(null);
    setShowTranslation(false);
    setFlagToast(false);
    setFlagExpanded(false);
    setFlagReason('');

    try {
      const data = await wordsAPI.getSentenceCompletion(10, language);
      if (!data || data.length === 0) {
        setNoWords(true);
        return;
      }
      setQuestions(data);
    } catch (err) {
      console.error('Failed to load sentence completion game:', err);
      setError('שגיאה בטעינת משפטים. נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGame();
  }, [language]);

  const handleAnswerClick = (option) => {
    if (selectedAnswer) return; // Prevent multiple clicks

    const currentQ = questions[currentIndex];
    const correct = option === currentQ.word_form;

    setSelectedAnswer(option);
    setIsCorrect(correct);
    setShowTranslation(true);

    // Background submit for XP
    wordsAPI.submitSentenceCompletion(currentQ.word_id, correct)
      .then((res) => {
        if (res.level_up && res.new_level_title) {
          setLevelUpToast(res.new_level_title);
          setTimeout(() => setLevelUpToast(null), 3500);
        }
      })
      .catch((err) => console.error("Failed to submit XP:", err));

    if (correct) {
      playCorrect();
      setScore((s) => s + 1);
    } else {
      playWrong();
      setWrongAnswers(prev => [...prev, currentQ]);
    }

    // Move to next question after delay
    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
        setShowTranslation(false);
      } else {
        // Game Over
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
        setCurrentIndex((i) => i + 1); // increment out of bounds to show completion
      }
    }, correct ? 1500 : 3000); // Give more time to read translation if they got it wrong
  };

  const handleFlag = (e) => {
    e.stopPropagation();
    if (!questions[currentIndex] || flagToast) return;
    setFlagExpanded(true);
  };

  const handleFlagSubmit = async (e) => {
    e.stopPropagation();
    try {
      const fullReason = `[SENTENCE] ${flagReason.trim()}`;
      await reviewAPI.flagWord(questions[currentIndex].word_id, fullReason);
      setFlagExpanded(false);
      setFlagReason('');
      setFlagToast(true);
      setTimeout(() => setFlagToast(false), 2500);
    } catch (err) {
      console.error('Flag failed:', err);
    }
  };

  const handleFlagCancel = (e) => {
    e.stopPropagation();
    setFlagExpanded(false);
    setFlagReason('');
  };

  const isGameOver = currentIndex >= questions.length;
  const currentQ = !isGameOver ? questions[currentIndex] : null;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
      if (selectedAnswer || isGameOver || !currentQ) return;
      if (['1', '2', '3', '4'].includes(e.key)) {
        const index = parseInt(e.key, 10) - 1;
        if (currentQ.options && currentQ.options[index]) {
          handleAnswerClick(currentQ.options[index]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="text-center">
          <div className="w-14 h-14 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 font-bold">מכין את המשפטים...</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50">
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
            className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-3 rounded-xl font-semibold"
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
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50/50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full bg-white rounded-3xl shadow-2xl p-8 text-center"
        >
          <div className="text-5xl mb-4">🧩</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">עדיין אין משפטים</h2>
          <p className="text-gray-500 mb-6 text-sm leading-relaxed">
            המשפטים עדיין נוצרים ברקע, או שטרם למדת מספיק מילים.
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
            <Puzzle className="w-5 h-5 text-pink-500" />
            <span className="font-semibold text-gray-800 hidden sm:inline">השלמת משפטים</span>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            {!isGameOver && (
              <div className="text-sm font-bold text-gray-500" style={{ direction: 'ltr' }}>
                {currentIndex + 1} / {questions.length}
              </div>
            )}
            <SoundToggle />
          </div>
        </div>
      </div>

      {/* --- Level Up Toast --- */}
      <AnimatePresence>
        {levelUpToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-black px-6 py-3 rounded-full shadow-2xl z-50 text-lg border-2 border-yellow-200"
          >
            🎉 עלית לדרגה {levelUpToast}!
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- Flag Toast --- */}
      <div className="flex-1 max-w-2xl mx-auto w-full p-4 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {!isGameOver ? (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              <div className="bg-white rounded-[24px] shadow-xl shadow-pink-100/50 p-6 sm:p-8 mb-6 border border-pink-50 text-center relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-pink-100 to-rose-50 rounded-full blur-2xl opacity-60 pointer-events-none" />
                
                <h3 className="text-xl sm:text-2xl font-black text-gray-800 leading-relaxed relative z-10" dir="ltr">
                  {(() => {
                    const escapedWord = currentQ.word_form.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    let parts = currentQ.sentence.split(new RegExp(`\\b${escapedWord}\\b`, 'i'));
                    if (parts.length === 1) {
                      parts = currentQ.sentence.split(new RegExp(escapedWord, 'i'));
                    }
                    if (parts.length === 1) {
                      // Fallback: blank at the end
                      parts = [currentQ.sentence, ''];
                    }
                    return parts.map((part, index, array) => (
                      <span key={index}>
                        {part}
                        {index < array.length - 1 && (
                          <span className={`inline-block border-b-4 mx-1 px-4 min-w-[80px] transition-colors duration-300 ${
                            selectedAnswer && isCorrect ? 'border-green-400 text-green-600' : 
                            selectedAnswer && !isCorrect ? 'border-red-400 text-red-600' : 
                            'border-gray-300 text-transparent'
                          }`}>
                            {selectedAnswer ? currentQ.word_form : ''}
                          </span>
                        )}
                      </span>
                    ));
                  })()}
                </h3>

                <AnimatePresence>
                  {showTranslation && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 pt-4 border-t border-gray-100"
                    >
                      <p className="text-sm font-bold text-gray-400 mb-1">פירוש המילה:</p>
                      <p className="text-lg font-black text-pink-600">{currentQ.hebrew}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentQ.options.map((option, idx) => {
                  const isSelected = selectedAnswer === option;
                  const isActualCorrect = option === currentQ.word_form;
                  
                  let btnClass = "bg-white border-2 border-gray-200 text-gray-700 hover:border-pink-300 hover:bg-pink-50";
                  
                  if (selectedAnswer) {
                    if (isActualCorrect) {
                      btnClass = "bg-green-50 border-2 border-green-500 text-green-700 font-bold scale-[1.02] shadow-lg shadow-green-200/50 z-10";
                    } else if (isSelected && !isActualCorrect) {
                      btnClass = "bg-red-50 border-2 border-red-500 text-red-700 animate-[shake_0.4s_ease-in-out]";
                    } else {
                      btnClass = "bg-gray-50 border-2 border-gray-200 text-gray-400 opacity-50";
                    }
                  }

                  return (
                    <motion.button
                      key={idx}
                      whileTap={!selectedAnswer ? { scale: 0.96 } : {}}
                      onClick={() => handleAnswerClick(option)}
                      disabled={!!selectedAnswer}
                      className={`p-4 rounded-2xl font-bold text-lg transition-all duration-300 relative overflow-hidden ${btnClass}`}
                      dir="ltr"
                    >
                      <span className="kbd-hint absolute top-1.5 left-2 text-[10px] text-gray-400/80 font-black bg-gray-100/50 px-1.5 py-0.5 rounded leading-none">
                        {idx + 1}
                      </span>
                      {option}
                      {isSelected && isCorrect && (
                        <motion.div 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="absolute right-4 top-1/2 -translate-y-1/2"
                        >
                          <Sparkles className="w-5 h-5 text-green-500" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              {/* Report mistake */}
              <div className="flex flex-col items-center gap-1.5 pt-4">
                {flagExpanded ? (
                  <div className="flex flex-col items-center gap-2 w-full max-w-xs" onClick={e => e.stopPropagation()}>
                    <textarea
                      className="w-full text-xs rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-gray-700 resize-none focus:outline-none focus:ring-1 focus:ring-red-300"
                      rows={2}
                      placeholder="מה השגיאה במשפט? (אופציונלי)"
                      value={flagReason}
                      onChange={e => setFlagReason(e.target.value)}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleFlagSubmit}
                        className="text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-600 font-medium hover:bg-red-200 transition-colors"
                      >
                        שלח דיווח
                      </button>
                      <button
                        onClick={handleFlagCancel}
                        className="text-xs px-3 py-1.5 rounded-full text-gray-400 hover:bg-gray-100 transition-colors"
                      >
                        ביטול
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleFlag}
                    className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                      flagToast
                        ? 'bg-red-50 text-red-500 font-medium'
                        : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                    }`}
                  >
                    <Flag className="w-3 h-3" />
                    {flagToast ? 'דווח — תודה!' : 'דיווח על שגיאה במשפט'}
                  </button>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] shadow-2xl p-8 sm:p-10 text-center max-w-md mx-auto w-full relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-pink-100 to-purple-100 opacity-50" />
              
              <div className="relative z-10">
                <Trophy className="w-20 h-20 text-yellow-400 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-gray-900 mb-2">
                  סיימת!
                </h2>
                <p className="text-gray-500 mb-8 font-medium">ענית נכון על {score} מתוך {questions.length} משפטים.</p>
                
                {wrongAnswers.length > 0 && (
                  <div className="mb-8 bg-gray-50/80 rounded-2xl p-5 border border-red-100 max-h-72 overflow-y-auto custom-scrollbar shadow-inner">
                    <h3 className="font-bold text-red-600 mb-4 text-base flex items-center justify-center gap-2">
                      <XCircle className="w-5 h-5" />
                      משפטים שכדאי לחזור עליהם:
                    </h3>
                    <div className="space-y-4 text-left" dir="ltr">
                      {wrongAnswers.map((wa, i) => {
                        const parts = wa.sentence.split('___');
                        
                        // If the AI correctly put '___', we fill it with the bold word.
                        // If it forgot and just wrote the full sentence, we just highlight the target word if it exists in the sentence.
                        let renderedSentence;
                        if (parts.length > 1) {
                          renderedSentence = (
                            <>
                              {parts[0]}
                              <span className="font-bold text-indigo-600 underline decoration-indigo-300 underline-offset-2 bg-indigo-50/50 px-1 rounded mx-0.5">
                                {wa.word_form}
                              </span>
                              {parts.slice(1).join('___')}
                            </>
                          );
                        } else {
                          // Try to highlight the word if it's in the text
                          const regex = new RegExp(`(${wa.word_form})`, 'gi');
                          const splitByWord = wa.sentence.split(regex);
                          if (splitByWord.length > 1) {
                            renderedSentence = splitByWord.map((segment, idx) => 
                              segment.toLowerCase() === wa.word_form.toLowerCase() ? (
                                <span key={idx} className="font-bold text-indigo-600 underline decoration-indigo-300 underline-offset-2 bg-indigo-50/50 px-1 rounded mx-0.5">
                                  {segment}
                                </span>
                              ) : segment
                            );
                          } else {
                            renderedSentence = <span>{wa.sentence}</span>;
                          }
                        }

                        return (
                          <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                            <p className="text-gray-800 text-[15px] font-medium leading-relaxed">
                              {renderedSentence}
                            </p>
                            <p className="text-gray-500 mt-2 text-sm text-right font-medium" dir="rtl">
                              <span className="font-bold text-gray-400">פירוש המילה:</span> <span className="text-pink-600 font-bold">{wa.hebrew}</span>
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    onClick={loadGame}
                    className="w-full bg-gradient-to-r from-pink-500 to-rose-500 text-white py-4 rounded-xl font-black text-lg shadow-lg shadow-pink-200/50 hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <Puzzle className="w-5 h-5" />
                    שחק שוב
                  </button>
                  <button
                    onClick={() => navigate('/')}
                    className="w-full bg-gray-100 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                  >
                    חזרה לדשבורד
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
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

export default SentenceCompletion;
