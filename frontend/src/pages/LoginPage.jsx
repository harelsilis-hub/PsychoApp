import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Brain, Eye, EyeOff } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [mode, setMode]                   = useState('login');   // 'login' | 'register'
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName]     = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);

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

    if (!email.trim() || !email.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה.');
      return;
    }
    if (!password) {
      setError('נא להזין סיסמה.');
      return;
    }
    if (mode === 'register') {
      if (password.length < 6) {
        setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
        return;
      }
      if (password !== confirmPassword) {
        setError('הסיסמאות אינן תואמות.');
        return;
      }
      if (!agreedToTerms) {
        setError('יש לאשר את תנאי השימוש כדי להירשם.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim() || null);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || (mode === 'login' ? 'אימייל או סיסמה שגויים.' : 'ההרשמה נכשלה. נסה שוב.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">

      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <img src="/mila_logo.png" alt="Mila" className="w-12 h-12 object-contain" />
        <div>
          <p className="text-xl font-black text-gray-900 tracking-tight leading-none">Mila</p>
          <p className="text-xs text-gray-400 font-medium mt-0.5">אוצר מילים פסיכומטרי</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-gray-200/70 rounded-2xl shadow-xl shadow-gray-200/50 overflow-hidden">

        {/* Tab toggle */}
        <div className="flex border-b border-gray-100">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              mode === 'login'
                ? 'bg-white text-gray-900 border-b-2 border-violet-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
            }`}
          >
            כניסה
          </button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${
              mode === 'register'
                ? 'bg-white text-gray-900 border-b-2 border-violet-600'
                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50/50'
            }`}
          >
            הרשמה
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-7 space-y-3">

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                שם תצוגה
              </label>
              <input
                type="text"
                maxLength={30}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="כיצד תופיע בלוח המובילים"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
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
                className="w-full px-4 py-3 pl-11 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                אימות סיסמה
              </label>
              <input
                type="password"
                dir="ltr"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition"
              />
            </div>
          )}

          {mode === 'register' && (
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className="mt-0.5 accent-violet-600 w-4 h-4 shrink-0"
              />
              <span className="text-xs text-gray-500 leading-relaxed">
                קראתי ואני מסכים/ה ל
                <Link to="/terms" target="_blank" className="text-violet-600 hover:text-violet-800 underline font-semibold mx-1">
                  תנאי השימוש
                </Link>
              </span>
            </label>
          )}

          {mode === 'login' && (
            <div className="flex justify-end">
              <Link
                to="/forgot-password"
                className="text-sm text-violet-600 hover:text-violet-800 font-semibold transition-colors"
              >
                שכחתי סיסמה?
              </Link>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500 font-medium bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl text-sm font-bold
                       hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 transition-all
                       shadow-md shadow-indigo-200/50 hover:shadow-lg hover:shadow-indigo-200/60 mt-1"
          >
            {loading ? 'רגע...' : mode === 'login' ? 'כניסה' : 'יצירת חשבון'}
          </button>
        </form>
      </div>

      <p className="mt-5 text-xs text-gray-400 text-center">
        למד 5,442 מילים פסיכומטריות בשיטת החזרות המרווחות.
      </p>
      <p className="mt-2 text-xs text-gray-400 text-center">
        <Link to="/terms" className="hover:text-gray-600 underline transition-colors">
          תנאי שימוש
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
