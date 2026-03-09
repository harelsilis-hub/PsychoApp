import { useState, useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquarePlus, Sparkles, Rocket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const tourKey  = (userId) => `mila_tour_done_${userId}`;
const welcomeKey = (userId) => `mila_welcome_done_${userId}`;
const v2Key    = (userId) => `mila_v2_seen_${userId}`;
const TOTAL = 6;

const Dots = ({ current }) => (
  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '18px' }}>
    {Array.from({ length: TOTAL }).map((_, i) => (
      <div
        key={i}
        style={{
          width: i === current ? '22px' : '8px',
          height: '8px',
          borderRadius: '4px',
          background: i === current ? '#7c3aed' : '#e5e7eb',
          transition: 'all 0.3s ease',
        }}
      />
    ))}
  </div>
);

const C = ({ text, step }) => (
  <div>
    <p style={{ margin: 0 }}>{text}</p>
    <Dots current={step} />
  </div>
);

const buildSteps = (mobile) => [
  {
    target: 'body',
    placement: 'center',
    title: '👋 ברוכים הבאים ללמידה חכמה!',
    content: <C text="קחו סיור קצר כדי לראות איך לומדים מילים ביעילות בשיטה המדעית: סינון ← שינון ← מבחן ← חזרה יומית." step={0} />,
    disableBeacon: true,
  },
  {
    target: '.tour-language',
    placement: mobile ? 'top' : 'bottom',
    title: '🌐 בחירת שפה',
    content: <C text="בחרו אם לתרגל אוצר מילים באנגלית (English ← עברית) או בעברית (מילה ← הגדרה). אפשר להחליף בכל רגע." step={1} />,
    disableBeacon: true,
  },
  {
    target: mobile ? '.tour-streak-mobile' : '.tour-streak',
    placement: mobile ? 'bottom' : 'auto',
    title: '🔥 רצף יומי וחזרה יומית',
    content: <C text="הסוד לזיכרון הוא התמדה! היכנסו כל יום לחזרה היומית — המילים שהגיע הזמן לרענן מחכות לכם בדשבורד, עם ניקוד כפול." step={2} />,
    disableBeacon: true,
  },
  {
    target: '.tour-filter',
    placement: mobile ? 'top' : 'auto',
    title: '🔍 צעד 1: סינון',
    content: <C text="מפרידים את המילים שאתם כבר מכירים מאלה שדורשות למידה — כדי לא לבזבז זמן על מה שכבר ברור." step={3} />,
    disableBeacon: true,
  },
  {
    target: '.tour-review',
    placement: mobile ? 'top' : 'auto',
    title: '🧠 צעד 2: שינון',
    content: <C text="כעת משננים רק את המילים שלא הכרתם בסינון. תוכלו להיעזר באסוציאציות שתלמידים אחרים יצרו, או לכתוב משלכם כדי לזכור טוב יותר." step={4} />,
    disableBeacon: true,
  },
  {
    target: '.tour-quiz',
    placement: mobile ? 'top' : 'auto',
    title: '✅ צעד 3: מבחן לאחר שינון',
    content: <C text="בוחן אמריקאי: תשובה נכונה מעבירה את המילה לאלגוריתם החזרה היומית. טעות? המילה חוזרת בסוף הבוחן. ממשיכים עד שהכל מקבל וי ירוק." step={5} />,
    disableBeacon: true,
  },
];

const tourStyles = {
  options: {
    primaryColor: '#7c3aed',
    textColor: '#374151',
    backgroundColor: '#ffffff',
    arrowColor: '#ffffff',
    zIndex: 10000,
    overlayColor: 'rgba(15, 10, 40, 0.6)',
    width: 340,
  },
  tooltip: {
    fontFamily: 'Heebo, sans-serif',
    direction: 'rtl',
    textAlign: 'right',
    borderRadius: '20px',
    padding: '0',
    boxShadow: '0 20px 60px rgba(124, 58, 237, 0.22), 0 4px 16px rgba(0,0,0,0.12)',
    overflow: 'hidden',
    border: '1px solid rgba(124, 58, 237, 0.12)',
  },
  tooltipTitle: {
    fontSize: '17px',
    fontWeight: '900',
    textAlign: 'right',
    color: '#1f2937',
    padding: '22px 22px 0',
    marginBottom: '10px',
    letterSpacing: '-0.2px',
  },
  tooltipContent: {
    fontSize: '14px',
    lineHeight: '1.75',
    textAlign: 'right',
    color: '#6b7280',
    padding: '0 22px',
  },
  tooltipFooter: {
    flexDirection: 'row-reverse',
    padding: '14px 22px 20px',
    marginTop: '6px',
    borderTop: '1px solid #f3f4f6',
    gap: '8px',
  },
  buttonNext: {
    background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '700',
    padding: '10px 22px',
    fontFamily: 'Heebo, sans-serif',
    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.45)',
    border: 'none',
    color: '#ffffff',
    cursor: 'pointer',
  },
  buttonBack: {
    color: '#7c3aed',
    fontSize: '13px',
    fontWeight: '600',
    fontFamily: 'Heebo, sans-serif',
    border: '1.5px solid #ede9fe',
    borderRadius: '10px',
    padding: '8px 16px',
    marginRight: '0',
    marginLeft: '0',
    background: '#faf5ff',
    cursor: 'pointer',
  },
  buttonSkip: {
    color: '#9ca3af',
    fontSize: '13px',
    fontFamily: 'Heebo, sans-serif',
    marginLeft: 'auto',
    marginRight: '0',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '0 4px',
    textDecoration: 'underline',
    textUnderlineOffset: '3px',
  },
  buttonClose: {
    top: '14px',
    left: '14px',
    right: 'auto',
    color: '#9ca3af',
    fontSize: '18px',
    padding: '4px',
    width: '28px',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
  },
  spotlight: {
    borderRadius: '16px',
    boxShadow: '0 0 0 4px rgba(124, 58, 237, 0.3), 0 0 0 9999px rgba(15,10,40,0.6)',
  },
};

const locale = {
  back: 'חזרה →',
  close: 'סגור',
  last: '🎉 סיום!',
  next: 'הבא ←',
  skip: 'דלג',
};

// ─── Post-tour welcome modal (shown to new users after they finish the tour) ───
const WelcomeModal = ({ onClose }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[20000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,10,40,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        <div className="h-2 w-full bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500" />
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="px-7 pt-6 pb-7 text-right">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-violet-600" />
            </div>
          </div>
          <h2 className="text-xl font-black text-gray-900 mb-3 leading-snug">
            ברוכים הבאים! 🎉
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">
            האתר שלנו עדיין צעיר, ואנחנו בונים אותו עם המון אהבה ותשוקה — צעד אחד קדימה בכל יום.
          </p>
          <p className="text-sm text-gray-600 leading-relaxed mb-5">
            יש לכם רעיון לשיפור או ראיתם משהו שלא עובד כמו שצריך?{' '}
            <span className="font-bold text-violet-700">נשמח לשמוע!</span> לחצו על הכפתור הסגול בפינה השמאלית התחתונה של המסך:
          </p>
          <div className="flex items-center gap-3 bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-3.5 mb-5">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
              <MessageSquarePlus className="w-[18px] h-[18px] text-white" />
            </div>
            <p className="text-xs text-gray-700 font-medium leading-snug">
              כפתור המשוב — דווח על באג, שתף רעיון, או פשוט תגיד שלום 👋
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-2xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200"
          >
            בואו נתחיל ללמוד! 🚀
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// ─── V2 Announcement modal (shown once to existing users only) ─────────────────
const V2Modal = ({ onClose }) => (
  <AnimatePresence>
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[20000] flex items-center justify-center p-4"
      style={{ background: 'rgba(15,10,40,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.88, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.88, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        dir="rtl"
      >
        {/* Gradient top bar */}
        <div className="h-2 w-full bg-gradient-to-r from-violet-500 via-indigo-500 to-purple-500" />

        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-7 pt-6 pb-7 text-right">
          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-indigo-100 flex items-center justify-center">
              <Rocket className="w-8 h-8 text-violet-600" />
            </div>
          </div>

          <h2 className="text-xl font-black text-gray-900 mb-1 leading-snug">
            שדרגנו לכם את הלמידה! 🚀
          </h2>
          <p className="text-sm text-gray-500 mb-4 leading-relaxed">
            הפרדנו בין לימוד יחידות חדשות לחזרה היומית כדי לעזור לכם לזכור טוב יותר. מהיום:
          </p>

          {/* Feature list */}
          <div className="space-y-3 mb-6">
            <div className="flex items-start gap-3 bg-emerald-50 rounded-2xl p-3.5">
              <span className="text-xl shrink-0 mt-0.5">✅</span>
              <div>
                <p className="text-sm font-black text-emerald-800">מבחן לאחר שינון</p>
                <p className="text-xs text-emerald-700 leading-snug mt-0.5">
                  בתוך היחידות, תתרגלו רק את המילים החדשות עד לשליטה מלאה.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-violet-50 rounded-2xl p-3.5">
              <span className="text-xl shrink-0 mt-0.5">📅</span>
              <div>
                <p className="text-sm font-black text-violet-800">חזרה יומית</p>
                <p className="text-xs text-violet-700 leading-snug mt-0.5">
                  בכפתור הסגול החדש בדאשבורד יחכו לכם המילים שהגיע הזמן לרענן, עם ניקוד כפול!
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 bg-amber-50 rounded-2xl p-3.5">
              <span className="text-xl shrink-0 mt-0.5">🔥</span>
              <div>
                <p className="text-sm font-black text-amber-800">מצב חרישה</p>
                <p className="text-xs text-amber-700 leading-snug mt-0.5">
                  סיימתם הכל ורוצים עוד? כפתור החרישה יאפשר לכם לתרגל בלי סוף.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-2xl text-sm font-bold hover:from-violet-700 hover:to-indigo-700 transition-all shadow-lg shadow-violet-200"
          >
            הבנתי, בואו נתחיל! 🚀
          </button>
        </div>
      </motion.div>
    </motion.div>
  </AnimatePresence>
);

// ─── Main OnboardingTour ───────────────────────────────────────────────────────
const OnboardingTour = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showV2, setShowV2] = useState(false);

  const isMobile = () => window.innerWidth < 640;

  useEffect(() => {
    if (!user) return;
    const onDashboard = location.pathname === '/' || location.pathname === '/dashboard';
    if (!onDashboard) return;

    const tourDone = localStorage.getItem(tourKey(user.id));
    const v2Done   = localStorage.getItem(v2Key(user.id));

    // Existing user: has finished the old tour but hasn't seen the V2 announcement
    if (tourDone && !v2Done) {
      const t = setTimeout(() => setShowV2(true), 600);
      return () => clearTimeout(t);
    }

    // New user: hasn't done the tour yet → start the onboarding
    if (!tourDone) {
      const t = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(t);
    }
  }, [location.pathname, user]);

  const goToUnit = () => {
    setRun(false);
    navigate('/unit/1');
    setTimeout(() => {
      setStepIndex(3);
      setRun(true);
    }, 1200);
  };

  const handleCallback = (data) => {
    const { action, index, status, type } = data;

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        if (index === 2) {
          goToUnit();
          return;
        }
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        if (index === 3) {
          setRun(false);
          navigate('/');
          setTimeout(() => {
            setStepIndex(2);
            setRun(true);
          }, 700);
          return;
        }
        setStepIndex(index - 1);
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (user) {
        localStorage.setItem(tourKey(user.id), 'true');
        // Mark V2 as seen for new users — they don't need the announcement
        localStorage.setItem(v2Key(user.id), 'true');
      }
      setRun(false);
      if (location.pathname !== '/') navigate('/');
      if (status === STATUS.FINISHED && user && !localStorage.getItem(welcomeKey(user.id))) {
        setShowWelcome(true);
      }
    }
  };

  const handleV2Close = () => {
    if (user) localStorage.setItem(v2Key(user.id), 'true');
    setShowV2(false);
  };

  return (
    <>
      <Joyride
        steps={buildSteps(isMobile())}
        run={run}
        stepIndex={stepIndex}
        continuous
        showSkipButton
        disableOverlayClose
        scrollToFirstStep
        scrollOffset={80}
        callback={handleCallback}
        styles={tourStyles}
        locale={locale}
      />
      {showWelcome && (
        <WelcomeModal onClose={() => {
          if (user) localStorage.setItem(welcomeKey(user.id), 'true');
          setShowWelcome(false);
        }} />
      )}
      {showV2 && <V2Modal onClose={handleV2Close} />}
    </>
  );
};

export default OnboardingTour;
