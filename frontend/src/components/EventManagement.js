import React, { useEffect, useMemo, useState } from 'react';
import { eventServiceAdapter as eventService, userServiceAdapter as userService } from '../services/serviceAdapter';
import scoreService from '../services/scoreService';
import AnomalyFlagIndicator from './AnomalyFlagIndicator';
import AnomalyDetailsModal from './AnomalyDetailsModal';

const CATEGORY_OPTIONS = [
    { value: 'dance', label: 'Dance / Folk Arts', icon: '💃', color: 'from-pink-500 to-rose-500' },
    { value: 'music', label: 'Music', icon: '🎵', color: 'from-blue-500 to-indigo-500' },
    { value: 'literary', label: 'Literary', icon: '📚', color: 'from-green-500 to-emerald-500' },
    { value: 'visual_arts', label: 'Visual Arts', icon: '🎨', color: 'from-purple-500 to-violet-500' },
    { value: 'theatre', label: 'Theatre / Drama', icon: '🎭', color: 'from-orange-500 to-amber-500' },
];

// Unused - kept for reference
// const EVENTS_BY_CATEGORY = {
//     dance: ['Bharatanatyam', 'Mohiniyattam', 'Kathakali', 'Thiruvathirakkali', 'Oppana'],
//     music: ['Light Music', 'Classical Music', 'Mappila Songs', 'Violin (Eastern)', 'Panchavadyam'],
//     literary: ['Essay Writing (Malayalam)', 'Poetry Recitation', 'Speech (Malayalam)', 'Quiz', 'Aksharaslokam'],
//     visual: ['Cartoon', 'Painting – Water Colour', 'Painting – Oil Colour', 'Collage', 'Painting – Pencil'],
//     theatre: ['Mime', 'Mono Act', 'Drama', 'Mimicry', 'Ottan Thullal']
// };

const AVAILABLE_EVENTS = {
    dance: ['Bharatanatyam', 'Mohiniyattam', 'Kathakali', 'Thiruvathirakali', 'Oppana'],
    music: ['Light Music', 'Classical Music', 'Mappila Songs', 'Violin (Eastern)', 'Panchavadyam'],
    literary: ['Essay Writing (Malayalam)', 'Poetry Recitation', 'Speech (Malayalam)', 'Quiz', 'Aksharaslokam'],
    visual_arts: ['Cartoon', 'Painting – Water Colour', 'Painting – Oil Colour', 'Collage', 'Painting – Pencil'],
    theatre: ['Mime', 'Mono Act', 'Drama', 'Mimicry', 'Ottan Thullal']
};

const initialEventState = {
    name: '',
    description: '',
    category: 'dance',
    date: '', // YYYY-MM-DD
    start_time: '', // HH:MM
    end_time: '', // HH:MM
    venue: '', // id
    max_participants: 1,
    judges: [], // [ids]
    volunteers: [], // [ids]
    is_published: false,
};

const EventManagement = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [events, setEvents] = useState([]);
    const [venues, setVenues] = useState([]);
    const [judges, setJudges] = useState([]);
    const [volunteers, setVolunteers] = useState([]);

    const [filters, setFilters] = useState({ category: '', date: '' });
    const [search, setSearch] = useState('');
    const [publishedOnly, setPublishedOnly] = useState(false);
    // Professional UX additions
    const [rowDensity, setRowDensity] = useState('comfortable'); // comfortable | compact
    const [columnsVisible, setColumnsVisible] = useState({
        name: true,
        category: true,
        date: true,
        time: true,
        venue: true,
        judges: true,
        volunteers: true,
        published: true,
        actions: true,
    });

    const [activeTab, setActiveTab] = useState('list'); // list | form
    const [formData, setFormData] = useState(initialEventState);
    const [editingId, setEditingId] = useState(null);
    const isEditing = useMemo(() => editingId !== null, [editingId]);

    // UI polish state for delete confirm modal
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmTargetId, setConfirmTargetId] = useState(null);

    // Anomaly detection state
    const [eventAnomalies, setEventAnomalies] = useState({});
    const [anomalyModalEventId, setAnomalyModalEventId] = useState(null);

    useEffect(() => {
        loadAll();
        loadAnomalies();
    }, []);

    const loadAnomalies = async () => {
        try {
            const anomalyData = await scoreService.getEventAnomalies();
            setEventAnomalies(anomalyData);
        } catch (err) {
            console.error('Failed to load anomaly data', err);
            // Non-critical, don't show error to user
        }
    };

    const loadAll = async () => {
        try {
            setLoading(true);
            const [evData, venueData] = await Promise.all([
                eventService.listEvents(),
                eventService.listVenues(),
            ]);
            setEvents(evData);
            setVenues(venueData);
            // Try to fetch judges list (expects backend to support role filter)
            try {
                const judgeUsers = await userService.list({ role: 'judge' });
                setJudges(judgeUsers);
            } catch (_) {
                // fallback: load all users and let admin pick from them
                try {
                    const allUsers = await userService.list();
                    setJudges(allUsers);
                } catch (e2) {
                    // ignore
                }
            }
            // load volunteers list similarly
            try {
                const volunteerUsers = await userService.list({ role: 'volunteer' });
                setVolunteers(volunteerUsers);
            } catch (_) {
                try {
                    const allUsers = await userService.list();
                    setVolunteers(allUsers.filter(u => u.role === 'volunteer'));
                } catch (e2) { /* ignore */ }
            }
            setError('');
        } catch (err) {
            console.error('Failed to load events/venues', err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const reloadEvents = async () => {
        try {
            const data = await eventService.listEvents(filters);
            setEvents(data);
        } catch (err) {
            console.error('Failed to reload events', err);
        }
    };

    const reloadAllEvents = async () => {
        try {
            const data = await eventService.listEvents();
            setEvents(data);
        } catch (err) {
            console.error('Failed to reload all events', err);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    };

    const applyFilters = async () => {
        await reloadEvents();
    };

    const totalEvents = useMemo(() => events.length, [events]);
    const publishedCount = useMemo(() => events.filter(e => e.is_published).length, [events]);
    const categoryCount = useMemo(() => new Set(events.map(e => e.category)).size, [events]);
    const venueCount = useMemo(() => new Set(events.map(e => e.venue)).size, [events]);

    const filteredEvents = useMemo(() => {
        let list = events;
        if (publishedOnly) list = list.filter(e => e.is_published);
        if (search.trim()) {
            const q = search.toLowerCase();
            list = list.filter(e =>
                (e.name || '').toLowerCase().includes(q) ||
                (e.description || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [events, publishedOnly, search]);

    // Dashboard enhancements: selection, sorting, pagination
    const [selectedIds, setSelectedIds] = useState([]);
    const [sort, setSort] = useState({ key: 'date', dir: 'asc' }); // keys: name, category, date, start_time, venue, is_published
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const sortedEvents = useMemo(() => {
        const list = [...filteredEvents];
        const { key, dir } = sort;
        const factor = dir === 'asc' ? 1 : -1;
        list.sort((a, b) => {
            const getValue = (ev) => {
                switch (key) {
                    case 'name': return (ev.name || '').toLowerCase();
                    case 'category': return (ev.category || '').toLowerCase();
                    case 'date': return ev.date || '';
                    case 'start_time': return ev.start_time || '';
                    case 'venue': return String(ev.venue || '');
                    case 'is_published': return ev.is_published ? 1 : 0;
                    default: return (ev.name || '').toLowerCase();
                }
            };
            const va = getValue(a);
            const vb = getValue(b);
            if (va < vb) return -1 * factor;
            if (va > vb) return 1 * factor;
            return 0;
        });
        return list;
    }, [filteredEvents, sort]);

    const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedEvents.length / pageSize)), [sortedEvents, pageSize]);
    const currentPageEvents = useMemo(() => {
        const start = (page - 1) * pageSize;
        return sortedEvents.slice(start, start + pageSize);
    }, [sortedEvents, page, pageSize]);

    useEffect(() => { setPage(1); }, [filters, search, publishedOnly, pageSize]);

    const isAllSelectedOnPage = useMemo(() => currentPageEvents.length > 0 && currentPageEvents.every(e => selectedIds.includes(e.id)), [currentPageEvents, selectedIds]);
    const toggleSelect = (id) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
    };
    const toggleSelectAllOnPage = () => {
        setSelectedIds((prev) => {
            const pageIds = currentPageEvents.map((e) => e.id);
            if (pageIds.every((id) => prev.includes(id))) {
                return prev.filter((id) => !pageIds.includes(id));
            }
            return Array.from(new Set([...prev, ...pageIds]));
        });
    };
    const clearSelection = () => setSelectedIds([]);

    const changeSort = (key) => {
        setSort((prev) => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
    };

    const bulkPublish = async (shouldPublish) => {
        if (!selectedIds.length) return;
        try {
            setSaving(true);
            await Promise.all(selectedIds.map((id) => eventService.publishEvent(id, shouldPublish)));
            await reloadAllEvents();
            clearSelection();
            setSuccess(shouldPublish ? 'Published selected events' : 'Unpublished selected events');
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            console.error('Bulk publish failed', err);
            setError('Bulk publish/unpublish failed');
            setTimeout(() => setError(''), 3000);
        } finally {
            setSaving(false);
        }
    };

    const bulkDelete = async () => {
        if (!selectedIds.length) return;
        if (!window.confirm(`Delete ${selectedIds.length} selected event(s)? This cannot be undone.`)) return;
        try {
            setSaving(true);
            await Promise.all(selectedIds.map((id) => eventService.deleteEvent(id)));
            await reloadAllEvents();
            clearSelection();
            setSuccess('Deleted selected events');
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            console.error('Bulk delete failed', err);
            setError('Bulk delete failed');
            setTimeout(() => setError(''), 3000);
        } finally {
            setSaving(false);
        }
    };

    // Quick filters
    const applyQuickPublished = (val) => setPublishedOnly(val);
    const applyQuickToday = () => {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        setFilters((prev) => ({ ...prev, date: `${yyyy}-${mm}-${dd}` }));
    };
    const clearQuickDate = () => setFilters((prev) => ({ ...prev, date: '' }));
    const applyQuickCategory = (cat) => setFilters((prev) => ({ ...prev, category: prev.category === cat ? '' : cat }));

    // Column visibility
    const toggleColumn = (key) => setColumnsVisible((prev) => ({ ...prev, [key]: !prev[key] }));

    // CSV Export for current sorted events
    const exportCSV = () => {
        const visibleCols = Object.entries(columnsVisible).filter(([k, v]) => v && k !== 'actions').map(([k]) => k);
        const headerMap = { name: 'Name', category: 'Category', date: 'Date', time: 'Time', venue: 'Venue', judges: 'Judges', volunteers: 'Volunteers', published: 'Published' };
        const headers = visibleCols.map((c) => headerMap[c] || c);
        const venueName = (id) => venues.find((v) => v.id === id)?.name || '';
        const judgeName = (id) => judges.find((u) => u.id === id)?.username || `User#${id}`;
        const volunteerNameCSV = (id) => volunteers.find((u) => u.id === id)?.username || `User#${id}`;
        const rows = sortedEvents.map((ev) => {
            const judgeIds = (ev.judges && ev.judges.length ? ev.judges : ((ev.judges_details || []).map(u => u.id))) || [];
            const volunteerIds = (ev.volunteers && ev.volunteers.length ? ev.volunteers : ((ev.volunteers_details || []).map(u => u.id))) || [];
            const map = {
                name: ev.name || '',
                category: ev.category || '',
                date: ev.date || '',
                time: `${ev.start_time || ''} - ${ev.end_time || ''}`.trim(),
                venue: venueName(ev.venue),
                judges: judgeIds.map(judgeName).join('; '),
                volunteers: volunteerIds.map(volunteerNameCSV).join('; '),
                published: ev.is_published ? 'Yes' : 'No',
            };
            return visibleCols.map((c) => map[c] ?? '');
        });
        const escapeCSV = (val) => {
            const s = String(val ?? '');
            if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
            return s;
        };
        const csv = [headers, ...rows].map((r) => r.map(escapeCSV).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'events.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const resetForm = () => {
        setFormData(initialEventState);
        setEditingId(null);
    };

    const openCreate = () => {
        resetForm();
        setFormData((prev) => ({ ...prev, category: '' }));
        setActiveTab('form');
    };

    const openEdit = (event) => {
        setEditingId(event.id);
        setFormData({
            name: event.name || '',
            description: event.description || '',
            category: event.category || 'dance',
            date: event.date || '',
            start_time: event.start_time?.slice(0, 5) || '',
            end_time: event.end_time?.slice(0, 5) || '',
            venue: event.venue || '',
            max_participants: event.max_participants || 1,
            judges: (event.judges || []),
            volunteers: (event.volunteers || []),
            is_published: !!event.is_published,
        });
        setActiveTab('form');
    };

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData((prev) => {
            const newData = {
                ...prev,
                [name]: type === 'number' ? Number(value) : value,
            };
            // Reset name if category changed and current name is not in the new category
            if (name === 'category') {
                const newCategoryEvents = AVAILABLE_EVENTS[value] || [];
                if (newData.name && !newCategoryEvents.includes(newData.name)) {
                    newData.name = '';
                }
            }
            return newData;
        });
    };

    const handleJudgesChange = (e) => {
        const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
        setFormData((prev) => ({ ...prev, judges: selected }));
    };
    const handleVolunteersChange = (e) => {
        const selected = Array.from(e.target.selectedOptions).map((o) => Number(o.value));
        setFormData((prev) => ({ ...prev, volunteers: selected }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            // Basic client-side validations to avoid 400s
            if (!formData.category) throw new Error('Please choose a category');
            if (!formData.name) throw new Error('Please select an event name');
            if (!formData.description || !formData.description.trim()) throw new Error('Description is required');
            if (!formData.date) throw new Error('Please select a date');
            if (!formData.start_time || !formData.end_time) throw new Error('Please fill start and end time');
            if (!formData.venue) throw new Error('Please choose a venue');
            if (!Array.isArray(formData.judges) || formData.judges.length === 0) throw new Error('Select at least one judge');

            // Build payload compliant with backend
            const payload = {
                ...formData,
                venue: formData.venue ? Number(formData.venue) : null,
                judges: formData.judges || [],
                volunteers: formData.volunteers || [],
            };

            // Client-side time validations
            const [sh, sm] = (payload.start_time || '').split(':').map(Number);
            const [eh, em] = (payload.end_time || '').split(':').map(Number);
            if (Number.isFinite(sh) && Number.isFinite(eh)) {
                const startMinutes = sh * 60 + (sm || 0);
                const endMinutes = eh * 60 + (em || 0);
                if (endMinutes <= startMinutes) throw new Error('End time must be after start time');
                if ((endMinutes - startMinutes) > 180) throw new Error('Event duration cannot exceed 3 hours');
                const earliest = 9 * 60; // 09:00
                const latest = 20 * 60; // 20:00
                if (startMinutes < earliest || endMinutes > latest) throw new Error('Events must be between 09:00 and 20:00');
            }

            if (isEditing) {
                await eventService.updateEvent(editingId, payload);
                setSuccess('Event updated successfully');
            } else {
                await eventService.createEvent(payload);
                setSuccess('Event created successfully');
            }

            await reloadAllEvents();
            setActiveTab('list');
            resetForm();

            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error('Failed to save event', err);
            const apiMsg = err.response?.data;
            let msg = 'Failed to save event';
            if (typeof apiMsg === 'string') {
                msg = apiMsg;
            } else if (apiMsg && typeof apiMsg === 'object') {
                try {
                    msg = Object.entries(apiMsg)
                        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
                        .join(' | ');
                } catch (_) { /* ignore */ }
            } else if (err.message) {
                msg = err.message;
            }
            setError(msg);
        } finally {
            setSaving(false);
        }
    };

    const handleAssignVolunteers = async (eventId, volunteerIds) => {
        try {
            setSaving(true);
            await eventService.assignVolunteers(eventId, volunteerIds);
            await reloadAllEvents();
            setSuccess('Volunteers assigned');
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            console.error('Failed to assign volunteers', err);
            setError('Failed to assign volunteers');
            setTimeout(() => setError(''), 3000);
        } finally {
            setSaving(false);
        }
    };

    // Replaced by openDeleteConfirm
    // const handleDelete = async (id) => {
    //     if (!window.confirm('Delete this event?')) return;
    //     try {
    //         await eventService.deleteEvent(id);
    //         setSuccess('Event deleted');
    //         await reloadAllEvents();
    //         setTimeout(() => setSuccess(''), 2000);
    //     } catch (err) {
    //         console.error('Failed to delete event', err);
    //         setError('Failed to delete event');
    //         setTimeout(() => setError(''), 3000);
    //     }
    // };

    const openDeleteConfirm = (id) => {
        setConfirmTargetId(id);
        setConfirmOpen(true);
    };

    const closeDeleteConfirm = () => {
        setConfirmOpen(false);
        setConfirmTargetId(null);
    };

    const confirmDelete = async () => {
        if (confirmTargetId == null) return;
        // call existing delete logic but skip duplicate confirmations
        try {
            await eventService.deleteEvent(confirmTargetId);
            setSuccess('Event deleted');
            await reloadAllEvents();
            setTimeout(() => setSuccess(''), 2000);
        } catch (err) {
            console.error('Failed to delete event', err);
            setError('Failed to delete event');
            setTimeout(() => setError(''), 3000);
        } finally {
            closeDeleteConfirm();
        }
    };

    const togglePublish = async (ev) => {
        try {
            const updated = await eventService.togglePublish(ev.id);
            // Merge with existing event to preserve judges/volunteers arrays if backend omits them
            setEvents((prev) => prev.map((e) =>
                e.id === ev.id
                    ? {
                        ...e,
                        ...updated,
                        judges: (updated && Object.prototype.hasOwnProperty.call(updated, 'judges')) ? updated.judges : e.judges,
                        volunteers: (updated && Object.prototype.hasOwnProperty.call(updated, 'volunteers')) ? updated.volunteers : e.volunteers,
                      }
                    : e
            ));
        } catch (err) {
            console.error('Failed to toggle publish', err);
            setError('Failed to update publish status');
            setTimeout(() => setError(''), 3000);
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
                <div className="flex items-start justify-between mb-8">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-3 tracking-tight">Event Management</h2>
                        <p className="text-lg md:text-xl text-slate-600 font-medium">Plan, organize, and publish events for student registration</p>
                    </div>
                    <button onClick={openCreate} className="inline-flex items-center bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 text-lg font-semibold">
                        <span className="text-2xl mr-2">＋</span> New Event
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <StatCard label="Total Events" value={totalEvents} />
                    <StatCard label="Published" value={publishedCount} />
                    <StatCard label="Categories" value={categoryCount} />
                    <StatCard label="Venues" value={venueCount} />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-200">
                <div className="border-b border-slate-200 p-8">
                    <div className="flex space-x-12">
                        <button onClick={() => setActiveTab('list')} className={`py-3 px-2 border-b-3 font-semibold text-lg transition-colors duration-200 ${activeTab === 'list' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>Events</button>
                        <button onClick={() => setActiveTab('form')} className={`py-3 px-2 border-b-3 font-semibold text-lg transition-colors duration-200 ${activeTab === 'form' ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{isEditing ? 'Edit Event' : 'Create Event'}</button>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">{error}</div>
                )}
                {success && (
                    <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">{success}</div>
                )}

                <div className="p-8">
                    {activeTab === 'list' && (
                        <>
                            <Filters
                                filters={filters}
                                onChange={handleFilterChange}
                                onApply={applyFilters}
                                search={search}
                                onSearch={setSearch}
                                publishedOnly={publishedOnly}
                                onPublishedOnlyChange={setPublishedOnly}
                            />
                            <QuickFilters
                                publishedOnly={publishedOnly}
                                onTogglePublished={() => applyQuickPublished(!publishedOnly)}
                                onToday={applyQuickToday}
                                onClearDate={clearQuickDate}
                                currentCategory={filters.category}
                                onCategory={applyQuickCategory}
                            />
                            <Toolbar
                                selectedCount={selectedIds.length}
                                onClearSelection={clearSelection}
                                onPublish={() => bulkPublish(true)}
                                onUnpublish={() => bulkPublish(false)}
                                onDelete={bulkDelete}
                                rowDensity={rowDensity}
                                onChangeDensity={setRowDensity}
                                columnsVisible={columnsVisible}
                                onToggleColumn={toggleColumn}
                                onExportCSV={exportCSV}
                            />
                            <EventList
                                events={currentPageEvents}
                                venues={venues}
                                judges={judges}
                                volunteers={volunteers}
                                onEdit={openEdit}
                                onDelete={openDeleteConfirm}
                                onTogglePublish={togglePublish}
                                selectedIds={selectedIds}
                                onToggleRowSelect={toggleSelect}
                                allSelected={isAllSelectedOnPage}
                                onToggleSelectAll={toggleSelectAllOnPage}
                                sort={sort}
                                onChangeSort={changeSort}
                                columnsVisible={columnsVisible}
                                density={rowDensity}
                                onAssignVolunteers={handleAssignVolunteers}
                                eventAnomalies={eventAnomalies}
                                onViewAnomalies={setAnomalyModalEventId}
                            />
                            <Pagination
                                page={page}
                                totalPages={totalPages}
                                totalItems={sortedEvents.length}
                                pageSize={pageSize}
                                onPageSizeChange={(n) => setPageSize(Number(n))}
                                onPrev={() => setPage((p) => Math.max(1, p - 1))}
                                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
                            />
                            {confirmOpen && (
                                <DeleteConfirmModal
                                    onCancel={closeDeleteConfirm}
                                    onConfirm={confirmDelete}
                                />
                            )}
                            {anomalyModalEventId && (
                                <AnomalyDetailsModal
                                    eventId={anomalyModalEventId}
                                    onClose={() => {
                                        setAnomalyModalEventId(null);
                                        loadAnomalies(); // Reload after closing modal
                                    }}
                                />
                            )}
                        </>
                    )}

                    {activeTab === 'form' && (
                        <EventForm
                            venues={venues}
                            judges={judges}
                            volunteers={volunteers}
                            availableEvents={AVAILABLE_EVENTS}
                            data={formData}
                            onChange={handleChange}
                            onJudgesChange={handleJudgesChange}
                            onVolunteersChange={handleVolunteersChange}
                            onCancel={() => { setActiveTab('list'); resetForm(); }}
                            onSubmit={handleSubmit}
                            saving={saving}
                            isEditing={isEditing}
                        />
                    )}
                </div>
            </div>
        </div >
    );
};

const Filters = ({ filters, onChange, onApply, search, onSearch, publishedOnly, onPublishedOnlyChange }) => {
    return (
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-xl mb-6 border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-900 mb-4">Filter Events</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                    <label className="block text-base font-semibold text-slate-700 mb-2">Category</label>
                    <select name="category" value={filters.category} onChange={onChange} className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="">All Categories</option>
                        {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-base font-semibold text-slate-700 mb-2">Date</label>
                    <input type="date" name="date" value={filters.date} onChange={onChange} className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div>
                    <label className="block text-base font-semibold text-slate-700 mb-2">Search</label>
                    <input type="text" value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search by name or description" className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-3 px-4 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
                </div>
                <div className="flex flex-col justify-end space-y-4">
                    <label className="inline-flex items-center text-base font-semibold text-slate-700">
                        <input type="checkbox" className="mr-3 w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" checked={publishedOnly} onChange={(e) => onPublishedOnlyChange(e.target.checked)} />
                        Published only
                    </label>
                    <button onClick={onApply} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 text-base font-semibold">Apply Filters</button>
                </div>
            </div>
        </div>
    );
};

const EventList = ({ events, venues, judges, volunteers = [], onEdit, onDelete, onTogglePublish, selectedIds, onToggleRowSelect, allSelected, onToggleSelectAll, sort, onChangeSort, columnsVisible, density, onAssignVolunteers, eventAnomalies = {}, onViewAnomalies }) => {
    const venueLabel = (id) => venues.find((v) => v.id === id)?.name || '-';
    const judgeName = (id) => judges.find((u) => u.id === id)?.username || `User#${id}`;
    const volunteerName = (id) => volunteers.find((u) => u.id === id)?.username || `User#${id}`;

    const CATEGORY_BADGE = {
        dance: 'bg-pink-50 text-pink-700 border-pink-200',
        music: 'bg-blue-50 text-blue-700 border-blue-200',
        literary: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        visual_arts: 'bg-violet-50 text-violet-700 border-violet-200',
        theatre: 'bg-amber-50 text-amber-700 border-amber-200',
    };

    if (!events.length) {
        return (
            <div className="text-center py-12">
                <div className="text-gray-500 text-lg">No events found</div>
                <p className="text-gray-400 mt-2">Create your first event</p>
            </div>
        );
    }

    const SortHeader = ({ label, col }) => (
        <button onClick={() => onChangeSort(col)} className={`px-4 py-4 text-left text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors duration-200 ${sort.key === col ? 'text-indigo-700' : 'text-slate-600 hover:text-slate-800'}`}>
            <span>{label}</span>
            <span className="text-lg">{sort.key === col ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
        </button>
    );

    return (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-lg">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-slate-50 to-blue-50 sticky top-0 z-10">
                    <tr>
                        <th className="px-8 py-4 text-left">
                            <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                        </th>
                        {columnsVisible.name && <th className="px-4"><SortHeader label="Name" col="name" /></th>}
                        {columnsVisible.category && <th className="px-4"><SortHeader label="Category" col="category" /></th>}
                        {columnsVisible.date && <th className="px-4"><SortHeader label="Date" col="date" /></th>}
                        {columnsVisible.time && <th className="px-4"><SortHeader label="Time" col="start_time" /></th>}
                        {columnsVisible.venue && <th className="px-4"><SortHeader label="Venue" col="venue" /></th>}
                        {columnsVisible.judges && <th className="px-8 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Judges</th>}
                        {columnsVisible.volunteers && <th className="px-8 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Volunteers</th>}
                        {columnsVisible.published && <th className="px-4"><SortHeader label="Published" col="is_published" /></th>}
                        {columnsVisible.actions && <th className="px-8 py-4 text-left text-sm font-bold text-slate-700 uppercase tracking-wider">Actions</th>}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                    {events.map((ev) => (
                        <tr key={ev.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50 transition-colors duration-200">
                            <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap`}>
                                <input type="checkbox" checked={selectedIds.includes(ev.id)} onChange={() => onToggleRowSelect(ev.id)} className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                            </td>
                            {columnsVisible.name && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'}`}>
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <div className="text-base font-bold text-slate-900">{ev.name}</div>
                                            <div className="text-sm text-slate-600 max-w-xs truncate mt-1">{ev.description}</div>
                                        </div>
                                        {eventAnomalies[ev.id] && (
                                            <AnomalyFlagIndicator
                                                count={eventAnomalies[ev.id].total_flagged}
                                                unreviewed={eventAnomalies[ev.id].unreviewed}
                                                onClick={() => onViewAnomalies(ev.id)}
                                            />
                                        )}
                                    </div>
                                </td>
                            )}
                            {columnsVisible.category && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap text-base`}>
                                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold border-2 ${CATEGORY_BADGE[ev.category] || 'bg-slate-100 text-slate-700 border-slate-300'}`} title={ev.category}>
                                        {ev.category}
                                    </span>
                                </td>
                            )}
                            {columnsVisible.date && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap text-base text-slate-700 font-semibold`}>{ev.date}</td>
                            )}
                            {columnsVisible.time && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap text-base text-slate-700`}>
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-blue-100 text-blue-800 text-sm font-semibold border border-blue-200">
                                        {ev.start_time} - {ev.end_time}
                                    </span>
                                </td>
                            )}
                            {columnsVisible.venue && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap text-base text-slate-700`}>
                                    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-800 text-sm font-semibold border border-slate-200">
                                        {venueLabel(ev.venue)}
                                    </span>
                                </td>
                            )}
                            {columnsVisible.judges && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap text-base text-slate-700`}>
                                    <div className="flex flex-wrap gap-2">
                                        {(((ev.judges && ev.judges.length ? ev.judges : ((ev.judges_details || []).map(u => u.id))) || []).slice(0,3)).map((jid) => (
                                            <span key={jid} className="px-2.5 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-full font-semibold border border-indigo-200" title="Judge">
                                                {judgeName(jid)}
                                            </span>
                                        ))}
                                        {(((ev.judges && ev.judges.length ? ev.judges : ((ev.judges_details || []).map(u => u.id))) || []).length > 3) && (
                                            <span className="px-2.5 py-0.5 text-xs bg-indigo-100 text-indigo-800 rounded-full font-semibold border border-indigo-200">+{(((ev.judges && ev.judges.length ? ev.judges : ((ev.judges_details || []).map(u => u.id))) || []).length - 3)} more</span>
                                        )}
                                    </div>
                                </td>
                            )}
                            {columnsVisible.volunteers && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap text-base text-slate-700`}>
                                    <div className="flex flex-wrap gap-2">
                                        {(((ev.volunteers && ev.volunteers.length ? ev.volunteers : ((ev.volunteers_details || []).map(u => u.id))) || []).slice(0,3)).map((vid) => (
                                            <span key={vid} className="px-2.5 py-0.5 text-xs bg-emerald-50 text-emerald-700 rounded-full font-semibold border border-emerald-200" title="Volunteer">
                                                {volunteerName(vid)}
                                            </span>
                                        ))}
                                        {(((ev.volunteers && ev.volunteers.length ? ev.volunteers : ((ev.volunteers_details || []).map(u => u.id))) || []).length > 3) && (
                                            <span className="px-2.5 py-0.5 text-xs bg-emerald-100 text-emerald-800 rounded-full font-semibold border border-emerald-200">+{(((ev.volunteers && ev.volunteers.length ? ev.volunteers : ((ev.volunteers_details || []).map(u => u.id))) || []).length - 3)} more</span>
                                        )}
                                    </div>
                                </td>
                            )}
                            {columnsVisible.published && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap text-base text-slate-700`}>
                                    <label className="inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={!!ev.is_published} onChange={() => onTogglePublish(ev)} />
                                        <div className="w-12 h-6 bg-slate-200 rounded-full peer peer-checked:bg-green-500 transition-colors relative">
                                            <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transform transition-transform peer-checked:translate-x-6"></div>
                                        </div>
                                        <span className="ml-3 text-sm font-semibold text-slate-600">{ev.is_published ? 'Published' : 'Hidden'}</span>
                                    </label>
                                </td>
                            )}
                            {columnsVisible.actions && (
                                <td className={`px-8 ${density === 'compact' ? 'py-3' : 'py-6'} whitespace-nowrap text-base font-semibold space-x-3`}>
                                    <button title="Edit" aria-label="Edit" onClick={() => onEdit(ev)} className="inline-flex items-center px-4 py-2 rounded-lg border-2 text-blue-700 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200 font-semibold">Edit</button>
                                    <button title={ev.is_published ? 'Unpublish' : 'Publish'} aria-label="Toggle publish" onClick={() => onTogglePublish(ev)} className={`inline-flex items-center px-4 py-2 rounded-lg border-2 transition-all duration-200 font-semibold ${ev.is_published ? 'text-indigo-700 border-indigo-300 hover:bg-indigo-50 hover:border-indigo-400' : 'text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}>{ev.is_published ? 'Unpublish' : 'Publish'}</button>
                                    <VolunteerAssignDropdown event={ev} volunteers={volunteers} onAssign={onAssignVolunteers} />
                                    <button title="Delete" aria-label="Delete" onClick={() => onDelete(ev.id)} className="inline-flex items-center px-4 py-2 rounded-lg border-2 text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400 transition-all duration-200 font-semibold">Delete</button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const VolunteerAssignDropdown = ({ event, volunteers, onAssign }) => {
    const [open, setOpen] = useState(false);
    const [selection, setSelection] = useState(event.volunteers || []);
    const toggle = () => setOpen(!open);
    const apply = async () => {
        await onAssign(event.id, selection);
        setOpen(false);
    };
    const onChange = (e) => {
        const vals = Array.from(e.target.selectedOptions).map(o => Number(o.value));
        setSelection(vals);
    };
    return (
        <span className="relative inline-block">
            <button onClick={toggle} className="inline-flex items-center px-4 py-2 rounded-lg border-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-200 font-semibold">Assign Volunteers</button>
            {open && (
                <div className="absolute right-0 mt-2 z-20 bg-white border border-slate-200 rounded-xl shadow-xl p-4 w-72">
                    <div className="text-sm font-semibold text-slate-700 mb-2">Select volunteers</div>
                    <select multiple value={selection} onChange={onChange} className="w-full h-40 border rounded-lg p-2">
                        {volunteers.map(v => (
                            <option key={v.id} value={v.id}>{v.username || v.email || `User#${v.id}`}</option>
                        ))}
                    </select>
                    <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => setOpen(false)} className="px-3 py-1 rounded border border-slate-300 text-slate-700">Cancel</button>
                        <button onClick={apply} className="px-3 py-1 rounded border border-emerald-300 text-emerald-700 hover:bg-emerald-50">Save</button>
                    </div>
                </div>
            )}
        </span>
    );
};

const QuickFilters = ({ publishedOnly, onTogglePublished, onToday, onClearDate, currentCategory, onCategory }) => {
    const cats = CATEGORY_OPTIONS.map((c) => c.value);
    return (
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={onTogglePublished} className={`px-4 py-2 text-sm font-semibold rounded-full border-2 transition-all duration-200 ${publishedOnly ? 'bg-green-100 text-green-800 border-green-300 shadow-md' : 'text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}>{publishedOnly ? 'Published: On' : 'Published: Off'}</button>
                <button onClick={onToday} className="px-4 py-2 text-sm font-semibold rounded-full border-2 text-blue-700 border-blue-300 hover:bg-blue-50 hover:border-blue-400 transition-all duration-200">Today</button>
                <button onClick={onClearDate} className="px-4 py-2 text-sm font-semibold rounded-full border-2 text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">Clear Date</button>
                <div className="w-px h-6 bg-slate-300"></div>
                {cats.map((cat) => (
                    <button key={cat} onClick={() => onCategory(cat)} className={`px-4 py-2 text-sm font-semibold rounded-full border-2 transition-all duration-200 ${currentCategory === cat ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-md' : 'text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}>{cat}</button>
                ))}
            </div>
        </div>
    );
};

const DeleteConfirmModal = ({ onCancel, onConfirm }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" aria-hidden="true" onClick={onCancel}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-5 border border-gray-200">
                <h4 className="text-lg font-semibold text-gray-900">Delete event?</h4>
                <p className="text-sm text-gray-600 mt-1">This action cannot be undone.</p>
                <div className="mt-5 flex justify-end gap-3">
                    <button onClick={onCancel} className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</button>
                    <button onClick={onConfirm} className="px-4 py-2 rounded border border-red-200 text-red-700 hover:bg-red-50">Delete</button>
                </div>
            </div>
        </div>
    );
};

const Toolbar = ({ selectedCount, onClearSelection, onPublish, onUnpublish, onDelete, rowDensity, onChangeDensity, columnsVisible, onToggleColumn, onExportCSV }) => {
    return (
        <div className="flex items-center justify-between mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-4">
                <span className="text-base font-semibold text-slate-700">Selected: <span className="font-bold text-indigo-600">{selectedCount}</span></span>
                <button onClick={onClearSelection} disabled={!selectedCount} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${selectedCount ? 'text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400' : 'text-slate-400 border-slate-200 cursor-not-allowed'}`}>Clear</button>
                <div className="w-px h-6 bg-slate-300"></div>
                <button onClick={onPublish} disabled={!selectedCount} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${selectedCount ? 'text-green-700 border-green-300 hover:bg-green-50 hover:border-green-400' : 'text-slate-400 border-slate-200 cursor-not-allowed'}`}>Publish</button>
                <button onClick={onUnpublish} disabled={!selectedCount} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${selectedCount ? 'text-amber-700 border-amber-300 hover:bg-amber-50 hover:border-amber-400' : 'text-slate-400 border-slate-200 cursor-not-allowed'}`}>Unpublish</button>
                <button onClick={onDelete} disabled={!selectedCount} className={`px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all duration-200 ${selectedCount ? 'text-red-700 border-red-300 hover:bg-red-50 hover:border-red-400' : 'text-slate-400 border-slate-200 cursor-not-allowed'}`}>Delete</button>
                <div className="w-px h-6 bg-slate-300"></div>
                <button onClick={onExportCSV} className="px-4 py-2 text-sm font-semibold rounded-lg border-2 text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">Export CSV</button>
            </div>
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">Density</span>
                    <select value={rowDensity} onChange={(e) => onChangeDensity(e.target.value)} className="border-slate-300 text-base rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        <option value="comfortable">Comfortable</option>
                        <option value="compact">Compact</option>
                    </select>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">Columns</span>
                    <div className="relative group">
                        <button className="px-4 py-2 text-sm font-semibold rounded-lg border-2 text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200">Show/Hide</button>
                        <div className="absolute right-0 mt-2 hidden group-hover:block bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-20 w-48">
                            {Object.keys(columnsVisible).map((key) => (
                                <label key={key} className="flex items-center gap-3 py-2 text-base text-slate-700">
                                    <input type="checkbox" checked={columnsVisible[key]} onChange={() => onToggleColumn(key)} className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                                    <span className="capitalize font-medium">{key.replace('_', ' ')}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Pagination = ({ page, totalPages, totalItems, pageSize, onPageSizeChange, onPrev, onNext }) => {
    return (
        <div className="flex items-center justify-between mt-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div className="flex items-center gap-6">
                <div className="text-base font-semibold text-slate-700">Total: <span className="font-bold text-indigo-600">{totalItems}</span></div>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">Rows per page</span>
                    <select value={pageSize} onChange={(e) => onPageSizeChange(e.target.value)} className="border-slate-300 text-base rounded-lg py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                        {[10, 20, 50].map((n) => (
                            <option key={n} value={n}>{n}</option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <button onClick={onPrev} disabled={page <= 1} className={`px-6 py-3 text-base font-semibold rounded-lg border-2 transition-all duration-200 ${page <= 1 ? 'text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}>Previous</button>
                <span className="text-base text-slate-700 font-semibold">Page <span className="font-bold text-indigo-600">{page}</span> of <span className="font-bold text-indigo-600">{totalPages}</span></span>
                <button onClick={onNext} disabled={page >= totalPages} className={`px-6 py-3 text-base font-semibold rounded-lg border-2 transition-all duration-200 ${page >= totalPages ? 'text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400'}`}>Next</button>
            </div>
        </div>
    );
};

const EventForm = ({ venues, judges, volunteers, availableEvents, data, onChange, onJudgesChange, onVolunteersChange, onCancel, onSubmit, saving, isEditing }) => {
    const showFormFields = !!data.category;

    return (
        <div className="max-w-5xl mx-auto">
            <div className="mb-10">
                <h3 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3 tracking-tight">{isEditing ? 'Edit Event' : 'Create New Event'}</h3>
                <p className="text-lg text-slate-600 font-medium">Follow the steps below. Fields appear after choosing a category.</p>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-8 border border-blue-200 shadow-lg">
                    <div className="flex items-center mb-6">
                        <span className="text-4xl mr-4">🎯</span>
                        <h4 className="text-2xl font-bold text-slate-900 font-display">Step 1: Choose Event Category</h4>
                    </div>
                    <p className="text-lg text-slate-600 mb-8 font-medium">Select a category to proceed</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {CATEGORY_OPTIONS.map((category) => (
                            <button
                                key={category.value}
                                type="button"
                                onClick={() => onChange({ target: { name: 'category', value: category.value } })}
                                className={`p-6 rounded-xl border-2 transition-all duration-200 text-left hover:shadow-lg ${
                                    data.category === category.value
                                        ? 'border-indigo-400 bg-indigo-100 shadow-lg scale-105'
                                        : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center mb-3">
                                    <span className="text-3xl mr-4">{category.icon}</span>
                                    <span className="text-lg font-bold text-slate-900">{category.label}</span>
                                </div>
                                <div className="text-base text-slate-600 font-semibold">{(availableEvents[category.value] || []).length} events available</div>
                            </button>
                        ))}
                    </div>
                </div>

                {showFormFields && (
                    <div className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 rounded-2xl p-8 border border-green-200 shadow-lg">
                        <div className="flex items-center mb-6">
                            <span className="text-4xl mr-4">📝</span>
                            <h4 className="text-2xl font-bold text-slate-900 font-display">Step 2: Event Details</h4>
                        </div>
                        <p className="text-lg text-slate-600 mb-8 font-medium">Select event name and add description</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="md:col-span-2">
                                <label className="block text-xl font-semibold text-slate-700 mb-3 font-display">Event Name</label>
                                <select name="name" value={data.name} onChange={onChange} className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-4 px-4 focus:ring-2 focus:ring-green-500 focus:border-green-500" required>
                                    <option value="">Select an event name</option>
                                    {(availableEvents[data.category] || []).map((eventName) => (
                                        <option key={eventName} value={eventName}>{eventName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xl font-semibold text-slate-700 mb-3 font-display">Description</label>
                                <textarea name="description" value={data.description} onChange={onChange} className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-4 px-4 focus:ring-2 focus:ring-green-500 focus:border-green-500" rows={4} placeholder="Add a brief description..." />
                            </div>
                        </div>
                    </div>
                )}

                {showFormFields && (
                    <div className="bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-50 rounded-2xl p-8 border border-purple-200 shadow-lg">
                        <div className="flex items-center mb-6">
                            <span className="text-4xl mr-4">📅</span>
                            <h4 className="text-2xl font-bold text-slate-900 font-display">Step 3: Schedule & Venue</h4>
                        </div>
                        <p className="text-lg text-slate-600 mb-8 font-medium">Set the date, time, and location</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            <div>
                                <label className="block text-xl font-semibold text-slate-700 mb-3 font-display">Date</label>
                                <input type="date" name="date" value={data.date} onChange={onChange} className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-4 px-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-xl font-semibold text-slate-700 mb-3 font-display">Start Time</label>
                                <input type="time" name="start_time" value={data.start_time} onChange={onChange} className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-4 px-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-xl font-semibold text-slate-700 mb-3 font-display">End Time</label>
                                <input type="time" name="end_time" value={data.end_time} onChange={onChange} className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-4 px-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" required />
                            </div>
                            <div>
                                <label className="block text-xl font-semibold text-slate-700 mb-3 font-display">Venue</label>
                                <select name="venue" value={data.venue} onChange={onChange} className="mt-1 block w-full border-slate-300 rounded-lg shadow-sm text-base py-4 px-4 focus:ring-2 focus:ring-purple-500 focus:border-purple-500" required>
                                    <option value="">Select a venue</option>
                                    {venues.map((v) => (
                                        <option key={v.id} value={v.id}>{v.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                )}

                {showFormFields && (
                    <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-2xl p-8 border border-slate-200 shadow-xl">
                        <div className="flex items-center mb-8">
                            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full p-3 mr-4 shadow-lg">
                                <span className="text-2xl text-white">👥</span>
                            </div>
                            <div>
                                <h4 className="text-2xl font-bold text-slate-900 font-display">Step 4: Participants & Judges</h4>
                                <p className="text-slate-600 font-medium">Configure event capacity and assign team members</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Max Participants Card */}
                            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <div className="flex items-center mb-6">
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl p-3 mr-4 shadow-lg">
                                        <span className="text-2xl text-white">👨‍🎓</span>
                                    </div>
                                    <div>
                                        <h5 className="text-xl font-bold text-slate-800 font-display">Participant Limit</h5>
                                        <p className="text-sm text-slate-500 font-medium mt-1">Set maximum capacity</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={1}
                                            name="max_participants"
                                            value={data.max_participants}
                                            onChange={onChange}
                                            className="w-full border-slate-300 rounded-xl shadow-sm text-lg py-4 px-5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-medium bg-slate-50 focus:bg-white transition-all duration-200"
                                            placeholder="Enter maximum participants"
                                            required
                                        />
                                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                                            <span className="text-sm font-medium">max</span>
                                        </div>
                                    </div>
                                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                                        <p className="text-sm text-emerald-700 font-medium">💡 Recommended: 50-200 participants per event</p>
                                    </div>
                                </div>
                            </div>

                            {/* Judges Card */}
                            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <div className="flex items-center mb-6">
                                    <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl p-3 mr-4 shadow-lg">
                                        <span className="text-2xl text-white">⚖️</span>
                                    </div>
                                    <div>
                                        <h5 className="text-xl font-bold text-slate-800 font-display">Event Judges</h5>
                                        <p className="text-sm text-slate-500 font-medium mt-1">Assign evaluation team</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <select
                                            multiple
                                            value={data.judges}
                                            onChange={onJudgesChange}
                                            className="w-full border-slate-300 rounded-xl shadow-sm text-base py-4 px-5 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 h-36 bg-slate-50 focus:bg-white transition-all duration-200"
                                        >
                                            {judges.map((u) => (
                                                <option key={u.id} value={u.id} className="py-2 px-1">
                                                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username || u.email || `User#${u.id}`}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-4 text-slate-400">
                                            <span className="text-xs font-medium bg-white px-2 py-1 rounded shadow-sm">Multiple</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-purple-50 rounded-lg p-3 border border-purple-200">
                                        <div className="flex items-center">
                                            <span className="text-lg mr-2">👨‍⚖️</span>
                                            <span className="text-sm text-purple-700 font-semibold">{data.judges.length} selected</span>
                                        </div>
                                        <span className="text-xs text-purple-600 font-medium">Ctrl+Click</span>
                                    </div>
                                </div>
                            </div>

                            {/* Volunteers Card */}
                            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                                <div className="flex items-center mb-6">
                                    <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl p-3 mr-4 shadow-lg">
                                        <span className="text-2xl text-white">🤝</span>
                                    </div>
                                    <div>
                                        <h5 className="text-xl font-bold text-slate-800 font-display">Support Volunteers</h5>
                                        <p className="text-sm text-slate-500 font-medium mt-1">On-ground coordination</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="relative">
                                        <select
                                            multiple
                                            value={data.volunteers || []}
                                            onChange={onVolunteersChange}
                                            className="w-full border-slate-300 rounded-xl shadow-sm text-base py-4 px-5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 h-36 bg-slate-50 focus:bg-white transition-all duration-200"
                                        >
                                            {volunteers.map((u) => (
                                                <option key={u.id} value={u.id} className="py-2 px-1">
                                                    {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username || u.email || `User#${u.id}`}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-4 text-slate-400">
                                            <span className="text-xs font-medium bg-white px-2 py-1 rounded shadow-sm">Multiple</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between bg-amber-50 rounded-lg p-3 border border-amber-200">
                                        <div className="flex items-center">
                                            <span className="text-lg mr-2">👷</span>
                                            <span className="text-sm text-amber-700 font-semibold">{(data.volunteers || []).length} selected</span>
                                        </div>
                                        <span className="text-xs text-amber-600 font-medium">Helpers</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Enhanced Summary Section */}
                        <div className="mt-10 bg-gradient-to-r from-white via-slate-50 to-white rounded-2xl p-8 border border-slate-200 shadow-xl">
                            <div className="text-center mb-8">
                                <h6 className="text-2xl font-bold text-slate-800 mb-2 flex items-center justify-center font-display">
                                    <span className="text-3xl mr-3">📊</span>
                                    Event Configuration Summary
                                </h6>
                                <p className="text-slate-600 font-medium">Review your event setup before proceeding</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200 text-center shadow-md">
                                    <div className="text-4xl font-bold text-emerald-600 mb-2">{data.max_participants}</div>
                                    <div className="text-sm text-emerald-700 font-semibold uppercase tracking-wide">Max Participants</div>
                                    <div className="mt-2 text-xs text-emerald-600">Event Capacity</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200 text-center shadow-md">
                                    <div className="text-4xl font-bold text-purple-600 mb-2">{data.judges.length}</div>
                                    <div className="text-sm text-purple-700 font-semibold uppercase tracking-wide">Assigned Judges</div>
                                    <div className="mt-2 text-xs text-purple-600">Evaluation Team</div>
                                </div>
                                <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200 text-center shadow-md">
                                    <div className="text-4xl font-bold text-amber-600 mb-2">{(data.volunteers || []).length}</div>
                                    <div className="text-sm text-amber-700 font-semibold uppercase tracking-wide">Support Volunteers</div>
                                    <div className="mt-2 text-xs text-amber-600">Coordination Team</div>
                                </div>
                            </div>
                            <div className="mt-8 text-center">
                                <div className="inline-flex items-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-full shadow-lg">
                                    <span className="text-lg mr-2">✨</span>
                                    <span className="font-semibold">Ready to publish your event!</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showFormFields && (
                    <div className="bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 rounded-2xl p-8 border border-teal-200 shadow-lg">
                        <div className="flex items-center mb-6">
                            <span className="text-4xl mr-4">🚀</span>
                            <h4 className="text-2xl font-bold text-slate-900 font-display">Step 5: Publishing</h4>
                        </div>
                        <p className="text-lg text-slate-600 mb-8 font-medium">Control event visibility</p>
                        <div className="flex items-center p-6 bg-white rounded-xl border-2 border-slate-200 shadow-sm">
                            <input type="checkbox" name="is_published" checked={!!data.is_published} onChange={(e) => onChange({ target: { name: 'is_published', value: e.target.checked, type: 'checkbox' } })} className="w-6 h-6 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500" />
                            <div className="ml-4">
                                <label className="text-lg font-bold text-slate-700">Publish to student dashboard</label>
                                <p className="text-base text-slate-500 mt-1">Make this event visible for student registration</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-end space-x-6 pt-8 border-t border-slate-200">
                    <button type="button" onClick={onCancel} className="px-8 py-4 border-2 border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200 text-lg font-semibold">Cancel</button>
                    <button type="submit" disabled={saving || !showFormFields} className={`px-8 py-4 rounded-xl text-white text-lg font-semibold transition-all duration-200 ${saving || !showFormFields ? 'bg-slate-300 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'}`}>
                        {saving ? 'Saving...' : isEditing ? 'Update Event' : 'Create Event'}
                    </button>
                </div>
            </form>
        </div>
    );
};

const StatCard = ({ label, value }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md hover:shadow-lg transition-shadow duration-200">
        <div className="text-base font-medium text-slate-600 mb-2">{label}</div>
        <div className="text-3xl md:text-4xl font-bold text-slate-900">{value}</div>
    </div>
);

export default EventManagement;