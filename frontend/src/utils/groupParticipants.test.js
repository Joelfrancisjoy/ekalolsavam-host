import {
  buildAdminQueryParams,
  getAdminStatusLabel,
  matchesAdminStatusTab,
  normalizeAdminStatus,
  normalizeSchoolStatus,
  parseAdminFilterStateFromSearchParams
} from './groupParticipants';

describe('groupParticipants query utilities', () => {
  test('buildAdminQueryParams includes only active filters and maps accepted status', () => {
    const params = buildAdminQueryParams({
      statusTab: 'accepted',
      groupClass: 'HS',
      genderCategory: '',
      school: 'SCH-10',
      event: '',
      search: 'leader',
      page: 1
    });

    expect(params).toEqual({
      status: 'accepted',
      group_class: 'HS',
      school: 'SCH-10',
      search: 'leader'
    });
  });

  test('buildAdminQueryParams keeps explicit all status and page', () => {
    const params = buildAdminQueryParams({
      statusTab: 'all',
      groupClass: '',
      genderCategory: 'MIXED',
      school: '',
      event: '42',
      search: '',
      page: 3
    });

    expect(params).toEqual({
      status: 'all',
      gender_category: 'MIXED',
      event: '42',
      page: 3
    });
  });

  test('parseAdminFilterStateFromSearchParams normalizes aliases', () => {
    const parsed = parseAdminFilterStateFromSearchParams(
      new URLSearchParams('status=approved&group_class=up&gender_category=girls&school_id=101&eventId=22&q=abc&page=2')
    );

    expect(parsed).toEqual({
      statusTab: 'accepted',
      groupClass: 'UP',
      genderCategory: 'GIRLS',
      school: '101',
      event: '22',
      search: 'abc',
      page: 2
    });
  });
});

describe('group status normalization', () => {
  test('accepted and declined aliases normalize correctly', () => {
    expect(normalizeAdminStatus('approved')).toBe('accepted');
    expect(normalizeAdminStatus('declined')).toBe('rejected');
    expect(normalizeAdminStatus('pending')).toBe('pending');
    expect(normalizeSchoolStatus('accepted')).toBe('approved');
  });

  test('accepted and rejected tabs match aliases', () => {
    expect(matchesAdminStatusTab('approved', 'accepted')).toBe(true);
    expect(matchesAdminStatusTab('declined', 'rejected')).toBe(true);
    expect(matchesAdminStatusTab('pending', 'accepted')).toBe(false);
    expect(matchesAdminStatusTab('approved', 'all')).toBe(true);
  });

  test('admin labels are presentation-safe', () => {
    expect(getAdminStatusLabel('approved')).toBe('Accepted');
    expect(getAdminStatusLabel('declined')).toBe('Rejected');
    expect(getAdminStatusLabel('pending')).toBe('Pending');
  });
});
