import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Zap, BookOpen, Brain, Layers, Target, X } from 'lucide-react';
import SoundToggle from '../components/SoundToggle';
import { useNavigate, useParams } from 'react-router-dom';
import { progressAPI } from '../api/progress';
import { useLanguage } from '../context/LanguageContext';

const MAX_PENDING_REVIEWS = 15;

const UNIT_TOTALS_EN = {
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
    className={`flex flex-col text-right w-full ${action.tourClass ?? ''}
               bg-white/90 backdrop-blur-xl border border-gray-200/70
               rounded-[24px] overflow-hidden
               shadow-lg shadow-gray-200/60
               hover:shadow-2xl hover:shadow-gray-300/60
               hover:-translate-y-1.5 hover:bg-white
               active:scale-[0.98]
               transition-all duration-300 group`}
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
        {action.cta} ←
      </div>
    </div>
  </motion.button>
);

/* ─── UnitDetail ─────────────────────────────────────────────────────── */
const UnitDetail = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const unitNum  = parseInt(id, 10);
  const { language } = useLanguage();
  const [stats, setStats] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [showGatekeeper, setShowGatekeeper] = useState(false);

  useEffect(() => {
    progressAPI.getUnitStats(language)
      .then((data) => {
        const unit = data.units.find((u) => u.unit === unitNum);
        const fallback = language === 'en' ? (UNIT_TOTALS_EN[unitNum] || 0) : 0;
        setStats(unit || { unit: unitNum, learned: 0, total: fallback, percent: 0 });
      })
      .catch(console.error);

    progressAPI.getUnitPendingCount(unitNum, language)
      .then((data) => setPendingCount(data.pending_count ?? 0))
      .catch(console.error);
  }, [unitNum, language]);

  const handleFilterClick = () => {
    if (pendingCount >= MAX_PENDING_REVIEWS) {
      setShowGatekeeper(true);
    } else {
      navigate(`/unit/${unitNum}/filter`);
    }
  };

  const learned   = stats?.learned  ?? 0;
  const total     = stats?.total    ?? UNIT_TOTALS_EN[unitNum] ?? 0;
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
      tourClass:  'tour-filter',
      title:      'סינון מילים',
      subtitle:   'בואו נבדוק מה המצב.',
      detail:     'עושים סדר מהיר: עוברים על המילים החדשות ומסמנים אילו מילים אתם כבר מכירים, ואילו דורשות חיזוק.',
      cta:        'התחל סינון',
      btnGrad:    'from-amber-400 to-orange-500',
      btnShadow:  'shadow-orange-200/60',
      onClick:    handleFilterClick,
    },
    // ── Step 2 ──
    {
      icon:       <BookOpen className="w-5 h-5 text-white" />,
      iconBg:     'bg-gradient-to-br from-violet-500 to-indigo-600',
      iconShadow: 'shadow-indigo-300/60',
      topBar:     'from-violet-500 to-indigo-600',
      tourClass:  'tour-review',
      title:      'שינון ולמידה',
      subtitle:   'הזמן להכניס את המילים לראש.',
      detail:     'למידה ממוקדת בעזרת כרטיסיות: קוראים, הופכים, ומשננים רק את המילים שסיננתם בשלב הקודם עד שהכל יושב טוב.',
      cta:        'התחל שינון',
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
      tourClass:  'tour-quiz',
      title:      'בוחן ומעקב',
      subtitle:   'רגע האמת של הזיכרון.',
      detail:     'תרגול חכם מבוסס אלגוריתם למידה: מילים שהתקשיתם בהן יחזרו מהר כדי לעזור לכם לזכור, ומילים שכבר למדתם יופיעו במרווחים גדולים יותר לטווח הארוך.',
      cta:        'התחל בוחן',
      btnGrad:    'from-emerald-400 to-teal-500',
      btnShadow:  'shadow-emerald-200/60',
      onClick:    () => navigate(`/unit/${unitNum}/quiz`),
    },
  ];

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden flex flex-col relative"
         style={{ background: 'transparent' }}>

      {/* ── Gatekeeper Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {showGatekeeper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={() => setShowGatekeeper(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-7 text-right"
            >
              {/* Close button */}
              <div className="flex justify-between items-start mb-5">
                <button
                  onClick={() => setShowGatekeeper(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
                {/* Warning icon */}
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500
                                flex items-center justify-center shadow-lg shadow-orange-200/60">
                  <span className="text-2xl">⚠️</span>
                </div>
              </div>

              <h2 className="text-xl font-black text-gray-900 mb-3">
                רגע, יש לך פה עבודה!
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-7">
                הצטברו לך{' '}
                <span className="font-black text-orange-500">{pendingCount}</span>
                {' '}מילים שמחכות לשינון ביחידה זו. כדאי לסיים ללמוד אותן לפני שמוסיפים מילים חדשות.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    setShowGatekeeper(false);
                    navigate(`/unit/${unitNum}/review`);
                  }}
                  className="w-full py-3.5 rounded-2xl font-black text-white text-sm
                             bg-gradient-to-r from-violet-500 to-indigo-600
                             shadow-md shadow-indigo-200/60
                             hover:shadow-xl transition-shadow duration-200"
                >
                  עבור לשינון ←
                </button>
                <button
                  onClick={() => setShowGatekeeper(false)}
                  className="w-full py-3 rounded-2xl font-semibold text-sm text-gray-600
                             bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            <ArrowRight className="w-4 h-4" />
            <span className="text-sm font-bold">יחידות</span>
          </button>

          <div className="w-px h-5 bg-gray-200 shrink-0" />

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600
                            flex items-center justify-center shadow-md shadow-indigo-400/40">
              <span className="text-white text-xs font-black">{unitNum}</span>
            </div>
            <div className="leading-tight">
              <p className="text-sm font-black text-gray-900">יחידה {unitNum}</p>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-wide">{total} מילים</p>
            </div>
          </div>

          <div className="flex-1" />

          <div className="hidden sm:flex items-center gap-5 shrink-0">
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 tabular-nums leading-none">{learned}</p>
              <p className="text-[9px] font-bold text-violet-500 uppercase tracking-wide mt-0.5">נלמד</p>
            </div>
            <div className="text-center">
              <p className="text-sm font-black text-gray-900 tabular-nums leading-none">{remaining}</p>
              <p className="text-[9px] font-bold text-gray-600 uppercase tracking-wide mt-0.5">נותר</p>
            </div>
          </div>

          <div className="hidden sm:block w-px h-5 bg-gray-200 shrink-0" />

          <div className="hidden sm:block shrink-0 w-36">
            <div className="flex justify-between text-[10px] font-bold mb-1.5">
              <span className="text-gray-600 uppercase tracking-wide">התקדמות</span>
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

          <SoundToggle className="shrink-0" />
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
                stepLabel="שלב 1"
                icon={<Layers className="w-3 h-3" />}
                title="סינון ומבוא"
                delay={0.1}
              />
            </div>

            {/* Step 2 — 1 col */}
            <div className="col-span-1">
              <StepHeader
                gradient="from-violet-500 to-indigo-600"
                border="border-violet-300"
                stepLabel="שלב 2"
                icon={<BookOpen className="w-3 h-3" />}
                title="שינון ולמידה"
                delay={0.18}
              />
            </div>

            {/* Step 3 — 1 col */}
            <div className="col-span-1">
              <StepHeader
                gradient="from-emerald-400 to-teal-500"
                border="border-emerald-300"
                stepLabel="שלב 3"
                icon={<Target className="w-3 h-3" />}
                title="תרגול ובחינה"
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
