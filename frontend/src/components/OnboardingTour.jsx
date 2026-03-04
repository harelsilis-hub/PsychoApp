import { useState, useEffect } from 'react';
import Joyride, { ACTIONS, EVENTS, STATUS } from 'react-joyride';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const tourKey = (userId) => `mila_tour_done_${userId}`;
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
    content: <C text="קחו סיור קצר כדי לראות איך לומדים מילים ביעילות, שומרים על רצף, ולא שוכחים לעולם." step={0} />,
    disableBeacon: true,
  },
  {
    // On mobile the sticky header skews the bounding rect — use centered modal instead
    target: mobile ? 'body' : '.tour-language',
    placement: 'center',
    title: '🌐 בחירת שפה',
    content: <C text="כאן תוכלו לעבור בקלות בין תרגול באנגלית לתרגול בעברית בכל רגע." step={1} />,
    disableBeacon: true,
  },
  {
    target: '.tour-streak',
    title: '🔥 הרצף היומי',
    content: <C text="הסוד לזיכרון מנצח הוא התמדה! היכנסו כל יום, תרגלו קצת, ושמרו על האש דולקת." step={2} />,
    disableBeacon: true,
  },
  {
    target: '.tour-filter',
    placement: mobile ? 'top' : 'auto',
    title: '🔍 צעד 1: סינון',
    content: <C text="מפרידים את המילים שאתם כבר מכירים מאלה שדורשות למידה — כדי לא לבזבז זמן." step={3} />,
    disableBeacon: true,
  },
  {
    target: '.tour-review',
    placement: mobile ? 'top' : 'auto',
    title: '🧠 צעד 2: שינון ואסוציאציות',
    content: <C text="כעת משננים רק את המילים שלא הכרתם בסינון. תוכלו להיעזר באסוציאציות שתלמידים אחרים יצרו או לכתוב אסוציאציות משלכם כדי לזכור טוב יותר!" step={4} />,
    disableBeacon: true,
  },
  {
    target: '.tour-quiz',
    placement: mobile ? 'top' : 'auto',
    title: '✅ צעד 3: בוחן ומעקב',
    content: <C text="האלגוריתם שלנו יזהה מה קשה לכם ויציג את זה יותר, בזמן שמילים קלות יופיעו במרווחים גדולים יותר." step={5} />,
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
  back: '→ חזרה',
  close: 'סגור',
  last: '🎉 סיום!',
  next: 'הבא ←',
  skip: 'דלג',
};

const OnboardingTour = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // On mobile (<640px) the desktop streak element is display:none but appears
  // first in the DOM — Joyride finds the hidden one and breaks. Skip streak on mobile.
  const isMobile = () => window.innerWidth < 640;

  useEffect(() => {
    if (!user) return;
    const isDone = localStorage.getItem(tourKey(user.id));
    if (!isDone && (location.pathname === '/' || location.pathname === '/dashboard')) {
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
        // Desktop: navigate after streak step (index 2)
        // Mobile: skip streak and navigate right after language step (index 1)
        if (index === 2 || (index === 1 && isMobile())) {
          goToUnit();
          return;
        }
        setStepIndex(index + 1);
      } else if (action === ACTIONS.PREV) {
        if (index === 3) {
          setRun(false);
          navigate('/');
          setTimeout(() => {
            setStepIndex(isMobile() ? 1 : 2);
            setRun(true);
          }, 700);
          return;
        }
        setStepIndex(index - 1);
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      if (user) localStorage.setItem(tourKey(user.id), 'true');
      setRun(false);
      if (location.pathname !== '/') navigate('/');
    }
  };

  return (
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
  );
};

export default OnboardingTour;
