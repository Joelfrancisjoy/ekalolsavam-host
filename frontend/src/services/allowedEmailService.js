import http from './http-common';
import { API_ROUTES } from './apiRoutes';

const getAllowedEmails = () => {
  return http.get(API_ROUTES.auth.allowedEmails);
};

const addAllowedEmail = (email) => {
  return http.post(API_ROUTES.auth.allowedEmails, { email });
};

const bulkAddAllowedEmails = (emails) => {
  return http.post(API_ROUTES.auth.allowedEmailsBulkAdd, { emails });
};

const toggleEmailStatus = (id) => {
  return http.patch(API_ROUTES.auth.allowedEmailToggle(id));
};

const deleteAllowedEmail = (id) => {
  return http.delete(API_ROUTES.auth.allowedEmailDelete(id));
};

const checkEmailAllowed = (email) => {
  return http.get(API_ROUTES.auth.allowedEmailCheck(email));
};

const checkEmailRegistered = (email) => {
  return http.get(API_ROUTES.auth.allowedEmailCheckRegistered(email));
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

export default allowedEmailService;
