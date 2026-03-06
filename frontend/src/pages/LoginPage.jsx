import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, BookOpen, Trophy, Brain, Star } from 'lucide-react';

const FEATURES = [
  { icon: Brain,    title: 'המערכת שיודעת מתי אתם עומדים לשכוח – ובוחנת אתכם בדיוק אז.',    desc: '' },
  { icon: BookOpen, title: '5,445 מילים',          desc: '20 יחידות לימוד · עברית ואנגלית' },
  { icon: Trophy,   title: 'גיימיפיקציה',          desc: 'ניקוד, רמות ולוח מובילים' },
];


const LoginPage = () => {
  const navigate = useNavigate();
  const { login, register, googleLogin } = useAuth();

  const [mode, setMode]                       = useState('login');
  const [email, setEmail]                     = useState('');
  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName]         = useState('');
  const [showPassword, setShowPassword]       = useState(false);
  const [agreedToTerms, setAgreedToTerms]     = useState(false);
  const [error, setError]                     = useState('');
  const [loading, setLoading]                 = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setDisplayName('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) { setError('נא להזין כתובת אימייל תקינה.'); return; }
    if (!password)                              { setError('נא להזין סיסמה.'); return; }
    if (mode === 'register') {
      if (password.length < 6)              { setError('הסיסמה חייבת להכיל לפחות 6 תווים.'); return; }
      if (password !== confirmPassword)     { setError('הסיסמאות אינן תואמות.'); return; }
      if (!agreedToTerms)                   { setError('יש לאשר את תנאי השימוש כדי להירשם.'); return; }
    }
    setLoading(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(email.trim(), password, displayName.trim() || null);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || (mode === 'login' ? 'אימייל או סיסמה שגויים.' : 'ההרשמה נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = `w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-sm text-white
    placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-violet-400
    transition backdrop-blur-sm`;

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 flex" dir="rtl">

      {/* Background orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none select-none">
        <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-2/3 right-1/2 w-72 h-72 bg-purple-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
        {/* Grid overlay */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* ── Hero (desktop only) ── */}
      <div className="hidden lg:flex flex-col justify-center px-16 flex-1 relative z-10 max-w-xl">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="relative">
            <div className="absolute inset-0 bg-violet-500/40 rounded-xl blur-lg" />
            <img src="/mila_logo.png" alt="Mila" className="relative w-12 h-12 object-contain rounded-xl" />
          </div>
          <div>
            <p className="text-2xl font-black text-white tracking-tight">Mila</p>
            <p className="text-xs text-violet-300/80 font-medium">אוצר מילים פסיכומטרי</p>
          </div>
        </div>

        {/* Headline */}
        <h1 className="text-5xl font-black text-white leading-[1.1] mb-3 tracking-tight">
          שלוט<br />בפסיכומטרי.
        </h1>
        <p className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-l from-violet-400 via-purple-300 to-indigo-300 mb-3">
          5,000 מילים. מערכת אחת.
        </p>
        <p className="text-sm text-white/50 mb-8 leading-relaxed max-w-sm">
          המערכת מסתגלת לקצב שלך ומבטיחה שכל מילה תישאר בזיכרון לאורך זמן.
        </p>

        {/* Feature list */}
        <div className="space-y-3 mb-8">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500/30 to-indigo-500/20 border border-violet-400/20 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-violet-300" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{title}</p>
                <p className="text-white/40 text-xs">{desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ── Form side ── */}
      <div className="flex-1 flex items-center justify-center p-5 relative z-10">

        {/* Mobile logo */}
        <div className="absolute top-6 right-6 flex items-center gap-2.5 lg:hidden">
          <img src="/mila_logo.png" alt="Mila" className="w-9 h-9 rounded-xl object-contain" />
          <p className="text-white font-black text-xl tracking-tight">Mila</p>
        </div>

        <div className="w-full max-w-sm lg:max-w-md">

          {/* Mobile headline */}
          <div className="lg:hidden text-center mb-6 mt-14">
            <h2 className="text-2xl font-black text-white mb-1">שלוט בפסיכומטרי</h2>
            <p className="text-white/50 text-xs">המערכת שיודעת מתי אתם עומדים לשכוח – ובוחנת אתכם בדיוק אז.</p>
          </div>

          {/* Card */}
          <div className="bg-white/10 backdrop-blur-2xl border border-white/15 rounded-3xl shadow-2xl overflow-hidden">

            {/* Tabs */}
            <div className="flex gap-1.5 p-2 bg-black/20">
              {[['login', 'כניסה'], ['register', 'הרשמה']].map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-2.5 text-sm font-bold rounded-2xl transition-all duration-200 ${
                    mode === m
                      ? 'bg-white text-violet-900 shadow-lg'
                      : 'text-white/50 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-3">

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    שם תצוגה
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="כיצד תופיע בלוח המובילים"
                    className={inputClass}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                  אימייל
                </label>
                <input
                  type="email"
                  dir="ltr"
                  autoFocus
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                  סיסמה
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === 'register' ? 'לפחות 6 תווים' : '••••••••'}
                    className={`${inputClass} pl-11`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">
                    אימות סיסמה
                  </label>
                  <input
                    type="password"
                    dir="ltr"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
              )}

              {mode === 'register' && (
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className="mt-0.5 accent-violet-400 w-4 h-4 shrink-0"
                  />
                  <span className="text-xs text-white/40 leading-relaxed">
                    קראתי ואני מסכים/ה ל
                    <Link to="/terms" target="_blank" className="text-violet-400 hover:text-violet-300 underline font-bold mx-1">
                      תנאי השימוש
                    </Link>
                  </span>
                </label>
              )}

              {mode === 'login' && (
                <div className="flex justify-start">
                  <Link to="/forgot-password" className="text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors">
                    שכחתי סיסמה?
                  </Link>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-4 py-2.5">
                  <p className="text-xs text-red-300 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-l from-violet-600 to-indigo-500 text-white py-3.5 rounded-2xl
                           text-sm font-black tracking-wide hover:from-violet-500 hover:to-indigo-400
                           disabled:opacity-40 transition-all shadow-xl shadow-indigo-900/60
                           hover:shadow-violet-800/50 hover:scale-[1.01] active:scale-[0.99] mt-1"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    רגע...
                  </span>
                ) : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
              </button>

              {/* Google Sign-In */}
              <div className="relative flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/30 font-medium shrink-0">או</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={async ({ credential }) => {
                    setLoading(true);
                    setError('');
                    try {
                      await googleLogin(credential);
                      navigate('/dashboard', { replace: true });
                    } catch {
                      setError('שגיאה בהתחברות עם Google. נסה שוב.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={() => setError('שגיאה בהתחברות עם Google.')}
                  theme="filled_black"
                  shape="pill"
                  locale="he"
                  text={mode === 'login' ? 'signin_with' : 'signup_with'}
                />
              </div>
            </form>
          </div>

          {/* Mobile feature pills */}
          <div className="lg:hidden flex flex-wrap justify-center gap-2 mt-6">
            {['המערכת שיודעת מתי אתם עומדים לשכוח – ובוחנת אתכם בדיוק אז.', 'לוח מובילים', '5,445 מילים'].map((f) => (
              <span key={f} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/8 border border-white/10 rounded-full text-xs text-white/50">
                <Star className="w-3 h-3 text-violet-400" />
                {f}
              </span>
            ))}
          </div>

          <p className="text-center mt-5">
            <Link to="/terms" className="text-xs text-white/20 hover:text-white/40 underline transition-colors">
              תנאי שימוש
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
