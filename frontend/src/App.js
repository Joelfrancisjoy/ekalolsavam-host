import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Header from './components/Header';
import DemoModeIndicator from './components/DemoModeIndicator';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import JudgeDashboard from './pages/JudgeDashboard';
import AdminPanel from './pages/AdminPanel';
import VolunteerDashboard from './pages/VolunteerDashboard';
import SchoolDashboard from './pages/SchoolDashboard';
import SchoolStandings from './pages/SchoolStandings';
import IDSignup from './pages/IDSignup';
import IDBasedRegistration from './pages/IDBasedRegistration';
import LiveResults from './pages/LiveResults';
import EmergencyMainPage from './pages/EmergencyMainPage';
import EmergencyDashboard from './pages/EmergencyDashboard';
import RecheckRequestDetails from './pages/RecheckRequestDetails';

function AppContent() {
  const { i18n } = useTranslation();
  const location = useLocation();

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  /*app.post("/auth/google", (req, res) => {
  // handle token verification and login here
  });*/

  // Check if current route is login page, landing page or emergency page
  const isLoginPage = location.pathname === '/login';
  const isLandingPage = location.pathname === '/';
  const isEmergencyPage = location.pathname === '/emergency';
  const isVolunteerPage = location.pathname === '/volunteer';

  // Read auth state from localStorage on each render
  const isAuthenticated = Boolean(localStorage.getItem('access_token'));

  // Simple protected route wrapper
  const ProtectedRoute = ({ element }) => (
    isAuthenticated ? element : <Navigate to="/login" replace />
  );

  return (
    <div className={(isEmergencyPage || isVolunteerPage) ? "h-screen overflow-hidden bg-gray-50" : "min-h-screen bg-gray-50"}>
      {!isLoginPage && !isLandingPage && !isEmergencyPage && !isVolunteerPage && <Header changeLanguage={changeLanguage} />}
      <main className={isLoginPage || isLandingPage || isEmergencyPage || isVolunteerPage ? "" : "container mx-auto px-4 py-8"}>
        <DemoModeIndicator />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/emergency" element={<EmergencyMainPage />} />
          <Route path="/emergency-dashboard" element={<ProtectedRoute element={<EmergencyDashboard />} />} />
          <Route path="/dashboard" element={<ProtectedRoute element={<StudentDashboard />} />} />
          <Route path="/student" element={<ProtectedRoute element={<StudentDashboard />} />} />
          <Route path="/judge" element={<ProtectedRoute element={<JudgeDashboard />} />} />
          <Route path="/admin" element={<ProtectedRoute element={<AdminPanel />} />} />
          <Route path="/admin/:section" element={<ProtectedRoute element={<AdminPanel />} />} />
          <Route path="/volunteer" element={<ProtectedRoute element={<VolunteerDashboard />} />} />
          <Route path="/school" element={<ProtectedRoute element={<SchoolDashboard />} />} />
          <Route path="/standings" element={<SchoolStandings />} />
          <Route path="/register-with-id" element={<IDBasedRegistration />} />
          <Route path="/id-signup" element={<IDSignup />} />
          <Route path="/results" element={<LiveResults />} />
          <Route path="/recheck-request/:recheckRequestId" element={<ProtectedRoute element={<RecheckRequestDetails />} />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const routerFuture = {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
  };

  return (
    <Router future={routerFuture}>
      <AppContent />
    </Router>
  );
}

export default App;
