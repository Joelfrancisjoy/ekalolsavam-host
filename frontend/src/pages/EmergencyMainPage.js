import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const FESTIVAL_NAME = process.env.REACT_APP_FESTIVAL_NAME || 'Festival Name';
const HOLD_DURATION_MS = 1200;

const EMERGENCY_TYPES = [
    {
        id: 'medical',
        label: 'Medical Emergency',
        description: 'Collapse, breathing difficulty, severe pain or bleeding',
    },
    {
        id: 'fire',
        label: 'Fire / Smoke',
        description: 'Visible fire, heavy smoke or strong burning smell',
    },
    {
        id: 'security',
        label: 'Security / Safety',
        description: 'Violence, harassment, threat, missing person',
    },
    {
        id: 'other',
        label: 'Other Urgent Issue',
        description: 'Any other situation needing quick help',
    },
];

const SEVERITY_LEVELS = [
    { id: 'red', title: 'RED', desc: 'Life-threatening', ring: 'focus:ring-red-500', on: 'border-red-500 bg-red-50', off: 'hover:border-red-300 hover:bg-red-50/40' },
    { id: 'orange', title: 'ORANGE', desc: 'Very urgent', ring: 'focus:ring-orange-500', on: 'border-orange-500 bg-orange-50', off: 'hover:border-orange-300 hover:bg-orange-50/40' },
    { id: 'yellow', title: 'YELLOW', desc: 'Urgent but stable', ring: 'focus:ring-yellow-500', on: 'border-yellow-500 bg-yellow-50', off: 'hover:border-yellow-300 hover:bg-yellow-50/40' },
    { id: 'blue', title: 'BLUE', desc: 'Observation', ring: 'focus:ring-blue-500', on: 'border-blue-500 bg-blue-50', off: 'hover:border-blue-300 hover:bg-blue-50/40' },
    { id: 'green', title: 'GREEN', desc: 'Minor', ring: 'focus:ring-green-500', on: 'border-green-500 bg-green-50', off: 'hover:border-green-300 hover:bg-green-50/40' },
];

const TYPE_META = {
    medical: { title: 'Medical emergency', accent: 'text-rose-700', chip: 'bg-rose-50 text-rose-700 border-rose-200' },
    fire: { title: 'Fire / smoke', accent: 'text-orange-700', chip: 'bg-orange-50 text-orange-700 border-orange-200' },
    security: { title: 'Security threat', accent: 'text-indigo-700', chip: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
    other: { title: 'Other urgent issue', accent: 'text-slate-700', chip: 'bg-slate-50 text-slate-700 border-slate-200' },
};

const SEVERITY_META = {
    red: { label: 'Red', chip: 'bg-red-50 text-red-800 border-red-200', dot: 'bg-red-600', button: 'hover:border-red-300 hover:bg-red-50/60' },
    orange: { label: 'Orange', chip: 'bg-orange-50 text-orange-800 border-orange-200', dot: 'bg-orange-600', button: 'hover:border-orange-300 hover:bg-orange-50/60' },
    yellow: { label: 'Yellow', chip: 'bg-yellow-50 text-yellow-900 border-yellow-200', dot: 'bg-yellow-500', button: 'hover:border-yellow-300 hover:bg-yellow-50/60' },
    blue: { label: 'Blue', chip: 'bg-blue-50 text-blue-800 border-blue-200', dot: 'bg-blue-600', button: 'hover:border-blue-300 hover:bg-blue-50/60' },
    green: { label: 'Green', chip: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-600', button: 'hover:border-emerald-300 hover:bg-emerald-50/60' },
};

const SEVERITY_ACCENT = {
    red: { topBorder: 'border-t-red-500', headerBg: 'bg-red-50', headerBorder: 'border-red-200', headerText: 'text-red-900', softPanel: 'bg-red-50/60 border-red-200' },
    orange: { topBorder: 'border-t-orange-500', headerBg: 'bg-orange-50', headerBorder: 'border-orange-200', headerText: 'text-orange-900', softPanel: 'bg-orange-50/60 border-orange-200' },
    yellow: { topBorder: 'border-t-yellow-500', headerBg: 'bg-yellow-50', headerBorder: 'border-yellow-200', headerText: 'text-yellow-900', softPanel: 'bg-yellow-50/60 border-yellow-200' },
    blue: { topBorder: 'border-t-blue-500', headerBg: 'bg-blue-50', headerBorder: 'border-blue-200', headerText: 'text-blue-900', softPanel: 'bg-blue-50/60 border-blue-200' },
    green: { topBorder: 'border-t-emerald-500', headerBg: 'bg-emerald-50', headerBorder: 'border-emerald-200', headerText: 'text-emerald-900', softPanel: 'bg-emerald-50/60 border-emerald-200' },
};

const EmergencyMainPage = () => {
    const navigate = useNavigate();

    const [emergencyType, setEmergencyType] = useState('medical');
    const [severity, setSeverity] = useState('red');
    const [venues, setVenues] = useState([]);
    const [selectedVenueId, setSelectedVenueId] = useState('');
    const [loadingVenues, setLoadingVenues] = useState(true);
    const [locationStatus, setLocationStatus] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [error, setError] = useState('');
    const [showHelplines, setShowHelplines] = useState(true);
    const [showSafety, setShowSafety] = useState(true);
    const [showOptionalLocation, setShowOptionalLocation] = useState(false);

    const [holdProgress, setHoldProgress] = useState(0);
    const holdTimeoutRef = useRef(null);
    const holdRafRef = useRef(null);
    const holdStartRef = useRef(0);
    const holdActiveRef = useRef(false);

    useEffect(() => {
        const loadVenues = async () => {
            try {
                setLoadingVenues(true);
                const response = await fetch(`${API_URL}/api/events/venues/`);
                if (!response.ok) {
                    throw new Error(`Failed to load venues: ${response.status}`);
                }
                const data = await response.json();
                const list = Array.isArray(data) ? data : [];
                setVenues(list);
                if (list.length > 0) {
                    setSelectedVenueId(String(list[0].id));
                }
            } catch (e) {
                console.error('Failed to load venues for emergency page', e);
            } finally {
                setLoadingVenues(false);
            }
        };

        loadVenues();
    }, []);


    const handleUseMyLocation = () => {
        if (!navigator.geolocation) {
            setLocationStatus('Location not supported on this device.');
            return;
        }

        setLocationStatus('Detecting your location - this may take a few seconds...');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                setLocationStatus(
                    `Location detected (approx.): ${latitude.toFixed(4)}, ${longitude.toFixed(4)}. Please confirm the venue below.`,
                );
            },
            () => {
                setLocationStatus('Unable to detect location. Please select the venue manually.');
            },
            {
                enableHighAccuracy: false,
                timeout: 7000,
                maximumAge: 60000,
            },
        );
    };

    const submitEmergency = async () => {
        if (!emergencyType) {
            setError('Please select the type of emergency.');
            return;
        }
        if (!severity) {
            setError('Please select the criticality.');
            return;
        }

        setError('');
        setSubmitting(true);
        setSubmitSuccess(false);

        try {
            const res = await fetch(`${API_URL}/api/emergencies/public-initiate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: emergencyType,
                    severity,
                    venue_id: selectedVenueId || null,
                }),
            });

            if (!res.ok) {
                let details = '';
                try {
                    const data = await res.json();
                    details = data?.error ? JSON.stringify(data.error) : JSON.stringify(data);
                } catch (e) {
                    // ignore parse errors
                }
                throw new Error(`Request failed: ${res.status}${details ? ` - ${details}` : ''}`);
            }
            setSubmitSuccess(true);
        } catch (err) {
            console.error('Failed to send emergency alert', err);
            setError(
                'We could not contact the festival team automatically. Please also use the helpline numbers below.',
            );
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        submitEmergency();
    };

    const startHold = () => {
        if (submitting) return;
        setError('');
        setSubmitSuccess(false);
        holdActiveRef.current = true;
        setHoldProgress(0);
        holdStartRef.current = Date.now();

        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
        if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);

        const tick = () => {
            const elapsed = Date.now() - holdStartRef.current;
            const p = Math.min(1, elapsed / HOLD_DURATION_MS);
            setHoldProgress(p);
            if (p < 1 && holdActiveRef.current) {
                holdRafRef.current = requestAnimationFrame(tick);
            }
        };

        holdRafRef.current = requestAnimationFrame(tick);
        holdTimeoutRef.current = setTimeout(() => {
            holdActiveRef.current = false;
            setHoldProgress(1);
            holdTimeoutRef.current = null;
            submitEmergency();
        }, HOLD_DURATION_MS);
    };

    const cancelHold = () => {
        if (holdTimeoutRef.current) {
            clearTimeout(holdTimeoutRef.current);
            holdTimeoutRef.current = null;
        }
        if (holdRafRef.current) {
            cancelAnimationFrame(holdRafRef.current);
            holdRafRef.current = null;
        }
        holdActiveRef.current = false;
        setHoldProgress(0);
    };

    useEffect(() => {
        return () => {
            if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
            if (holdRafRef.current) cancelAnimationFrame(holdRafRef.current);
        };
    }, []);

    const emergencyIcon = (id) => {
        if (id === 'medical') {
            return (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
            );
        }
        if (id === 'fire') {
            return (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22c4.418 0 8-3.134 8-7 0-3.314-2.1-5.4-4.3-7.3C14.2 6.4 14 5 14 4c-2 1-3.5 3-3.5 5.5 0 1.3.4 2.1.9 3.1C10.2 12.4 9 11.5 9 9.5 6.5 11 4 13.7 4 16c0 3.866 3.582 6 8 6z" />
                </svg>
            );
        }
        if (id === 'security') {
            return (
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3l7 4v6c0 5-3 8-7 8s-7-3-7-8V7l7-4z" />
                </svg>
            );
        }
        return (
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
        );
    };

    const selectedTypeMeta = TYPE_META[emergencyType] || TYPE_META.other;
    const selectedSeverityMeta = SEVERITY_META[severity] || SEVERITY_META.red;
    const severityAccent = SEVERITY_ACCENT[severity] || SEVERITY_ACCENT.red;
    const selectedSeverity = SEVERITY_LEVELS.find((s) => s.id === severity);
    const selectedType = EMERGENCY_TYPES.find((t) => t.id === emergencyType);
    const selectedVenueName = venues.find((v) => String(v.id) === String(selectedVenueId))?.name;

    return (
        <div className="h-screen overflow-hidden bg-gradient-to-b from-slate-50 via-slate-50 to-white flex flex-col">
            <div className="bg-amber-50 border-b border-amber-200 py-2">
                <div className="flex items-center justify-center gap-2 px-4">
                    <svg className="w-5 h-5 text-amber-700" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-lg font-bold text-amber-900">Emergency assistance panel</span>
                    <span className="text-lg text-amber-800 hidden sm:inline">Use helplines if life-threatening</span>
                </div>
            </div>

            <header className="w-full bg-white/90 backdrop-blur border-b border-slate-200">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <button
                        type="button"
                        onClick={() => navigate('/')}
                        className="inline-flex items-center text-lg font-bold text-slate-700 hover:text-slate-900 transition-colors"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back
                    </button>
                    <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${submitting ? 'bg-amber-500' : submitSuccess ? 'bg-emerald-500' : 'bg-emerald-500'}`}></div>
                        <span className="text-lg font-bold text-slate-700">
                            {submitting ? 'Sending alert…' : submitSuccess ? 'Alert sent' : 'Ready to send alert'}
                        </span>
                    </div>
                </div>
            </header>

            <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-10 pb-44 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-red-600 text-white shadow-sm mb-5">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.07 19h13.86A2 2 0 0020.8 16.6l-6.93-12a2 2 0 00-3.54 0l-6.93 12A2 2 0 005.07 19z" />
                            </svg>
                        </div>
                        <h1 className="text-5xl sm:text-6xl font-extrabold text-slate-900 tracking-tight">Emergency</h1>
                        <p className="text-xl sm:text-2xl text-slate-600 mt-3">Send a private alert to festival volunteers</p>
                        <p className="text-lg text-slate-500 mt-2">{FESTIVAL_NAME}</p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                        <div className="lg:col-span-2">
                            <div className={`rounded-2xl border border-slate-200 border-t-4 ${severityAccent.topBorder} bg-white shadow-sm overflow-hidden mb-8`}>
                                <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-sm">
                                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-xl font-bold text-slate-900">Create an emergency alert</div>
                                            <div className="text-lg text-slate-600">Choose type, criticality, and optionally a venue</div>
                                        </div>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <div className="text-base font-bold text-slate-700">Current selection</div>
                                        <div className="mt-1 flex items-center justify-end gap-2">
                                            <span className={`inline-flex items-center rounded-full border px-4 py-2 text-base font-bold ${selectedTypeMeta.chip}`}>{selectedTypeMeta.title}</span>
                                            <span className={`inline-flex items-center rounded-full border px-4 py-2 text-base font-bold ${selectedSeverityMeta.chip}`}>{selectedSeverityMeta.label}</span>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleSubmit} className="px-8 py-8 space-y-10">
                                    <section>
                                        <h2 className="text-3xl font-extrabold text-slate-900 mb-4">Emergency type</h2>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            {EMERGENCY_TYPES.map((type) => {
                                                const selected = emergencyType === type.id;
                                                const meta = TYPE_META[type.id] || TYPE_META.other;
                                                const title = type.id === 'medical'
                                                    ? 'MEDICAL EMERGENCY'
                                                    : type.id === 'fire'
                                                        ? 'FIRE / SMOKE'
                                                        : type.id === 'security'
                                                            ? 'SECURITY THREAT'
                                                            : 'OTHER URGENT';

                                                return (
                                                    <button
                                                        key={type.id}
                                                        type="button"
                                                        onClick={() => setEmergencyType(type.id)}
                                                        className={`w-full rounded-xl border transition-colors text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 ${selected
                                                            ? 'border-indigo-500 bg-indigo-50'
                                                            : 'border-slate-200 bg-white hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        <div className="p-6">
                                                            <div className="flex items-start gap-4">
                                                                <div className={`shrink-0 p-3 rounded-xl ${selected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                                                                    {emergencyIcon(type.id)}
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="text-xl font-extrabold text-slate-900">{title}</div>
                                                                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-sm font-semibold ${meta.chip}`}>Recommended</span>
                                                                    </div>
                                                                    <div className="text-lg text-slate-600 mt-1">{type.description}</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <section className="space-y-4">
                                        <h2 className="text-4xl font-extrabold text-slate-900">Criticality</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                                            {SEVERITY_LEVELS.map((lvl) => {
                                                const isOn = severity === lvl.id;
                                                const meta = SEVERITY_META[lvl.id] || SEVERITY_META.red;

                                                return (
                                                    <button
                                                        key={lvl.id}
                                                        type="button"
                                                        onClick={() => setSeverity(lvl.id)}
                                                        className={`rounded-xl p-4 border transition-colors focus:outline-none focus:ring-2 ${isOn ? `border-indigo-600 bg-indigo-50 ${lvl.ring}` : `border-slate-200 bg-white ${meta.button} focus:ring-indigo-500`}`}
                                                    >
                                                        <div className="text-center">
                                                            <div className="flex items-center justify-center gap-2 mb-1">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                                                                <div className="text-lg font-extrabold text-slate-900">{lvl.title}</div>
                                                            </div>
                                                            <div className="text-base text-slate-600">{lvl.desc}</div>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </section>

                                    <section className="pt-6">
                                        <button
                                            type="button"
                                            onClick={() => setShowOptionalLocation((v) => !v)}
                                            className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 text-left transition-colors hover:bg-slate-50"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                <span className="text-lg font-bold text-slate-900">Location details</span>
                                            </div>
                                            <span className="text-base font-bold text-slate-600">{showOptionalLocation ? 'HIDE' : 'SHOW'}</span>
                                        </button>

                                        {showOptionalLocation && (
                                            <div className="mt-6 space-y-6 p-6 rounded-xl bg-white border border-slate-200">
                                                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                                    <div className="flex-1">
                                                        <label className="block text-sm font-medium text-slate-700 mb-2">SELECT VENUE</label>
                                                        <select
                                                            value={selectedVenueId}
                                                            onChange={(e) => setSelectedVenueId(e.target.value)}
                                                            disabled={loadingVenues || venues.length === 0}
                                                            className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-slate-100 disabled:text-slate-500 h-10"
                                                        >
                                                            {loadingVenues && <option className="text-blue-400">LOADING VENUES...</option>}
                                                            {!loadingVenues && venues.length === 0 && (
                                                                <option value="" className="text-blue-400">NO VENUES AVAILABLE - DESCRIBE LOCATION TO VOLUNTEERS</option>
                                                            )}
                                                            {!loadingVenues &&
                                                                venues.map((v) => (
                                                                    <option key={v.id} value={v.id} className="text-blue-900 bg-white">
                                                                        {v.name}
                                                                    </option>
                                                                ))}
                                                        </select>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={handleUseMyLocation}
                                                        className="inline-flex items-center justify-center rounded-lg bg-rose-600 text-white px-4 py-2 text-sm font-medium hover:bg-rose-700 transition-colors min-h-10"
                                                    >
                                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        </svg>
                                                        USE MY LOCATION
                                                    </button>
                                                </div>

                                                {locationStatus && (
                                                    <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 font-normal">
                                                        {locationStatus}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </section>

                                    <div className="pt-4 space-y-4 text-center">
                                        <div className="text-base sm:text-lg font-semibold text-slate-700">
                                            Your alert will be sent privately to festival volunteers. If this is life-threatening, also call the helplines.
                                        </div>
                                    </div>

                                    {submitSuccess && (
                                        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 text-center">
                                            Help is on the way. Volunteers have been alerted.
                                        </div>
                                    )}
                                </form>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowHelplines((v) => !v)}
                                        className="w-full flex items-center justify-between text-left mb-4"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
                                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 20,16.5V20A1,1 0 0,1 19,19A17,17 0 0,1 2,2A1,1 0 0,1 3,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-slate-900">Emergency numbers</div>
                                                <div className="text-lg text-slate-600">Call directly if needed</div>
                                            </div>
                                        </div>
                                        <span className="text-base font-bold text-blue-700">{showHelplines ? 'Hide' : 'Show'}</span>
                                    </button>
                                    {showHelplines && (
                                        <div className="mt-4 space-y-4">
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                                                <div>
                                                    <div className="text-lg font-bold text-slate-900">Ambulance (Medical)</div>
                                                    <div className="text-base text-slate-600">National emergency medical service</div>
                                                </div>
                                                <a
                                                    href="tel:108"
                                                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-blue-600 text-white text-lg font-bold hover:bg-blue-700 transition-colors"
                                                >
                                                    Call 108
                                                </a>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-orange-50 rounded-xl border border-orange-200">
                                                <div>
                                                    <div className="text-lg font-bold text-slate-900">Fire department</div>
                                                    <div className="text-base text-slate-600">Report fire and smoke</div>
                                                </div>
                                                <a
                                                    href="tel:101"
                                                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-orange-600 text-white text-lg font-bold hover:bg-orange-700 transition-colors"
                                                >
                                                    Call 101
                                                </a>
                                            </div>
                                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-rose-50 rounded-xl border border-rose-200">
                                                <div>
                                                    <div className="text-lg font-bold text-slate-900">Police / Security</div>
                                                    <div className="text-base text-slate-600">Threats, violence, missing person</div>
                                                </div>
                                                <a
                                                    href="tel:100"
                                                    className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-rose-600 text-white text-lg font-bold hover:bg-rose-700 transition-colors"
                                                >
                                                    Call 100
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                                    <button
                                        type="button"
                                        onClick={() => setShowSafety((v) => !v)}
                                        className="w-full flex items-center justify-between text-left mb-4"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                                                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <div className="text-xl font-bold text-slate-900">Safety reminders</div>
                                                <div className="text-lg text-slate-600">Quick guidance while help arrives</div>
                                            </div>
                                        </div>
                                        <span className="text-base font-bold text-emerald-700">{showSafety ? 'Hide' : 'Show'}</span>
                                    </button>
                                    {showSafety && (
                                        <ul className="mt-4 space-y-3 text-lg text-slate-700 bg-emerald-50 p-5 rounded-xl border border-emerald-200 list-disc list-inside">
                                            <li>Stay as calm as you can and keep the area clear.</li>
                                            <li>Do not move the person if you suspect serious injury.</li>
                                            <li>Follow instructions from volunteers and staff.</li>
                                            <li>If you are in immediate danger, move to a safe place first.</li>
                                        </ul>
                                    )}
                                </div>
                            </div>
                        </div>

                        <aside className="lg:col-span-1">
                            <div className="lg:sticky lg:top-6 space-y-6">
                                <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden border-t-4 ${severityAccent.topBorder}`}>
                                    <div className={`px-5 py-4 border-b ${severityAccent.headerBg} ${severityAccent.headerBorder}`}>
                                        <div className={`text-lg font-extrabold ${severityAccent.headerText}`}>Summary</div>
                                        <div className="text-base text-slate-700 mt-1">Review before sending</div>
                                    </div>
                                    <div className="p-7 space-y-6">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Emergency type</div>
                                                <div className="text-lg font-extrabold text-slate-900 mt-1">{selectedType?.label || 'Other urgent issue'}</div>
                                            </div>
                                            <span className={`shrink-0 inline-flex items-center rounded-full border px-4 py-2 text-sm font-bold ${selectedTypeMeta.chip}`}>{selectedTypeMeta.title}</span>
                                        </div>

                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Criticality</div>
                                                <div className="text-lg font-extrabold text-slate-900 mt-1">{selectedSeverity?.desc || ''}</div>
                                            </div>
                                            <span className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${selectedSeverityMeta.chip}`}>
                                                <span className={`w-2 h-2 rounded-full ${selectedSeverityMeta.dot}`} aria-hidden="true" />
                                                {selectedSeverityMeta.label}
                                            </span>
                                        </div>

                                        <div className="pt-1">
                                            <div className="text-sm font-bold text-slate-500 uppercase tracking-wide">Venue (optional)</div>
                                            <div className="text-lg text-slate-700 mt-1">
                                                {showOptionalLocation
                                                    ? loadingVenues
                                                        ? 'Loading venues…'
                                                        : venues.length === 0
                                                            ? 'No venues available'
                                                            : (selectedVenueName || 'Select a venue')
                                                    : 'Not provided'}
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <div className={`rounded-xl border p-4 ${severityAccent.softPanel}`}>
                                                <div className="text-base font-bold text-slate-700">How it works</div>
                                                <ol className="mt-2 space-y-2 text-lg text-slate-700 list-decimal list-inside">
                                                    <li>Select type and criticality.</li>
                                                    <li>Optionally add venue/location details.</li>
                                                    <li>Press & hold the button to send the alert.</li>
                                                </ol>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {error && (
                                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                                        <div className="text-sm font-semibold text-rose-800">Could not send alert</div>
                                        <div className="text-sm text-rose-700 mt-1">{error}</div>
                                    </div>
                                )}
                            </div>
                        </aside>
                    </div>
                </div>
            </main>

            <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur shadow-lg">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5">
                    <button
                        type="button"
                        disabled={submitting}
                        onMouseDown={startHold}
                        onMouseUp={cancelHold}
                        onMouseLeave={cancelHold}
                        onTouchStart={startHold}
                        onTouchEnd={cancelHold}
                        onKeyDown={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') startHold();
                        }}
                        onKeyUp={(e) => {
                            if (e.key === ' ' || e.key === 'Enter') cancelHold();
                        }}
                        className="relative w-full rounded-2xl overflow-hidden border border-rose-300 bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 shadow-md disabled:opacity-60 disabled:cursor-not-allowed transform transition-transform active:scale-[0.99]"
                        aria-label="Press and hold to send alert to volunteers"
                    >
                        <div
                            className="absolute inset-0 bg-gradient-to-r from-rose-800 to-rose-900"
                            style={{ transform: `translateX(${(holdProgress - 1) * 100}%)`, transition: holdActiveRef.current ? 'none' : 'transform 150ms ease' }}
                        />
                        <div className="relative px-6 py-5 text-center">
                            <div className="text-2xl sm:text-3xl font-extrabold tracking-wide text-white drop-shadow">
                                {submitting ? 'Sending emergency alert…' : 'Send alert to volunteers'}
                            </div>
                            <div className="text-lg font-bold text-rose-100 mt-1">
                                Press & hold for 1 second
                            </div>
                        </div>
                    </button>

                    <div className="mt-3 text-center text-base sm:text-lg font-semibold text-slate-600">
                        Anyone can use this. If life-threatening, call emergency numbers too.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyMainPage;











