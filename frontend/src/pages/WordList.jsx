import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, List, Search, X, Check } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { reviewAPI } from '../api/review';

const MARKS_KEY = 'psychoapp_word_marks';

const loadMarks = () => {
  try { return JSON.parse(localStorage.getItem(MARKS_KEY)) || {}; }
  catch { return {}; }
};

const saveMarks = (marks) => {
  localStorage.setItem(MARKS_KEY, JSON.stringify(marks));
};

const WordList = () => {
  const navigate  = useNavigate();
  const { id }    = useParams();
  const unitNum   = parseInt(id, 10);

  const [words,   setWords]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [query,   setQuery]   = useState('');
  const [filter,  setFilter]  = useState('all'); // 'all' | 'know' | 'dontknow'
  const [marks,   setMarks]   = useState(loadMarks);

  useEffect(() => {
    reviewAPI.getUnitWords(unitNum, 500)
      .then((data) => {
        setWords(data.words || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [unitNum]);

  const toggleMark = (wordId, value) => {
    setMarks((prev) => {
      const next = { ...prev };
      if (next[wordId] === value) {
        delete next[wordId]; // clicking the active button un-marks it
      } else {
        next[wordId] = value;
      }
      saveMarks(next);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let result = words;

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(
        (w) =>
          w.english.toLowerCase().includes(q) ||
          w.hebrew.includes(query.trim()),
      );
    }

    if (filter === 'know')     result = result.filter((w) => marks[w.word_id] === 'know');
    if (filter === 'dontknow') result = result.filter((w) => marks[w.word_id] === 'dontknow');

    return result;
  }, [words, query, filter, marks]);

  const knownCount    = useMemo(() => words.filter((w) => marks[w.word_id] === 'know').length,     [words, marks]);
  const unknownCount  = useMemo(() => words.filter((w) => marks[w.word_id] === 'dontknow').length, [words, marks]);

  const filterTabs = [
    { key: 'all',      label: 'All',     count: words.length },
    { key: 'know',     label: '✓ Know',  count: knownCount   },
    { key: 'dontknow', label: '✗ Don\'t know', count: unknownCount },
  ];

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
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="bg-white/90 backdrop-blur-xl border border-gray-200/70
                         rounded-2xl shadow-xl shadow-gray-200/60 overflow-hidden"
            >
              {/* Count bar + filter tabs */}
              <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
                {/* Filter tabs */}
                <div className="flex gap-1.5">
                  {filterTabs.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilter(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        filter === tab.key
                          ? tab.key === 'know'
                            ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                            : tab.key === 'dontknow'
                            ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                            : 'bg-gray-900 text-white shadow-sm'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        filter === tab.key ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-500'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex-1" />

                <div className="flex gap-6 text-xs font-bold text-gray-400 uppercase tracking-wide">
                  <span>English</span>
                  <span dir="rtl">עברית</span>
                </div>
              </div>

              {/* Word rows */}
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <p className="text-lg font-semibold">No words found</p>
                  <p className="text-sm mt-1">
                    {filter !== 'all'
                      ? 'No words marked in this category yet.'
                      : 'Try a different search term.'}
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {filtered.map((word, i) => {
                    const mark = marks[word.word_id];
                    return (
                      <div
                        key={word.word_id}
                        className={`flex items-center px-5 py-3 transition-colors ${
                          mark === 'know'
                            ? 'hover:bg-emerald-50/60'
                            : mark === 'dontknow'
                            ? 'hover:bg-red-50/60'
                            : 'hover:bg-blue-50/40'
                        }`}
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

                        {/* ✓ / ✗ buttons */}
                        <div className="flex items-center gap-1.5 ml-4 shrink-0">
                          <button
                            onClick={() => toggleMark(word.word_id, 'know')}
                            title="I know this"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              mark === 'know'
                                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-emerald-100 hover:text-emerald-600'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" strokeWidth={3} />
                          </button>
                          <button
                            onClick={() => toggleMark(word.word_id, 'dontknow')}
                            title="I don't know this"
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              mark === 'dontknow'
                                ? 'bg-red-500 text-white shadow-sm shadow-red-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WordList;
