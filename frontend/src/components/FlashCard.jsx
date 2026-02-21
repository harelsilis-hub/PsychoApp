import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, Star, BookOpen, Save, Check, Volume2, Pencil, X } from 'lucide-react';
import apiClient from '../api/client';

const FlashCard = ({ word, isNew, onRate, onAssociationSaved }) => {
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

  const wordId = word?.word_id;

  useEffect(() => {
    const fetchAssociations = async () => {
      try {
        const response = await apiClient.get(`/v1/associations/${wordId}`);
        setAiAssociation(response.data.ai_association || '');
        setUserAssociationInput(response.data.user_association || '');
      } catch (error) {
        console.error('Error fetching associations:', error);
      }
    };

    if (wordId) {
      fetchAssociations();
      setAssociationSaved(false);
      setIsFlipped(false);
      setHasFlipped(false);
      setIsEditingSentence(false);
      setSentenceSaved(false);
    }
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
      setAssociationSaved(true);
      setTimeout(() => setAssociationSaved(false), 2000);
      if (onAssociationSaved) onAssociationSaved();
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
    onRate(quality);
    setIsFlipped(false);
    setHasFlipped(false);
  };

  const speakWord = (e) => {
    e.stopPropagation();
    if (!word?.english) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word.english);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full">
      {/* Flip Card */}
      <div className="perspective-1000 mb-6">
        <motion.div
          animate={{ rotateY: isFlipped ? 180 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 100 }}
          className="relative preserve-3d cursor-pointer"
          onClick={handleFlip}
          style={{ minHeight: '340px' }}
        >
          {/* Front — English */}
          <div
            className={`absolute inset-0 backface-hidden bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl shadow-2xl p-6 sm:p-10 flex flex-col items-center justify-center ${
              isFlipped ? 'invisible' : ''
            }`}
          >
            {isNew && (
              <div className="absolute top-5 right-5 bg-yellow-400 text-yellow-900 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5" />
                New Word
              </div>
            )}
            {/* Audio button — icon only, right edge */}
            <button
              onClick={speakWord}
              title="Hear pronunciation"
              className="absolute right-5 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/20 hover:bg-white/30 active:bg-white/40 text-white rounded-full transition-colors"
            >
              <Volume2 className="w-5 h-5" />
            </button>

            <div className="text-center">
              <div className="text-white text-xs uppercase tracking-widest mb-4 opacity-80">
                Try to Recall
              </div>
              <div className="text-white text-4xl sm:text-5xl md:text-6xl font-bold mb-4">
                {word.english}
              </div>
              <div className="text-white text-xs opacity-60 mb-8">
                Unit {word.unit}
              </div>
              <div className="flex items-center justify-center gap-2 text-white opacity-80">
                <RotateCcw className="w-4 h-4" />
                <span>Click to reveal answer</span>
              </div>
            </div>
          </div>

          {/* Back — Hebrew + memory aid */}
          <div
            className={`absolute inset-0 backface-hidden bg-white rounded-3xl shadow-2xl p-5 sm:p-8 flex flex-col ${
              !isFlipped ? 'invisible' : ''
            }`}
            style={{ transform: 'rotateY(180deg)' }}
          >
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-gray-400 text-xs uppercase tracking-widest mb-2">
                עברית (Hebrew)
              </div>
              <div className="text-gray-900 text-3xl sm:text-5xl font-bold mb-6" dir="rtl">
                {word.hebrew}
              </div>

              {/* Example Sentence */}
              <div className="w-full mb-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-purple-500" />
                    <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Example Sentence</span>
                    {sentenceSaved && <Check className="w-3.5 h-3.5 text-green-500" />}
                  </div>
                  {!isEditingSentence && (
                    <button
                      onClick={() => { setSentenceInput(aiAssociation); setIsEditingSentence(true); }}
                      className="text-gray-400 hover:text-purple-600 transition-colors p-1 rounded"
                      title={aiAssociation ? 'Edit sentence' : 'Add sentence'}
                    >
                      <Pencil className="w-3.5 h-3.5" />
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
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-purple-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsEditingSentence(false)}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
                      >
                        <X className="w-3.5 h-3.5" /> Cancel
                      </button>
                      <button
                        onClick={handleSaveSentence}
                        disabled={!sentenceInput.trim() || isSavingSentence}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-40 transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSavingSentence ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : aiAssociation ? (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2.5">
                    <p className="text-sm text-gray-700 italic leading-relaxed">{aiAssociation}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => { setSentenceInput(''); setIsEditingSentence(true); }}
                    className="w-full bg-purple-50 border border-dashed border-purple-300 rounded-xl px-3 py-2.5 text-sm text-purple-400 hover:text-purple-600 hover:border-purple-400 transition-colors text-center"
                  >
                    + Add an example sentence for this word
                  </button>
                )}
              </div>

              {/* Personal Memory Aid Input */}
              <div className="w-full" onClick={(e) => e.stopPropagation()}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Your Memory Aid
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={userAssociationInput}
                    onChange={(e) => setUserAssociationInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveAssociation()}
                    placeholder="e.g. 'Sounds like...', 'Reminds me of...'"
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400"
                  />
                  <button
                    onClick={handleSaveAssociation}
                    disabled={!userAssociationInput.trim() || isSavingAssociation}
                    className="px-3 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    {associationSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                    {isSavingAssociation ? 'Saving…' : associationSaved ? 'Saved!' : 'Save'}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-gray-400 mt-4">
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs">Click card to flip back</span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Rating Buttons */}
      <div className="space-y-3">
        <div className="text-center text-sm text-gray-500">
          {!hasFlipped ? (
            <span className="text-amber-600 font-medium">↑ Flip the card first</span>
          ) : (
            <span className="font-medium text-gray-700">Did you know this word?</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleRate(1)}
            disabled={!hasFlipped}
            className="bg-gradient-to-br from-red-500 to-red-600 text-white py-3 sm:py-5 rounded-2xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 transform transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">✗</span>
              <span>I Don't Know</span>
            </div>
          </button>

          <button
            onClick={() => handleRate(4)}
            disabled={!hasFlipped}
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white py-3 sm:py-5 rounded-2xl font-bold text-lg hover:shadow-lg hover:-translate-y-0.5 transform transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
          >
            <div className="flex flex-col items-center gap-1">
              <span className="text-2xl">✓</span>
              <span>I Know It</span>
            </div>
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          Don't know → Review tomorrow · Know it → Longer interval
        </p>
      </div>
    </div>
  );
};

export default FlashCard;
