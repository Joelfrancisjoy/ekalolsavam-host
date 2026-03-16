import React, { useCallback, useEffect, useMemo, useState } from 'react';
import http from '../services/http-common';

const GROUP_CLASS_OPTIONS = ['LP', 'UP', 'HS', 'HSS'];
const GENDER_CATEGORY_OPTIONS = ['BOYS', 'GIRLS', 'MIXED'];
const STATUS_FILTER_OPTIONS = ['pending', 'approved', 'rejected'];

const createEmptyParticipant = () => ({ first_name: '', last_name: '' });

const createInitialGroupForm = () => ({
  group_id: '',
  group_class: '',
  gender_category: '',
  participant_count: 1,
  participants: [createEmptyParticipant()],
  leader_index: '',
  event_ids: []
});

const createEmptyFormErrors = () => ({
  non_field_errors: [],
  group_id: [],
  group_class: [],
  gender_category: [],
  participant_count: [],
  event_ids: [],
  leader_index: [],
  participants_non_field: [],
  participants: {}
});

const normalizeCollection = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).map((item) => String(item));
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
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
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.name || item?.event_name || item?.title || '';
      })
      .filter(Boolean);
  }
  if (Array.isArray(entry?.events)) {
    return entry.events
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.name || item?.event_name || item?.title || '';
      })
      .filter(Boolean);
  }
  return [];
};

const normalizeGroupEvents = (payload) => {
  return normalizeCollection(payload)
    .map((item) => {
      const id = Number(item?.id);
      if (!Number.isInteger(id) || id <= 0) return null;
      return {
        id,
        name: item?.name || item?.event_name || `Event #${id}`,
        category: item?.category || '',
        description: item?.description || ''
      };
    })
    .filter(Boolean);
};

const getLeaderFullName = (entry) => {
  if (entry?.leader_full_name) return entry.leader_full_name;
  const participants = Array.isArray(entry?.participants) ? entry.participants : [];
  const leaderIndex = toInt(entry?.leader_index);
  if (!leaderIndex || leaderIndex < 1 || leaderIndex > participants.length) return '-';
  const leader = participants[leaderIndex - 1] || {};
  const fullName = `${leader?.first_name || ''} ${leader?.last_name || ''}`.trim();
  return fullName || '-';
};

const normalizeSubmittedGroups = (payload) => {
  return normalizeCollection(payload).map((entry, index) => {
    const participants = Array.isArray(entry?.participants) ? entry.participants : [];
    const participantCount = toInt(entry?.participant_count) || participants.length || 0;
    const id = entry?.id ?? entry?.group_entry_id ?? `${entry?.group_id || 'GROUP'}-${index}`;
    return {
      ...entry,
      id,
      group_id: String(entry?.group_id || '').toUpperCase(),
      group_class: entry?.group_class || '',
      gender_category: entry?.gender_category || '',
      participant_count: participantCount,
      leader_full_name: getLeaderFullName(entry),
      events_display: normalizeEventsDisplay(entry),
      event_ids: normalizeEventIds(entry),
      status: String(entry?.status || 'pending').toLowerCase(),
      source: entry?.source || '-',
      submitted_at: entry?.submitted_at || entry?.created_at || null,
      review_notes: entry?.review_notes || '',
      participants
    };
  });
};

const statusChipClass = (status) => {
  if (status === 'approved') return 'bg-green-100 text-green-800 border-green-200';
  if (status === 'rejected') return 'bg-red-100 text-red-800 border-red-200';
  return 'bg-amber-100 text-amber-800 border-amber-200';
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
};

const toErrorList = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item)).filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [String(value)];
};

const parseParticipantErrors = (value) => {
  const participantErrors = {};
  const participantsNonField = [];

  if (!Array.isArray(value)) {
    return { participantErrors, participantsNonField };
  }

  value.forEach((item, index) => {
    if (!item) return;
    if (typeof item === 'string') {
      participantsNonField.push(item);
      return;
    }
    if (Array.isArray(item)) {
      participantsNonField.push(...toErrorList(item));
      return;
    }
    if (typeof item === 'object') {
      participantErrors[index] = {
        first_name: toErrorList(item.first_name),
        last_name: toErrorList(item.last_name),
        non_field_errors: toErrorList(item.non_field_errors)
      };
    }
  });

  return { participantErrors, participantsNonField };
};

const parseGroupSubmitErrors = (errorPayload) => {
  const errors = createEmptyFormErrors();

  if (!errorPayload) {
    errors.non_field_errors = ['Failed to submit group entry.'];
    return errors;
  }

  if (typeof errorPayload === 'string') {
    errors.non_field_errors = [errorPayload];
    return errors;
  }

  if (errorPayload?.error) {
    errors.non_field_errors.push(String(errorPayload.error));
  }
  if (errorPayload?.detail) {
    errors.non_field_errors.push(String(errorPayload.detail));
  }

  const groupError =
    (Array.isArray(errorPayload?.groups) && errorPayload.groups[0] && typeof errorPayload.groups[0] === 'object')
      ? errorPayload.groups[0]
      : errorPayload;

  errors.group_id = toErrorList(groupError?.group_id);
  errors.group_class = toErrorList(groupError?.group_class);
  errors.gender_category = toErrorList(groupError?.gender_category);
  errors.participant_count = toErrorList(groupError?.participant_count);
  errors.event_ids = toErrorList(groupError?.event_ids);
  errors.leader_index = toErrorList(groupError?.leader_index);
  errors.non_field_errors.push(...toErrorList(groupError?.non_field_errors));

  const participantParse = parseParticipantErrors(groupError?.participants);
  errors.participants = participantParse.participantErrors;
  errors.participants_non_field = participantParse.participantsNonField;

  return errors;
};

const hasAnyFormErrors = (errors) => {
  if (!errors) return false;
  const topLevelHasErrors = [
    errors.non_field_errors,
    errors.group_id,
    errors.group_class,
    errors.gender_category,
    errors.participant_count,
    errors.event_ids,
    errors.leader_index,
    errors.participants_non_field
  ].some((items) => Array.isArray(items) && items.length > 0);

  if (topLevelHasErrors) return true;

  const participantValues = Object.values(errors.participants || {});
  return participantValues.some((item) => {
    return ['first_name', 'last_name', 'non_field_errors'].some((key) => Array.isArray(item?.[key]) && item[key].length > 0);
  });
};

const SchoolGroupParticipantsSection = ({ showToast }) => {
  const [groupTab, setGroupTab] = useState('new');

  const [groupEvents, setGroupEvents] = useState([]);
  const [groupEventsLoading, setGroupEventsLoading] = useState(false);
  const [groupEventsError, setGroupEventsError] = useState('');

  const [groupForm, setGroupForm] = useState(createInitialGroupForm());
  const [groupFormErrors, setGroupFormErrors] = useState(createEmptyFormErrors());
  const [groupSubmitting, setGroupSubmitting] = useState(false);

  const [importFile, setImportFile] = useState(null);
  const [importUploading, setImportUploading] = useState(false);
  const [importResponse, setImportResponse] = useState(null);
  const [importError, setImportError] = useState('');

  const [submittedGroups, setSubmittedGroups] = useState([]);
  const [submittedFilters, setSubmittedFilters] = useState({ status: '', group_class: '' });
  const [submittedLoading, setSubmittedLoading] = useState(false);
  const [submittedError, setSubmittedError] = useState('');

  const eventNameById = useMemo(() => {
    const map = {};
    groupEvents.forEach((event) => {
      map[String(event.id)] = event.name;
    });
    return map;
  }, [groupEvents]);

  const loadGroupEvents = useCallback(async () => {
    try {
      setGroupEventsLoading(true);
      setGroupEventsError('');
      const response = await http.get('/api/auth/schools/group-events/');
      setGroupEvents(normalizeGroupEvents(response.data));
    } catch (error) {
      console.error('Failed to load group events', error);
      setGroupEvents([]);
      setGroupEventsError('Failed to load group events.');
    } finally {
      setGroupEventsLoading(false);
    }
  }, []);

  const loadSubmittedGroups = useCallback(async (filters) => {
    try {
      setSubmittedLoading(true);
      setSubmittedError('');
      const params = {};
      if (filters?.status) params.status = filters.status;
      if (filters?.group_class) params.group_class = filters.group_class;
      const response = await http.get('/api/auth/schools/group-participants/', { params });
      setSubmittedGroups(normalizeSubmittedGroups(response.data));
    } catch (error) {
      console.error('Failed to load submitted groups', error);
      setSubmittedGroups([]);
      setSubmittedError('Failed to load submitted groups.');
    } finally {
      setSubmittedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroupEvents();
    loadSubmittedGroups({ status: '', group_class: '' });
  }, [loadGroupEvents, loadSubmittedGroups]);

  useEffect(() => {
    if (groupTab === 'submitted') {
      loadSubmittedGroups(submittedFilters);
    }
  }, [groupTab, loadSubmittedGroups, submittedFilters]);

  useEffect(() => {
    const count = Math.min(20, Math.max(1, toInt(groupForm.participant_count) || 1));
    setGroupForm((prev) => {
      const existing = Array.isArray(prev.participants) ? [...prev.participants] : [];
      if (existing.length === count && prev.participant_count === count) return prev;
      const nextParticipants = Array.from({ length: count }).map((_, index) => (
        existing[index] || createEmptyParticipant()
      ));
      const currentLeader = toInt(prev.leader_index);
      const leader_index = currentLeader && currentLeader <= count ? currentLeader : '';
      return {
        ...prev,
        participant_count: count,
        participants: nextParticipants,
        leader_index
      };
    });
  }, [groupForm.participant_count]);

  const resetGroupForm = () => {
    setGroupForm(createInitialGroupForm());
    setGroupFormErrors(createEmptyFormErrors());
  };

  const updateParticipantField = (index, field, value) => {
    setGroupForm((prev) => {
      const nextParticipants = [...(prev.participants || [])];
      const current = nextParticipants[index] || createEmptyParticipant();
      nextParticipants[index] = { ...current, [field]: value };
      return { ...prev, participants: nextParticipants };
    });
  };

  const setGroupField = (name, value) => {
    setGroupForm((prev) => ({ ...prev, [name]: value }));
  };

  const toggleEventId = (eventId) => {
    setGroupForm((prev) => {
      const current = Array.isArray(prev.event_ids) ? prev.event_ids : [];
      const has = current.includes(eventId);
      return {
        ...prev,
        event_ids: has ? current.filter((id) => id !== eventId) : [...current, eventId]
      };
    });
  };

  const validateGroupForm = () => {
    const errors = createEmptyFormErrors();

    const normalizedGroupId = String(groupForm.group_id || '').trim().toUpperCase();
    const groupClass = String(groupForm.group_class || '').trim();
    const genderCategory = String(groupForm.gender_category || '').trim();
    const participantCount = toInt(groupForm.participant_count);
    const participants = Array.isArray(groupForm.participants) ? groupForm.participants : [];
    const eventIds = (Array.isArray(groupForm.event_ids) ? groupForm.event_ids : [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
    const leaderIndex = toInt(groupForm.leader_index);

    if (!normalizedGroupId) {
      errors.group_id.push('Group ID is required.');
    }
    if (!groupClass) {
      errors.group_class.push('Group class is required.');
    }
    if (!genderCategory) {
      errors.gender_category.push('Gender category is required.');
    }
    if (!participantCount || participantCount < 1 || participantCount > 20) {
      errors.participant_count.push('Participant count must be between 1 and 20.');
    }
    if (!eventIds.length) {
      errors.event_ids.push('Select at least one group event.');
    }
    if (!leaderIndex) {
      errors.leader_index.push('Select a group leader.');
    }

    if (participantCount && participants.length !== participantCount) {
      errors.participants_non_field.push('Participants length must equal participant count.');
    }

    participants.forEach((participant, index) => {
      const firstName = String(participant?.first_name || '').trim();
      const lastName = String(participant?.last_name || '').trim();
      const rowErrors = {
        first_name: [],
        last_name: [],
        non_field_errors: []
      };

      if (!firstName) rowErrors.first_name.push('First name is required.');
      if (!lastName) rowErrors.last_name.push('Last name is required.');

      if (rowErrors.first_name.length || rowErrors.last_name.length || rowErrors.non_field_errors.length) {
        errors.participants[index] = rowErrors;
      }
    });

    if (leaderIndex && participantCount && (leaderIndex < 1 || leaderIndex > participantCount)) {
      errors.leader_index.push('Leader must be one of the listed participants.');
    }

    setGroupFormErrors(errors);
    return !hasAnyFormErrors(errors);
  };

  const submitGroupEntry = async (event) => {
    event.preventDefault();
    setImportResponse(null);
    setImportError('');

    if (!validateGroupForm()) {
      showToast?.('Please fix validation errors before submitting the group.', 'error');
      return;
    }

    const payloadGroup = {
      group_id: String(groupForm.group_id || '').trim().toUpperCase(),
      group_class: String(groupForm.group_class || '').trim(),
      gender_category: String(groupForm.gender_category || '').trim(),
      participant_count: toInt(groupForm.participant_count) || 1,
      leader_index: toInt(groupForm.leader_index),
      participants: (groupForm.participants || []).map((participant) => ({
        first_name: String(participant?.first_name || '').trim(),
        last_name: String(participant?.last_name || '').trim()
      })),
      event_ids: (groupForm.event_ids || []).map((id) => Number(id)).filter((id) => Number.isInteger(id) && id > 0)
    };

    try {
      setGroupSubmitting(true);
      setGroupFormErrors(createEmptyFormErrors());
      await http.post('/api/auth/schools/group-participants/submit/', { groups: [payloadGroup] });
      showToast?.('Group entry submitted successfully.', 'success');
      resetGroupForm();
      setGroupTab('submitted');
      await loadSubmittedGroups(submittedFilters);
    } catch (error) {
      console.error('Failed to submit group entry', error);
      const parsed = parseGroupSubmitErrors(error?.response?.data);
      setGroupFormErrors(parsed);
      showToast?.('Failed to submit group entry. Review the highlighted fields.', 'error');
    } finally {
      setGroupSubmitting(false);
    }
  };

  const onGroupIdBlur = () => {
    setGroupForm((prev) => ({
      ...prev,
      group_id: String(prev.group_id || '').trim().toUpperCase()
    }));
  };

  const onImportFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setImportResponse(null);
    setImportError('');

    if (!file) {
      setImportFile(null);
      return;
    }

    const name = String(file.name || '').toLowerCase();
    const valid = name.endsWith('.csv') || name.endsWith('.xlsx');
    if (!valid) {
      setImportFile(null);
      setImportError('Only .csv and .xlsx files are allowed.');
      return;
    }

    setImportFile(file);
  };

  const onUploadImportFile = async () => {
    if (!importFile) {
      setImportError('Please choose a .csv or .xlsx file first.');
      return;
    }

    try {
      setImportUploading(true);
      setImportError('');
      setImportResponse(null);

      const formData = new FormData();
      formData.append('file', importFile);

      const response = await http.post('/api/auth/schools/group-participants/import/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const result = response?.data || {};
      setImportResponse(result);

      const importedCount = Number(result?.imported_count || 0);
      const errorCount = Number(result?.error_count || 0);
      if (importedCount > 0 && errorCount > 0) {
        showToast?.(`Imported ${importedCount} groups with ${errorCount} row errors.`, 'info');
      } else if (importedCount > 0) {
        showToast?.(`Imported ${importedCount} groups successfully.`, 'success');
      } else {
        showToast?.('Import completed with no inserted groups.', 'info');
      }

      await loadSubmittedGroups(submittedFilters);
    } catch (error) {
      console.error('Failed to import group participants', error);
      const payload = error?.response?.data || {};
      setImportResponse(payload);
      const message = payload?.detail || payload?.error || 'Failed to import file.';
      setImportError(String(message));
      showToast?.('Failed to import group participants.', 'error');
    } finally {
      setImportUploading(false);
    }
  };

  const importErrorsList = useMemo(() => {
    if (!importResponse) return [];
    if (Array.isArray(importResponse?.errors)) return importResponse.errors;
    if (Array.isArray(importResponse?.row_errors)) return importResponse.row_errors;
    if (Array.isArray(importResponse?.non_field_errors)) return importResponse.non_field_errors;
    if (importResponse?.detail) return [String(importResponse.detail)];
    return [];
  }, [importResponse]);

  const importedGroups = useMemo(() => {
    if (!Array.isArray(importResponse?.imported_groups)) return [];
    return importResponse.imported_groups;
  }, [importResponse]);

  const getParticipantError = (index, field) => {
    const row = groupFormErrors?.participants?.[index];
    if (!row) return [];
    return toArray(row?.[field]);
  };

  const applySubmittedFilters = async () => {
    await loadSubmittedGroups(submittedFilters);
  };

  const clearSubmittedFilters = async () => {
    const next = { status: '', group_class: '' };
    setSubmittedFilters(next);
    await loadSubmittedGroups(next);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-12 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
          <div>
            <h2 className="text-3xl font-bold text-gray-800">Group Participants</h2>
            <p className="text-gray-600">Manage group entries, imports, and submission review status.</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setGroupTab('new')}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors ${groupTab === 'new' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:bg-indigo-100'}`}
          >
            New Group Entry
          </button>
          <button
            type="button"
            onClick={() => setGroupTab('bulk')}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors ${groupTab === 'bulk' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:bg-indigo-100'}`}
          >
            Bulk Import
          </button>
          <button
            type="button"
            onClick={() => setGroupTab('submitted')}
            className={`px-4 py-2 rounded-xl font-semibold transition-colors ${groupTab === 'submitted' ? 'bg-indigo-600 text-white' : 'text-indigo-700 hover:bg-indigo-100'}`}
          >
            Submitted Groups
          </button>
        </div>
      </div>

      {groupTab === 'new' && (
        <div className="space-y-6">
          {groupEventsError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {groupEventsError}
            </div>
          )}

          {groupFormErrors.non_field_errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              <ul className="list-disc list-inside space-y-1">
                {groupFormErrors.non_field_errors.map((item, index) => (
                  <li key={`${item}-${index}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <form onSubmit={submitGroupEntry} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Group ID <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  value={groupForm.group_id}
                  onChange={(e) => setGroupField('group_id', e.target.value)}
                  onBlur={onGroupIdBlur}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                  placeholder="GRP-001"
                />
                {groupFormErrors.group_id.length > 0 && (
                  <p className="mt-1 text-sm text-red-600">{groupFormErrors.group_id.join(' ')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Group Class <span className="text-red-600">*</span>
                </label>
                <select
                  value={groupForm.group_class}
                  onChange={(e) => setGroupField('group_class', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                >
                  <option value="">Select class</option>
                  {GROUP_CLASS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {groupFormErrors.group_class.length > 0 && (
                  <p className="mt-1 text-sm text-red-600">{groupFormErrors.group_class.join(' ')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Gender Category <span className="text-red-600">*</span>
                </label>
                <select
                  value={groupForm.gender_category}
                  onChange={(e) => setGroupField('gender_category', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                >
                  <option value="">Select gender category</option>
                  {GENDER_CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
                {groupFormErrors.gender_category.length > 0 && (
                  <p className="mt-1 text-sm text-red-600">{groupFormErrors.gender_category.join(' ')}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Participant Count (1-20) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={groupForm.participant_count}
                  onChange={(e) => setGroupField('participant_count', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                />
                {groupFormErrors.participant_count.length > 0 && (
                  <p className="mt-1 text-sm text-red-600">{groupFormErrors.participant_count.join(' ')}</p>
                )}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Participants</h3>
                <span className="text-sm text-gray-600">
                  Leader is selected with the radio control for each row
                </span>
              </div>

              {groupFormErrors.participants_non_field.length > 0 && (
                <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                  {groupFormErrors.participants_non_field.join(' ')}
                </div>
              )}

              <div className="space-y-3">
                {(groupForm.participants || []).map((participant, index) => (
                  <div key={`participant-row-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start p-3 rounded-xl border border-gray-200">
                    <div className="md:col-span-1 flex items-center justify-center pt-2">
                      <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                          type="radio"
                          name="leader_index"
                          value={index + 1}
                          checked={Number(groupForm.leader_index) === index + 1}
                          onChange={(e) => setGroupField('leader_index', Number(e.target.value))}
                          className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                          aria-label={`Select participant ${index + 1} as leader`}
                        />
                        Lead
                      </label>
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={participant.first_name}
                        onChange={(e) => updateParticipantField(index, 'first_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                        placeholder={`Member ${index + 1} first name`}
                      />
                      {getParticipantError(index, 'first_name').length > 0 && (
                        <p className="mt-1 text-xs text-red-600">{getParticipantError(index, 'first_name').join(' ')}</p>
                      )}
                    </div>

                    <div className="md:col-span-5">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={participant.last_name}
                        onChange={(e) => updateParticipantField(index, 'last_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-indigo-500"
                        placeholder={`Member ${index + 1} last name`}
                      />
                      {getParticipantError(index, 'last_name').length > 0 && (
                        <p className="mt-1 text-xs text-red-600">{getParticipantError(index, 'last_name').join(' ')}</p>
                      )}
                    </div>

                    <div className="md:col-span-1 flex items-center justify-center pt-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                        {index + 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {groupFormErrors.leader_index.length > 0 && (
                <p className="mt-3 text-sm text-red-600">{groupFormErrors.leader_index.join(' ')}</p>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-900">Group Events</h3>
                <span className="text-sm text-gray-600">Only group events are shown</span>
              </div>

              {groupEventsLoading ? (
                <div className="py-6 text-center text-gray-500">Loading group events...</div>
              ) : groupEvents.length === 0 ? (
                <div className="py-6 text-center text-gray-500">No group events available right now.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
                  {groupEvents.map((event) => (
                    <label key={event.id} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={(groupForm.event_ids || []).includes(event.id)}
                        onChange={() => toggleEventId(event.id)}
                        className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <div>
                        <div className="font-semibold text-gray-900">{event.name}</div>
                        {event.category && <div className="text-xs text-gray-500 mt-1">{event.category}</div>}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              {groupFormErrors.event_ids.length > 0 && (
                <p className="mt-3 text-sm text-red-600">{groupFormErrors.event_ids.join(' ')}</p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={resetGroupForm}
                className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition-colors"
              >
                Reset Form
              </button>
              <button
                type="submit"
                disabled={groupSubmitting}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {groupSubmitting ? 'Submitting...' : 'Submit Group Entry'}
              </button>
            </div>
          </form>
        </div>
      )}

      {groupTab === 'bulk' && (
        <div className="space-y-5">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
            <p className="text-indigo-900 font-semibold mb-1">Supported file types</p>
            <p className="text-indigo-800 text-sm">Upload <code>.csv</code> or <code>.xlsx</code> files only. Import may return partial success with row-level errors.</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select import file</label>
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={onImportFileChange}
                className="w-full text-sm text-gray-700"
              />
              {importFile && (
                <p className="mt-2 text-sm text-gray-600">Selected: <span className="font-medium">{importFile.name}</span></p>
              )}
              {importError && (
                <p className="mt-2 text-sm text-red-600">{importError}</p>
              )}
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={onUploadImportFile}
                disabled={importUploading || !importFile}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold hover:from-emerald-700 hover:to-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {importUploading ? 'Uploading...' : 'Upload and Import'}
              </button>
            </div>
          </div>

          {importResponse && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Imported</div>
                  <div className="text-2xl font-bold text-green-700">{Number(importResponse?.imported_count || 0)}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Errors</div>
                  <div className="text-2xl font-bold text-red-700">{Number(importResponse?.error_count || 0)}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">HTTP Status</div>
                  <div className="text-2xl font-bold text-indigo-700">{importResponse?.status || '201'}</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">Result</div>
                  <div className="text-sm font-semibold text-gray-900 mt-1">
                    {Number(importResponse?.imported_count || 0) > 0 && Number(importResponse?.error_count || 0) > 0
                      ? 'Partial Success'
                      : Number(importResponse?.imported_count || 0) > 0
                        ? 'Success'
                        : 'Needs Review'}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h4 className="text-lg font-bold text-gray-900 mb-3">Imported Groups ({importedGroups.length})</h4>
                {importedGroups.length === 0 ? (
                  <p className="text-sm text-gray-600">No imported groups returned by server.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-600 border-b">
                          <th className="py-2 pr-4">Group ID</th>
                          <th className="py-2 pr-4">Class</th>
                          <th className="py-2 pr-4">Gender</th>
                          <th className="py-2">Participants</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importedGroups.map((group, index) => (
                          <tr key={`${group?.group_id || 'group'}-${index}`} className="border-b border-gray-100">
                            <td className="py-2 pr-4 font-medium text-gray-900">{group?.group_id || '-'}</td>
                            <td className="py-2 pr-4 text-gray-700">{group?.group_class || '-'}</td>
                            <td className="py-2 pr-4 text-gray-700">{group?.gender_category || '-'}</td>
                            <td className="py-2 text-gray-700">{group?.participant_count || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-4">
                <h4 className="text-lg font-bold text-gray-900 mb-3">Row-Level Errors ({importErrorsList.length})</h4>
                {importErrorsList.length === 0 ? (
                  <p className="text-sm text-gray-600">No row-level errors reported.</p>
                ) : (
                  <ul className="list-disc list-inside space-y-1 text-sm text-red-700 max-h-72 overflow-y-auto">
                    {importErrorsList.map((item, index) => (
                      <li key={`${String(item)}-${index}`}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {groupTab === 'submitted' && (
        <div className="space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Status</label>
                <select
                  value={submittedFilters.status}
                  onChange={(e) => setSubmittedFilters((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All</option>
                  {STATUS_FILTER_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Group Class</label>
                <select
                  value={submittedFilters.group_class}
                  onChange={(e) => setSubmittedFilters((prev) => ({ ...prev, group_class: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">All</option>
                  {GROUP_CLASS_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 flex items-end justify-end gap-2">
                <button
                  type="button"
                  onClick={clearSubmittedFilters}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={applySubmittedFilters}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>

          {submittedError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
              {submittedError}
            </div>
          )}

          {submittedLoading ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-600">
              Loading submitted groups...
            </div>
          ) : submittedGroups.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 text-center text-gray-600">
              No group submissions found for the selected filters.
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50">
                  <tr className="text-left text-gray-600 uppercase tracking-wide text-xs">
                    <th className="px-4 py-3">Group ID</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Gender</th>
                    <th className="px-4 py-3">Participants</th>
                    <th className="px-4 py-3">Leader</th>
                    <th className="px-4 py-3">Events</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Review Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {submittedGroups.map((group) => {
                    const eventLabels = (group.events_display || []).length > 0
                      ? group.events_display
                      : (group.event_ids || []).map((id) => eventNameById[String(id)] || `Event #${id}`);
                    return (
                      <tr key={String(group.id)} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{group.group_id || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{group.group_class || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{group.gender_category || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{group.participant_count || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{group.leader_full_name || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">
                          {eventLabels.length > 0 ? eventLabels.join(', ') : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusChipClass(group.status)}`}>
                            {group.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-700">{group.source || '-'}</td>
                        <td className="px-4 py-3 text-gray-700">{formatDateTime(group.submitted_at)}</td>
                        <td className="px-4 py-3 text-gray-700">{group.review_notes || '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SchoolGroupParticipantsSection;
