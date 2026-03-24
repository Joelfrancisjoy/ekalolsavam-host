const withQueryParams = (path, params) => {
  if (!params) {
    return path;
  }

  const query = params instanceof URLSearchParams
    ? params.toString()
    : String(params).replace(/^\?/, '');

  return query ? `${path}?${query}` : path;
};

export const API_ROUTES = {
  auth: {
    tokenRefresh: '/api/token/refresh/',
    allowedEmails: '/api/auth/allowed-emails/',
    allowedEmailsBulkAdd: '/api/auth/allowed-emails/bulk-add/',
    allowedEmailToggle: (id) => `/api/auth/allowed-emails/${id}/toggle/`,
    allowedEmailDelete: (id) => `/api/auth/allowed-emails/${id}/`,
    allowedEmailCheck: (email) => `/api/auth/allowed-emails/check/?email=${encodeURIComponent(email)}`,
    allowedEmailCheckRegistered: (email) => `/api/auth/allowed-emails/check-registered/?email=${encodeURIComponent(email)}`
  },
  feedback: {
    create: '/api/feedback/create/',
    analytics: '/api/feedback/sentiment-analytics/',
    analyticsWithParams: (params) => withQueryParams('/api/feedback/sentiment-analytics/', params),
    adminList: '/api/feedback/admin/list/'
  },
  students: {
    groupProfile: (groupEntryId) => `/api/auth/students/group-profiles/${groupEntryId}/`
  },
  admin: {
    schoolGroupParticipants: '/api/auth/admin/school-group-participants/',
    schoolGroupParticipant: (groupEntryId) => `/api/auth/admin/school-group-participants/${groupEntryId}/`,
    schoolGroupParticipantApprove: (groupEntryId) => `/api/auth/admin/school-group-participants/${groupEntryId}/approve/`,
    schoolGroupParticipantReject: (groupEntryId) => `/api/auth/admin/school-group-participants/${groupEntryId}/reject/`,
    idsGenerate: '/api/auth/admin/ids/generate/',
    idsList: '/api/auth/admin/ids/',
    idsListWithParams: (params) => withQueryParams('/api/auth/admin/ids/', params),
    idRecord: (id) => `/api/auth/admin/ids/${id}/`,
    signupRequests: '/api/auth/admin/signup-requests/',
    signupRequestsWithParams: (params) => withQueryParams('/api/auth/admin/signup-requests/', params),
    signupRequest: (requestId) => `/api/auth/admin/signup-requests/${requestId}/`
  },
  emergencies: {
    volunteerComplete: (emergencyId) => `/api/emergencies/${emergencyId}/volunteer-complete/`
  }
};
