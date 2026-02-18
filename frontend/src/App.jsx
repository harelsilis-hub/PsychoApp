import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SortingHatPage from './pages/SortingHatPage';
import PlacementTest from './pages/PlacementTest';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sorting-hat" element={<SortingHatPage />} />
        <Route path="/placement-test" element={<PlacementTest />} />
      </Routes>
    </Router>
  );
}

export default App;
