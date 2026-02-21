import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, List, Search, X } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewAPI } from '../api/review';

const UNIT_TOTALS = {
  1: 283, 2: 376, 3: 359, 4: 379, 5: 384,
  6: 386, 7: 387, 8: 404, 9: 388, 10: 396,
};

const WordList = () => {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const unitNum   = parseInt(id, 10);

  const [words,   setWords]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');

  useEffect(() => {
    reviewAPI.getUnitWords(unitNum, 500)
      .then((data) => {
        setWords(data.words || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [unitNum]);

  const filtered = useMemo(() => {
    if (!query.trim()) return words;
    const q = query.trim().toLowerCase();
    return words.filter(
      (w) =>
        w.english.toLowerCase().includes(q) ||
        w.hebrew.includes(query.trim()),
    );
  }, [words, query]);

  return (
    <div className="min-h-[100dvh] flex flex-col relative" style={{ background: 'transparent' }}>

      {/* ── Header ── */}
      <div className="relative z-20 shrink-0 sticky top-0 px-5 pt-4 pb-3">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl mx-auto
                     bg-white/90 backdrop-blur-2xl border border-gray-200/70
                     rounded-2xl px-4 py-3
                     shadow-xl shadow-gray-300/30
                     flex items-center gap-4"
        >
          {/* Back */}
          <button
            onClick={() => navigate(`/unit/${unitNum}`)}
            className="flex items-center gap-1.5 shrink-0 text-gray-700 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">Unit {unitNum}</span>
          </button>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          {/* Title */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600
                            flex items-center justify-center shadow-md shadow-blue-400/40">
              <List className="w-4 h-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-gray-900">Word List</p>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                {loading ? '…' : `${words.length} words`}
              </p>
            </div>
          </div>

          <div className="flex-1" />

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="pl-8 pr-7 py-1.5 text-sm bg-gray-100 rounded-xl border border-gray-200
                         focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:bg-white
                         transition-all w-32 sm:w-48"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 px-5 pb-10 pt-2">
        <div className="max-w-3xl mx-auto">

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <p className="text-lg font-semibold">No words found</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/70
                         rounded-2xl shadow-xl shadow-gray-200/60 overflow-hidden"
            >
              {/* Count bar */}
              <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                  {query ? `${filtered.length} results` : `All ${filtered.length} words`}
                </span>
                <div className="flex gap-6 text-xs font-bold text-gray-400 uppercase tracking-wide">
                  <span className="w-1/2">English</span>
                  <span className="w-1/2 text-right" dir="rtl">עברית</span>
                </div>
              </div>

              {/* Word rows */}
              <div className="divide-y divide-gray-50">
                {filtered.map((word, i) => (
                  <div
                    key={word.word_id}
                    className="flex items-center px-5 py-3 hover:bg-blue-50/40 transition-colors"
                  >
                    {/* Index */}
                    <span className="text-xs text-gray-300 tabular-nums w-8 shrink-0 font-medium">
                      {i + 1}
                    </span>

                    {/* English */}
                    <span className="flex-1 text-sm font-semibold text-gray-800">
                      {word.english}
                    </span>

                    {/* Hebrew */}
                    <span
                      className="flex-1 text-sm font-semibold text-gray-700 text-right"
                      dir="rtl"
                    >
                      {word.hebrew}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordList;
