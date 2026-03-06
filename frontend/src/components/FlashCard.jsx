import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Star, BookOpen, Save, Check, Volume2, Pencil, X, Flag, Users, Heart, Crown } from 'lucide-react';
import apiClient from '../api/client';
import { reviewAPI } from '../api/review';
import { useLanguage } from '../context/LanguageContext';
import { useSound } from '../context/SoundContext';

const FlashCard = ({ word, isNew, onRate, onAssociationSaved }) => {
  const { language } = useLanguage();
  const { speakWord, playCorrect, playWrong } = useSound();
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasFlipped, setHasFlipped] = useState(false);
  const [aiAssociation, setAiAssociation] = useState('');
  const [userAssociationInput, setUserAssociationInput] = useState('');
  const [isSavingAssociation, setIsSavingAssociation] = useState(false);
  const [associationSaved, setAssociationSaved] = useState(false);
  const [isEditingSentence, setIsEditingSentence] = useState(false);
  const [sentenceInput, setSentenceInput] = useState('');
  const [isSavingSentence, setIsSavingSentence] = useState(false);
  const [sentenceSaved, setSentenceSaved] = useState(false);
  const [flagToast, setFlagToast] = useState(false);
  const [communityTips, setCommunityTips] = useState([]);
  const [likedTipIds, setLikedTipIds] = useState(() => {
    try {
      const stored = localStorage.getItem('liked_tip_ids');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const [savedAssociation, setSavedAssociation] = useState('');

  const wordId = word?.word_id;

  useEffect(() => {
    if (!wordId) return;

    setAssociationSaved(false);
    setIsFlipped(false);
    setHasFlipped(false);
    setIsEditingSentence(false);
    setSentenceSaved(false);
    setFlagToast(false);
    setCommunityTips([]);
    setSavedAssociation('');

    // Fetch personal associations independently
    apiClient.get(`/v1/associations/${wordId}`)
      .then(res => {
        setAiAssociation(res.data.ai_association || '');
        setUserAssociationInput(res.data.user_association || '');
        setSavedAssociation(res.data.user_association || '');
      })
      .catch(err => console.error('Error fetching associations:', err));

    // Fetch community tips independently so one failure doesn't block the other
    apiClient.get(`/v1/associations/${wordId}/community`)
      .then(res => {
        const sorted = [...res.data]
          .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
        setCommunityTips(sorted);
      })
      .catch(err => console.error('Error fetching community tips:', err));
  }, [wordId]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (!hasFlipped) setHasFlipped(true);
  };

  const handleSaveAssociation = async () => {
    if (!userAssociationInput.trim()) return;
    setIsSavingAssociation(true);
    try {
      await apiClient.post(`/v1/associations/${wordId}`, {
        user_association: userAssociationInput.trim(),
      });
      setSavedAssociation(userAssociationInput.trim());
      setAssociationSaved(true);
      setTimeout(() => setAssociationSaved(false), 2000);
      if (onAssociationSaved) onAssociationSaved();
      // Refresh community tips so the newly saved tip appears
      apiClient.get(`/v1/associations/${wordId}/community`)
        .then(res => {
          const sorted = [...res.data]
            .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
            setCommunityTips(sorted);
        })
        .catch(() => {});
    } catch (error) {
      console.error('Error saving association:', error);
      alert('Failed to save association. Please try again.');
    } finally {
      setIsSavingAssociation(false);
    }
  };

  const handleSaveSentence = async () => {
    if (!sentenceInput.trim()) return;
    setIsSavingSentence(true);
    try {
      await apiClient.put(`/v1/associations/${wordId}/sentence`, {
        sentence: sentenceInput.trim(),
      });
      setAiAssociation(sentenceInput.trim());
      setSentenceSaved(true);
      setIsEditingSentence(false);
      setTimeout(() => setSentenceSaved(false), 2000);
    } catch (error) {
      console.error('Error saving sentence:', error);
    } finally {
      setIsSavingSentence(false);
    }
  };

  const handleRate = (quality) => {
    if (!hasFlipped) return;
    if (quality >= 3) playCorrect(); else playWrong();
    onRate(quality);
    setIsFlipped(false);
    setHasFlipped(false);
  };

  const handleLikeTip = async (tipId) => {
    if (likedTipIds.has(tipId)) return;
    try {
      const res = await apiClient.post(`/v1/associations/${wordId}/like/${tipId}`);
      const newLiked = new Set([...likedTipIds, tipId]);
      setLikedTipIds(newLiked);
      localStorage.setItem('liked_tip_ids', JSON.stringify([...newLiked]));
      setCommunityTips(prev =>
        [...prev.map(t => t.id === tipId ? { ...t, likes: res.data.likes } : t)]
          .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))
      );
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleFlag = async (e) => {
    e.stopPropagation();
    if (flagToast) return;
    try {
      await reviewAPI.flagWord(wordId);
      setFlagToast(true);
      setTimeout(() => setFlagToast(false), 2500);
    } catch (err) {
      console.error('Flag failed:', err);
    }
  };

  const handleSpeak = (e) => {
    e.stopPropagation();
    if (!word?.english) return;
    speakWord(word.english, language === 'he' ? 'he-IL' : 'en-US');
  };

  const myText = savedAssociation.trim();
  const topOtherTip = [...communityTips]
    .filter(t => t.text !== myText)
    .sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0))[0];
  const sortedTips = [...communityTips].sort((a, b) => {
    if (myText && a.text === myText) return -1;
    if (myText && b.text === myText) return 1;
    return (b.likes ?? 0) - (a.likes ?? 0);
  });

  return (
    <div className="w-full flex flex-col gap-3">

      {/* ── Card area — AnimatePresence swaps front ↔ back ── */}
      <div style={{ perspective: '1200px' }}>
        <AnimatePresence mode="wait" initial={false}>
          {!isFlipped ? (
            /* ── FRONT ── */
            <motion.div
              key="front"
              initial={{ rotateY: -90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: 90, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              onClick={handleFlip}
              className="cursor-pointer select-none bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl shadow-xl px-6 py-4 md:py-8 text-center relative flex flex-col items-center justify-center min-h-[130px] md:min-h-[170px]"
            >
              {isNew && (
                <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  מילה חדשה
                </div>
              )}
              <button
                onClick={handleSpeak}
                title="Hear pronunciation"
                className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <div className="text-white/70 text-xs uppercase tracking-widest mb-2">נסה להיזכר</div>
              <div className="text-white text-5xl sm:text-6xl font-bold mb-2">{word.english}</div>
              <div className="text-white/50 text-xs">Unit {word.unit}</div>
            </motion.div>
          ) : (
            /* ── BACK ── */
            <motion.div
              key="back"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
              className="relative bg-white rounded-3xl shadow-xl p-3 md:p-5"
            >
              {/* Flip back button */}
              <button
                onClick={handleFlip}
                title="חזרה לצד הקדמי"
                className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Hebrew answer */}
              <div className="text-center pb-2 mb-2 md:pb-4 md:mb-4 border-b border-gray-100">
                <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">
                  {language === 'he' ? 'הגדרה' : 'עברית (Hebrew)'}
                </div>
                <div className="text-4xl sm:text-5xl font-bold text-gray-900" dir="rtl">
                  {word.hebrew}
                </div>
              </div>

              {/* Example Sentence — English mode only, hidden on mobile to fit in viewport */}
              {language !== 'he' && (
                <div className="hidden md:block mb-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">משפט לדוגמה</span>
                      {sentenceSaved && <Check className="w-3 h-3 text-green-500" />}
                    </div>
                    {!isEditingSentence && (
                      <button
                        onClick={() => { setSentenceInput(aiAssociation); setIsEditingSentence(true); }}
                        className="text-gray-300 hover:text-purple-500 transition-colors p-0.5 rounded"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {isEditingSentence ? (
                    <div className="space-y-2">
                      <textarea
                        autoFocus
                        value={sentenceInput}
                        onChange={(e) => setSentenceInput(e.target.value)}
                        placeholder={`e.g. "The exam was difficult; however, most students passed."`}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-purple-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => setIsEditingSentence(false)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 border border-gray-200 rounded-lg"
                        >
                          <X className="w-3 h-3" /> ביטול
                        </button>
                        <button
                          onClick={handleSaveSentence}
                          disabled={!sentenceInput.trim() || isSavingSentence}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-purple-600 text-white rounded-lg disabled:opacity-40"
                        >
                          <Save className="w-3 h-3" /> {isSavingSentence ? 'שומר...' : 'שמור'}
                        </button>
                      </div>
                    </div>
                  ) : aiAssociation ? (
                    <div className="bg-purple-50 border border-purple-100 rounded-xl px-3 py-2">
                      <p className="text-sm text-gray-600 italic leading-relaxed">{aiAssociation}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setSentenceInput(''); setIsEditingSentence(true); }}
                      className="w-full text-xs text-purple-400 hover:text-purple-600 py-1.5 border border-dashed border-purple-200 rounded-xl transition-colors"
                    >
                      + הוסף משפט לדוגמה
                    </button>
                  )}
                </div>
              )}

              {/* Memory Aid */}
              <div onClick={(e) => e.stopPropagation()}>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                  עזר הזיכרון שלך
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userAssociationInput}
                    onChange={(e) => setUserAssociationInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveAssociation()}
                    placeholder={language === 'he' ? 'למשל: "נשמע כמו...", "מזכיר לי..."' : "e.g. 'Sounds like...', 'Reminds me of...'"}
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    onClick={handleSaveAssociation}
                    disabled={!userAssociationInput.trim() || isSavingAssociation}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    {associationSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Community Tips — always open, always visible ── */}
      <div className="rounded-2xl border border-purple-100 bg-purple-50 p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Users className="w-3.5 h-3.5 text-purple-500" />
          <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">עזרי זיכרון מהקהילה</span>
        </div>
        {communityTips.length > 0 ? (
          <div className="overflow-y-auto max-h-40 space-y-1.5">
            {sortedTips.map((tip) => {
              const isMine = myText && tip.text === myText;
              const isTop = topOtherTip && tip.id === topOtherTip.id;
              return (
                <div
                  key={tip.id}
                  className={`rounded-xl px-3 py-2 flex items-start gap-2 ${
                    isMine ? 'bg-purple-50 border border-purple-200' : isTop ? 'bg-white border border-amber-200' : 'bg-white border border-gray-100'
                  }`}
                >
                  {isMine
                    ? <span className="text-xs font-bold text-purple-500 flex-shrink-0 mt-0.5">שלי</span>
                    : isTop && <Crown className="w-3 h-3 text-amber-500 flex-shrink-0 mt-0.5" />
                  }
                  <p className="text-sm text-gray-700 flex-1 leading-snug">"{tip.text}"</p>
                  <button
                    onClick={() => handleLikeTip(tip.id)}
                    disabled={likedTipIds.has(tip.id)}
                    className={`flex items-center gap-0.5 flex-shrink-0 mt-0.5 px-1.5 py-0.5 rounded-full transition-colors ${
                      likedTipIds.has(tip.id)
                        ? 'text-red-500 bg-red-50'
                        : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                    }`}
                  >
                    <Heart className={`w-3 h-3 ${likedTipIds.has(tip.id) ? 'fill-red-400' : ''}`} />
                    <span className="text-xs">{tip.likes}</span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-purple-400 text-center py-1">אין עדיין עזרי זיכרון — היה הראשון!</p>
        )}
      </div>

      {/* ── Actions ── */}
      <AnimatePresence mode="wait" initial={false}>
        {!isFlipped ? (
          /* Single reveal button — shown whenever front card is visible */
          <motion.button
            key="reveal"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            onClick={handleFlip}
            className="w-full py-3 md:py-4 rounded-2xl font-bold text-base text-white bg-gradient-to-r from-purple-500 to-blue-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transform transition-all flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            חשוף תשובה
          </motion.button>
        ) : (
          /* Know / Don't Know buttons after flip */
          <motion.div
            key="rate"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}
            className="space-y-2"
          >
            <div className="text-center text-sm font-semibold text-gray-500">האם ידעת מילה זו?</div>
            {/* Know first → RIGHT in RTL grid */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleRate(4)}
                className="bg-gradient-to-br from-green-500 to-emerald-600 text-white py-2.5 md:py-4 rounded-2xl font-bold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transform transition-all"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl">✓</span>
                  <span>ידעתי</span>
                </div>
              </button>
              <button
                onClick={() => handleRate(1)}
                className="bg-gradient-to-br from-red-500 to-rose-600 text-white py-2.5 md:py-4 rounded-2xl font-bold text-lg shadow-md hover:shadow-lg hover:-translate-y-0.5 transform transition-all"
              >
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-2xl">✗</span>
                  <span>לא ידעתי</span>
                </div>
              </button>
            </div>
            <div className="flex justify-center">
              <button
                onClick={handleFlag}
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full transition-colors ${
                  flagToast ? 'bg-red-50 text-red-500 font-medium' : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
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
  );
};

export default FlashCard;
