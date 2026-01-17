import http from './http-common';

const volunteerService = {
  // Get volunteer assignments
  getAssignments: () => {
    return http.get('/api/events/volunteer-assignments/');
  },

  // Check in for a shift
  checkIn: (shiftId) => {
    return http.post('/api/events/volunteer-check-in/', { shift_id: shiftId });
  },

  // Verify participant by chess number
  verifyParticipant: (chessNumber, eventId, notes = '') => {
    return http.post('/api/events/verify-participant/', {
      chess_number: chessNumber,
      event_id: eventId,
      notes: notes
    });
  },

  // Get participant verifications
  getVerifications: () => {
    return http.get('/api/events/participant-verifications/');
  },

  // Get volunteer shifts
  getShifts: () => {
    return http.get('/api/volunteers/shifts/');
  },

  // Get volunteer assignments
  getVolunteerAssignments: () => {
    return http.get('/api/volunteers/assignments/');
  },

  // Volunteer shifts
  listShifts: () => {
    return http.get('/api/volunteers/shifts/');
  },

  createShift: (data) => {
    return http.post('/api/volunteers/shifts/', data);
  },

  createAssignment: (data) => {
    return http.post('/api/volunteers/assignments/', data);
  },

  // Re-check request endpoints
  getRecheckRequests: () => {
    return http.get('/api/scores/volunteer/result-re-evaluation/');
  },

  getRecheckRequestDetails: (recheckRequestId) => {
    return http.get(`/api/scores/volunteer/result-re-evaluation/${recheckRequestId}/`);
  },

  acceptRecheckRequest: (recheckRequestId) => {
    return http.put(`/api/scores/volunteer/result-re-evaluation/${recheckRequestId}/accept/`);
  }
};

export default volunteerService;