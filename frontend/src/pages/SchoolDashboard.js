import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import http from '../services/http-common';
import UserInfoHeader from '../components/UserInfoHeader';
import Toast from '../components/Toast';

const SchoolDashboard = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('participants');
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Form state for participant entry
  const [formData, setFormData] = useState({
    participant_id: '',
    first_name: '',
    last_name: '',
    student_class: '',
    event_ids: []
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await http.get('/api/auth/current/');
        setCurrentUser(response.data);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        navigate('/login');
      }
    };
    fetchUser();
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await http.get('/api/events/');
      setEvents(response.data);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'success' }), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        participants: [{
          participant_id: formData.participant_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          student_class: parseInt(formData.student_class),
          event_ids: formData.event_ids
        }]
      };

      const response = await http.post('/api/auth/schools/participants/submit/', payload);

      if (response.data.participants) {
        setParticipants(prev => [...prev, ...response.data.participants]);
        setFormData({
          participant_id: '',
          first_name: '',
          last_name: '',
          student_class: '',
          event_ids: []
        });
        // Show success toast
        showToast('Participant submitted successfully! 🎉', 'success');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit participant data');
      showToast('Failed to submit participant data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleEventChange = (eventId) => {
    setFormData(prev => ({
      ...prev,
      event_ids: prev.event_ids.includes(eventId)
        ? prev.event_ids.filter(id => id !== eventId)
        : [...prev.event_ids, eventId]
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* User Info Header */}
      <UserInfoHeader
        user={currentUser}
        title="School Dashboard"
        subtitle="Manage participant registrations and submissions"
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl overflow-hidden border border-white/20">
          {/* Navigation Tabs */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600">
            <nav className="flex space-x-1 px-6">
              <button
                onClick={() => setActiveSection('participants')}
                className={`px-8 py-5 text-lg font-semibold transition-all duration-300 relative ${
                  activeSection === 'participants'
                    ? 'text-white'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                📝 Participant Entry
                {activeSection === 'participants' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-t-full"></div>
                )}
              </button>
              <button
                onClick={() => setActiveSection('submitted')}
                className={`px-8 py-5 text-lg font-semibold transition-all duration-300 relative ${
                  activeSection === 'submitted'
                    ? 'text-white'
                    : 'text-indigo-200 hover:text-white'
                }`}
              >
                📋 Submitted Participants
                {activeSection === 'submitted' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white rounded-t-full"></div>
                )}
              </button>
            </nav>
          </div>

          <div className="p-8">
            {/* Content Area */}
            {activeSection === 'participants' && (
              <div className="space-y-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-2 h-12 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                  <h2 className="text-3xl font-bold text-gray-800">Participant Data Entry</h2>
                </div>

                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-lg text-lg">
                    <div className="flex items-center space-x-3">
                      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{error}</span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Participant ID */}
                    <div className="space-y-3">
                      <label className="block text-xl font-semibold text-gray-700">
                        Participant ID <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.participant_id}
                        onChange={(e) => setFormData({ ...formData, participant_id: e.target.value })}
                        className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                        placeholder="Enter Participant ID (e.g., P001)"
                      />
                    </div>

                    {/* Student Class */}
                    <div className="space-y-3">
                      <label className="block text-xl font-semibold text-gray-700">
                        Student Class <span className="text-red-500">*</span>
                        <span className="text-sm font-normal text-gray-500 ml-2">(1-12)</span>
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="12"
                        value={formData.student_class}
                        onChange={(e) => setFormData({ ...formData, student_class: e.target.value })}
                        className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                        placeholder="Enter Class"
                      />
                    </div>

                    {/* First Name */}
                    <div className="space-y-3">
                      <label className="block text-xl font-semibold text-gray-700">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                        placeholder="Enter First Name"
                      />
                    </div>

                    {/* Last Name */}
                    <div className="space-y-3">
                      <label className="block text-xl font-semibold text-gray-700">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-indigo-300 focus:border-indigo-500 transition-all duration-200 bg-gray-50 hover:bg-white"
                        placeholder="Enter Last Name"
                      />
                    </div>
                  </div>

                  {/* Events Selection */}
                  <div className="space-y-4">
                    <label className="block text-xl font-semibold text-gray-700">
                      Events Selection <span className="text-red-500">*</span>
                      <span className="text-base font-normal text-gray-500 ml-2">(Select all that apply)</span>
                    </label>
                    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-2xl p-6 max-h-80 overflow-y-auto shadow-inner">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {events.map(event => (
                          <label key={event.id} className="flex items-center space-x-3 p-4 bg-white rounded-xl hover:bg-indigo-50 hover:shadow-md transition-all duration-200 cursor-pointer border-2 border-transparent hover:border-indigo-300">
                            <input
                              type="checkbox"
                              checked={formData.event_ids.includes(event.id)}
                              onChange={() => handleEventChange(event.id)}
                              className="w-5 h-5 rounded border-2 border-gray-300 text-indigo-600 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 cursor-pointer"
                            />
                            <span className="text-lg text-gray-700 font-medium">{event.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {events.length === 0 && (
                      <p className="text-lg text-gray-500 text-center py-8">No events available at the moment</p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setFormData({
                        participant_id: '',
                        first_name: '',
                        last_name: '',
                        student_class: '',
                        event_ids: []
                      })}
                      className="px-8 py-4 text-lg font-semibold border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm hover:shadow-md"
                    >
                      🗑️ Clear Form
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-10 py-4 text-lg font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
                    >
                      {loading ? (
                        <span className="flex items-center space-x-2">
                          <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>Submitting...</span>
                        </span>
                      ) : (
                        '✅ Submit Participant'
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeSection === 'submitted' && (
              <div className="space-y-8">
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-2 h-12 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                  <h2 className="text-3xl font-bold text-gray-800">Submitted Participants</h2>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 shadow-lg border border-indigo-100">
                  {participants.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="inline-block p-6 bg-white rounded-full shadow-lg mb-6">
                        <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                      </div>
                      <p className="text-2xl text-gray-600 font-medium mb-2">No participants submitted yet</p>
                      <p className="text-lg text-gray-500">Participants will appear here once you submit them</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-gray-200">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-indigo-600 to-purple-600">
                          <tr>
                            <th className="px-8 py-5 text-left text-base font-bold text-white uppercase tracking-wider">Participant ID</th>
                            <th className="px-8 py-5 text-left text-base font-bold text-white uppercase tracking-wider">Name</th>
                            <th className="px-8 py-5 text-left text-base font-bold text-white uppercase tracking-wider">Class</th>
                            <th className="px-8 py-5 text-left text-base font-bold text-white uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {participants.map((p, index) => (
                            <tr key={index} className="hover:bg-indigo-50 transition-colors duration-150">
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className="text-lg font-semibold text-gray-900">{p.participant_id}</span>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className="text-lg text-gray-900">{p.first_name} {p.last_name}</span>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className="text-lg text-gray-900">Class {p.student_class}</span>
                              </td>
                              <td className="px-8 py-5 whitespace-nowrap">
                                <span className={`inline-flex items-center px-4 py-2 text-base font-semibold rounded-full ${
                                  p.verified_by_volunteer
                                    ? 'bg-green-100 text-green-800 border-2 border-green-300'
                                    : 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                                }`}>
                                  {p.verified_by_volunteer ? '✓ Verified' : '⏳ Pending'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="bg-blue-50 border-l-4 border-blue-500 rounded-r-xl p-6 shadow-lg">
                  <div className="flex items-start space-x-4">
                    <svg className="w-8 h-8 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <p className="text-lg font-semibold text-blue-900 mb-2">Information</p>
                      <p className="text-base text-blue-800">This data will be sent to your assigned volunteer for verification. Status will update once verification is complete.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDashboard;
