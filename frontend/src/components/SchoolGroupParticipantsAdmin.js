import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import http from '../services/http-common';
import { API_ROUTES } from '../services/apiRoutes';
import { GENDER_OPTIONS, normalizeGenderValue } from '../constants/gender';
import {
  ADMIN_STATUS_TABS,
  DEFAULT_ADMIN_FILTER_STATE,
  GENDER_CATEGORY_OPTIONS,
  GROUP_CLASS_OPTIONS,
  buildAdminQueryParams,
  buildAdminSearchParamsFromState,
  getAdminStatusLabel,
  getStatusBadgeClass,
  matchesAdminStatusTab,
  normalizeAdminFilterState,
  normalizeAdminStatus,
  parseAdminFilterStateFromSearchParams
} from '../utils/groupParticipants';

const FILTER_KEYS = ['statusTab', 'groupClass', 'genderCategory', 'school', 'event', 'search', 'page'];

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const toInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeEventIds = (entry) => {
  if (Array.isArray(entry?.event_ids)) {
    return entry.event_ids.map((item) => Number(item)).filter((item) => Number.isInteger(item) && item > 0);
  }
  if (Array.isArray(entry?.events)) {
    return entry.events
      .map((item) => (typeof item === 'object' ? item?.id : item))
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);
  }
  if (Array.isArray(entry?.events_display)) {
    return entry.events_display
      .map((item) => Number(item?.id))
      .filter((item) => Number.isInteger(item) && item > 0);
  }
  return [];
};

const normalizeEventsDisplay = (entry) => {
  if (Array.isArray(entry?.events_display)) {
    return entry.events_display
      .map((item) => (typeof item === 'string' ? item : item?.name || item?.event_name || item?.title || ''))
      .filter(Boolean);
  }
  if (Array.isArray(entry?.events)) {
    return entry.events
      .map((item) => (typeof item === 'string' ? item : item?.name || item?.event_name || item?.title || ''))
      .filter(Boolean);
  }
  return [];
};

const getLeaderFullName = (entry, participants) => {
  if (entry?.leader_full_name) return entry.leader_full_name;
  const leaderIndex = toInt(entry?.leader_index);
  if (!leaderIndex || leaderIndex < 1 || leaderIndex > participants.length) return '-';
  const participant = participants[leaderIndex - 1] || {};
  const fullName = `${participant?.first_name || ''} ${participant?.last_name || ''}`.trim();
  return fullName || '-';
};

const normalizeAdminEntries = (payload) => {
  return normalizeCollection(payload).map((entry, index) => {
    const participants = Array.isArray(entry?.participants) ? entry.participants : [];
    const participantCount = toInt(entry?.participant_count) || participants.length || 0;
    const id = entry?.id ?? entry?.group_entry_id ?? `entry-${index}`;
    const schoolName = entry?.school_name || entry?.school_details?.name || entry?.school?.name || entry?.school_display || '-';
    const reviewerName = entry?.reviewed_by_name || entry?.reviewed_by?.username || entry?.reviewed_by?.email || '-';

    return {
      ...entry,
      id,
      group_id: String(entry?.group_id || '').toUpperCase(),
      group_class: entry?.group_class || '',
      gender_category: entry?.gender_category || '',
      participant_count: participantCount,
      participants,
      leader_full_name: getLeaderFullName(entry, participants),
      events_display: normalizeEventsDisplay(entry),
      event_ids: normalizeEventIds(entry),
      status: normalizeAdminStatus(entry?.status),
      source: entry?.source || '-',
      submitted_at: entry?.submitted_at || entry?.created_at || null,
      review_notes: entry?.review_notes || '',
      reviewed_at: entry?.reviewed_at || null,
      reviewed_by_name: reviewerName,
      school_name: schoolName
    };
  });
};

const entryEventLabels = (entry) => {
  const labels = Array.isArray(entry?.events_display) ? entry.events_display.filter(Boolean) : [];
  if (labels.length > 0) return labels;
  const ids = Array.isArray(entry?.event_ids) ? entry.event_ids : [];
  return ids.map((id) => `Event #${id}`);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const getRequestErrorMessage = (requestError, fallback) => {
  const payload = requestError?.response?.data;
  return payload?.detail || payload?.error || fallback;
};

const toErrorList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
};

const createEntryEditFieldErrors = () => ({
  non_field_errors: [],
  gender_category: [],
  notes: [],
  participants_non_field: [],
  participants: {}
});

const hasEntryEditFieldErrors = (errors) => {
  if (!errors) return false;
  if (
    (Array.isArray(errors.non_field_errors) && errors.non_field_errors.length > 0) ||
    (Array.isArray(errors.gender_category) && errors.gender_category.length > 0) ||
    (Array.isArray(errors.notes) && errors.notes.length > 0) ||
    (Array.isArray(errors.participants_non_field) && errors.participants_non_field.length > 0)
  ) {
    return true;
  }
  return Object.values(errors.participants || {}).some((row) => (
    (Array.isArray(row?.first_name) && row.first_name.length > 0) ||
    (Array.isArray(row?.last_name) && row.last_name.length > 0) ||
    (Array.isArray(row?.gender) && row.gender.length > 0) ||
    (Array.isArray(row?.student_class) && row.student_class.length > 0) ||
    (Array.isArray(row?.phone) && row.phone.length > 0) ||
    (Array.isArray(row?.non_field_errors) && row.non_field_errors.length > 0)
  ));
};

const normalizeParticipantGenderValue = (value) => {
  const normalized = normalizeGenderValue(value);
  if (normalized) return normalized;
  return String(value || '').trim().toUpperCase();
};

const normalizeEditableParticipants = (value) => {
  if (!Array.isArray(value)) return [];
  return value.map((participant, index) => {
    const participantId = participant?.id ?? participant?.participant_id ?? null;
    const fallbackOrder = toInt(participant?.member_order ?? participant?.memberOrder ?? index + 1);
    const memberOrder = fallbackOrder && fallbackOrder > 0 ? fallbackOrder : (index + 1);
    return {
      id: participantId,
      member_order: memberOrder,
      first_name: String(participant?.first_name || '').trim(),
      last_name: String(participant?.last_name || '').trim(),
      gender: normalizeParticipantGenderValue(participant?.gender),
      student_class: String(participant?.student_class ?? participant?.studentClass ?? '').trim(),
      phone: String(participant?.phone || '').trim()
    };
  });
};

const buildEditableParticipantsPayload = (value) => {
  return normalizeEditableParticipants(value).map((participant, index) => {
    const payload = {
      first_name: String(participant?.first_name || '').trim(),
      last_name: String(participant?.last_name || '').trim(),
      gender: normalizeParticipantGenderValue(participant?.gender),
      student_class: String(participant?.student_class || '').trim(),
      phone: String(participant?.phone || '').trim()
    };
    const participantId = participant?.id;
    if (participantId !== null && participantId !== undefined && participantId !== '') {
      payload.id = participantId;
    } else {
      const fallbackOrder = toInt(participant?.member_order ?? index + 1);
      payload.member_order = fallbackOrder && fallbackOrder > 0 ? fallbackOrder : (index + 1);
    }
    return payload;
  });
};

const parseParticipantFieldErrors = (participantErrors) => {
  const rows = {};
  const nonField = [];
  if (!participantErrors) return { rows, nonField };

  const consumeRowError = (rowIndex, item) => {
    if (!item || typeof item !== 'object') return;
    const rowErrors = {
      first_name: toErrorList(item?.first_name),
      last_name: toErrorList(item?.last_name),
      gender: toErrorList(item?.gender),
      student_class: toErrorList(item?.student_class),
      phone: toErrorList(item?.phone),
      non_field_errors: toErrorList(item?.non_field_errors)
    };
    if (
      rowErrors.first_name.length ||
      rowErrors.last_name.length ||
      rowErrors.gender.length ||
      rowErrors.student_class.length ||
      rowErrors.phone.length ||
      rowErrors.non_field_errors.length
    ) {
      rows[rowIndex] = rowErrors;
    }
  };

  if (Array.isArray(participantErrors)) {
    participantErrors.forEach((item, index) => {
      if (!item) return;
      if (typeof item === 'string') {
        nonField.push(item);
        return;
      }
      if (Array.isArray(item)) {
        nonField.push(...toErrorList(item));
        return;
      }
      consumeRowError(index, item);
    });
    return { rows, nonField };
  }

  if (typeof participantErrors === 'object') {
    Object.entries(participantErrors).forEach(([key, item]) => {
      const rowIndex = Number(key);
      if (!Number.isInteger(rowIndex) || rowIndex < 0) {
        nonField.push(...toErrorList(item));
        return;
      }
      if (typeof item === 'string') {
        nonField.push(item);
        return;
      }
      if (Array.isArray(item)) {
        nonField.push(...toErrorList(item));
        return;
      }
      consumeRowError(rowIndex, item);
    });
  } else {
    nonField.push(...toErrorList(participantErrors));
  }

  return { rows, nonField };
};

const parseEntryEditErrors = (payload) => {
  const errors = createEntryEditFieldErrors();
  if (!payload) return errors;
  if (typeof payload === 'string') {
    errors.non_field_errors = [payload];
    return errors;
  }

  errors.non_field_errors.push(...toErrorList(payload?.non_field_errors));
  errors.non_field_errors.push(...toErrorList(payload?.detail));
  errors.non_field_errors.push(...toErrorList(payload?.error));
  errors.gender_category = toErrorList(payload?.gender_category);
  errors.notes = toErrorList(payload?.notes);

  const participantParse = parseParticipantFieldErrors(payload?.participants);
  errors.participants = participantParse.rows;
  errors.participants_non_field = participantParse.nonField;

  return errors;
};

const deriveLeaderFullName = (leaderIndex, participants, fallback = '-') => {
  const normalizedLeaderIndex = toInt(leaderIndex);
  if (!normalizedLeaderIndex || normalizedLeaderIndex < 1 || normalizedLeaderIndex > participants.length) {
    return fallback;
  }
  const participant = participants[normalizedLeaderIndex - 1] || {};
  const fullName = `${participant?.first_name || ''} ${participant?.last_name || ''}`.trim();
  return fullName || fallback;
};

const areFilterStatesEqual = (a, b) => {
  return FILTER_KEYS.every((key) => String(a?.[key] ?? '') === String(b?.[key] ?? ''));
};

const tabLabel = (statusTab) => {
  if (statusTab === 'accepted') return 'Accepted';
  if (statusTab === 'rejected') return 'Rejected';
  if (statusTab === 'all') return 'All';
  return 'Pending';
};

const SchoolGroupParticipantsAdmin = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilterState = useMemo(
    () => normalizeAdminFilterState({ ...DEFAULT_ADMIN_FILTER_STATE, ...parseAdminFilterStateFromSearchParams(searchParams) }),
    [searchParams]
  );

  const [draftFilters, setDraftFilters] = useState(initialFilterState);
  const [appliedFilters, setAppliedFilters] = useState(initialFilterState);
  const [searchInput, setSearchInput] = useState(initialFilterState.search || '');
  const [reloadToken, setReloadToken] = useState(0);

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastIssuedCredentials, setLastIssuedCredentials] = useState(null);
  const [pagination, setPagination] = useState({
    page: initialFilterState.page || 1,
    count: 0,
    hasNext: false,
    hasPrevious: false
  });

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [entryEditForm, setEntryEditForm] = useState({
    groupEntryId: '',
    gender_category: '',
    notes: '',
    participants: []
  });
  const [entryEditSaving, setEntryEditSaving] = useState(false);
  const [entryEditErrors, setEntryEditErrors] = useState(createEntryEditFieldErrors());
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState({ id: null, type: '' });

  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
    setActionError('');
    setLastIssuedCredentials(null);
  }, []);

  const loadEntries = useCallback(async (activeFilters = {}, options = {}) => {
    const normalizedFilters = normalizeAdminFilterState(activeFilters);

    try {
      if (!options?.silent) setLoading(true);
      setError('');
      const params = buildAdminQueryParams(normalizedFilters);
      const response = await http.get(API_ROUTES.admin.schoolGroupParticipants, { params });
      const nextEntries = normalizeAdminEntries(response.data)
        .filter((entry) => matchesAdminStatusTab(entry.status, normalizedFilters.statusTab));

      setEntries(nextEntries);
      setPagination({
        page: normalizedFilters.page,
        count: Number.isInteger(Number(response?.data?.count)) ? Number(response.data.count) : nextEntries.length,
        hasNext: Boolean(response?.data?.next),
        hasPrevious: Boolean(response?.data?.previous)
      });

      setSelectedEntry((prev) => {
        if (!prev) return null;
        const updated = nextEntries.find((entry) => String(entry.id) === String(prev.id));
        return updated || null;
      });
      return nextEntries;
    } catch (requestError) {
      console.error('Failed to load school group participants', requestError);
      setEntries([]);
      setError(getRequestErrorMessage(requestError, 'Failed to load school group participants.'));
      return [];
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const cleaned = String(searchInput || '').trim();
      setDraftFilters((prev) => (prev.search === cleaned ? prev : { ...prev, search: cleaned }));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const parsed = normalizeAdminFilterState({
      ...DEFAULT_ADMIN_FILTER_STATE,
      ...parseAdminFilterStateFromSearchParams(searchParams)
    });

    setDraftFilters((prev) => (areFilterStatesEqual(prev, parsed) ? prev : parsed));
    setAppliedFilters((prev) => (areFilterStatesEqual(prev, parsed) ? prev : parsed));
    setSearchInput((prev) => (prev === parsed.search ? prev : parsed.search));
  }, [searchParams]);

  useEffect(() => {
    const nextParams = buildAdminSearchParamsFromState(appliedFilters);
    if (nextParams.toString() !== searchParams.toString()) {
      setSearchParams(nextParams, { replace: true });
    }
  }, [appliedFilters, searchParams, setSearchParams]);

  useEffect(() => {
    loadEntries(appliedFilters);
  }, [appliedFilters, reloadToken, loadEntries]);

  const statusCounts = useMemo(() => {
    return entries.reduce((acc, entry) => {
      const normalized = normalizeAdminStatus(entry?.status);
      acc[normalized] += 1;
      return acc;
    }, { pending: 0, accepted: 0, rejected: 0 });
  }, [entries]);

  const updateEntryOptimistically = useCallback((entryId, partialEntry) => {
    setEntries((prev) => {
      const next = prev
        .map((entry) => {
          if (String(entry.id) !== String(entryId)) return entry;
          const nextStatus = partialEntry?.status ? normalizeAdminStatus(partialEntry.status) : entry.status;
          return {
            ...entry,
            ...partialEntry,
            status: nextStatus
          };
        })
        .filter((entry) => matchesAdminStatusTab(entry.status, appliedFilters.statusTab));
      return next;
    });

    setSelectedEntry((prev) => {
      if (!prev || String(prev.id) !== String(entryId)) return prev;
      const nextStatus = partialEntry?.status ? normalizeAdminStatus(partialEntry.status) : prev.status;
      return {
        ...prev,
        ...partialEntry,
        status: nextStatus
      };
    });
  }, [appliedFilters.statusTab]);

  const openDetails = (entry) => {
    setSelectedEntry(entry);
    setEntryEditForm({
      groupEntryId: String(entry?.id ?? ''),
      gender_category: String(entry?.gender_category || '').trim().toUpperCase(),
      notes: String(entry?.review_notes || '').trim(),
      participants: normalizeEditableParticipants(entry?.participants)
    });
    setEntryEditErrors(createEntryEditFieldErrors());
    setEntryEditSaving(false);
    setReviewNotes(entry?.review_notes || '');
    setRejectReason('');
    setActionError('');
  };

  const closeDetails = () => {
    setSelectedEntry(null);
    setEntryEditForm({
      groupEntryId: '',
      gender_category: '',
      notes: '',
      participants: []
    });
    setEntryEditErrors(createEntryEditFieldErrors());
    setEntryEditSaving(false);
    setReviewNotes('');
    setRejectReason('');
    setActionError('');
  };

  const triggerReload = () => {
    setReloadToken((prev) => prev + 1);
  };

  const applyFilters = () => {
    clearMessages();
    const nextFilters = normalizeAdminFilterState({
      ...draftFilters,
      search: searchInput,
      page: 1
    });
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  const resetFilters = () => {
    clearMessages();
    const nextFilters = normalizeAdminFilterState({
      ...DEFAULT_ADMIN_FILTER_STATE,
      statusTab: draftFilters.statusTab,
      page: 1
    });
    setSearchInput('');
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  const refreshEntries = () => {
    clearMessages();
    triggerReload();
  };

  const setStatusTab = (statusTab) => {
    clearMessages();
    const nextFilters = normalizeAdminFilterState({
      ...draftFilters,
      statusTab,
      search: searchInput,
      page: 1
    });
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  const setPage = (page) => {
    if (page < 1) return;
    const nextFilters = normalizeAdminFilterState({
      ...draftFilters,
      search: searchInput,
      page
    });
    setDraftFilters(nextFilters);
    setAppliedFilters(nextFilters);
  };

  const clearEntryFieldError = (field) => {
    setEntryEditErrors((prev) => {
      if (!Array.isArray(prev?.[field]) || prev[field].length === 0) return prev;
      return { ...prev, [field]: [] };
    });
  };

  const updateEntryParticipantField = (index, field, value) => {
    setEntryEditForm((prev) => {
      const participants = Array.isArray(prev.participants) ? [...prev.participants] : [];
      const current = participants[index] || { first_name: '', last_name: '' };
      participants[index] = { ...current, [field]: value };
      return { ...prev, participants };
    });
    setEntryEditErrors((prev) => {
      if (!prev?.participants?.[index]?.[field]?.length) return prev;
      const nextParticipants = { ...(prev.participants || {}) };
      const row = { ...(nextParticipants[index] || {}) };
      row[field] = [];
      nextParticipants[index] = row;
      return { ...prev, participants: nextParticipants };
    });
  };

  const submitEntryEdits = async () => {
    if (!selectedEntry) return;

    setActionError('');
    setSuccess('');
    setLastIssuedCredentials(null);
    setEntryEditErrors(createEntryEditFieldErrors());

    const groupEntryId = String(entryEditForm.groupEntryId || selectedEntry.id || '').trim();
    const genderCategory = String(entryEditForm.gender_category || '').trim().toUpperCase();
    const notes = String(entryEditForm.notes || '').trim();
    const participants = buildEditableParticipantsPayload(entryEditForm.participants);

    if (!groupEntryId) {
      setActionError('Unable to update this group entry. Please reopen the details panel.');
      return;
    }
    if (!participants.length) {
      setActionError('At least one participant is required.');
      return;
    }

    const payload = {
      participants,
      ...(genderCategory ? { gender_category: genderCategory } : {}),
      ...(notes ? { notes } : {})
    };

    try {
      setEntryEditSaving(true);
      const response = await http.patch(API_ROUTES.admin.schoolGroupParticipant(groupEntryId), payload);
      const serverGroup = response?.data?.group
        ? normalizeAdminEntries([response.data.group])[0]
        : (response?.data ? normalizeAdminEntries([response.data])[0] : null);
      const normalizedParticipants = normalizeEditableParticipants(participants);
      const optimistic = serverGroup || {
        gender_category: genderCategory || selectedEntry.gender_category || '',
        review_notes: notes || selectedEntry.review_notes || '',
        participants: normalizedParticipants,
        participant_count: normalizedParticipants.length,
        leader_full_name: deriveLeaderFullName(
          selectedEntry?.leader_index,
          normalizedParticipants,
          selectedEntry?.leader_full_name || '-'
        )
      };

      updateEntryOptimistically(groupEntryId, optimistic);
      setSuccess('Group entry updated successfully.');
      setEntryEditForm((prev) => ({
        ...prev,
        notes: optimistic.review_notes || notes,
        gender_category: optimistic.gender_category || genderCategory,
        participants: normalizeEditableParticipants(optimistic.participants || normalizedParticipants)
      }));
      setReviewNotes(optimistic.review_notes || notes);
      loadEntries(appliedFilters, { silent: true });
    } catch (requestError) {
      const statusCode = Number(requestError?.response?.status || 0);
      const payloadErrors = requestError?.response?.data;
      if (statusCode === 400) {
        const parsed = parseEntryEditErrors(payloadErrors);
        if (hasEntryEditFieldErrors(parsed)) {
          setEntryEditErrors(parsed);
          setActionError('Please correct the highlighted fields.');
        } else {
          setActionError(getRequestErrorMessage(requestError, 'Validation failed.'));
        }
      } else if (statusCode === 403) {
        setActionError('Your role is not allowed to edit this group entry.');
      } else if (statusCode === 404) {
        setActionError('This group entry was not found or is not accessible.');
      } else {
        setActionError(getRequestErrorMessage(requestError, 'Failed to update group entry.'));
      }
    } finally {
      setEntryEditSaving(false);
    }
  };

  const approveEntry = async (entry, notes = '') => {
    if (!entry) return;
    const groupEntryId = entry.id;
    if (normalizeAdminStatus(entry.status) !== 'pending') return;

    try {
      setActionLoading({ id: groupEntryId, type: 'approve' });
      setActionError('');
      setSuccess('');
      setLastIssuedCredentials(null);

      const payload = {};
      const trimmedNotes = String(notes || '').trim();
      if (trimmedNotes) payload.notes = trimmedNotes;

      const response = await http.post(API_ROUTES.admin.schoolGroupParticipantApprove(groupEntryId), payload);
      const serverGroup = response?.data?.group ? normalizeAdminEntries([response.data.group])[0] : null;
      const credentials = response?.data?.user_credentials || null;
      const optimistic = serverGroup || {
        status: 'accepted',
        review_notes: trimmedNotes || entry.review_notes || '',
        reviewed_at: new Date().toISOString()
      };

      updateEntryOptimistically(groupEntryId, optimistic);
      setSuccess('Group entry approved successfully.');
      if (credentials?.username) setLastIssuedCredentials(credentials);
      closeDetails();
      loadEntries(appliedFilters, { silent: true });
    } catch (requestError) {
      console.error('Failed to approve group entry', requestError);
      setActionError(getRequestErrorMessage(requestError, 'Failed to approve group entry.'));
    } finally {
      setActionLoading({ id: null, type: '' });
    }
  };

  const rejectEntry = async (entry, notes, reason) => {
    if (!entry) return;
    const groupEntryId = entry.id;
    if (normalizeAdminStatus(entry.status) !== 'pending') return;

    const trimmedNotes = String(notes || '').trim();
    if (!trimmedNotes) {
      setActionError('Review notes are required to reject a group entry.');
      return;
    }

    try {
      setActionLoading({ id: groupEntryId, type: 'reject' });
      setActionError('');
      setSuccess('');
      setLastIssuedCredentials(null);

      const payload = {
        notes: trimmedNotes,
        reason: String(reason || '').trim() || trimmedNotes
      };

      const response = await http.post(API_ROUTES.admin.schoolGroupParticipantReject(groupEntryId), payload);
      const serverGroup = response?.data?.group ? normalizeAdminEntries([response.data.group])[0] : null;
      const optimistic = serverGroup || {
        status: 'rejected',
        review_notes: trimmedNotes,
        reviewed_at: new Date().toISOString()
      };

      updateEntryOptimistically(groupEntryId, optimistic);
      setSuccess('Group entry rejected.');
      closeDetails();
      loadEntries(appliedFilters, { silent: true });
    } catch (requestError) {
      console.error('Failed to reject group entry', requestError);
      setActionError(getRequestErrorMessage(requestError, 'Failed to reject group entry.'));
    } finally {
      setActionLoading({ id: null, type: '' });
    }
  };

  const canTransition = normalizeAdminStatus(selectedEntry?.status) === 'pending';
  const hasPagination = pagination.hasNext || pagination.hasPrevious || pagination.count > entries.length;
  const searchIsDebounced = String(searchInput || '').trim() === draftFilters.search;

  return (
    <div className="max-w-[92rem] mx-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 md:p-8 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-[30px] md:text-[32px] font-bold text-slate-900 tracking-tight">School Group Participants</h2>
            <p className="mt-2 text-[15px] md:text-base text-slate-700">
              Review school group submissions, transition status, and keep approvals flowing without filter mismatches.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div className="text-[13px] uppercase tracking-wide text-amber-700 font-semibold">Pending</div>
              <div className="text-2xl font-bold text-amber-800">{statusCounts.pending}</div>
            </div>
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3">
              <div className="text-[13px] uppercase tracking-wide text-green-700 font-semibold">Accepted</div>
              <div className="text-2xl font-bold text-green-800">{statusCounts.accepted}</div>
            </div>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <div className="text-[13px] uppercase tracking-wide text-red-700 font-semibold">Rejected</div>
              <div className="text-2xl font-bold text-red-800">{statusCounts.rejected}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {ADMIN_STATUS_TABS.map((statusTab) => {
            const active = draftFilters.statusTab === statusTab;
            return (
              <button
                key={statusTab}
                type="button"
                onClick={() => setStatusTab(statusTab)}
                className={`rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 ${
                  active
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {tabLabel(statusTab)}
              </button>
            );
          })}
        </div>
      </section>

      {(error || success || actionError || lastIssuedCredentials) && (
        <section className="space-y-3">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-800">{error}</div>
          )}
          {success && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-[15px] text-green-800">{success}</div>
          )}
          {lastIssuedCredentials && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-[15px] text-indigo-900">
              <p className="font-semibold">Leader credentials generated</p>
              <p className="mt-1">Username: <span className="font-semibold">{lastIssuedCredentials.username || '-'}</span></p>
              <p>Password: <span className="font-semibold">{lastIssuedCredentials.password || '-'}</span></p>
            </div>
          )}
          {actionError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-800">{actionError}</div>
          )}
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-[22px] font-semibold text-slate-900">Filters</h3>
        <p className="mt-1 text-[14px] text-slate-600">
          Apply filters to the current status tab. Pagination resets to page 1 on apply and reset.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div>
            <label className="mb-1.5 block text-[14px] font-semibold text-slate-700">Group Class</label>
            <select
              value={draftFilters.groupClass}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, groupClass: e.target.value.toUpperCase() }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <option value="">All classes</option>
              {GROUP_CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[14px] font-semibold text-slate-700">Gender Category</label>
            <select
              value={draftFilters.genderCategory}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, genderCategory: e.target.value.toUpperCase() }))}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <option value="">All categories</option>
              {GENDER_CATEGORY_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[14px] font-semibold text-slate-700">School</label>
            <input
              type="text"
              value={draftFilters.school}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, school: e.target.value }))}
              placeholder="School ID or code"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[14px] font-semibold text-slate-700">Event</label>
            <input
              type="text"
              value={draftFilters.event}
              onChange={(e) => setDraftFilters((prev) => ({ ...prev, event: e.target.value }))}
              placeholder="Event ID"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
          </div>

          <div className="xl:col-span-2">
            <label className="mb-1.5 block text-[14px] font-semibold text-slate-700">Search</label>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applyFilters();
              }}
              placeholder="Search school, group, leader..."
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-[15px] text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            />
            <p className="mt-1 text-[13px] text-slate-500">
              {searchIsDebounced ? 'Search state is ready.' : 'Syncing search input...'}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Apply Filters
          </button>
          <button
            type="button"
            aria-label="Refresh list"
            onClick={refreshEntries}
            className="rounded-xl border border-indigo-300 px-4 py-2.5 text-[15px] font-semibold text-indigo-700 hover:bg-indigo-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-[22px] font-semibold text-slate-900">{tabLabel(appliedFilters.statusTab)} Entries</h3>
          <p className="mt-1 text-[14px] text-slate-600">
            Showing page {pagination.page} with {entries.length} records.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-[16px] text-slate-600">Loading group entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-[18px] font-semibold text-slate-800">No entries found</p>
            <p className="mt-2 text-[15px] text-slate-600">Try adjusting filters or changing the status tab.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-[15px]">
              <thead className="bg-slate-50">
                <tr className="text-left text-[13px] uppercase tracking-wide text-slate-600">
                  <th className="px-4 py-3">Group ID</th>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Gender</th>
                  <th className="px-4 py-3">Participants</th>
                  <th className="px-4 py-3">Leader</th>
                  <th className="px-4 py-3">Events</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((entry) => {
                  const canReview = normalizeAdminStatus(entry.status) === 'pending';
                  const actionInProgress = actionLoading.id === entry.id;
                  return (
                    <tr key={String(entry.id)} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-semibold text-[16px] text-slate-900">{entry.group_id || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.school_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.group_class || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.gender_category || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.participant_count || '-'}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.leader_full_name || '-'}</td>
                      <td className="px-4 py-3 text-slate-700 max-w-xs">{entryEventLabels(entry).join(', ') || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[13px] font-semibold ${getStatusBadgeClass(entry.status)}`}>
                          {getAdminStatusLabel(entry.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{formatDateTime(entry.submitted_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openDetails(entry)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                          >
                            View
                          </button>
                          {canReview ? (
                            <>
                              <button
                                type="button"
                                onClick={() => approveEntry(entry, '')}
                                disabled={actionInProgress}
                                className="rounded-lg border border-green-300 px-3 py-1.5 text-[14px] font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                              >
                                {actionInProgress && actionLoading.type === 'approve' ? 'Approving...' : 'Approve'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  openDetails(entry);
                                  setActionError('Add notes and confirm rejection in details panel.');
                                }}
                                disabled={actionInProgress}
                                className="rounded-lg border border-red-300 px-3 py-1.5 text-[14px] font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className="text-[14px] text-slate-500">Reviewed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {hasPagination && (
          <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4">
            <p className="text-[14px] text-slate-600">Total records: {pagination.count}</p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(pagination.page - 1)}
                disabled={!pagination.hasPrevious || loading}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Previous
              </button>
              <span className="text-[14px] font-semibold text-slate-700">Page {pagination.page}</span>
              <button
                type="button"
                onClick={() => setPage(pagination.page + 1)}
                disabled={!pagination.hasNext || loading}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-[14px] font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" aria-hidden="true" onClick={closeDetails}></div>
          <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <div>
                <h4 className="text-[24px] font-semibold text-slate-900">Group Entry Details</h4>
                <p className="mt-1 text-[14px] text-slate-600">Group ID: {selectedEntry.group_id || '-'}</p>
              </div>
              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close details modal"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                ×
              </button>
            </div>

            <div className="space-y-5 p-6">
              {actionError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[13px] uppercase tracking-wide text-slate-500">School</div>
                  <div className="mt-1 text-[18px] font-semibold text-slate-900">{selectedEntry.school_name || '-'}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[13px] uppercase tracking-wide text-slate-500">Status</div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[13px] font-semibold ${getStatusBadgeClass(selectedEntry.status)}`}>
                      {getAdminStatusLabel(selectedEntry.status)}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-[13px] uppercase tracking-wide text-slate-500">Submitted</div>
                  <div className="mt-1 text-[16px] font-semibold text-slate-900">{formatDateTime(selectedEntry.submitted_at)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h5 className="text-[20px] font-semibold text-slate-900">Participants ({entryEditForm.participants.length})</h5>
                  {entryEditErrors.participants_non_field.length > 0 && (
                    <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 space-y-1">
                      {entryEditErrors.participants_non_field.map((msg, index) => (
                        <p key={`entry-edit-participant-non-field-${index}`}>{msg}</p>
                      ))}
                    </div>
                  )}
                  {entryEditForm.participants.length === 0 ? (
                    <p className="mt-3 text-[15px] text-slate-600">No participants available.</p>
                  ) : (
                    <div className="mt-3 space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                      {entryEditForm.participants.map((participant, index) => {
                        const isLeader = (index + 1) === Number(selectedEntry?.leader_index);
                        return (
                          <div
                            key={`participant-edit-${index}`}
                            className={`rounded-lg border px-3 py-3 space-y-2 ${isLeader ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-slate-50'}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[14px] font-semibold text-slate-800">Member {index + 1}</span>
                              {isLeader && (
                                <span className="text-[13px] font-semibold text-amber-700">Leader</span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">First Name</label>
                                <input
                                  type="text"
                                  value={participant.first_name || ''}
                                  onChange={(e) => updateEntryParticipantField(index, 'first_name', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                />
                                {toErrorList(entryEditErrors.participants?.[index]?.first_name).map((msg, errorIndex) => (
                                  <p key={`entry-edit-first-name-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                                ))}
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Last Name</label>
                                <input
                                  type="text"
                                  value={participant.last_name || ''}
                                  onChange={(e) => updateEntryParticipantField(index, 'last_name', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                />
                                {toErrorList(entryEditErrors.participants?.[index]?.last_name).map((msg, errorIndex) => (
                                  <p key={`entry-edit-last-name-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                                ))}
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Gender</label>
                                <select
                                  value={participant.gender || ''}
                                  onChange={(e) => updateEntryParticipantField(index, 'gender', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] text-slate-900 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                >
                                  <option value="">Select gender</option>
                                  {GENDER_OPTIONS.map((option) => (
                                    <option key={`${option.value}-${index}`} value={option.value}>{option.label}</option>
                                  ))}
                                </select>
                                {toErrorList(entryEditErrors.participants?.[index]?.gender).map((msg, errorIndex) => (
                                  <p key={`entry-edit-gender-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                                ))}
                              </div>
                              <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Class</label>
                                <input
                                  type="text"
                                  value={participant.student_class || ''}
                                  onChange={(e) => updateEntryParticipantField(index, 'student_class', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                />
                                {toErrorList(entryEditErrors.participants?.[index]?.student_class).map((msg, errorIndex) => (
                                  <p key={`entry-edit-student-class-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                                ))}
                              </div>
                              <div className="md:col-span-2">
                                <label className="mb-1 block text-xs font-semibold text-slate-600">Phone</label>
                                <input
                                  type="text"
                                  value={participant.phone || ''}
                                  onChange={(e) => updateEntryParticipantField(index, 'phone', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-[14px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                                />
                                {toErrorList(entryEditErrors.participants?.[index]?.phone).map((msg, errorIndex) => (
                                  <p key={`entry-edit-phone-${index}-${errorIndex}`} className="mt-1 text-xs text-red-600">{msg}</p>
                                ))}
                              </div>
                            </div>
                            {toErrorList(entryEditErrors.participants?.[index]?.non_field_errors).map((msg, errorIndex) => (
                              <p key={`entry-edit-row-non-field-${index}-${errorIndex}`} className="text-xs text-red-600">{msg}</p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <h5 className="text-[20px] font-semibold text-slate-900">Events</h5>
                  {entryEventLabels(selectedEntry).length === 0 ? (
                    <p className="mt-3 text-[15px] text-slate-600">No events linked.</p>
                  ) : (
                    <ul className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                      {entryEventLabels(selectedEntry).map((label, index) => (
                        <li key={`${label}-${index}`} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-[15px] font-medium text-indigo-900">
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h5 className="text-[20px] font-semibold text-slate-900">Review Metadata</h5>
                <div className="mt-3 grid grid-cols-1 gap-2 text-[15px] md:grid-cols-2">
                  <div><span className="font-semibold text-slate-700">Leader:</span> <span className="text-slate-900">{selectedEntry.leader_full_name || '-'}</span></div>
                  <div><span className="font-semibold text-slate-700">Source:</span> <span className="text-slate-900">{selectedEntry.source || '-'}</span></div>
                  <div><span className="font-semibold text-slate-700">Reviewed By:</span> <span className="text-slate-900">{selectedEntry.reviewed_by_name || '-'}</span></div>
                  <div><span className="font-semibold text-slate-700">Reviewed At:</span> <span className="text-slate-900">{formatDateTime(selectedEntry.reviewed_at)}</span></div>
                  <div className="md:col-span-2">
                    <span className="font-semibold text-slate-700">Existing Notes:</span> <span className="text-slate-900">{selectedEntry.review_notes || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 space-y-4">
                <h5 className="text-[20px] font-semibold text-indigo-900">Edit Group Entry</h5>

                {entryEditErrors.non_field_errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 space-y-1">
                    {entryEditErrors.non_field_errors.map((msg, index) => (
                      <p key={`entry-edit-non-field-${index}`}>{msg}</p>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[14px] font-semibold text-indigo-900">Gender Category (optional)</label>
                    <select
                      value={entryEditForm.gender_category}
                      onChange={(e) => {
                        const value = String(e.target.value || '').toUpperCase();
                        setEntryEditForm((prev) => ({ ...prev, gender_category: value }));
                        clearEntryFieldError('gender_category');
                      }}
                      className="w-full rounded-xl border border-indigo-300 px-3 py-2.5 text-[15px] text-slate-900 bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    >
                      <option value="">Keep existing</option>
                      {GENDER_CATEGORY_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    {toErrorList(entryEditErrors.gender_category).map((msg, index) => (
                      <p key={`entry-edit-gender-category-${index}`} className="mt-1 text-xs text-red-600">{msg}</p>
                    ))}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[14px] font-semibold text-indigo-900">Notes (optional)</label>
                    <textarea
                      value={entryEditForm.notes}
                      onChange={(e) => {
                        setEntryEditForm((prev) => ({ ...prev, notes: e.target.value }));
                        clearEntryFieldError('notes');
                      }}
                      rows={3}
                      className="w-full rounded-xl border border-indigo-300 px-3 py-2.5 text-[15px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                      placeholder="Optional notes to save with member updates"
                    />
                    {toErrorList(entryEditErrors.notes).map((msg, index) => (
                      <p key={`entry-edit-notes-${index}`} className="mt-1 text-xs text-red-600">{msg}</p>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={submitEntryEdits}
                    disabled={entryEditSaving || actionLoading.id === selectedEntry.id}
                    className="rounded-xl bg-indigo-600 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                  >
                    {entryEditSaving ? 'Saving edits...' : 'Save Member Edits'}
                  </button>
                </div>
              </div>

              {canTransition && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-4">
                  <h5 className="text-[20px] font-semibold text-amber-900">Review Action</h5>

                  <div>
                    <label className="mb-1.5 block text-[14px] font-semibold text-amber-900">
                      Notes (optional for approve, required for reject)
                    </label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-amber-300 px-3 py-2.5 text-[15px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      placeholder="Add review notes"
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[14px] font-semibold text-amber-900">Reject Reason (optional)</label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full rounded-xl border border-amber-300 px-3 py-2.5 text-[15px] text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                      placeholder="Reason sent with reject request"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      disabled={actionLoading.id === selectedEntry.id}
                      onClick={() => approveEntry(selectedEntry, reviewNotes)}
                      className="rounded-xl bg-green-600 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
                    >
                      {actionLoading.id === selectedEntry.id && actionLoading.type === 'approve' ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading.id === selectedEntry.id}
                      onClick={() => rejectEntry(selectedEntry, reviewNotes, rejectReason)}
                      className="rounded-xl bg-red-600 px-4 py-2.5 text-[15px] font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600"
                    >
                      {actionLoading.id === selectedEntry.id && actionLoading.type === 'reject' ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchoolGroupParticipantsAdmin;
