import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import AllowedEmailsManager from '../components/AllowedEmailsManager';
import UserManagement from '../components/UserManagement';
import EventManagement from '../components/EventManagement';
import ResultPublishing from '../components/ResultPublishing';
import CertificateGeneration from '../components/CertificateGeneration';
import VolunteerCoordination from '../components/VolunteerCoordination';
import SystemSettings from '../components/SystemSettings';
import SchoolManagement from '../components/SchoolManagement';
import IDManagement from '../components/IDManagementEnhanced';

const AdminPanel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { section } = useParams();

  // Determine active section from URL param; default to dashboard
  const activeSection = useMemo(() => section || 'dashboard', [section]);

  const goTo = (target) => navigate(target ? `/admin/${target}` : '/admin');

  const renderContent = () => {
    switch (activeSection) {
      case 'allowed-emails':
        return <AllowedEmailsManager />;
      case 'users':
        return <UserManagement />;
      case 'events':
        return <EventManagement />;
      case 'results':
        return <ResultPublishing />;
      case 'certificates':
        return <CertificateGeneration />;
      case 'volunteers':
        return <VolunteerCoordination />;
      case 'settings':
        return <SystemSettings />;
      case 'schools':
        return <SchoolManagement />;
      case 'ids':
        return <IDManagement />;
      case 'dashboard':
      default:
        return (
          <div className="relative">
            {/* Header with enhanced styling */}
            <div className="text-center mb-16">
              <div className="inline-block">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mr-4">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <h2 className="text-4xl font-bold bg-gradient-to-r from-gray-900 via-indigo-800 to-purple-800 bg-clip-text text-transparent">
                    {t('admin_panel') || 'Admin Panel'}
                  </h2>
                </div>
              </div>
              <p className="text-gray-600 mt-4 text-lg font-medium">Comprehensive management dashboard for E-Kalolsavam</p>
              <div className="mt-6 flex items-center justify-center space-x-2">
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-indigo-400 to-transparent"></div>
                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                <div className="w-16 h-1 bg-gradient-to-r from-transparent via-purple-400 to-transparent"></div>
              </div>
            </div>

            {/* Creative grid layout with staggered animation */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Row 1 */}
              <div className="animate-fade-in-up animation-delay-100">
                <AdminCard
                  title={t('user_management')}
                  description="Manage students, judges, and volunteers"
                  icon="👥"
                  onClick={() => goTo('users')}
                />
              </div>
              <div className="animate-fade-in-up animation-delay-200">
                <AdminCard
                  title="Google Signup Emails"
                  description="Manage allowed email addresses for Google signup"
                  icon="📧"
                  onClick={() => goTo('allowed-emails')}
                />
              </div>
              <div className="animate-fade-in-up animation-delay-300 md:col-span-1 lg:col-span-1">
                <AdminCard
                  title={t('event_management')}
                  description="Create and schedule events"
                  icon="📅"
                  onClick={() => goTo('events')}
                />
              </div>

              {/* Row 2 */}
              <div className="animate-fade-in-up animation-delay-400">
                <AdminCard
                  title={t('result_publishing')}
                  description="Publish and manage results"
                  icon="🏆"
                  onClick={() => goTo('results')}
                />
              </div>
              <div className="animate-fade-in-up animation-delay-500">
                <AdminCard
                  title={t('certificate_generation')}
                  description="Generate and distribute certificates"
                  icon="📜"
                  onClick={() => goTo('certificates')}
                />
              </div>
              <div className="animate-fade-in-up animation-delay-600">
                <AdminCard
                  title={t('volunteer_coordination')}
                  description="Assign shifts and manage volunteers"
                  icon="🤝"
                  onClick={() => goTo('volunteers')}
                />
              </div>

              {/* Row 3 - New workflow features */}
              <div className="animate-fade-in-up animation-delay-700">
                <AdminCard
                  title="School Management"
                  description="Create and manage school accounts"
                  icon="🏫"
                  onClick={() => goTo('schools')}
                />
              </div>
              <div className="animate-fade-in-up animation-delay-800">
                <AdminCard
                  title="ID Management"
                  description="Generate IDs for volunteers and judges"
                  icon="🔑"
                  onClick={() => goTo('ids')}
                />
              </div>
              <div className="animate-fade-in-up animation-delay-900">
                <AdminCard
                  title="System Settings"
                  description="Configure portal settings and system preferences"
                  icon="⚙️"
                  onClick={() => goTo('settings')}
                />
              </div>
              <div className="animate-fade-in-up animation-delay-1000">
                <AdminCard
                  title="Emergency Dashboard"
                  description="Monitor and manage emergency alerts"
                  icon="🚨"
                  onClick={() => window.open('/emergency-dashboard', '_blank')}
                />
              </div>
            </div>

            {/* Background decoration */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br from-blue-200 to-purple-200 rounded-full opacity-20 blur-xl"></div>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 blur-xl"></div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-pink-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-200/20 to-cyan-200/20 rounded-full blur-3xl"></div>
      </div>

      {/* Navigation Bar */}
      {activeSection !== 'dashboard' && (
        <div className="bg-white/80 backdrop-blur-lg shadow-lg border-b border-white/20 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => goTo('')}
                  className="group flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                >
                  <span className="transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
                  <span className="ml-2">Back to Admin Dashboard</span>
                </button>
                <div className="text-gray-300">|</div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {activeSection === 'allowed-emails' && 'Google Signup Email Management'}
                  {activeSection === 'users' && 'User Management'}
                  {activeSection === 'events' && 'Event Management'}
                  {activeSection === 'results' && 'Result Publishing'}
                  {activeSection === 'certificates' && 'Certificate Generation'}
                  {activeSection === 'volunteers' && 'Volunteer Coordination'}
                  {activeSection === 'settings' && 'System Settings'}
                  {activeSection === 'schools' && 'School Management'}
                  {activeSection === 'ids' && 'ID Management'}
                </h1>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className={`relative z-10 ${activeSection === 'dashboard' ? 'max-w-7xl mx-auto px-4 py-12' : ''}`}>
        {renderContent()}
      </div>
    </div>
  );
};

const SectionPlaceholder = ({ title }) => (
  <div className="container mx-auto px-4 py-8">
    <h2 className="text-2xl font-bold mb-6">{title}</h2>
    <p className="text-gray-700 mb-2">Coming soon.</p>
    <p className="text-gray-600">Build this section at: <code className="bg-gray-100 px-1 py-0.5 rounded">/admin/&lt;section&gt;</code></p>
  </div>
);

const AdminCard = ({ title, description, icon, onClick }) => {
  return (
    <div
      className="group relative bg-white border-2 border-gray-200/60 p-8 rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer hover:-translate-y-1 overflow-hidden"
      onClick={onClick}
    >
      {/* Subtle gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

      <div className="relative z-10">
        {/* Icon with subtle hover effect */}
        <div className="text-5xl mb-5 transform group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>

        <h3 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight group-hover:text-indigo-700 transition-colors duration-300">
          {title}
        </h3>

        <p className="text-base text-gray-600 mb-6 leading-relaxed group-hover:text-gray-700 transition-colors duration-300">
          {description}
        </p>

        {/* Clean button design */}
        <button className="relative inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md group/btn">
          <span className="relative z-10 text-base">Manage</span>
          <span className="ml-2 transform group-hover/btn:translate-x-1 transition-transform duration-300">→</span>
        </button>
      </div>
    </div>
  );
};

export default AdminPanel;