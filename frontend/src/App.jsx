import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import { SoundProvider } from './context/SoundContext';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingWordsBackground from './components/FloatingWordsBackground';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';
import SortingHatPage from './pages/SortingHatPage';
import PlacementTest from './pages/PlacementTest';
import Dashboard from './pages/Dashboard';
import UnitDetail from './pages/UnitDetail';
import FilterMode from './pages/FilterMode';
import TriageMode from './pages/TriageMode';
import ReviewSession from './pages/ReviewSession';
import Quiz from './pages/Quiz';
import WordList from './pages/WordList';
import Admin from './pages/Admin';
import FeedbackWidget from './components/FeedbackWidget';

const AdminRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !user.is_admin) return <Navigate to="/dashboard" replace />;
  return children;
};

const AuthenticatedFeedback = () => {
  const { user } = useAuth();
  if (!user) return null;
  return <FeedbackWidget />;
};

function App() {
  return (
    <ThemeProvider>
      <SoundProvider>
      <LanguageProvider>
      <AuthProvider>
        <Router>
          <FloatingWordsBackground />
          <AuthenticatedFeedback />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/home" element={<HomePage />} />

            {/* Protected routes */}
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/sorting-hat" element={<ProtectedRoute><SortingHatPage /></ProtectedRoute>} />
            <Route path="/placement-test" element={<ProtectedRoute><PlacementTest /></ProtectedRoute>} />
            <Route path="/triage" element={<ProtectedRoute><TriageMode /></ProtectedRoute>} />

            {/* Unit learning flow — all protected */}
            <Route path="/unit/:id" element={<ProtectedRoute><UnitDetail /></ProtectedRoute>} />
            <Route path="/unit/:id/filter" element={<ProtectedRoute><FilterMode /></ProtectedRoute>} />
            <Route path="/unit/:id/review" element={<ProtectedRoute><ReviewSession /></ProtectedRoute>} />
            <Route path="/unit/:id/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
            <Route path="/unit/:id/words" element={<ProtectedRoute><WordList /></ProtectedRoute>} />

            {/* Legacy review route */}
            <Route path="/review" element={<ProtectedRoute><ReviewSession /></ProtectedRoute>} />

            {/* Admin panel — requires is_admin */}
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
          </Routes>
        </Router>
      </AuthProvider>
      </LanguageProvider>
      </SoundProvider>
    </ThemeProvider>
  );
}

export default App;
