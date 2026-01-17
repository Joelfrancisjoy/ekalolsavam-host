import React, { useEffect, useState } from 'react';
import certificateService from '../services/certificateService';
import eventService from '../services/eventService';
import userService from '../services/userService';
import CertificatePreview from './CertificatePreview';

const CertificateGeneration = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [events, setEvents] = useState([]);
    const [participants, setParticipants] = useState([]);
    const [certificates, setCertificates] = useState([]);

    const [selectedEvent, setSelectedEvent] = useState('');
    const [selectedParticipant, setSelectedParticipant] = useState('');
    const [schoolName, setSchoolName] = useState('');
    const [districtName, setDistrictName] = useState('');
    const [category, setCategory] = useState('HSS');
    const [certificateType, setCertificateType] = useState('participation');
    const [prize, setPrize] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => {
        init();
    }, []);

    const init = async () => {
        try {
            setLoading(true);
            const [ev, certs] = await Promise.all([
                eventService.listEvents(),
                certificateService.list(),
            ]);
            setEvents(ev);
            setCertificates(certs);

            // Load participants list (users). If role filter exists, try role=student
            try {
                const users = await userService.list({ role: 'student' });
                setParticipants(users);
            } catch (_) {
                try { const usersAll = await userService.list(); setParticipants(usersAll); } catch (e2) { }
            }
            setError('');
        } catch (err) {
            console.error(err);
            setError('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const refreshCertificates = async () => {
        try {
            const certs = await certificateService.list();
            setCertificates(certs);
        } catch (_) { }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        if (!selectedEvent || !selectedParticipant || !schoolName || !districtName || !category || !certificateType) {
            setError('Please fill all required fields');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            await certificateService.generate({
                participant: Number(selectedParticipant),
                event: Number(selectedEvent),
                school_name: schoolName,
                district_name: districtName,
                category: category,
                certificate_type: certificateType,
                prize: prize
            });
            setSuccess('Certificate generated successfully');
            await refreshCertificates();
            // Reset form
            setSchoolName('');
            setDistrictName('');
            setCategory('HSS');
            setCertificateType('participation');
            setPrize('');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            console.error(err);
            const apiMsg = err.response?.data;
            setError(typeof apiMsg === 'string' ? apiMsg : 'Failed to generate certificate');
        } finally {
            setSaving(false);
        }
    };

    const downloadPdf = (id) => {
        const url = certificateService.downloadPdfUrl(id);
        window.open(url, '_blank');
    };

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
                            <h2 className="text-2xl font-bold text-gray-900">Certificate Generation</h2>
                            <p className="mt-1 text-gray-600">Generate and download certificates</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={init} className="px-3 py-2 rounded-md border">Refresh</button>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">{error}</div>
                )}
                {success && (
                    <div className="mx-6 mt-4 p-4 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">{success}</div>
                )}

                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-3 bg-gray-50 p-4 rounded-lg">
                        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Event *</label>
                                <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Select event</option>
                                    {events.map((ev) => (
                                        <option key={ev.id} value={ev.id}>{ev.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Participant *</label>
                                <select value={selectedParticipant} onChange={(e) => setSelectedParticipant(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                                    <option value="">Select participant</option>
                                    {participants.map((u) => (
                                        <option key={u.id} value={u.id}>{u.username || u.email || `User#${u.id}`}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">School Name *</label>
                                <input
                                    type="text"
                                    value={schoolName}
                                    onChange={(e) => setSchoolName(e.target.value)}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                    placeholder="Enter school name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">District Name *</label>
                                <input
                                    type="text"
                                    value={districtName}
                                    onChange={(e) => setDistrictName(e.target.value)}
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                                    placeholder="Enter district name"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Category *</label>
                                <select value={category} onChange={(e) => setCategory(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                                    <option value="LP">LP</option>
                                    <option value="UP">UP</option>
                                    <option value="HS">HS</option>
                                    <option value="HSS">HSS</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Certificate Type *</label>
                                <select value={certificateType} onChange={(e) => setCertificateType(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm" required>
                                    <option value="participation">Participation Certificate</option>
                                    <option value="merit">Merit Certificate</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Prize/Rank</label>
                                <select value={prize} onChange={(e) => setPrize(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm">
                                    <option value="">Select prize/rank (if applicable)</option>
                                    <option value="1st">1st Prize</option>
                                    <option value="2nd">2nd Prize</option>
                                    <option value="3rd">3rd Prize</option>
                                    <option value="consolation">Consolation Prize</option>
                                    <option value="participation">Participation</option>
                                </select>
                            </div>
                            <div className="flex items-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const selectedEventObj = events.find(e => e.id === parseInt(selectedEvent));
                                        const selectedParticipantObj = participants.find(p => p.id === parseInt(selectedParticipant));

                                        if (selectedEventObj && selectedParticipantObj) {
                                            setShowPreview({
                                                participant_name: selectedParticipantObj.first_name && selectedParticipantObj.last_name
                                                    ? `${selectedParticipantObj.first_name} ${selectedParticipantObj.last_name}`
                                                    : selectedParticipantObj.username || selectedParticipantObj.email || `User#${selectedParticipantObj.id}`,
                                                school_name: schoolName,
                                                district_name: districtName,
                                                category: category,
                                                event_name: selectedEventObj.name,
                                                event_date: selectedEventObj.date,
                                                certificate_type: certificateType,
                                                prize: prize,
                                                issue_date: new Date(),
                                                certificate_number: 'PREVIEW-CERT-' + Date.now()
                                            });
                                        }
                                    }}
                                    className="w-full px-4 py-2 rounded-md text-white bg-green-600 hover:bg-green-700"
                                >
                                    Preview
                                </button>
                                <button type="submit" disabled={saving} className={`w-full px-4 py-2 rounded-md text-white ${saving ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}>{saving ? 'Generating...' : 'Generate Certificate'}</button>
                            </div>
                        </form>
                    </div>

                    <div className="md:col-span-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">Existing Certificates</h3>
                        {certificates.length === 0 ? (
                            <div className="text-gray-500">No certificates generated yet</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Event</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Participant</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">School</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">District</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prize</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Issued At</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {certificates.map((c) => (
                                            <tr key={c.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.event_details?.name || c.event}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.participant_details?.username || c.participant_details?.email || c.participant}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.school_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.district_name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.category}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.certificate_type === 'merit' ? 'Merit' : 'Participation'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.prize ? ({
                                                    '1st': '1st Prize',
                                                    '2nd': '2nd Prize',
                                                    '3rd': '3rd Prize',
                                                    'consolation': 'Consolation Prize',
                                                    'participation': 'Participation'
                                                }[c.prize] || c.prize) : '-'}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{new Date(c.issued_at).toLocaleString()}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                                    <button onClick={() => downloadPdf(c.id)} className="text-blue-600 hover:text-blue-900">Download PDF</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Certificate Preview Modal */}
                    {showPreview && (
                        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-auto">
                                <div className="p-4 border-b flex justify-between items-center">
                                    <h3 className="text-lg font-semibold">Certificate Preview</h3>
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="text-gray-500 hover:text-gray-700"
                                    >
                                        ✕
                                    </button>
                                </div>
                                <div className="p-4 max-h-[70vh] overflow-auto">
                                    <CertificatePreview certificateData={showPreview} />
                                </div>
                                <div className="p-4 border-t flex justify-end">
                                    <button
                                        onClick={() => setShowPreview(false)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                                    >
                                        Close Preview
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CertificateGeneration;