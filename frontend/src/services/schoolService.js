import axios from 'axios';
import http from './http-common';

export const schoolService = {
  // Get participants from assigned schools
  getSchoolParticipants: async () => {
    try {
      const response = await http.get('/api/auth/volunteer/school-participants/');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  // Verify student against school data
  verifyStudent: async (participantId, firstName, lastName) => {
    try {
      const response = await http.post('/api/auth/volunteer/verify-student/', {
        participant_id: participantId,
        first_name: firstName,
        last_name: lastName
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }
};

export default schoolService;

