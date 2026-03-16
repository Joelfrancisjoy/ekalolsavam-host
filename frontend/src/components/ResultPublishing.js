import React, { useEffect, useMemo, useState } from 'react';
import resultService from '../services/resultService';
import eventService from '../services/eventService';

// Note: Backend exposes only read/list for published results.
// This UI allows admins to view results per event, and export.
// If later you add publish/unpublish endpoints, buttons can be wired easily.http://localhost:3000/admin/events

const ResultPublishing = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [events, setEvents] = useState([]);
    const [results, setResults] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('');

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        try {
            setLoading(true);
            const [ev, res] = await Promise.all([
                eventService.listEvents(),
                resultService.list(),
            ]);
            setEvents(ev);
            setResults(res);
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const loadForEvent = async (eventId) => {
        try {
            setLoading(true);
            const res = await resultService.list(eventId ? { event: eventId } : {});
            setResults(res);
        } catch (err) {
            console.error(err);
            setError('Failed to load results');
        } finally {
            setLoading(false);
        }
    };

    const handleEventChange = async (e) => {
        const val = e.target.value;
        setSelectedEvent(val);
        await loadForEvent(val);
    };

    const exportCSV = () => {
        const rows = [
            ['Event', 'Participant', 'Total Score', 'Rank', 'Published', 'Published At'],
            ...results.map((r) => [
                eventName(r.event),
                r.participant_details?.username || r.participant_details?.email || r.participant,
                r.total_score,
                r.rank,
                r.published ? 'Yes' : 'No',
                r.published_at || '',
            ]),
        ];
        const csv = rows.map((row) => row.map(escapeCSV).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `results${selectedEvent ? `-event-${selectedEvent}` : ''}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const escapeCSV = (value) => {
        const v = value == null ? '' : String(value);
        if (/[",\n]/.test(v)) {
            return '"' + v.replace(/"/g, '""') + '"';
        }
        return v;
    };

    const eventName = (id) => events.find((e) => e.id === id)?.name || `Event #${id}`;

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6">
            <div className="bg-white rounded-lg shadow-lg">
                <div className="border-b border-gray-200 p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Result Publishing</h2>
                            <p className="mt-1 text-gray-600">View and export published results</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => loadForEvent(selectedEvent)} className="px-3 py-2 rounded-md border">Refresh</button>
                            <button onClick={exportCSV} className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700">Export CSV</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Event</label>
                            <select value={selectedEvent} onChange={handleEventChange} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                <option value="">All Events</option>
                                {events.map((ev) => (
                                    <option key={ev.id} value={ev.id}>{ev.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">{error}</div>
                )}

                <div className="p-6">
                    {results.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-gray-500 text-lg">No published results found</div>
                            <p className="text-gray-400 mt-2">Choose a different event or refresh</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Score</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rank</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Published At</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {results.map((r) => (
                                        <tr key={`${r.event}-${r.participant}`} className="hover:bg-gray-50">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{eventName(r.event)}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.participant_details?.username || r.participant_details?.email || r.participant}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.total_score}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.rank}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{r.published_at || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResultPublishing;