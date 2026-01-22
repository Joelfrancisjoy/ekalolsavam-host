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

  // Fetch participants for the current school user
  const fetchParticipants = async () => {
    try {
      const response = await http.get('/api/auth/schools/participants/');
      setParticipants(response.data);
    } catch (err) {
      console.error('Failed to fetch participants:', err);
      setError('Failed to load participants');
      showToast('Failed to load participants', 'error');
    }
  };

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await http.get('/api/auth/current/');
        setCurrentUser(response.data);

        // After getting user, fetch their participants
        fetchParticipants();
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
      // Validate form data
      if (!formData.participant_id || !formData.first_name || !formData.last_name || !formData.student_class) {
        setError('All fields are required');
        showToast('All fields are required', 'error');
        setLoading(false);
        return;
      }

      const studentClassInt = parseInt(formData.student_class);
      if (isNaN(studentClassInt) || studentClassInt < 1 || studentClassInt > 12) {
        setError('Student class must be between 1 and 12');
        showToast('Student class must be between 1 and 12', 'error');
        setLoading(false);
        return;
      }

      const payload = {
        participants: [{
          participant_id: formData.participant_id,
          first_name: formData.first_name,
          last_name: formData.last_name,
          student_class: studentClassInt,
          event_ids: formData.event_ids
        }]
      };

      const response = await http.post('/api/auth/schools/participants/submit/', payload);

      if (response.data.participants) {
        // Option 1: Update state with response (as before)
        // setParticipants(prev => [...prev, ...response.data.participants]);

        // Option 2: Refresh from server to ensure consistency
        await fetchParticipants();

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
                className={`px-8 py-5 text-lg font-semibold transition-all duration-300 relative ${activeSection === 'participants'
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
                className={`px-8 py-5 text-lg font-semibold transition-all duration-300 relative ${activeSection === 'submitted'
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
              <div className="space-y-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-20 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full"></div>
                    <div>
                      <h2 className="text-5xl font-bold text-gray-900">Submitted Participants</h2>
                      <p className="text-lg text-gray-600 mt-2">
                        {participants.length} {participants.length === 1 ? 'participant' : 'participants'} submitted
                      </p>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  {participants.length > 0 && (
                    <div className="flex items-center space-x-4">
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl px-6 py-4 flex items-center space-x-3">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>
                        <span className="text-lg font-bold text-yellow-800">
                          {participants.filter(p => !p.verified_by_volunteer).length} Pending
                        </span>
                      </div>
                      <div className="bg-green-50 border-2 border-green-200 rounded-xl px-6 py-4 flex items-center space-x-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-lg font-bold text-green-800">
                          {participants.filter(p => p.verified_by_volunteer).length} Verified
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Main Content */}
                {participants.length === 0 ? (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-16">
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl mb-6">
                        <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">No participants submitted yet</h3>
                      <p className="text-gray-600 mb-6">Start by adding participants in the Participant Entry tab</p>
                      <button
                        onClick={() => setActiveSection('participants')}
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                      >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Participants
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                    {/* Table Header */}
                    <div className="bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 px-8 py-6">
                      <div className="grid grid-cols-12 gap-4 text-base font-bold text-white uppercase tracking-wider">
                        <div className="col-span-2">Participant ID</div>
                        <div className="col-span-2">Name</div>
                        <div className="col-span-1">Class</div>
                        <div className="col-span-5">Events</div>
                        <div className="col-span-2 text-center">Status</div>
                      </div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-gray-100">
                      {participants.map((p, index) => (
                        <div
                          key={index}
                          className="grid grid-cols-12 gap-4 px-8 py-6 hover:bg-gradient-to-r hover:from-indigo-50 hover:to-purple-50 transition-all duration-200 group"
                        >
                          {/* Participant ID */}
                          <div className="col-span-2 flex items-center">
                            <div className="flex items-center space-x-3">
                              <div className="w-14 h-14 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg flex items-center justify-center group-hover:from-indigo-200 group-hover:to-purple-200 transition-colors">
                                <span className="text-lg font-bold text-indigo-700">
                                  {p.participant_id.substring(0, 2)}
                                </span>
                              </div>
                              <span className="text-lg font-bold text-gray-900">{p.participant_id}</span>
                            </div>
                          </div>

                          {/* Name */}
                          <div className="col-span-2 flex items-center">
                            <div>
                              <p className="text-lg font-semibold text-gray-900">{p.first_name} {p.last_name}</p>
                              <p className="text-base text-gray-500">Student</p>
                            </div>
                          </div>

                          {/* Class */}
                          <div className="col-span-1 flex items-center">
                            <span className="inline-flex items-center px-5 py-2.5 rounded-lg bg-gray-100 text-gray-800 text-lg font-semibold">
                              {p.student_class}
                            </span>
                          </div>

                          {/* Events */}
                          <div className="col-span-5 flex items-center">
                            <div className="flex flex-wrap gap-2">
                              {p.events_display && p.events_display.length > 0 ? (
                                p.events_display.map((event, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-4 py-2 rounded-lg text-base font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-colors"
                                  >
                                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    {event.name}
                                  </span>
                                ))
                              ) : (
                                <span className="text-base text-gray-400 italic">No events selected</span>
                              )}
                            </div>
                          </div>

                          {/* Status */}
                          <div className="col-span-2 flex items-center justify-center">
                            {p.verified_by_volunteer ? (
                              <span className="inline-flex items-center px-6 py-3 rounded-lg bg-green-50 text-green-700 border-2 border-green-200 text-lg font-bold">
                                <svg className="w-6 h-6 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Verified
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-6 py-3 rounded-lg bg-yellow-50 text-yellow-700 border-2 border-yellow-200 text-lg font-bold">
                                <svg className="w-6 h-6 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Info Banner */}
                {participants.length > 0 && (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-7 shadow-sm">
                    <div className="flex items-start space-x-5">
                      <div className="flex-shrink-0">
                        <div className="w-14 h-14 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <h4 className="text-lg font-bold text-blue-900 mb-2">Verification Process</h4>
                        <p className="text-lg text-blue-800 leading-relaxed">
                          Your submitted participants will be reviewed by the assigned volunteer. Once verified, the status will automatically update to "Verified". You'll be notified of any changes.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolDashboard;
