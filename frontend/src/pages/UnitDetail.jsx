import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Zap, BookOpen, Brain, Layers, Target } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { progressAPI } from '../api/progress';

const UNIT_TOTALS = {
  1: 283, 2: 376, 3: 359, 4: 379, 5: 384,
  6: 386, 7: 387, 8: 404, 9: 388, 10: 396,
};

/* ─── Step Header (desktop header-row cell) ──────────────────────────── */
const StepHeader = ({ gradient, border, stepLabel, icon, title, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
    className={`flex items-center gap-2.5 pb-2.5 border-b-2 ${border}`}
  >
    <span className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg
                      bg-gradient-to-r ${gradient}
                      text-[10px] font-black text-white uppercase tracking-wider shadow-sm`}>
      {icon}
      {stepLabel}
    </span>
    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
      {title}
    </span>
  </motion.div>
);

/* ─── Action Card ─────────────────────────────────────────────────────── */
const ActionCard = ({ action, delay }) => (
  <motion.button
    initial={{ opacity: 0, y: 28 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    onClick={action.onClick}
    className="flex flex-col text-left w-full
               bg-white/90 backdrop-blur-xl border border-gray-200/70
               rounded-[24px] overflow-hidden
               shadow-lg shadow-gray-200/60
               hover:shadow-2xl hover:shadow-gray-300/60
               hover:-translate-y-1.5 hover:bg-white
               active:scale-[0.98]
               transition-all duration-300 group"
  >
    {/* Coloured top accent bar */}
    <div className={`h-[5px] shrink-0 bg-gradient-to-r ${action.topBar}`} />

    {/* Card content */}
    <div className="flex flex-col gap-3 p-5 flex-1">
      {/* Icon + title */}
      <div className="flex items-center gap-3.5">
        <div className={`w-11 h-11 shrink-0 rounded-2xl ${action.iconBg}
                         flex items-center justify-center
                         shadow-lg ${action.iconShadow}
                         group-hover:scale-110 transition-transform duration-300`}>
          {action.icon}
        </div>
        <div className="leading-tight">
          <h3 className="text-[16px] font-black text-gray-900">{action.title}</h3>
          <p className="text-[11px] font-semibold text-gray-500 mt-0.5">{action.subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-[12.5px] text-gray-600 leading-relaxed flex-1">
        {action.detail}
      </p>

      {/* CTA */}
      <div className={`w-full py-2.5 rounded-2xl text-center
                       text-[11px] font-black text-white uppercase tracking-[0.12em]
                       bg-gradient-to-r ${action.btnGrad}
                       shadow-md ${action.btnShadow}
                       group-hover:shadow-xl transition-shadow duration-300`}>
        {action.cta} →
      </div>
    </div>
  </motion.button>
);

/* ─── UnitDetail ─────────────────────────────────────────────────────── */
const UnitDetail = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const unitNum  = parseInt(id, 10);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    progressAPI.getUnitStats()
      .then((data) => {
        const unit = data.units.find((u) => u.unit === unitNum);
        setStats(unit || { unit: unitNum, learned: 0, total: UNIT_TOTALS[unitNum] || 0, percent: 0 });
      })
      .catch(console.error);
  }, [unitNum]);

  const learned   = stats?.learned  ?? 0;
  const total     = stats?.total    ?? UNIT_TOTALS[unitNum] ?? 0;
  const percent   = stats?.percent  ?? 0;
  const remaining = total - learned;
  const completed = percent >= 100;

  const barGrad = completed
    ? 'bg-gradient-to-r from-emerald-400 to-teal-500'
    : 'bg-gradient-to-r from-violet-500 to-indigo-600';

  const actions = [
    // ── Step 1 ──
    {
      icon:       <Zap className="w-5 h-5 text-white" />,
      iconBg:     'bg-gradient-to-br from-amber-400 to-orange-500',
      iconShadow: 'shadow-orange-300/60',
      topBar:     'from-amber-400 to-orange-500',
      title:      'Filter Words',
      subtitle:   'Swipe through — mark what you know',
      detail:     "Quickly sort vocabulary card-by-card. Mark each word as Known or Unknown. Stop once you've found 10 unknowns — they'll form your personalized review list.",
      cta:        'Start Filtering',
      btnGrad:    'from-amber-400 to-orange-500',
      btnShadow:  'shadow-orange-200/60',
      onClick:    () => navigate(`/unit/${unitNum}/filter`),
    },
    // ── Step 2 ──
    {
      icon:       <BookOpen className="w-5 h-5 text-white" />,
      iconBg:     'bg-gradient-to-br from-violet-500 to-indigo-600',
      iconShadow: 'shadow-indigo-300/60',
      topBar:     'from-violet-500 to-indigo-600',
      title:      'Review Session',
      subtitle:   'Study your unknown words in depth',
      detail:     'Study each word with its Hebrew translation, an AI memory tip, and your personal mnemonic. Rate recall quality to update your SM-2 spaced-repetition schedule.',
      cta:        'Start Review',
      btnGrad:    'from-violet-500 to-indigo-600',
      btnShadow:  'shadow-indigo-200/60',
      onClick:    () => navigate(`/unit/${unitNum}/review`),
    },
    // ── Step 3 ──
    {
      icon:       <Brain className="w-5 h-5 text-white" />,
      iconBg:     'bg-gradient-to-br from-emerald-400 to-teal-500',
      iconShadow: 'shadow-emerald-300/60',
      topBar:     'from-emerald-400 to-teal-500',
      title:      'Practice Quiz',
      subtitle:   'Test yourself with multiple-choice',
      detail:     "10 questions drawn from words you've already learned. Four options, one correct answer — the fastest way to convert short-term recall into long-term memory.",
      cta:        'Start Quiz',
      btnGrad:    'from-emerald-400 to-teal-500',
      btnShadow:  'shadow-emerald-200/60',
      onClick:    () => navigate(`/unit/${unitNum}/quiz`),
    },
  ];

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden flex flex-col relative"
         style={{ background: 'transparent' }}>

      {/* ══════════════════════════════════════════════════════════
          HEADER
         ══════════════════════════════════════════════════════════ */}
      <div className="relative z-20 shrink-0 sticky top-0 px-5 pt-4 pb-3">
        <motion.div
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-5xl mx-auto
                     bg-white/90 backdrop-blur-2xl border border-gray-200/70
                     rounded-2xl px-4 py-3
                     shadow-xl shadow-gray-300/30
                     flex items-center gap-4"
        >
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 shrink-0 text-gray-700 hover:text-gray-900 transition-colors duration-200"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-bold">Units</span>
          </button>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
                            flex items-center justify-center shadow-md shadow-indigo-400/40">
              <span className="text-white text-xs font-black">{unitNum}</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-gray-900">Unit {unitNum}</p>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">{total} words</p>
            </div>
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-5 shrink-0">
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 tabular-nums leading-none">{learned}</p>
              <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wide mt-0.5">Learned</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 tabular-nums leading-none">{remaining}</p>
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mt-0.5">Remaining</p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" />

          <div className="hidden sm:block shrink-0 w-36">
            <div className="flex justify-between text-[10px] font-bold mb-1.5">
              <span className="text-gray-600 uppercase tracking-wide">Progress</span>
              <span className={`tabular-nums ${completed ? 'text-emerald-500' : 'text-violet-600'}`}>
                {percent}%
              </span>
            </div>
            <div className="h-[6px] bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className={`h-full rounded-full ${barGrad}`}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          BODY
         ══════════════════════════════════════════════════════════ */}
      <div className="relative z-10 flex-1 lg:min-h-0
                      px-5 pt-4 pb-8 lg:pb-5
                      flex flex-col justify-start lg:justify-center">
        <div className="max-w-5xl mx-auto w-full">

          {/* ── Desktop: step-header row (hidden on mobile) ────────────────
               Same gap-4 as the cards grid below ensures column alignment.
              ──────────────────────────────────────────────────────────── */}
          <div className="hidden lg:grid grid-cols-3 gap-4 mb-3">

            {/* Step 1 — 1 col */}
            <div className="col-span-1">
              <StepHeader
                gradient="from-amber-400 to-orange-500"
                border="border-amber-300"
                stepLabel="Step 1"
                icon={<Layers className="w-3 h-3" />}
                title="Filtering & Introduction"
                delay={0.1}
              />
            </div>

            {/* Step 2 — 1 col */}
            <div className="col-span-1">
              <StepHeader
                gradient="from-violet-500 to-indigo-600"
                border="border-violet-300"
                stepLabel="Step 2"
                icon={<BookOpen className="w-3 h-3" />}
                title="Memorization & Learning"
                delay={0.18}
              />
            </div>

            {/* Step 3 — 1 col */}
            <div className="col-span-1">
              <StepHeader
                gradient="from-emerald-400 to-teal-500"
                border="border-emerald-300"
                stepLabel="Step 3"
                icon={<Target className="w-3 h-3" />}
                title="Practice & Testing"
                delay={0.26}
              />
            </div>
          </div>

          {/* ── Cards grid ────────────────────────────────────────────────
               Mobile: 1 col → tablet: 2 cols → desktop: 3 cols (single row)
              ──────────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {actions.map((action, i) => (
              <ActionCard key={action.title} action={action} delay={0.14 + i * 0.08} />
            ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default UnitDetail;
