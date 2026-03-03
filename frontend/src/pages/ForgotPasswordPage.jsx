import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, ArrowRight } from 'lucide-react';
import { authAPI } from '../api/auth';

const ForgotPasswordPage = () => {
  const [email, setEmail]       = useState('');
  const [sent, setSent]         = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !email.includes('@')) {
      setError('נא להזין כתובת אימייל תקינה.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.forgotPassword(email.trim());
      setSent(true);
    } catch {
      setError('שגיאה בשליחת הבקשה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  };

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
        {sent ? (
          <div className="text-center space-y-4">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">בדוק את תיבת הדואר שלך</h2>
            <p className="text-sm text-gray-500">
              אם הכתובת קיימת במערכת, שלחנו קישור לאיפוס הסיסמה. הקישור תקף לשעה אחת.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:text-violet-700 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה להתחברות
            </Link>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-900 mb-1">שכחת סיסמה?</h2>
            <p className="text-sm text-gray-500 mb-5">
              הזן את כתובת האימייל שלך ונשלח לך קישור לאיפוס הסיסמה.
            </p>
            <form onSubmit={handleSubmit} className="space-y-3">
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
                {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
              </button>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors pt-1"
              >
                <ArrowRight className="w-4 h-4" />
                חזרה להתחברות
              </Link>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
