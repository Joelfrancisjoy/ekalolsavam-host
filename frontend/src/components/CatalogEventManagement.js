import React, { useEffect, useMemo, useState } from 'react';
import catalogService from '../services/catalogService';
import authManager from '../utils/authManager';

const GENDER_OPTIONS = [
  { value: 'BOYS', label: 'Boys' },
  { value: 'GIRLS', label: 'Girls' },
  { value: 'MIXED', label: 'Mixed' },
];

const CatalogEventManagement = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [categories, setCategories] = useState([]);
  const [levels, setLevels] = useState([]);
  const [participationTypes, setParticipationTypes] = useState([]);

  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const selectedEvent = useMemo(
    () => (events || []).find((e) => String(e.id) === String(selectedEventId)) || null,
    [events, selectedEventId]
  );

  const [variants, setVariants] = useState([]);
  const [rules, setRules] = useState([]);

  const [eventForm, setEventForm] = useState({
    event_code: '',
    event_name: '',
    category: '',
    participation_type: '',
  });

  const [variantName, setVariantName] = useState('');

  const [ruleForm, setRuleForm] = useState({
    level: '',
    gender_eligibility: 'MIXED',
    duration_minutes: '',
    min_participants: '',
    max_participants: '',
    variant: '',
  });

  const loadAll = async () => {
    try {
      setLoading(true);
      const [cat, lvl, pt, ev, rl] = await Promise.all([
        catalogService.listCategories(),
        catalogService.listLevels(),
        catalogService.listParticipationTypes(),
        catalogService.listEventDefinitions(),
        catalogService.listRules(),
      ]);
      setCategories(cat || []);
      setLevels(lvl || []);
      setParticipationTypes(pt || []);
      setEvents(ev || []);
      setRules(rl || []);

      const first = (ev || [])[0];
      if (first && !selectedEventId) {
        setSelectedEventId(String(first.id));
      }
      setError('');
    } catch (e) {
      const status = e?.response?.status;
      if (status === 401) {
        setError('Session expired. Please login again.');
        authManager.redirectToLogin('catalog load unauthorized');
      } else {
        setError('Failed to load catalog data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVariantsForSelected = async (eventId) => {
    if (!eventId) {
      setVariants([]);
      return;
    }
    try {
      const v = await catalogService.listVariants(eventId);
      setVariants(v || []);
    } catch (e) {
      setVariants([]);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadVariantsForSelected(selectedEventId);
  }, [selectedEventId]);

  const rulesForSelectedEvent = useMemo(() => {
    if (!selectedEventId) return [];
    return (rules || []).filter((r) => String(r.event) === String(selectedEventId));
  }, [rules, selectedEventId]);

  const showSuccess = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');

      if (!eventForm.event_code || !eventForm.event_name) {
        throw new Error('Event code and name are required');
      }
      if (!eventForm.category) throw new Error('Category is required');
      if (!eventForm.participation_type) throw new Error('Participation type is required');

      const created = await catalogService.createEventDefinition({
        event_code: eventForm.event_code.trim(),
        event_name: eventForm.event_name.trim(),
        category: Number(eventForm.category),
        participation_type: Number(eventForm.participation_type),
      });

      const nextEvents = await catalogService.listEventDefinitions();
      setEvents(nextEvents || []);
      setSelectedEventId(String(created.id));
      setEventForm({ event_code: '', event_name: '', category: '', participation_type: '' });
      showSuccess('Event definition created');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to create event definition';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEventId) return;
    if (!window.confirm('Delete selected event definition? This will remove its variants and rules too.')) return;

    try {
      setSaving(true);
      setError('');
      await catalogService.deleteEventDefinition(selectedEventId);
      const nextEvents = await catalogService.listEventDefinitions();
      setEvents(nextEvents || []);
      const first = (nextEvents || [])[0];
      setSelectedEventId(first ? String(first.id) : '');
      showSuccess('Event definition deleted');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to delete event definition';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleAddVariant = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;
    const name = String(variantName || '').trim();
    if (!name) return;

    try {
      setSaving(true);
      setError('');
      await catalogService.createVariant(selectedEventId, { variant_name: name });
      setVariantName('');
      await loadVariantsForSelected(selectedEventId);
      showSuccess('Variant added');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to add variant';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  const handleAddRule = async (e) => {
    e.preventDefault();
    if (!selectedEventId) return;

    try {
      setSaving(true);
      setError('');

      if (!ruleForm.level) throw new Error('Level is required');
      if (!ruleForm.gender_eligibility) throw new Error('Gender eligibility is required');

      const payload = {
        event: Number(selectedEventId),
        level: Number(ruleForm.level),
        gender_eligibility: ruleForm.gender_eligibility,
        duration_minutes: ruleForm.duration_minutes ? Number(ruleForm.duration_minutes) : null,
        min_participants: ruleForm.min_participants ? Number(ruleForm.min_participants) : null,
        max_participants: ruleForm.max_participants ? Number(ruleForm.max_participants) : null,
      };

      if (ruleForm.variant) {
        payload.variant = Number(ruleForm.variant);
      } else {
        payload.variant = null;
      }

      await catalogService.createRule(payload);
      const nextRules = await catalogService.listRules();
      setRules(nextRules || []);
      setRuleForm({
        level: '',
        gender_eligibility: 'MIXED',
        duration_minutes: '',
        min_participants: '',
        max_participants: '',
        variant: '',
      });
      showSuccess('Rule added');
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || err?.message || 'Failed to add rule';
      setError(String(msg));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl border border-slate-200 shadow-lg p-8 mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">Event Catalog</h2>
            <p className="text-lg md:text-xl text-slate-600 font-medium">Manage base event definitions, variants, and rules</p>
          </div>
          <button
            onClick={loadAll}
            className="inline-flex items-center bg-white border px-6 py-3 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 font-semibold"
          >
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">{success}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <h3 className="text-xl font-bold text-slate-900 mb-4">Create Event Definition</h3>
          <form onSubmit={handleCreateEvent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Code</label>
              <input
                value={eventForm.event_code}
                onChange={(e) => setEventForm((p) => ({ ...p, event_code: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                placeholder="e.g. SPEECH"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Event Name</label>
              <input
                value={eventForm.event_name}
                onChange={(e) => setEventForm((p) => ({ ...p, event_name: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                placeholder="e.g. Speech"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select
                value={eventForm.category}
                onChange={(e) => setEventForm((p) => ({ ...p, category: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="">Select</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.category_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Participation Type</label>
              <select
                value={eventForm.participation_type}
                onChange={(e) => setEventForm((p) => ({ ...p, participation_type: e.target.value }))}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="">Select</option>
                {participationTypes.map((p) => (
                  <option key={p.id} value={p.id}>{p.type_name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Create'}
            </button>
          </form>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Selected Event</h3>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="">Select event</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.event_code} - {ev.event_name}</option>
                ))}
              </select>
              {selectedEvent && (
                <div className="mt-3 text-sm text-gray-700">
                  <div><span className="font-semibold">Category:</span> {selectedEvent.category_details?.category_name || selectedEvent.category}</div>
                  <div><span className="font-semibold">Participation:</span> {selectedEvent.participation_type_details?.type_name || selectedEvent.participation_type}</div>
                </div>
              )}
            </div>
            <div>
              <button
                onClick={handleDeleteEvent}
                disabled={saving || !selectedEventId}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="border rounded-xl p-4">
              <h4 className="font-bold text-slate-900 mb-3">Variants</h4>
              <form onSubmit={handleAddVariant} className="flex gap-2 mb-3">
                <input
                  value={variantName}
                  onChange={(e) => setVariantName(e.target.value)}
                  className="flex-1 border-gray-300 rounded-md shadow-sm"
                  placeholder="e.g. Malayalam"
                  disabled={!selectedEventId}
                />
                <button
                  type="submit"
                  disabled={saving || !selectedEventId}
                  className="bg-slate-900 text-white px-4 py-2 rounded-md disabled:opacity-50"
                >
                  Add
                </button>
              </form>
              {variants.length === 0 ? (
                <div className="text-sm text-gray-500">No variants yet</div>
              ) : (
                <ul className="text-sm text-gray-700 space-y-1">
                  {variants.map((v) => (
                    <li key={v.id} className="flex items-center justify-between">
                      <span>{v.variant_name}</span>
                      <span className="text-gray-400">#{v.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="border rounded-xl p-4">
              <h4 className="font-bold text-slate-900 mb-3">Add Rule</h4>
              <form onSubmit={handleAddRule} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Level</label>
                  <select
                    value={ruleForm.level}
                    onChange={(e) => setRuleForm((p) => ({ ...p, level: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    disabled={!selectedEventId}
                  >
                    <option value="">Select</option>
                    {levels.map((l) => (
                      <option key={l.id} value={l.id}>{l.level_code}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Gender Eligibility</label>
                  <select
                    value={ruleForm.gender_eligibility}
                    onChange={(e) => setRuleForm((p) => ({ ...p, gender_eligibility: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    disabled={!selectedEventId}
                  >
                    {GENDER_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value}>{g.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Variant (optional)</label>
                  <select
                    value={ruleForm.variant}
                    onChange={(e) => setRuleForm((p) => ({ ...p, variant: e.target.value }))}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                    disabled={!selectedEventId}
                  >
                    <option value="">None</option>
                    {variants.map((v) => (
                      <option key={v.id} value={v.id}>{v.variant_name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <input
                      type="number"
                      value={ruleForm.duration_minutes}
                      onChange={(e) => setRuleForm((p) => ({ ...p, duration_minutes: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      placeholder="min"
                      disabled={!selectedEventId}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min</label>
                    <input
                      type="number"
                      value={ruleForm.min_participants}
                      onChange={(e) => setRuleForm((p) => ({ ...p, min_participants: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      disabled={!selectedEventId}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max</label>
                    <input
                      type="number"
                      value={ruleForm.max_participants}
                      onChange={(e) => setRuleForm((p) => ({ ...p, max_participants: e.target.value }))}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                      disabled={!selectedEventId}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving || !selectedEventId}
                  className="w-full bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 disabled:opacity-50"
                >
                  Add Rule
                </button>
              </form>
            </div>
          </div>

          <div className="mt-6">
            <h4 className="font-bold text-slate-900 mb-3">Rules</h4>
            {rulesForSelectedEvent.length === 0 ? (
              <div className="text-sm text-gray-500">No rules for this event yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Level</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Variant</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Max</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {rulesForSelectedEvent.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.level_details?.level_code || r.level}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.gender_eligibility}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.variant_details?.variant_name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.duration_minutes ?? '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.min_participants ?? '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-700">{r.max_participants ?? '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatalogEventManagement;
