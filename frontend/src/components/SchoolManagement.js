import React, { useState, useEffect } from 'react';
import axios from 'axios';
import authManager from '../utils/authManager';

const SchoolManagement = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    last_name: '',
    school_model_id: ''
  });
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [loadingSchools, setLoadingSchools] = useState(false);

  // Fetch existing schools
  const fetchSchools = async () => {
    setLoadingSchools(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.get(`${apiUrl}/api/auth/schools/`);
      setSchools(response.data);
    } catch (error) {
      console.error('Error fetching schools:', error);
    } finally {
      setLoadingSchools(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const { access } = authManager.getTokens();

      const response = await axios.post(
        `${apiUrl}/api/auth/admin/schools/create/`,
        formData,
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessage(`School account created successfully! Username: ${response.data.username}`);
      setFormData({
        username: '',
        password: '',
        email: '',
        first_name: '',
        last_name: '',
        school_model_id: ''
      });
      // Refresh the schools list
      fetchSchools();
    } catch (error) {
      setMessage(error.response?.data?.error || 'Failed to create school account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Header Section */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">🏫 School Management Center</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">Effortlessly manage school accounts, create credentials, and oversee educational institutions participating in the event</p>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`p-6 rounded-xl shadow-md ${message.includes('successfully')
            ? 'bg-green-50 text-green-800 border-l-4 border-green-500'
            : 'bg-red-50 text-red-800 border-l-4 border-red-500'
          }`}>
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {message.includes('successfully') ? (
                <span className="text-green-500 text-xl">✓</span>
              ) : (
                <span className="text-red-500 text-xl">!</span>
              )}
            </div>
            <div className="ml-4">
              <p className="font-medium text-lg">{message}</p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create School Form */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
              <span className="mr-3 text-blue-600">+</span>
              Create New School Account
            </h2>
            <p className="text-gray-600">Fill in the details to create a new school account with secure credentials</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                  placeholder="Enter unique school username"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3">
                  Temporary Password *
                </label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                  placeholder="Enter temporary password"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3">
                  Contact Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                  placeholder="Enter school contact email"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3">
                  School Name
                </label>
                <input
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                  placeholder="Enter school full name"
                />
              </div>

              <div>
                <label className="block text-base font-semibold text-gray-700 mb-3">
                  School Model ID (Optional)
                </label>
                <input
                  type="number"
                  value={formData.school_model_id}
                  onChange={(e) => setFormData({ ...formData, school_model_id: e.target.value })}
                  className="w-full px-5 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                  placeholder="Enter existing school model ID"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={() => setFormData({
                  username: '',
                  password: '',
                  email: '',
                  first_name: '',
                  last_name: '',
                  school_model_id: ''
                })}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-100 font-medium text-lg transition-colors flex-1"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 font-bold text-lg transition-all flex-1 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating...
                  </>
                ) : 'Create School Account'}
              </button>
            </div>
          </form>
        </div>

        {/* Existing Schools List */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl shadow-xl p-8 border border-gray-100">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 flex items-center">
              <span className="mr-3 text-gray-600">📋</span>
              Existing Schools
            </h2>
            <p className="text-gray-600">Manage and monitor all registered schools in the system</p>
          </div>

          {loadingSchools ? (
            <div className="flex justify-center items-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {schools.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-lg">No schools registered yet</p>
                  <p className="text-sm mt-2">Create a new school to get started</p>
                </div>
              ) : (
                schools.map((school) => (
                  <div
                    key={school.id}
                    className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-lg text-gray-800">{school.name}</h3>
                        <div className="flex items-center mt-1 space-x-4">
                          <span className="text-sm text-gray-600">
                            Category: <span className="font-medium">{school.category}</span>
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${school.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {school.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-gray-500">ID: {school.id}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Information Note */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-l-4 border-yellow-500 rounded-xl p-6 shadow-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <span className="text-yellow-500 text-2xl">ℹ️</span>
          </div>
          <div className="ml-4">
            <h3 className="text-lg font-bold text-yellow-800">Important Information</h3>
            <p className="text-yellow-700 mt-1 text-lg">
              <strong>Credentials will be sent to the school's email address.</strong> The school will need to change their password upon first login.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SchoolManagement;

