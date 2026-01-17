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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
            {/* Warning banner */}
            <div className="bg-red-600 border-b-4 border-red-500 py-4">
                <div className="flex items-center justify-center space-x-4 animate-pulse">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="text-2xl font-black text-white tracking-wider uppercase">EMERGENCY MODE ACTIVE</span>
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                </div>
            </div>

            <header className="w-full px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between bg-gradient-to-r from-blue-100 to-blue-200 border-b-2 border-blue-300">
                <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="inline-flex items-center text-lg font-black text-blue-800 hover:text-blue-900 transition-colors"
                >
                    <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    BACK TO SAFETY
                </button>
                <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-black text-blue-800 tracking-wide uppercase">STAY CALM - HELP IS COMING</span>
                </div>
            </header>

            <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-6 pb-32 overflow-y-auto">
                <div className="max-w-6xl mx-auto max-h-[calc(100vh-300px)] overflow-y-auto">
                    <div className="text-center mb-10">
                        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-blue-900 mb-4 tracking-tight">
                            EMERGENCY
                        </h1>
                        <p className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-700 tracking-wide">
                            IMMEDIATE ASSISTANCE NEEDED
                        </p>
                    </div>

                    <div className="rounded-3xl shadow-2xl border-4 border-blue-300 bg-gradient-to-br from-blue-50 to-white overflow-hidden mb-10">
                        <div className="px-8 py-6 bg-gradient-to-r from-blue-200 to-blue-300 border-b-4 border-blue-400 flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center animate-pulse">
                                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-4xl font-black tracking-widest text-blue-900 uppercase">EMERGENCY ALERT</div>
                                    <div className="text-2xl font-bold text-blue-800">{FESTIVAL_NAME}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-blue-900 uppercase">ALERT SYSTEM</div>
                                <div className="text-xl font-bold text-blue-800">SECURE CONNECTION</div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-8">
                            <section>
                                <h2 className="text-3xl font-black text-blue-900 mb-6 text-center tracking-wide uppercase">SELECT EMERGENCY TYPE</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {EMERGENCY_TYPES.map((type) => {
                                        const selected = emergencyType === type.id;
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
                                                className={`w-full rounded-3xl border-4 transition-all duration-300 transform hover:scale-105 ${selected
                                                    ? 'border-red-500 bg-gradient-to-br from-red-100 to-red-200 text-red-900 shadow-2xl scale-105'
                                                    : 'border-blue-300 bg-gradient-to-br from-blue-50 to-white text-blue-900 hover:border-red-400 hover:from-red-50 hover:to-red-100'
                                                    }`}
                                            >
                                                <div className="p-6">
                                                    <div className="flex items-center justify-center mb-4">
                                                        <div className={`p-5 rounded-full ${selected ? 'bg-red-600' : 'bg-blue-200'}`}>
                                                            {emergencyIcon(type.id)}
                                                        </div>
                                                    </div>
                                                    <div className="text-center">
                                                        <div className="text-2xl sm:text-3xl font-black tracking-wide mb-3 uppercase">{title}</div>
                                                        <div className="text-lg sm:text-xl font-bold text-blue-800">{type.description}</div>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </section>

                            <section className="space-y-6">
                                <h2 className="text-3xl font-black text-blue-900 text-center tracking-wide uppercase">CRITICALITY LEVEL</h2>
                                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                    {SEVERITY_LEVELS.map((lvl) => {
                                        const isOn = severity === lvl.id;
                                        const bgColor = lvl.id === 'red'
                                            ? 'bg-gradient-to-br from-red-600 to-red-700 border-red-500'
                                            : lvl.id === 'orange'
                                                ? 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-400'
                                                : lvl.id === 'yellow'
                                                    ? 'bg-gradient-to-br from-yellow-400 to-yellow-500 border-yellow-300'
                                                    : lvl.id === 'blue'
                                                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-400'
                                                        : 'bg-gradient-to-br from-green-500 to-green-600 border-green-400';

                                        return (
                                            <button
                                                key={lvl.id}
                                                type="button"
                                                onClick={() => setSeverity(lvl.id)}
                                                className={`rounded-2xl p-4 transition-all duration-300 transform hover:scale-105 border-4 ${isOn ? 'ring-4 ring-blue-500 ring-opacity-50 scale-105' : 'border-blue-300'} ${bgColor}`}
                                            >
                                                <div className="text-center">
                                                    <div className="text-xl font-black tracking-widest text-white mb-2 uppercase">{lvl.title}</div>
                                                    <div className="text-sm font-bold text-white uppercase">{lvl.desc}</div>
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
                                    className="w-full flex items-center justify-between rounded-3xl border-4 border-blue-300 bg-gradient-to-br from-blue-50 to-white px-6 py-4 text-left transition-all duration-300 hover:from-blue-100 hover:to-blue-50"
                                >
                                    <div className="flex items-center space-x-3">
                                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-2xl font-black text-blue-900 tracking-wide uppercase">LOCATION DETAILS</span>
                                    </div>
                                    <span className="text-xl font-bold text-blue-700">{showOptionalLocation ? 'HIDE' : 'SHOW'}</span>
                                </button>

                                {showOptionalLocation && (
                                    <div className="mt-6 space-y-6 p-6 rounded-3xl bg-gradient-to-br from-blue-50 to-white border-4 border-blue-300">
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                                            <div className="flex-1">
                                                <label className="block text-xl font-black text-blue-900 mb-4 tracking-wide uppercase">SELECT VENUE</label>
                                                <select
                                                    value={selectedVenueId}
                                                    onChange={(e) => setSelectedVenueId(e.target.value)}
                                                    disabled={loadingVenues || venues.length === 0}
                                                    className="w-full rounded-2xl border-4 border-blue-400 bg-white text-blue-900 px-6 py-4 text-xl font-bold shadow-lg focus:outline-none focus:ring-4 focus:ring-red-300 focus:border-blue-500 disabled:bg-blue-100 disabled:text-blue-500 h-16"
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
                                                className="inline-flex items-center justify-center rounded-2xl border-4 border-red-500 bg-gradient-to-br from-red-500 to-red-600 px-6 py-4 text-xl font-black text-white hover:from-red-600 hover:to-red-700 transition-all duration-300 min-h-16"
                                            >
                                                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                USE MY LOCATION
                                            </button>
                                        </div>

                                        {locationStatus && (
                                            <p className="text-xl text-blue-900 bg-blue-100 border-4 border-blue-300 rounded-2xl px-6 py-4 font-bold">
                                                {locationStatus}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </section>

                            {error && (
                                <div className="rounded-3xl border-4 border-red-500 bg-gradient-to-br from-red-100 to-red-200 px-6 py-4 text-xl font-black text-red-800 text-center">
                                    {error}
                                </div>
                            )}

                            <div className="pt-4 space-y-4 text-center">
                                <div className="text-lg font-black text-blue-800 tracking-wide">
                                    Your alert will be sent privately to festival volunteers. If this is life-threatening, also call the helplines.
                                </div>
                            </div>

                            {submitSuccess && (
                                <div className="rounded-3xl border-4 border-green-500 bg-gradient-to-br from-green-100 to-green-200 px-6 py-4 text-xl font-black text-green-800 text-center animate-pulse">
                                    HELP IS ON THE WAY. VOLUNTEERS HAVE BEEN ALERTED.
                                </div>
                            )}
                        </form>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                        <div className="bg-gradient-to-br from-blue-50 to-white rounded-3xl shadow-2xl border-4 border-blue-300 p-6">
                            <button
                                type="button"
                                onClick={() => setShowHelplines((v) => !v)}
                                className="w-full flex items-center justify-between text-left mb-4"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 20,16.5V20A1,1 0 0,1 19,19A17,17 0 0,1 2,2A1,1 0 0,1 3,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                                        </svg>
                                    </div>
                                    <span className="text-3xl font-black text-blue-900 tracking-wider uppercase">EMERGENCY NUMBERS</span>
                                </div>
                                <span className="text-2xl font-bold text-blue-700">{showHelplines ? 'HIDE' : 'SHOW'}</span>
                            </button>
                            {showHelplines && (
                                <div className="mt-4 space-y-6 text-center">
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-blue-100 rounded-2xl border-4 border-blue-300">
                                        <span className="text-xl font-black text-blue-900 uppercase">AMBULANCE (MEDICAL)</span>
                                        <a
                                            href="tel:108"
                                            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white text-xl font-black hover:from-blue-700 hover:to-blue-800 transition-all duration-300"
                                        >
                                            CALL 108
                                        </a>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-orange-100 rounded-2xl border-4 border-orange-300">
                                        <span className="text-xl font-black text-orange-900 uppercase">FIRE DEPARTMENT</span>
                                        <a
                                            href="tel:101"
                                            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-xl font-black hover:from-orange-600 hover:to-orange-700 transition-all duration-300"
                                        >
                                            CALL 101
                                        </a>
                                    </div>
                                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 bg-red-100 rounded-2xl border-4 border-red-300">
                                        <span className="text-xl font-black text-red-900 uppercase">POLICE / SECURITY</span>
                                        <a
                                            href="tel:100"
                                            className="px-6 py-4 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 text-white text-xl font-black hover:from-red-700 hover:to-red-800 transition-all duration-300"
                                        >
                                            CALL 100
                                        </a>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="bg-gradient-to-br from-green-50 to-white rounded-3xl shadow-2xl border-4 border-green-300 p-6">
                            <button
                                type="button"
                                onClick={() => setShowSafety((v) => !v)}
                                className="w-full flex items-center justify-between text-left mb-4"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-14 h-14 bg-green-600 rounded-full flex items-center justify-center">
                                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                                        </svg>
                                    </div>
                                    <span className="text-3xl font-black text-green-900 tracking-wider uppercase">SAFETY REMINDERS</span>
                                </div>
                                <span className="text-2xl font-bold text-green-700">{showSafety ? 'HIDE' : 'SHOW'}</span>
                            </button>
                            {showSafety && (
                                <ul className="mt-4 space-y-4 text-xl font-bold text-green-900 bg-green-100 p-6 rounded-2xl border-4 border-green-300">
                                    <li className="flex items-start space-x-3">
                                        <span className="text-green-700 font-black text-2xl">•</span>
                                        <span>Stay as calm as you can and keep the area clear.</span>
                                    </li>
                                    <li className="flex items-start space-x-3">
                                        <span className="text-green-700 font-black text-2xl">•</span>
                                        <span>Do not move the person if you suspect serious injury.</span>
                                    </li>
                                    <li className="flex items-start space-x-3">
                                        <span className="text-green-700 font-black text-2xl">•</span>
                                        <span>Follow instructions from volunteers and staff.</span>
                                    </li>
                                    <li className="flex items-start space-x-3">
                                        <span className="text-green-700 font-black text-2xl">•</span>
                                        <span>If you are in immediate danger, move to a safe place first.</span>
                                    </li>
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <div className="fixed inset-x-0 bottom-0 z-50 border-t-4 border-blue-400 bg-gradient-to-r from-blue-200 to-blue-300 shadow-2xl">
                <div className="max-w-6xl mx-auto px-6 py-6">
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
                        className="relative w-full rounded-2xl overflow-hidden border-4 border-red-500 bg-gradient-to-r from-red-600 via-red-500 to-red-600 shadow-2xl disabled:opacity-60 disabled:cursor-not-allowed transform transition-transform active:scale-95"
                        aria-label="Press and hold to send alert to volunteers"
                    >
                        <div
                            className="absolute inset-0 bg-gradient-to-r from-red-800 to-red-900"
                            style={{ transform: `translateX(${(holdProgress - 1) * 100}%)`, transition: holdActiveRef.current ? 'none' : 'transform 150ms ease' }}
                        />
                        <div className="relative px-6 py-6 text-center">
                            <div className="text-2xl font-black tracking-widest text-white drop-shadow-lg uppercase">
                                {submitting ? 'SENDING EMERGENCY ALERT...' : 'SEND ALERT TO VOLUNTEERS'}
                            </div>
                            <div className="text-lg font-bold text-red-100 mt-2">
                                PRESS & HOLD FOR 1 SECOND
                            </div>
                        </div>
                    </button>

                    <div className="mt-4 text-center text-lg font-bold text-blue-900 tracking-wide">
                        ANYONE CAN USE THIS. IF LIFE-THREATENING, CALL EMERGENCY NUMBERS TOO.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EmergencyMainPage;