import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Save, Check, CheckCircle, XCircle } from 'lucide-react';
import apiClient from '../api/client';

/**
 * StudyCard — full study card for Review Session (post-filter mode).
 *
 * Shows English + Hebrew + AI association + user association immediately,
 * with simple Known / Unknown binary buttons.
 *
 * Props:
 *   word        — { word_id, english, hebrew, unit }
 *   onKnown()   — called when user marks word as Known  (quality 4)
 *   onUnknown() — called when user marks word as Unknown (quality 1)
 *   disabled    — disable buttons while submitting
 */
const StudyCard = ({ word, onKnown, onUnknown, disabled }) => {
  const [aiAssociation, setAiAssociation] = useState('');
  const [userInput, setUserInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const wordId = word?.word_id;

  useEffect(() => {
    if (!wordId) return;
    setSaved(false);
    setAiAssociation('');
    setUserInput('');

    apiClient
      .get(`/v1/associations/${wordId}`)
      .then((res) => {
        setAiAssociation(res.data.ai_association || '');
        setUserInput(res.data.user_association || '');
      })
      .catch(() => {});
  }, [wordId]);

  const handleSave = async () => {
    if (!userInput.trim()) return;
    setSaving(true);
    try {
      await apiClient.post(`/v1/associations/${wordId}`, {
        user_association: userInput.trim(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent — association save is optional
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      key={wordId}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-3xl shadow-xl overflow-hidden"
    >
      {/* ── Top gradient band ── */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-7 text-center">
        <div className="text-white/70 text-xs uppercase tracking-widest mb-3">English</div>
        <div className="text-white text-5xl font-bold mb-4 leading-tight">{word.english}</div>
        <div className="text-white/60 text-xs">Unit {word.unit}</div>
      </div>

      {/* ── Body ── */}
      <div className="px-8 py-6 space-y-5">
        {/* Hebrew */}
        <div className="bg-purple-50 rounded-2xl p-4 text-center">
          <div className="text-xs text-gray-400 uppercase tracking-widest mb-1">עברית</div>
          <div className="text-4xl font-bold text-gray-800" dir="rtl">{word.hebrew}</div>
        </div>

        {/* AI Association */}
        {aiAssociation && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <Lightbulb className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
                AI Memory Tip
              </span>
            </div>
            <p className="text-sm text-gray-700 italic leading-relaxed">{aiAssociation}</p>
          </div>
        )}

        {/* User Association */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
            Your Memory Aid
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="e.g. 'Sounds like…'"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl
                         focus:outline-none focus:ring-2 focus:ring-purple-400"
            />
            <button
              onClick={handleSave}
              disabled={!userInput.trim() || saving}
              className="px-3 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium
                         hover:bg-purple-700 disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {saving ? '…' : saved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>

        {/* Known / Unknown buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onUnknown}
            disabled={disabled}
            className="bg-gradient-to-br from-red-500 to-rose-600 text-white py-4 rounded-2xl
                       font-bold text-base hover:shadow-lg hover:-translate-y-0.5 transform
                       transition-all disabled:opacity-50 active:scale-95"
          >
            <XCircle className="w-5 h-5 mx-auto mb-1" />
            Still Unsure
          </button>
          <button
            onClick={onKnown}
            disabled={disabled}
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white py-4 rounded-2xl
                       font-bold text-base hover:shadow-lg hover:-translate-y-0.5 transform
                       transition-all disabled:opacity-50 active:scale-95"
          >
            <CheckCircle className="w-5 h-5 mx-auto mb-1" />
            Got It!
          </button>
        </div>
        <p className="text-center text-xs text-gray-400">
          "Got It" → scheduled for review · "Still Unsure" → back tomorrow
        </p>
      </div>
    </motion.div>
  );
};

export default StudyCard;
