import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import FloatingWordsBackground from './components/FloatingWordsBackground';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import SortingHatPage from './pages/SortingHatPage';
import PlacementTest from './pages/PlacementTest';
import Dashboard from './pages/Dashboard';
import UnitDetail from './pages/UnitDetail';
import FilterMode from './pages/FilterMode';
import TriageMode from './pages/TriageMode';
import ReviewSession from './pages/ReviewSession';
import Quiz from './pages/Quiz';

function App() {
  return (
    <AuthProvider>
      <Router>
        <FloatingWordsBackground />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
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

          {/* Legacy review route */}
          <Route path="/review" element={<ProtectedRoute><ReviewSession /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
