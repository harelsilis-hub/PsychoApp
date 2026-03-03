import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { Brain, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../api/auth';

const ResetPasswordPage = () => {
  const [searchParams]                      = useSearchParams();
  const navigate                            = useNavigate();
  const token                               = searchParams.get('token') || '';

  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword]     = useState(false);
  const [done, setDone]                     = useState(false);
  const [error, setError]                   = useState('');
  const [loading, setLoading]               = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('הסיסמה חייבת להכיל לפחות 6 תווים.');
      return;
    }
    if (password !== confirmPassword) {
      setError('הסיסמאות אינן תואמות.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setError(detail || 'הקישור אינו תקין או שפג תוקפו. בקש קישור חדש.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <p className="text-gray-600">קישור לא תקין.</p>
          <Link to="/login" className="text-violet-600 font-semibold hover:underline text-sm">
            חזרה להתחברות
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-300/50">
          <Brain className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="text-xl font-black text-gray-900 tracking-tight leading-none">Mila</p>
          <p className="text-xs text-gray-400 font-medium mt-0.5">אוצר מילים פסיכומטרי</p>
        </div>
      </div>

      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-gray-200/70 rounded-2xl shadow-xl shadow-gray-200/50 p-7">
        {done ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">הסיסמה אופסה בהצלחה!</h2>
            <p className="text-sm text-gray-500">מועבר לדף ההתחברות...</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">איפוס סיסמה</h2>
            <p className="text-sm text-gray-500 mb-5">הזן סיסמה חדשה לחשבון שלך.</p>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  סיסמה חדשה
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    dir="ltr"
                    autoFocus
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="לפחות 6 תווים"
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
                           shadow-md shadow-indigo-200/50 mt-1"
              >
                {loading ? 'שומר...' : 'שמור סיסמה חדשה'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
