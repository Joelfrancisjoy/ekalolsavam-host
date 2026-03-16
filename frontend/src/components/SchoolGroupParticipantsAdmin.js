import React, { useCallback, useEffect, useMemo, useState } from 'react';
import http from '../services/http-common';

const STATUS_OPTIONS = ['pending', 'approved', 'rejected'];
const GROUP_CLASS_OPTIONS = ['LP', 'UP', 'HS', 'HSS'];

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
      status: String(entry?.status || 'pending').toLowerCase(),
      source: entry?.source || '-',
      submitted_at: entry?.submitted_at || entry?.created_at || null,
      review_notes: entry?.review_notes || '',
      reviewed_at: entry?.reviewed_at || null,
      reviewed_by_name: reviewerName,
      school_name: schoolName
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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
};

const entryEventLabels = (entry) => {
  const labels = Array.isArray(entry?.events_display) ? entry.events_display.filter(Boolean) : [];
  if (labels.length > 0) return labels;
  const ids = Array.isArray(entry?.event_ids) ? entry.event_ids : [];
  return ids.map((id) => `Event #${id}`);
};

const SchoolGroupParticipantsAdmin = () => {
  const [filters, setFilters] = useState({
    status: '',
    group_class: '',
    school: '',
    event: ''
  });
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [selectedEntry, setSelectedEntry] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionLoading, setActionLoading] = useState({ id: null, type: '' });

  const loadEntries = useCallback(async (activeFilters = {}) => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (activeFilters.status) params.status = activeFilters.status;
      if (activeFilters.group_class) params.group_class = activeFilters.group_class;
      if (activeFilters.school) params.school = activeFilters.school;
      if (activeFilters.event) params.event = activeFilters.event;
      const response = await http.get('/api/auth/admin/school-group-participants/', { params });
      const nextEntries = normalizeAdminEntries(response.data);
      setEntries(nextEntries);
      setSelectedEntry((prev) => {
        if (!prev) return null;
        return nextEntries.find((entry) => String(entry.id) === String(prev.id)) || null;
      });
      return nextEntries;
    } catch (requestError) {
      console.error('Failed to load school group participants', requestError);
      setEntries([]);
      setError('Failed to load school group participants.');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEntries({ status: '', group_class: '', school: '', event: '' });
  }, [loadEntries]);

  const pendingCount = useMemo(() => entries.filter((entry) => entry.status === 'pending').length, [entries]);

  const clearMessages = () => {
    setError('');
    setSuccess('');
    setActionError('');
  };

  const openDetails = (entry) => {
    setSelectedEntry(entry);
    setReviewNotes(entry?.review_notes || '');
    setRejectReason('');
    setActionError('');
  };

  const closeDetails = () => {
    setSelectedEntry(null);
    setReviewNotes('');
    setRejectReason('');
    setActionError('');
  };

  const applyFilters = async () => {
    await loadEntries(filters);
  };

  const clearFilters = async () => {
    const nextFilters = { status: '', group_class: '', school: '', event: '' };
    setFilters(nextFilters);
    await loadEntries(nextFilters);
  };

  const canTransition = selectedEntry?.status === 'pending';

  const submitApprove = async () => {
    if (!selectedEntry) return;
    const groupEntryId = selectedEntry.id;
    if (!canTransition) return;

    try {
      setActionLoading({ id: groupEntryId, type: 'approve' });
      setActionError('');
      const payload = {};
      const notes = String(reviewNotes || '').trim();
      if (notes) payload.notes = notes;
      await http.post(`/api/auth/admin/school-group-participants/${groupEntryId}/approve/`, payload);
      setSuccess('Group entry approved successfully.');
      const refreshedEntries = await loadEntries(filters);
      const updated = refreshedEntries.find((entry) => String(entry.id) === String(groupEntryId));
      if (updated) {
        setSelectedEntry(updated);
      }
    } catch (requestError) {
      console.error('Failed to approve group entry', requestError);
      const message = requestError?.response?.data?.detail || requestError?.response?.data?.error || 'Failed to approve group entry.';
      setActionError(String(message));
    } finally {
      setActionLoading({ id: null, type: '' });
    }
  };

  const submitReject = async () => {
    if (!selectedEntry) return;
    const groupEntryId = selectedEntry.id;
    if (!canTransition) return;

    const notes = String(reviewNotes || '').trim();
    if (!notes) {
      setActionError('Review notes are required to reject a group entry.');
      return;
    }

    try {
      setActionLoading({ id: groupEntryId, type: 'reject' });
      setActionError('');
      const payload = {
        notes
      };
      const reason = String(rejectReason || '').trim();
      payload.reason = reason || notes;
      await http.post(`/api/auth/admin/school-group-participants/${groupEntryId}/reject/`, payload);
      setSuccess('Group entry rejected.');
      const refreshedEntries = await loadEntries(filters);
      const updated = refreshedEntries.find((entry) => String(entry.id) === String(groupEntryId));
      if (updated) {
        setSelectedEntry(updated);
      }
    } catch (requestError) {
      console.error('Failed to reject group entry', requestError);
      const message = requestError?.response?.data?.detail || requestError?.response?.data?.error || 'Failed to reject group entry.';
      setActionError(String(message));
    } finally {
      setActionLoading({ id: null, type: '' });
    }
  };

  return (
    <div className="max-w-[90rem] mx-auto p-6 md:p-8">
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-slate-200 shadow-lg p-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">School Group Participants</h2>
            <p className="text-lg md:text-xl text-slate-600 font-medium">
              Review and transition school-submitted group entries
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-slate-500 uppercase tracking-wide">Pending</div>
            <div className="text-3xl font-bold text-amber-700">{pendingCount}</div>
          </div>
        </div>
      </div>

      {(error || success) && (
        <div className="space-y-3 mb-4">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">{error}</div>
          )}
          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">{success}</div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Group Class</label>
            <select
              value={filters.group_class}
              onChange={(e) => setFilters((prev) => ({ ...prev, group_class: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">All</option>
              {GROUP_CLASS_OPTIONS.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">School</label>
            <input
              type="text"
              value={filters.school}
              onChange={(e) => setFilters((prev) => ({ ...prev, school: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="School ID"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Event</label>
            <input
              type="text"
              value={filters.event}
              onChange={(e) => setFilters((prev) => ({ ...prev, event: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Event ID"
            />
          </div>

          <div className="md:col-span-2 flex items-end justify-end gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700"
            >
              Apply Filters
            </button>
            <button
              type="button"
              onClick={() => {
                clearMessages();
                loadEntries(filters);
              }}
              className="px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 text-sm font-semibold hover:bg-indigo-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-gray-600">Loading entries...</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-gray-600">No group entries found for current filters.</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600 uppercase tracking-wide text-xs">
                <th className="px-4 py-3">Group ID</th>
                <th className="px-4 py-3">School</th>
                <th className="px-4 py-3">Class</th>
                <th className="px-4 py-3">Gender</th>
                <th className="px-4 py-3">Participants</th>
                <th className="px-4 py-3">Leader</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Submitted</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const labels = entryEventLabels(entry);
                const canReview = entry.status === 'pending';
                return (
                  <tr key={String(entry.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">{entry.group_id || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.school_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.group_class || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.gender_category || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.participant_count || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{entry.leader_full_name || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{labels.length ? labels.join(', ') : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusChipClass(entry.status)}`}>
                        {entry.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{entry.source || '-'}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDateTime(entry.submitted_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => openDetails(entry)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold"
                        >
                          Details
                        </button>
                        {canReview && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                openDetails(entry);
                                setActionError('');
                              }}
                              className="px-3 py-1.5 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-xs font-semibold"
                            >
                              Review
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={closeDetails}></div>
          <div className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">Group Entry Details</h3>
                <p className="text-sm text-slate-600 mt-1">Group ID: {selectedEntry.group_id || '-'}</p>
              </div>
              <button onClick={closeDetails} className="text-slate-500 hover:text-slate-800 text-xl">×</button>
            </div>

            <div className="p-6 space-y-6">
              {actionError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-700 text-sm">
                  {actionError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">School</div>
                  <div className="text-lg font-semibold text-slate-900 mt-1">{selectedEntry.school_name || '-'}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Status</div>
                  <div className="mt-2">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-semibold ${statusChipClass(selectedEntry.status)}`}>
                      {selectedEntry.status}
                    </span>
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 uppercase tracking-wide">Submitted</div>
                  <div className="text-base font-semibold text-slate-900 mt-1">{formatDateTime(selectedEntry.submitted_at)}</div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h4 className="text-lg font-bold text-slate-900 mb-3">Participants ({selectedEntry.participant_count})</h4>
                  {selectedEntry.participants.length === 0 ? (
                    <p className="text-sm text-slate-600">No participants available.</p>
                  ) : (
                    <ul className="space-y-2 max-h-56 overflow-y-auto">
                      {selectedEntry.participants.map((participant, index) => {
                        const fullName = `${participant?.first_name || ''} ${participant?.last_name || ''}`.trim() || 'Participant';
                        const isLeader = (index + 1) === Number(selectedEntry?.leader_index);
                        return (
                          <li key={`${fullName}-${index}`} className={`px-3 py-2 rounded-lg border ${isLeader ? 'bg-amber-50 border-amber-300' : 'bg-slate-50 border-slate-200'}`}>
                            <span className="font-medium text-slate-900">{fullName}</span>
                            {isLeader && (
                              <span className="ml-2 text-xs font-semibold text-amber-700">Leader</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-4">
                  <h4 className="text-lg font-bold text-slate-900 mb-3">Events</h4>
                  {entryEventLabels(selectedEntry).length === 0 ? (
                    <p className="text-sm text-slate-600">No events linked.</p>
                  ) : (
                    <ul className="space-y-2">
                      {entryEventLabels(selectedEntry).map((label, index) => (
                        <li key={`${label}-${index}`} className="px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-900 text-sm font-medium">
                          {label}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-lg font-bold text-slate-900">Review Metadata</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div><span className="font-semibold text-slate-700">Leader:</span> <span className="text-slate-900">{selectedEntry.leader_full_name || '-'}</span></div>
                  <div><span className="font-semibold text-slate-700">Source:</span> <span className="text-slate-900">{selectedEntry.source || '-'}</span></div>
                  <div><span className="font-semibold text-slate-700">Reviewed By:</span> <span className="text-slate-900">{selectedEntry.reviewed_by_name || '-'}</span></div>
                  <div><span className="font-semibold text-slate-700">Reviewed At:</span> <span className="text-slate-900">{formatDateTime(selectedEntry.reviewed_at)}</span></div>
                  <div className="md:col-span-2"><span className="font-semibold text-slate-700">Existing Notes:</span> <span className="text-slate-900">{selectedEntry.review_notes || '-'}</span></div>
                </div>
              </div>

              {canTransition && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-4">
                  <h4 className="text-lg font-bold text-amber-900">Review Action</h4>

                  <div>
                    <label className="block text-sm font-semibold text-amber-900 mb-2">Notes (optional for approve, required for reject)</label>
                    <textarea
                      value={reviewNotes}
                      onChange={(e) => setReviewNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                      placeholder="Add review notes"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-amber-900 mb-2">Reject Reason (optional)</label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm"
                      placeholder="Reason sent with reject request"
                    />
                  </div>

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      disabled={actionLoading.id === selectedEntry.id}
                      onClick={submitApprove}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-60"
                    >
                      {actionLoading.id === selectedEntry.id && actionLoading.type === 'approve' ? 'Approving...' : 'Approve'}
                    </button>
                    <button
                      type="button"
                      disabled={actionLoading.id === selectedEntry.id}
                      onClick={submitReject}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
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
