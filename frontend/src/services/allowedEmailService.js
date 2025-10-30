import http from './http-common';

const getAllowedEmails = () => {
  return http.get('/api/auth/allowed-emails/');
};

const addAllowedEmail = (email) => {
  return http.post('/api/auth/allowed-emails/', { email });
};

const bulkAddAllowedEmails = (emails) => {
  return http.post('/api/auth/allowed-emails/bulk-add/', { emails });
};

const toggleEmailStatus = (id) => {
  return http.patch(`/api/auth/allowed-emails/${id}/toggle/`);
};

const deleteAllowedEmail = (id) => {
  return http.delete(`/api/auth/allowed-emails/${id}/`);
};

const checkEmailAllowed = (email) => {
  return http.get(`/api/auth/allowed-emails/check/?email=${encodeURIComponent(email)}`);
};

const checkEmailRegistered = (email) => {
  return http.get(`/api/auth/allowed-emails/check-registered/?email=${encodeURIComponent(email)}`);
};

const allowedEmailService = {
  getAllowedEmails,
  addAllowedEmail,
  bulkAddAllowedEmails,
  toggleEmailStatus,
  deleteAllowedEmail,
  checkEmailAllowed,
  checkEmailRegistered
};

<<<<<<< HEAD
export default allowedEmailService;
=======
export default allowedEmailService;
>>>>>>> 0459f2d6c76b2996f69de121c5e8747cafc4cdd5
