import { API_ROUTES } from './apiRoutes';

describe('API_ROUTES query helpers', () => {
  test('builds feedback analytics route with URLSearchParams', () => {
    const params = new URLSearchParams();
    params.append('event', 'on-stage');
    params.append('days', '30');

    expect(API_ROUTES.feedback.analyticsWithParams(params))
      .toBe('/api/feedback/sentiment-analytics/?event=on-stage&days=30');
  });

  test('returns base routes when query params are empty', () => {
    const params = new URLSearchParams();

    expect(API_ROUTES.admin.idsListWithParams(params)).toBe(API_ROUTES.admin.idsList);
    expect(API_ROUTES.admin.signupRequestsWithParams(params)).toBe(API_ROUTES.admin.signupRequests);
    expect(API_ROUTES.feedback.analyticsWithParams(params)).toBe(API_ROUTES.feedback.analytics);
  });

  test('normalizes plain-string query input without duplicate question marks', () => {
    expect(API_ROUTES.feedback.analyticsWithParams('?days=7'))
      .toBe('/api/feedback/sentiment-analytics/?days=7');
    expect(API_ROUTES.admin.idsListWithParams('status=pending'))
      .toBe('/api/auth/admin/ids/?status=pending');
  });
});
