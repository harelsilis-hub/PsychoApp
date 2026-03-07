import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Flag, Search, Plus, Trash2, Save, X, Database, AlertTriangle, Users, ChevronDown, ChevronUp, MessageSquare, CheckCheck, Bell } from 'lucide-react';
import { adminAPI } from '../api/admin';
import { testPushNotification, subscribeToPush } from '../api/push';

// ─── Inline editable word row ─────────────────────────────────────────────────

const WordRow = ({ word, onSaved, onDeleted, showFlag = false }) => {
  const [editing, setEditing]     = useState(false);
  const [english, setEnglish]     = useState(word.english);
  const [hebrew, setHebrew]       = useState(word.hebrew);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(false);
  const [toast, setToast]         = useState(null);

  const handleSave = async () => {
    if (!english.trim() || !hebrew.trim()) return;
    setSaving(true);
    try {
      const updated = await adminAPI.editWord(word.id, { english: english.trim(), hebrew: hebrew.trim() });
      setToast('Saved!');
      setTimeout(() => setToast(null), 2000);
      setEditing(false);
      onSaved?.(updated);
    } catch (err) {
      console.error(err);
      setToast('Error saving');
      setTimeout(() => setToast(null), 2000);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${word.english}" (${word.hebrew})? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await adminAPI.deleteWord(word.id);
      onDeleted?.(word.id);
    } catch (err) {
      console.error(err);
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setEnglish(word.english);
    setHebrew(word.hebrew);
    setEditing(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="flex flex-wrap items-center gap-2 p-3 bg-white border border-gray-100 rounded-xl shadow-sm"
    >
      <span className="text-xs font-mono text-gray-300 w-10 shrink-0">#{word.id}</span>
      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">Unit {word.unit}</span>

      {showFlag && word.is_flagged && (
        <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
          <Flag className="w-2.5 h-2.5" /> flagged
        </span>
      )}

      {editing ? (
        <>
          <input
            value={english}
            onChange={(e) => setEnglish(e.target.value)}
            className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="English"
          />
          <input
            value={hebrew}
            onChange={(e) => setHebrew(e.target.value)}
            dir="rtl"
            className="flex-1 min-w-[120px] px-2 py-1 text-sm border border-violet-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="Hebrew"
          />
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-3 h-3" />
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <X className="w-3 h-3" /> Cancel
          </button>
          {toast && <span className="text-xs text-violet-500 font-medium">{toast}</span>}
        </>
      ) : (
        <>
          <span className="flex-1 min-w-[100px] text-sm font-medium text-gray-800">{word.english}</span>
          <span className="flex-1 min-w-[100px] text-sm text-gray-700" dir="rtl">{word.hebrew}</span>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-violet-50 hover:text-violet-600 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-400 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? '…' : 'Delete'}
          </button>
        </>
      )}
    </motion.div>
  );
};

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section = ({ icon: Icon, title, badge, color = 'violet', children }) => {
  const [open, setOpen] = useState(true);
  const colors = {
    violet: 'bg-violet-100 text-violet-700',
    red:    'bg-red-100 text-red-600',
    blue:   'bg-blue-100 text-blue-700',
    green:  'bg-green-100 text-green-700',
  };
  return (
    <div className="bg-white/70 backdrop-blur border border-gray-200/70 rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-bold text-gray-900 flex-1 text-left">{title}</span>
        {badge !== undefined && (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${colors[color]}`}>{badge}</span>
        )}
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 pt-1">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Admin Panel ──────────────────────────────────────────────────────────────

const Admin = () => {
  const [stats, setStats]           = useState(null);
  const [users, setUsers]           = useState([]);
  const [flagged, setFlagged]       = useState([]);
  const [feedback, setFeedback]     = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searching, setSearching]   = useState(false);
  const [newEnglish, setNewEnglish] = useState('');
  const [newHebrew, setNewHebrew]   = useState('');
  const [newUnit, setNewUnit]       = useState('1');
  const [adding, setAdding]         = useState(false);
  const [addToast, setAddToast]     = useState(null);
  const [pushStatus, setPushStatus] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [s, f, u, fb] = await Promise.all([
      adminAPI.getStats().catch(() => null),
      adminAPI.getFlagged().catch(() => ({ words: [] })),
      adminAPI.getUsers().catch(() => ({ users: [] })),
      adminAPI.getFeedback().catch(() => ({ feedback: [] })),
    ]);
    if (s) setStats(s);
    setFlagged(f.words || []);
    setUsers(u.users || []);
    setFeedback(fb.feedback || []);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const data = await adminAPI.searchWords(searchQuery.trim());
      setSearchResults(data.words || []);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch(e);
  };

  const handleAddWord = async () => {
    if (!newEnglish.trim() || !newHebrew.trim()) return;
    setAdding(true);
    try {
      await adminAPI.addWord({ english: newEnglish.trim(), hebrew: newHebrew.trim(), unit: parseInt(newUnit) });
      setNewEnglish('');
      setNewHebrew('');
      setAddToast('Word added!');
      setTimeout(() => setAddToast(null), 2500);
      loadData(); // refresh stats
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Error adding word';
      setAddToast(msg);
      setTimeout(() => setAddToast(null), 3000);
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Delete user "${user.email}"? This will permanently remove all their data.`)) return;
    try {
      await adminAPI.deleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      alert(err?.response?.data?.detail || 'Error deleting user');
    }
  };

  const removeFlagged = (id) => {
    setFlagged((prev) => prev.filter((w) => w.id !== id));
    setStats((s) => s ? { ...s, flagged_count: Math.max(0, s.flagged_count - 1) } : s);
  };

  const updateFlaggedWord = (updated) => {
    // on save, the word is unflagged — remove from inbox
    removeFlagged(updated.id);
  };

  const removeSearchResult = (id) => {
    setSearchResults((prev) => prev ? prev.filter((w) => w.id !== id) : prev);
  };

  const updateSearchResult = (updated) => {
    setSearchResults((prev) =>
      prev ? prev.map((w) => w.id === updated.id ? { ...w, ...updated } : w) : prev
    );
  };

  return (
    <div className="min-h-screen px-4 py-8 max-w-3xl mx-auto space-y-5">

      {/* Page header */}
      <div className="mb-2">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Admin Panel</h1>
        <p className="text-sm text-gray-500 mt-1">Word database management — local testing mode</p>
      </div>

      {/* ── Push Notifications Test ──────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/70 backdrop-blur border border-gray-200/70 rounded-2xl shadow-sm p-5 flex items-center gap-4"
      >
        <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
          <Bell className="w-6 h-6 text-violet-700" />
        </div>
        <div className="flex-1">
          <p className="font-black text-gray-900">Push Notifications</p>
          <p className="text-xs text-gray-500 mt-0.5">{pushStatus || 'Send a test streak reminder to yourself'}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={async () => {
              try {
                await subscribeToPush();
                setPushStatus('Subscribed!');
              } catch (err) {
                setPushStatus(`Error: ${err.message}`);
              }
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
          >
            Enable
          </button>
          <button
            onClick={async () => {
              try {
                const res = await testPushNotification();
                setPushStatus(res.ok ? `Sent to ${res.sent} device(s)` : res.detail);
              } catch {
                setPushStatus('Error — are you subscribed?');
              }
            }}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
          >
            Test Send
          </button>
        </div>
      </motion.div>

      {/* ── Section 1: Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/70 backdrop-blur border border-gray-200/70 rounded-2xl shadow-sm p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-violet-100 rounded-xl flex items-center justify-center shrink-0">
            <Database className="w-6 h-6 text-violet-700" />
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900 tabular-nums">
              {stats ? stats.total_words.toLocaleString() : '—'}
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">Total Words</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
          className="bg-white/70 backdrop-blur border border-gray-200/70 rounded-2xl shadow-sm p-5 flex items-center gap-4"
        >
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <Flag className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="text-3xl font-black text-gray-900 tabular-nums">
              {stats ? stats.flagged_count : '—'}
            </p>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-0.5">Flagged</p>
          </div>
        </motion.div>
      </div>

      {/* ── Section 2: Users ─────────────────────────────────────────────────── */}
      <Section icon={Users} title="Registered Users" badge={users.length} color="violet">
        {users.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No users registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                  <th className="pb-2 pr-4">#</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Joined</th>
                  <th className="pb-2 pr-4">Streak</th>
                  <th className="pb-2 pr-4">Today</th>
                  <th className="pb-2 pr-4">Last Active</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className="text-gray-700 hover:bg-gray-50/50">
                    <td className="py-2.5 pr-4 font-mono text-xs text-gray-300">{u.id}</td>
                    <td className="py-2.5 pr-4 font-medium">{u.email}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-1">
                        🔥 <span className="font-semibold">{u.current_streak}</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 tabular-nums">{u.daily_words_reviewed}</td>
                    <td className="py-2.5 pr-4 text-xs text-gray-400">{u.last_active_date || '—'}</td>
                    <td className="py-2.5">
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                        title="Delete user"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* ── Section 4: Flagged Inbox ─────────────────────────────────────────── */}
      <Section icon={AlertTriangle} title="Flagged Inbox" badge={flagged.length} color="red">
        {flagged.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No flagged words — inbox is clean ✓</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-gray-400 mb-3">
              Edit the translation to fix and auto-unflag, or delete the word entirely.
            </p>
            <AnimatePresence>
              {flagged.map((w) => (
                <WordRow
                  key={w.id}
                  word={w}
                  onSaved={updateFlaggedWord}
                  onDeleted={removeFlagged}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Section>

      {/* ── Section 3: Dictionary Search ─────────────────────────────────────── */}
      <Section icon={Search} title="Dictionary Search" color="blue">
        <div className="flex gap-2 mb-4">
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search English or Hebrew…"
            className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !searchQuery.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            <Search className="w-3.5 h-3.5" />
            {searching ? 'Searching…' : 'Search'}
          </button>
        </div>

        {searchResults !== null && (
          <div className="space-y-2">
            {searchResults.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">No results found</p>
            ) : (
              <>
                <p className="text-xs text-gray-400 mb-2">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
                <AnimatePresence>
                  {searchResults.map((w) => (
                    <WordRow
                      key={w.id}
                      word={w}
                      showFlag
                      onSaved={updateSearchResult}
                      onDeleted={removeSearchResult}
                    />
                  ))}
                </AnimatePresence>
              </>
            )}
          </div>
        )}
      </Section>

      {/* ── Section 4: Add Word ───────────────────────────────────────────────── */}
      <Section icon={Plus} title="Add New Word" color="green">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">English</label>
            <input
              value={newEnglish}
              onChange={(e) => setNewEnglish(e.target.value)}
              placeholder="e.g. enormous"
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hebrew</label>
            <input
              value={newHebrew}
              onChange={(e) => setNewHebrew(e.target.value)}
              placeholder="עצום"
              dir="rtl"
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Unit</label>
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400 bg-white"
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map((u) => (
                <option key={u} value={u}>Unit {u}</option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddWord}
            disabled={adding || !newEnglish.trim() || !newHebrew.trim()}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            {adding ? 'Adding…' : 'Add Word'}
          </button>
        </div>
        {addToast && (
          <motion.p
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm font-medium mt-3 ${
              addToast.includes('Error') || addToast.includes('error')
                ? 'text-red-500'
                : 'text-green-600'
            }`}
          >
            {addToast}
          </motion.p>
        )}
      </Section>

      {/* ── Section 5: Feedback Inbox ────────────────────────────────────────── */}
      <Section
        icon={MessageSquare}
        title="Feedback Inbox"
        badge={feedback.filter((f) => !f.is_read).length || undefined}
        color="blue"
      >
        {feedback.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No feedback yet.</p>
        ) : (
          <div className="space-y-3">
            {feedback.map((f) => (
              <motion.div
                key={f.id}
                layout
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-xl border ${
                  f.is_read
                    ? 'bg-gray-50 border-gray-100'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        f.category === 'bug'   ? 'bg-red-100 text-red-600' :
                        f.category === 'idea'  ? 'bg-amber-100 text-amber-700' :
                                                  'bg-gray-100 text-gray-600'
                      }`}>
                        {f.category === 'bug' ? '🐛 Bug' : f.category === 'idea' ? '💡 Idea' : '💬 General'}
                      </span>
                      <span className="text-xs text-gray-400">{f.user_email}</span>
                      <span className="text-xs text-gray-300">
                        {f.created_at ? new Date(f.created_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed" dir="rtl">{f.message}</p>
                  </div>
                  {!f.is_read && (
                    <button
                      onClick={async () => {
                        await adminAPI.markFeedbackRead(f.id);
                        setFeedback((prev) => prev.map((x) => x.id === f.id ? { ...x, is_read: true } : x));
                      }}
                      className="shrink-0 flex items-center gap-1 text-xs px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
};

export default Admin;
