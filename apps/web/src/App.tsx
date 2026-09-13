import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import DashboardPage from './pages/DashboardPage';
import SessionPage from './pages/SessionPage';
import ReportPage from './pages/ReportPage';
import ProfilePage from './pages/ProfilePage';
import StoriesPage from './pages/StoriesPage';

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/session" element={<SessionPage />} />
          <Route path="/report/:sessionId" element={<ReportPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/stories" element={<StoriesPage />} />
        </Routes>
      </main>
    </div>
  );
}
