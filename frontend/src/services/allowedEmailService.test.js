import allowedEmailService from './allowedEmailService';
import http from './http-common';
import { API_ROUTES } from './apiRoutes';

jest.mock('./http-common', () => ({
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  delete: jest.fn()
}));

describe('allowedEmailService route canonicalization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('uses API_ROUTES for list and create requests', () => {
    allowedEmailService.getAllowedEmails();
    allowedEmailService.addAllowedEmail('user@example.com');
    allowedEmailService.bulkAddAllowedEmails(['a@example.com', 'b@example.com']);

    expect(http.get).toHaveBeenCalledWith(API_ROUTES.auth.allowedEmails);
    expect(http.post).toHaveBeenNthCalledWith(1, API_ROUTES.auth.allowedEmails, { email: 'user@example.com' });
    expect(http.post).toHaveBeenNthCalledWith(2, API_ROUTES.auth.allowedEmailsBulkAdd, {
      emails: ['a@example.com', 'b@example.com']
    });
  });

  test('uses API_ROUTES dynamic builders for update and delete requests', () => {
    allowedEmailService.toggleEmailStatus(17);
    allowedEmailService.deleteAllowedEmail(17);

    expect(http.patch).toHaveBeenCalledWith(API_ROUTES.auth.allowedEmailToggle(17));
    expect(http.delete).toHaveBeenCalledWith(API_ROUTES.auth.allowedEmailDelete(17));
  });

  test('preserves encoded query behavior for email checks', () => {
    const email = 'foo+bar user@example.com';

    allowedEmailService.checkEmailAllowed(email);
    allowedEmailService.checkEmailRegistered(email);

    expect(http.get).toHaveBeenNthCalledWith(1, API_ROUTES.auth.allowedEmailCheck(email));
    expect(http.get).toHaveBeenNthCalledWith(2, API_ROUTES.auth.allowedEmailCheckRegistered(email));
  });
});
