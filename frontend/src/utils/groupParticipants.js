export const GROUP_CLASS_OPTIONS = ['LP', 'UP', 'HS', 'HSS'];
export const GENDER_CATEGORY_OPTIONS = ['BOYS', 'GIRLS', 'MIXED'];
export const ADMIN_STATUS_TABS = ['pending', 'accepted', 'rejected', 'all'];

export const DEFAULT_ADMIN_FILTER_STATE = {
  statusTab: 'pending',
  groupClass: '',
  genderCategory: '',
  school: '',
  event: '',
  search: '',
  page: 1
};

const ACCEPTED_STATUSES = new Set(['accepted', 'approved']);
const REJECTED_STATUSES = new Set(['rejected', 'declined']);

const toCleanString = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const toPositiveInt = (value, fallback = 1) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const normalizeStatusTab = (value) => {
  const normalized = toCleanString(value).toLowerCase();
  if (normalized === 'all') return 'all';
  if (normalized === 'pending') return 'pending';
  if (ACCEPTED_STATUSES.has(normalized)) return 'accepted';
  if (REJECTED_STATUSES.has(normalized)) return 'rejected';
  return 'pending';
};

export const normalizeAdminStatus = (value) => {
  const normalized = toCleanString(value).toLowerCase();
  if (ACCEPTED_STATUSES.has(normalized)) return 'accepted';
  if (REJECTED_STATUSES.has(normalized)) return 'rejected';
  return 'pending';
};

export const normalizeSchoolStatus = (value) => {
  const normalized = toCleanString(value).toLowerCase();
  if (ACCEPTED_STATUSES.has(normalized)) return 'approved';
  if (REJECTED_STATUSES.has(normalized)) return 'rejected';
  return 'pending';
};

export const getStatusBadgeClass = (status) => {
  const normalized = toCleanString(status).toLowerCase();
  if (normalized === 'accepted' || normalized === 'approved') {
    return 'bg-green-100 text-green-800 border-green-200';
  }
  if (normalized === 'rejected' || normalized === 'declined') {
    return 'bg-red-100 text-red-800 border-red-200';
  }
  return 'bg-amber-100 text-amber-800 border-amber-200';
};

export const getAdminStatusLabel = (status) => {
  const normalized = normalizeAdminStatus(status);
  if (normalized === 'accepted') return 'Accepted';
  if (normalized === 'rejected') return 'Rejected';
  return 'Pending';
};

export const getSchoolStatusLabel = (status) => {
  const normalized = normalizeSchoolStatus(status);
  if (normalized === 'approved') return 'Approved';
  if (normalized === 'rejected') return 'Rejected';
  return 'Pending';
};

export const statusTabToApiStatus = (statusTab) => {
  const normalized = normalizeStatusTab(statusTab);
  if (normalized === 'accepted') return 'accepted';
  if (normalized === 'rejected') return 'declined';
  if (normalized === 'all') return 'all';
  return 'pending';
};

export const matchesAdminStatusTab = (entryStatus, statusTab) => {
  const tab = normalizeStatusTab(statusTab);
  if (tab === 'all') return true;
  return normalizeAdminStatus(entryStatus) === tab;
};

export const normalizeAdminFilterState = (state = {}) => {
  return {
    statusTab: normalizeStatusTab(state.statusTab || state.status),
    groupClass: toCleanString(state.groupClass || state.group_class).toUpperCase(),
    genderCategory: toCleanString(state.genderCategory || state.gender_category).toUpperCase(),
    school: toCleanString(state.school || state.schoolId || state.school_id),
    event: toCleanString(state.event || state.eventId || state.event_id),
    search: toCleanString(state.search || state.q || state.query),
    page: toPositiveInt(state.page, 1)
  };
};

export const buildAdminQueryParams = (state = {}) => {
  const normalized = normalizeAdminFilterState(state);
  const params = {};
  const status = statusTabToApiStatus(normalized.statusTab);

  params.status = status;
  if (normalized.groupClass) params.group_class = normalized.groupClass;
  if (normalized.genderCategory) params.gender_category = normalized.genderCategory;
  if (normalized.school) params.school = normalized.school;
  if (normalized.event) params.event = normalized.event;
  if (normalized.search) params.search = normalized.search;
  if (normalized.page > 1) params.page = normalized.page;

  return params;
};

export const buildAdminSearchParamsFromState = (state = {}) => {
  const normalized = normalizeAdminFilterState(state);
  const params = new URLSearchParams();

  if (normalized.statusTab !== 'pending') {
    params.set('status', normalized.statusTab);
  }
  if (normalized.groupClass) params.set('groupClass', normalized.groupClass);
  if (normalized.genderCategory) params.set('genderCategory', normalized.genderCategory);
  if (normalized.school) params.set('school', normalized.school);
  if (normalized.event) params.set('event', normalized.event);
  if (normalized.search) params.set('search', normalized.search);
  if (normalized.page > 1) params.set('page', String(normalized.page));

  return params;
};

const firstQueryValue = (searchParams, keys = []) => {
  for (const key of keys) {
    const value = searchParams.get(key);
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
};

export const parseAdminFilterStateFromSearchParams = (searchParams) => {
  const params = searchParams instanceof URLSearchParams
    ? searchParams
    : new URLSearchParams(String(searchParams || ''));

  return normalizeAdminFilterState({
    statusTab: firstQueryValue(params, ['status']),
    groupClass: firstQueryValue(params, ['groupClass', 'group_class']),
    genderCategory: firstQueryValue(params, ['genderCategory', 'gender_category']),
    school: firstQueryValue(params, ['school', 'schoolId', 'school_id']),
    event: firstQueryValue(params, ['event', 'eventId', 'event_id']),
    search: firstQueryValue(params, ['search', 'q', 'query']),
    page: firstQueryValue(params, ['page'])
  });
};
