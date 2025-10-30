import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SchoolStandings = () => {
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadStandings();
  }, []);

  const loadStandings = async () => {
    try {
      const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
      const response = await axios.get(`${apiUrl}/api/auth/standings/`);
      setStandings(response.data);
    } catch (err) {
      setError('Failed to load standings');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading standings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">🏆 School Standings</h1>
        <p className="text-lg text-gray-600">Current rankings based on student performance</p>
      </div>

      {standings.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Standings Yet</h3>
          <p className="text-gray-600">School standings will appear here as participants earn points.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-lg">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold">Rank</th>
                <th className="px-6 py-4 text-left text-sm font-semibold">School</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">🥇 Gold</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">🥈 Silver</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">🥉 Bronze</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">📊 Participants</th>
                <th className="px-6 py-4 text-center text-sm font-semibold">Total Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {standings.map((standing, index) => (
                <tr 
                  key={standing.id} 
                  className={`hover:bg-gray-50 transition-colors ${
                    index === 0 ? 'bg-yellow-50' : 
                    index === 1 ? 'bg-gray-50' : 
                    index === 2 ? 'bg-orange-50' : ''
                  }`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {index === 0 && <span className="text-2xl mr-2">🥇</span>}
                      {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                      {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                      <span className="font-bold text-lg">{standing.rank || index + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{standing.school_name || 'Unknown School'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-yellow-600">{standing.total_gold || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-gray-400">{standing.total_silver || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-orange-600">{standing.total_bronze || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-600">{standing.total_participants || 0}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <span className="text-lg font-bold text-blue-600">{standing.total_points || 0}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-8 text-center text-sm text-gray-500">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default SchoolStandings;

