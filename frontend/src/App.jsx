import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './pages/HomePage';
import SortingHatPage from './pages/SortingHatPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sorting-hat" element={<SortingHatPage />} />
      </Routes>
    </Router>
  );
}

export default App;
