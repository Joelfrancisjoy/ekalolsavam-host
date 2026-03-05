import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import http from '../services/http-common';
import volunteerService from '../services/volunteerService';
import eventService from '../services/eventService';
import { userService } from '../services/userService';

const cx = (...c) => c.filter(Boolean).join(' ');

const VolunteerCoordination = () => {
    const navigate = useNavigate();
    const [shifts, setShifts] = useState([]);
    const [events, setEvents] = useState([]);
    const [volunteers, setVolunteers] = useState([]);
    const [signupRequests, setSignupRequests] = useState([]);
    const [recheckRequests, setRecheckRequests] = useState([]); // Add recheck requests state
    const [currentUser, setCurrentUser] = useState(null); // Track current user

    const [activeTab, setActiveTab] = useState('shifts');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [requestsLoading, setRequestsLoading] = useState(false);
    const [recheckRequestsLoading, setRecheckRequestsLoading] = useState(false); // Add recheck requests loading state

    const [form, setForm] = useState({
        event: '',
        date: '',
        start_time: '',
        end_time: '',
        description: '',
        required_volunteers: 1,
    });

    const [query, setQuery] = useState('');

    const filteredShifts = useMemo(() => {
        const q = query.trim().toLowerCase();
        return shifts.filter(s => {
            const desc = `${s.description || ''} ${s.event_details?.name || ''}`.toLowerCase();
            return !q || desc.includes(q);
        });
    }, [shifts, query]);

    useEffect(() => {
        const load = async () => {
            setLoading(true); setError('');
            try {
                const [shRes, ev] = await Promise.all([
                    volunteerService.listShifts(),
                    eventService.listEvents(),
                ]);
                const shData = shRes?.data;
                setShifts(Array.isArray(shData) ? shData : (shData?.results || []));
                setEvents(Array.isArray(ev) ? ev : (ev?.results || []));
                try {
                    const users = await userService.list({ role: 'volunteer' });
                    setVolunteers(Array.isArray(users) ? users : users.results || []);
                } catch (_) { /* optional */ }
            } catch (e) {
                setError('Failed to load volunteer data.');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Load signup requests
    useEffect(() => {
        const loadSignupRequests = async () => {
            setRequestsLoading(true);
            try {
                const response = await http.get('/api/auth/admin/signup-requests/', {
                    params: { status: 'all' }
                });
                const data = response.data;
                setSignupRequests(Array.isArray(data) ? data : (data?.results || []));
            } catch (error) {
                console.error('Failed to load signup requests:', error);
                if (error.response?.status === 401) {
                    setError('Authentication failed. Please log in again.');
                } else if (error.response?.status === 403) {
                    setError('Permission denied. Admin access required.');
                }
            } finally {
                setRequestsLoading(false);
            }
        };

        loadSignupRequests();
    }, []);

    // Load current user info
    useEffect(() => {
        const loadCurrentUser = async () => {
            try {
                const response = await http.get('/api/auth/current/');
                setCurrentUser(response.data);
            } catch (error) {
                console.error('Failed to load current user:', error);
                setError('Failed to load user information. Please log in again.');
            }
        };

        loadCurrentUser();
    }, []);

    // Load recheck requests only for volunteers (backend restriction)
    useEffect(() => {
        if (!currentUser || currentUser.role !== 'volunteer') {
            // Don't load recheck requests if user is not a volunteer (backend restriction)
            return;
        }

        const loadRecheckRequests = async () => {
            setRecheckRequestsLoading(true);
            try {
                const response = await volunteerService.getRecheckRequests();
                const data = response?.data;
                const updatedData = data;
                setRecheckRequests(Array.isArray(updatedData) ? updatedData : (updatedData?.results || []));
            } catch (error) {
                console.error('Failed to load recheck requests:', error);
                if (error?.response?.status === 401) {
                    setError('Authentication failed. Please log in again.');
                } else if (error?.response?.status === 403) {
                    setError('Permission denied. Volunteer access required.');
                } else {
                    setError('Failed to load recheck requests: ' + (error?.message || 'Unknown error'));
                }
            } finally {
                setRecheckRequestsLoading(false);
            }
        };

        loadRecheckRequests();
    }, [currentUser]);

    const onCreateShift = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const createdRes = await volunteerService.createShift(form);
            const created = createdRes?.data;
            if (created) setShifts(prev => [created, ...prev]);
            setForm({ event: '', date: '', start_time: '', end_time: '', description: '', required_volunteers: 1 });
        } catch (e) {
            const apiError = e?.response?.data;
            if (apiError) {
                if (typeof apiError === 'string') {
                    setError(apiError);
                } else {
                    const message = Object.entries(apiError)
                        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : String(value)}`)
                        .join(' | ');
                    setError(message || 'Failed to create shift.');
                }
            } else {
                setError('Failed to create shift.');
            }
        }
    };

    const assignVolunteer = async (shiftId, volunteerId) => {
        try {
            await volunteerService.createAssignment({ shift: shiftId, volunteer: volunteerId });
            const updatedRes = await volunteerService.listShifts();
            const updatedData = updatedRes?.data;
            setShifts(Array.isArray(updatedData) ? updatedData : (updatedData?.results || []));
        } catch (e) {
            setError('Failed to assign volunteer.');
        }
    };

    // Function to accept recheck request
    const handleAcceptRecheckRequest = async (recheckRequestId) => {
        try {
            console.log('Attempting to accept recheck request:', recheckRequestId);
            const response = await volunteerService.acceptRecheckRequest(recheckRequestId);
            console.log('Accept response:', response);
            // Refresh the recheck requests to get updated data from the backend
            const updatedResponse = await volunteerService.getRecheckRequests();
            console.log('Updated requests:', updatedResponse.data);
            const updatedData = updatedResponse?.data;
            setRecheckRequests(Array.isArray(updatedData) ? updatedData : (updatedData?.results || []));
            // Show success message
            setError('Recheck request accepted successfully.');
        } catch (error) {
            console.error('Failed to accept recheck request:', error);
            console.error('Error details:', error?.response || error?.message || error);
            setError('Failed to accept recheck request: ' + (error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Unknown error'));
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Volunteer Coordination</h1>
                    <p className="text-gray-600 mt-1">Manage shifts, assignments, signup requests, and recheck requests</p>
                </div>

                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => setActiveTab('shifts')}
                        className={cx('px-4 py-2 rounded-xl text-sm font-semibold transition-colors', activeTab === 'shifts' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-gray-700 border border-gray-200 hover:bg-gray-50')}
                    >
                        Shifts
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('signup')}
                        className={cx('px-4 py-2 rounded-xl text-sm font-semibold transition-colors', activeTab === 'signup' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-gray-700 border border-gray-200 hover:bg-gray-50')}
                    >
                        Signup Requests
                    </button>
                    <button
                        type="button"
                        onClick={() => setActiveTab('recheck')}
                        className={cx('px-4 py-2 rounded-xl text-sm font-semibold transition-colors', activeTab === 'recheck' ? 'bg-indigo-600 text-white' : 'bg-white/80 text-gray-700 border border-gray-200 hover:bg-gray-50')}
                    >
                        Recheck Requests
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Shifts</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{shifts.length}</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Volunteers</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{volunteers.length}</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Signup Requests</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{signupRequests.length}</div>
                </div>
                <div className="bg-white/80 backdrop-blur rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="text-xs font-semibold text-gray-500 uppercase">Recheck Pending</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{recheckRequests.filter(r => r.status === 'Pending').length}</div>
                </div>
            </div>

            {error && <div className="p-4 rounded-2xl shadow-sm bg-red-50 text-red-800 border border-red-200">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        <svg className="w-5 h-5 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10A8 8 0 112 10a8 8 0 0116 0zM9 8a1 1 0 102 0 1 1 0 00-2 0zm.25 3.75a.75.75 0 000 1.5h.5v2.25a.75.75 0 001.5 0V12.5a.75.75 0 00-.75-.75h-1.25z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <div className="ml-3">
                        <p className="font-medium">{error}</p>
                    </div>
                </div>
            </div>}

            {activeTab === 'shifts' && (
                <>
                    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6">
                        <div className="mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Create New Shift</h3>
                            <p className="text-sm text-gray-600 mt-1">Define volunteer shifts for events with specific requirements</p>
                        </div>

                        <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={onCreateShift}>
                            <div>
                                <label className="block text-lg font-bold text-gray-700 mb-3">Select Event *</label>
                                <select
                                    required
                                    className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg"
                                    value={form.event}
                                    onChange={e => {
                                        const v = e.target.value;
                                        setForm({ ...form, event: v ? Number(v) : '' });
                                    }}
                                >
                                    <option key="choose-event-placeholder" value="">Choose an event</option>
                                    {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}</select>
                            </div>

                            <div>
                                <label className="block text-lg font-bold text-gray-700 mb-3">Date *</label>
                                <input type="date" required className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-lg font-bold text-gray-700 mb-3">Start Time *</label>
                                <input type="time" required className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg" value={form.start_time} onChange={e => setForm({ ...form, start_time: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-lg font-bold text-gray-700 mb-3">End Time *</label>
                                <input type="time" required className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg" value={form.end_time} onChange={e => setForm({ ...form, end_time: e.target.value })} />
                            </div>

                            <div>
                                <label className="block text-lg font-bold text-gray-700 mb-3">Required Volunteers</label>
                                <input type="number" min="1" className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg" value={form.required_volunteers} onChange={e => setForm({ ...form, required_volunteers: Number(e.target.value) })} placeholder="Enter number of volunteers needed" />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-lg font-bold text-gray-700 mb-3">Description *</label>
                                <input required className="w-full px-5 py-3 border-2 border-gray-300 rounded-xl focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all text-lg" placeholder="Enter shift description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                            </div>

                            <div className="md:col-span-2 flex justify-end pt-4">
                                <button className="px-8 py-4 border-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 text-white hover:from-amber-700 hover:to-amber-800 font-bold text-xl transition-all">Create Shift</button>
                            </div>
                        </form>
                    </div>

                    <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Shifts</h3>
                                <p className="text-sm text-gray-600 mt-1">Assign volunteers to shifts and manage coverage</p>
                            </div>
                            <input className="w-full md:w-72 px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white" placeholder="Search shifts..." value={query} onChange={e => setQuery(e.target.value)} />
                        </div>

                        <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Event</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Date</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Time</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Req.</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Description</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Assigned</Th>
                                        <Th className="text-right text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Assign</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr key="loading-row"><td colSpan={7} className="p-8 text-center text-sm text-gray-500">Loading...</td></tr>
                                    ) : filteredShifts.length === 0 ? (
                                        <tr key="no-shifts-row"><td colSpan={7} className="p-8 text-center text-sm text-gray-500">No shifts</td></tr>
                                    ) : (
                                        filteredShifts.map(shift => (
                                            <tr key={shift.id} className="border-t border-gray-200 hover:bg-gray-50">
                                                <Td className="px-6 py-4 text-lg text-gray-800">{shift.event_details?.name || '-'}</Td>
                                                <Td className="px-6 py-4 text-lg text-gray-800">{shift.date}</Td>
                                                <Td className="px-6 py-4 text-lg text-gray-800">{shift.start_time} - {shift.end_time}</Td>
                                                <Td className="px-6 py-4 text-lg text-gray-800">{shift.required_volunteers}</Td>
                                                <Td className="px-6 py-4 text-lg text-gray-800">{shift.description}</Td>
                                                <Td className="px-6 py-4 text-lg text-gray-800">
                                                    <div className="flex flex-wrap gap-2">
                                                        {(shift.volunteers_assigned || []).map(v => (
                                                            <span key={v.id} className="px-3 py-1 text-sm rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">{v.username}</span>
                                                        ))}
                                                    </div>
                                                </Td>
                                                <Td className="px-6 py-4 text-right">
                                                    <select className="px-4 py-3 border-2 border-gray-300 rounded-xl text-lg mr-3" defaultValue="" onChange={(e) => { const id = e.target.value; if (!id) return; assignVolunteer(shift.id, id); e.target.value = ''; }}>
                                                        <option key="select-placeholder" value="">Select volunteer</option>
                                                        {volunteers.map(v => <option key={v.id} value={v.id}>{v.username}</option>)}
                                                    </select>
                                                </Td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'signup' && (
                <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-900">Signup Requests</h3>
                            <p className="text-sm text-gray-600 mt-1">Review allowed email / ID-based signup attempts</p>
                        </div>
                        <div className="px-4 py-2 rounded-xl bg-blue-50 text-blue-800 border border-blue-100 font-semibold text-sm">Total: {signupRequests.length}</div>
                    </div>

                    {requestsLoading ? (
                        <div className="p-8 text-center text-sm text-gray-500">Loading requests...</div>
                    ) : signupRequests.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">No signup requests found</div>
                    ) : (
                        <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
                            <table className="min-w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">User</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Email</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">ID Used</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Status</Th>
                                        <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Date</Th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {signupRequests.map((request) => (
                                        <tr key={request.id} className="border-t border-gray-200 hover:bg-gray-50">
                                            <Td className="px-6 py-4 text-lg text-gray-800">
                                                {request.user_details?.first_name} {request.user_details?.last_name}<br />
                                                <span className="text-base text-gray-600">@{request.user_details?.username}</span>
                                            </Td>
                                            <Td className="px-6 py-4 text-lg text-gray-800">{request.user_details?.email}</Td>
                                            <Td className="px-6 py-4 text-lg text-gray-800">
                                                <code className="font-mono text-lg bg-gray-200 px-4 py-2 rounded-xl">
                                                    {request.issued_id_code}
                                                </code>
                                            </Td>
                                            <Td className="px-6 py-4 text-lg">
                                                <span className={`px-4 py-2 text-lg rounded-full font-bold ${request.status === 'approved'
                                                    ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                                                    : request.status === 'rejected'
                                                        ? 'bg-gradient-to-r from-red-100 to-red-200 text-red-800'
                                                        : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                                                    }`}>
                                                    {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                                                </span>
                                            </Td>
                                            <Td className="px-6 py-4 text-lg text-gray-800">{new Date(request.created_at).toLocaleDateString()}</Td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'recheck' && (
                <>
                    {!currentUser ? (
                        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-8 text-center text-sm text-gray-600">Loading user details...</div>
                    ) : currentUser.role !== 'volunteer' ? (
                        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-8 text-center text-sm text-gray-600">Recheck requests are available only for volunteer accounts.</div>
                    ) : (
                        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-lg border border-gray-100 p-6">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Recheck Requests</h3>
                                    <p className="text-sm text-gray-600 mt-1">Review and accept recheck requests</p>
                                </div>
                                <div className="px-4 py-2 rounded-xl bg-purple-50 text-purple-800 border border-purple-100 font-semibold text-sm">Pending: {recheckRequests.filter(r => r.status === 'Pending').length}</div>
                            </div>

                            {recheckRequestsLoading ? (
                                <div className="p-8 text-center text-sm text-gray-500">Loading recheck requests...</div>
                            ) : recheckRequests.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-500">No recheck requests found</div>
                            ) : (
                                <div className="overflow-auto rounded-xl border border-gray-200 bg-white">
                                    <table className="min-w-full">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Event</Th>
                                                <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Participant</Th>
                                                <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Category</Th>
                                                <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Score</Th>
                                                <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Status</Th>
                                                <Th className="text-left text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Date</Th>
                                                <Th className="text-right text-lg font-bold text-gray-800 uppercase tracking-wider px-6 py-4">Actions</Th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {recheckRequests.map((request) => (
                                                <tr key={request.recheck_request_id} className="border-t border-gray-200 hover:bg-gray-50">
                                                    <Td className="px-6 py-4 text-lg text-gray-800">{request.event_name}</Td>
                                                    <Td className="px-6 py-4 text-lg text-gray-800">
                                                        {request.participant_name}<br />
                                                        <span className="text-base text-gray-600">ID: {request.participant_username}</span>
                                                    </Td>
                                                    <Td className="px-6 py-4 text-lg text-gray-800">{request.event_category}</Td>
                                                    <Td className="px-6 py-4 text-lg text-gray-800 font-bold">{request.final_score}</Td>
                                                    <Td className="px-6 py-4 text-lg">
                                                        <span className={`px-4 py-2 text-lg rounded-full font-bold ${request.status === 'Accepted'
                                                            ? 'bg-gradient-to-r from-green-100 to-green-200 text-green-800'
                                                            : 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800'
                                                            }`}>
                                                            {request.status}
                                                        </span>
                                                    </Td>
                                                    <Td className="px-6 py-4 text-lg text-gray-800">{new Date(request.submitted_at).toLocaleDateString()}</Td>
                                                    <Td className="px-6 py-4 text-right">
                                                        {request.status === 'Pending' && (
                                                            <button
                                                                className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white text-lg font-bold rounded-xl hover:from-green-700 hover:to-green-800 mr-4"
                                                                onClick={() => handleAcceptRecheckRequest(request.recheck_request_id)}
                                                            >
                                                                Accept
                                                            </button>
                                                        )}
                                                        <button
                                                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white text-lg font-bold rounded-xl hover:from-blue-700 hover:to-blue-800"
                                                            onClick={() => {
                                                                navigate(`/recheck-request/${request.recheck_request_id}`);
                                                            }}
                                                        >
                                                            View Details
                                                        </button>
                                                    </Td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

const Th = React.memo(({ children, className, ...props }) => (
    <th {...props} className={cx('text-left text-xs font-semibold text-gray-600 uppercase tracking-wider px-4 py-3', className)}>{children}</th>
));
const Td = React.memo(({ children, alignRight, ...props }) => (
    <td {...props} className={cx('px-4 py-3 text-sm text-gray-800', alignRight && 'text-right')}>{children}</td>
));

export default VolunteerCoordination;