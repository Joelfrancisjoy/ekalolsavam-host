import React, { useState, useEffect } from 'react';
import axios from 'axios';
import authManager from '../utils/authManager';

const IDManagement = () => {
  const [activeTab, setActiveTab] = useState('generate');
  const [role, setRole] = useState('volunteer');
  const [count, setCount] = useState(1);
  const [generatedIds, setGeneratedIds] = useState([]);
  const [signupRequests, setSignupRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const generateIds = async () => {
    setLoading(true);
    setMessage('');

    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const { access } = authManager.getTokens();

      if (!access) {
        setMessage('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.post(
        `${apiUrl}/api/auth/admin/ids/generate/`,
        { role, count },
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setGeneratedIds(response.data.ids);
      setMessage(`Generated ${response.data.count} ID(s) successfully`);
    } catch (error) {
      console.error('ID Generation Error:', error.response || error);

      if (error.response?.status === 401) {
        setMessage('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setMessage('Permission denied. Admin access required.');
      } else {
        setMessage(error.response?.data?.error || error.response?.data?.detail || 'Failed to generate IDs');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSignupRequests = async () => {
    setLoading(true);
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const { access } = authManager.getTokens();

      if (!access) {
        setMessage('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await axios.get(
        `${apiUrl}/api/auth/admin/signup-requests/?status=pending`,
        {
          headers: {
            'Authorization': `Bearer ${access}`
          }
        }
      );

      setSignupRequests(response.data);
    } catch (error) {
      console.error('Failed to load signup requests:', error);

      if (error.response?.status === 401) {
        setMessage('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setMessage('Permission denied. Admin access required.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId, status) => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const { access } = authManager.getTokens();

      if (!access) {
        setMessage('Authentication token not found. Please log in again.');
        return;
      }

      await axios.patch(
        `${apiUrl}/api/auth/admin/signup-requests/${requestId}/`,
        { status, notes: `Status changed to ${status}` },
        {
          headers: {
            'Authorization': `Bearer ${access}`,
            'Content-Type': 'application/json'
          }
        }
      );

      setMessage(`Request ${status} successfully`);
      loadSignupRequests();
    } catch (error) {
      console.error('Failed to approve request:', error.response || error);

      if (error.response?.status === 401) {
        setMessage('Authentication failed. Please log in again.');
      } else if (error.response?.status === 403) {
        setMessage('Permission denied. Admin access required.');
      } else {
        setMessage(error.response?.data?.error || error.response?.data?.detail || 'Failed to update request');
      }
    }
  };

  useEffect(() => {
    if (activeTab === 'requests') {
      loadSignupRequests();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-gray-800">ID Management</h2>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'generate'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Generate IDs
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Signup Requests
          </button>
        </nav>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.includes('successfully')
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
          {message}
        </div>
      )}

      {activeTab === 'generate' && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role *
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="volunteer">Volunteer</option>
                <option value="judge">Judge</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Count *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            onClick={generateIds}
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating...' : 'Generate IDs'}
          </button>

          {generatedIds.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Generated IDs:</h3>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                {generatedIds.map((id, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                    <code className="font-mono text-sm">{id.id_code}</code>
                    <span className="text-xs text-gray-500">{id.role}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Pending Signup Requests</h3>

          {signupRequests.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {signupRequests.map((request) => (
                <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold">{request.user_details?.username}</p>
                      <p className="text-sm text-gray-600">{request.user_details?.email}</p>
                      <p className="text-xs text-gray-500">Role: {request.issued_id_code}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${request.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                      }`}>
                      {request.status}
                    </span>
                  </div>

                  <div className="flex space-x-2 mt-4">
                    <button
                      onClick={() => handleApproveRequest(request.id, 'approved')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleApproveRequest(request.id, 'rejected')}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IDManagement;

