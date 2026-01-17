import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LandingPage = () => {
    const navigate = useNavigate();
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showAboutModal, setShowAboutModal] = useState(false);
    const [showEmergencyModal, setShowEmergencyModal] = useState(false);

    // Art forms data with authentic Kerala traditional arts
    const artForms = [
        {
            name: "Margamkali",
            description: "A traditional Syrian Christian art form celebrating unity and devotion",
            importance: "Performed during weddings and festivals, symbolizing community harmony",
            bgPattern: "M20,20 Q40,10 60,20 Q50,40 60,60 Q40,50 20,60 Q30,40 20,20"
        },
        {
            name: "Thiruvathirakali",
            description: "Graceful group dance performed by women in circular formations",
            importance: "Celebrates femininity, unity, and the divine feminine energy",
            bgPattern: "M30,30 C50,20 70,40 50,60 C30,70 10,50 30,30"
        },
        {
            name: "Oppana",
            description: "Elegant dance form of the Muslim community with rhythmic clapping",
            importance: "Performed during weddings, expressing joy and cultural heritage",
            bgPattern: "M25,25 L35,15 L45,25 L35,35 Z M15,45 L25,35 L35,45 L25,55 Z"
        },
        {
            name: "Bharatanatyam",
            description: "Classical dance form expressing devotion through precise movements",
            importance: "Ancient art combining spirituality, storytelling, and aesthetic beauty",
            bgPattern: "M40,10 Q60,30 40,50 Q20,30 40,10 M40,60 C50,70 30,70 40,60"
        }
    ];

    // Auto-slide functionality
    // If user navigates to Landing while logged in, force logout and go to login
    useEffect(() => {
        const hadToken = Boolean(localStorage.getItem('access_token') || localStorage.getItem('refresh_token'));
        if (hadToken) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            navigate('/login', { replace: true });
        }
    }, [navigate]);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % artForms.length);
        }, 4000);
        return () => clearInterval(timer);
    }, [artForms.length]);

    const handleGetStarted = () => {
        navigate('/login');
    };

    const handleLoginClick = () => {
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-amber-100 via-orange-50 to-yellow-100 relative overflow-hidden">
            {/* Enhanced Background Elements */}
            <div className="absolute inset-0 overflow-hidden">
                {/* Traditional Art Patterns */}
                <div className="absolute top-0 left-0 w-96 h-96 opacity-5">
                    <svg viewBox="0 0 200 200" className="w-full h-full text-amber-700">
                        <defs>
                            <pattern id="kerala-pattern" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse">
                                <circle cx="25" cy="25" r="4" fill="currentColor" />
                                <path d="M15,15 Q25,10 35,15 Q30,25 35,35 Q25,40 15,35 Q20,25 15,15" fill="none" stroke="currentColor" strokeWidth="1.5" />
                                <path d="M10,40 L20,30 L30,40 L20,50 Z" fill="currentColor" opacity="0.3" />
                            </pattern>
                        </defs>
                        <rect width="200" height="200" fill="url(#kerala-pattern)" />
                    </svg>
                </div>

                {/* Floating Decorative Elements */}
                <div className="absolute top-32 right-20 w-40 h-40 opacity-10 text-orange-600 animate-pulse">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <path d="M50,10 Q70,30 50,50 Q30,30 50,10" fill="currentColor" />
                        <circle cx="50" cy="70" r="12" fill="currentColor" />
                        <path d="M30,80 Q50,75 70,80" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                </div>

                <div className="absolute bottom-32 left-20 w-48 h-48 opacity-8 text-amber-600">
                    <svg viewBox="0 0 100 100" className="w-full h-full">
                        <path d="M20,20 Q50,5 80,20 Q85,50 80,80 Q50,85 20,80 Q15,50 20,20" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="50" cy="50" r="20" fill="currentColor" opacity="0.2" />
                        <path d="M35,35 L65,35 L50,65 Z" fill="currentColor" opacity="0.4" />
                    </svg>
                </div>
            </div>

            {/* Header */}
            <header className="relative bg-white/95 backdrop-blur-sm border-b-2 border-amber-200 shadow-sm">
                <div className="px-0">
                    <div className="flex justify-between items-center py-4">
                        {/* Logo and Title */}
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center shadow-xl">
                                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                                    </svg>
                                </div>
                            </div>
                            <div className="ml-4">
                                <h1
                                    className="text-4xl font-bold text-amber-800 tracking-wide"
                                    style={{ fontFamily: 'Cinzel, serif' }}
                                >
                                    E-Kalolsavam Arts Fest
                                </h1>
                                <p
                                    className="text-amber-700 text-lg font-medium italic"
                                    style={{ fontFamily: 'Dancing Script, cursive' }}
                                >
                                    "Where Performance Becomes Art."
                                </p>
                            </div>
                        </div>

                        {/* Navigation */}
                        <div className="hidden md:flex items-center space-x-8">
                            <nav className="flex items-center space-x-6">
                                <button
                                    onClick={() => setShowAboutModal(true)}
                                    className="text-amber-800 hover:text-amber-900 font-semibold transition-colors duration-200"
                                >
                                    About Us
                                </button>
                                <a href="#contact" className="text-amber-800 hover:text-amber-900 font-semibold transition-colors duration-200">
                                    Contact
                                </a>
                                <a href="mailto:info@ekalolsavam.com" className="text-amber-800 hover:text-amber-900 font-semibold transition-colors duration-200">
                                    Email
                                </a>
                            </nav>

                            {/* Login Icon */}
                            <button
                                onClick={handleLoginClick}
                                className="text-amber-800 border-2 border-amber-300 hover:border-amber-400 hover:bg-amber-50 font-semibold px-4 py-2 rounded-full transition-colors"
                                title="Login"
                            >
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="relative flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-4 sm:px-6 lg:px-8 py-12">

                {/* Art Forms Carousel */}
                <div className="mb-12 w-full max-w-4xl">
                    <div className="relative bg-white/95 backdrop-blur-sm rounded-3xl shadow-xl p-10 border border-amber-200 overflow-hidden">
                        {/* Carousel Content */}
                        <div className="relative h-48 flex items-center justify-center">
                            {/* Background Pattern for Current Slide */}
                            <div className="absolute inset-0 opacity-5">
                                <svg viewBox="0 0 100 100" className="w-full h-full text-amber-700">
                                    <path d={artForms[currentSlide].bgPattern} fill="currentColor" />
                                </svg>
                            </div>

                            {/* Content */}
                            <div className="relative text-center z-10">
                                <h3 className="text-3xl font-bold text-amber-900 mb-3 tracking-wide">
                                    {artForms[currentSlide].name}
                                </h3>
                                <p className="text-base text-amber-800/90 mb-2 max-w-2xl leading-relaxed">
                                    {artForms[currentSlide].description}
                                </p>
                                <p className="text-sm text-amber-700 italic">
                                    {artForms[currentSlide].importance}
                                </p>
                            </div>
                        </div>

                        {/* Carousel Indicators */}
                        <div className="flex justify-center space-x-2 mt-6">
                            {artForms.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`w-3 h-3 rounded-full transition-all duration-200 ${index === currentSlide
                                        ? 'bg-amber-600 scale-125'
                                        : 'bg-amber-300 hover:bg-amber-400'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Get Started Section */}
                <div className="text-center">
                    <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-2xl p-12 border-2 border-amber-200/50 relative overflow-hidden max-w-2xl">
                        {/* Decorative Corner Elements */}
                        <div className="absolute top-0 right-0 w-24 h-24 opacity-10">
                            <svg viewBox="0 0 100 100" className="w-full h-full text-amber-600">
                                <path d="M0,0 Q50,25 100,0 L100,50 Q75,25 100,100 L50,100 Q25,75 0,100 Z" fill="currentColor" />
                            </svg>
                        </div>

                        <div className="relative z-10">
                            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-amber-600 to-orange-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z" />
                                </svg>
                            </div>

                            <h2 className="text-4xl font-bold text-amber-900 mb-5 tracking-wide">
                                Welcome to Kerala's Premier Arts Festival
                            </h2>

                            <p className="text-lg text-amber-800/90 mb-6 leading-relaxed">
                                Experience the rich cultural heritage of Kerala through traditional art forms,
                                competitions, and celebrations that bring communities together.
                            </p>

                            <button
                                onClick={handleGetStarted}
                                className="text-amber-800 font-semibold border-2 border-amber-300 hover:border-amber-400 hover:bg-amber-50 py-3 px-10 rounded-xl text-lg transition-colors"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* About Us Modal */}
            {showAboutModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-3xl font-bold text-amber-800">About E-Kalolsavam Arts Fest</h2>
                                <button
                                    onClick={() => setShowAboutModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-6 text-gray-700">
                                <section>
                                    <h3 className="text-xl font-semibold text-amber-700 mb-3">Our Mission</h3>
                                    <p className="leading-relaxed">
                                        E-Kalolsavam is Kerala's premier digital platform for celebrating and preserving traditional art forms.
                                        We bring together artists, judges, and art enthusiasts to participate in competitions that showcase
                                        the rich cultural heritage of Kerala.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-amber-700 mb-3">Festival Events</h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <div className="bg-amber-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-amber-800">Dance Forms</h4>
                                            <p className="text-sm">Margamkali, Thiruvathirakali, Oppana, Bharatanatyam, Mohiniyattam</p>
                                        </div>
                                        <div className="bg-orange-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-orange-800">Music & Theatre</h4>
                                            <p className="text-sm">Classical music, folk songs, drama, and storytelling competitions</p>
                                        </div>
                                        <div className="bg-yellow-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-yellow-800">Visual Arts</h4>
                                            <p className="text-sm">Traditional painting, sculpture, and contemporary art exhibitions</p>
                                        </div>
                                        <div className="bg-red-50 p-4 rounded-lg">
                                            <h4 className="font-semibold text-red-800">Literary Arts</h4>
                                            <p className="text-sm">Poetry, storytelling, and literary competitions in multiple languages</p>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-amber-700 mb-3">How E-Kalolsavam Works</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-start space-x-3">
                                            <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                                            <p><strong>Registration:</strong> Students register for events through our digital platform</p>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                                            <p><strong>Participation:</strong> Participants perform in their chosen art forms at designated venues</p>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                                            <p><strong>Judging:</strong> Expert judges evaluate performances using our digital scoring system</p>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
                                            <p><strong>Results:</strong> Live results and certificates are generated automatically</p>
                                        </div>
                                        <div className="flex items-start space-x-3">
                                            <div className="w-6 h-6 bg-amber-600 text-white rounded-full flex items-center justify-center text-sm font-bold">5</div>
                                            <p><strong>Celebration:</strong> Winners are celebrated and cultural heritage is preserved digitally</p>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-xl font-semibold text-amber-700 mb-3">Platform Features</h3>
                                    <ul className="list-disc list-inside space-y-2">
                                        <li>Digital registration and event management</li>
                                        <li>Real-time scoring and results</li>
                                        <li>Automated certificate generation</li>
                                        <li>Multi-language support</li>
                                        <li>Live streaming capabilities</li>
                                        <li>Cultural heritage documentation</li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Emergency Floating Button */}
            <button
                onClick={() => {
                    try {
                        navigate('/emergency');
                    } catch (e) {
                        window.location.href = '/emergency';
                    }
                }}
                className="fixed bottom-8 right-8 z-50 group"
                title="Emergency"
            >
                <div className="relative">
                    {/* Pulsing ring effect */}
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-20"></div>
                    <div className="absolute inset-0 bg-red-500 rounded-full animate-ping animation-delay-200 opacity-20"></div>

                    {/* Main button with gradient and shadow */}
                    <div className="relative bg-gradient-to-br from-red-500 to-red-600 rounded-full p-4 shadow-2xl hover:shadow-3xl transform hover:scale-110 transition-all duration-300 group-hover:from-red-600 group-hover:to-red-700 border-2 border-white/50">
                        {/* Emergency icon */}
                        <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,6V13H13V6H11M11,15V17H13V15H11Z" />
                        </svg>
                    </div>

                    {/* Hover tooltip */}
                    <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        Emergency Help
                        <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                    </div>
                </div>
            </button>

            {/* Emergency Modal */}
            {showEmergencyModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-8">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center">
                                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M11,6V13H13V6H11M11,15V17H13V15H11Z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-3xl font-bold text-red-600">Emergency Helplines & Solutions</h2>
                                </div>
                                <button
                                    onClick={() => setShowEmergencyModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-3xl font-light"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Emergency Helplines */}
                                <section>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z" />
                                        </svg>
                                        Emergency Helplines
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {/* Police */}
                                        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-blue-800 text-lg">Police</h4>
                                                <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12,1L8,5H11V14H13V5H16M18,23H6C5.45,23 5,22.55 5,22V9A3,3 0 0,1 8,6H10V4H14V6H16A3,3 0 0,1 19,9V22A1,1 0 0,1 18,23Z" />
                                                </svg>
                                            </div>
                                            <p className="text-2xl font-bold text-blue-700 mb-2">100</p>
                                            <div className="flex space-x-2">
                                                <a href="tel:100" className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-700 transition-colors font-semibold">
                                                    Call Now
                                                </a>
                                                <a href="sms:100" className="flex-1 bg-blue-500 text-white px-4 py-2 rounded-lg text-center hover:bg-blue-600 transition-colors font-semibold">
                                                    SMS
                                                </a>
                                            </div>
                                        </div>

                                        {/* Ambulance */}
                                        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-red-800 text-lg">Ambulance</h4>
                                                <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M19,8C20.1,8 21,8.9 21,10V20C21,21.1 20.1,22 19,22H5C3.9,22 3,21.1 3,20V10C3,8.9 3.9,8 5,8H6V6C6,4.9 6.9,4 8,4H16C17.1,4 18,4.9 18,6V8H19M8,6V8H16V6H8M5,10V20H19V10H5M10,12H14V14H16V16H14V18H10V16H8V14H10V12Z" />
                                                </svg>
                                            </div>
                                            <p className="text-2xl font-bold text-red-700 mb-2">108</p>
                                            <div className="flex space-x-2">
                                                <a href="tel:108" className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg text-center hover:bg-red-700 transition-colors font-semibold">
                                                    Call Now
                                                </a>
                                                <a href="sms:108" className="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg text-center hover:bg-red-600 transition-colors font-semibold">
                                                    SMS
                                                </a>
                                            </div>
                                        </div>

                                        {/* Fire Department */}
                                        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-orange-800 text-lg">Fire Department</h4>
                                                <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M17.66,11.2C17.43,10.9 17.15,10.64 16.89,10.38L16.89,10.38C16.22,9.78 15.46,9.35 14.64,9.07L13.65,7.83C13.4,7.55 13.09,7.35 12.75,7.24C12.41,7.13 12.04,7.13 11.7,7.24C11.36,7.35 11.05,7.55 10.8,7.83L9.81,9.07C9,9.35 8.23,9.78 7.56,10.38L7.56,10.38C7.3,10.64 7.02,10.9 6.79,11.2C6.56,11.5 6.38,11.83 6.27,12.18C6.16,12.53 6.12,12.89 6.15,13.25C6.18,13.61 6.28,13.96 6.45,14.28C6.62,14.6 6.85,14.88 7.13,15.11C7.41,15.34 7.73,15.51 8.08,15.62C8.43,15.73 8.79,15.77 9.15,15.74C9.51,15.71 9.86,15.61 10.18,15.44L10.18,15.44L17.66,11.2M12,2C12,2 9,4 9,7C9,7 7,7 7,9C7,9 4,9 4,12C4,12 2,12 2,15C2,15 4,15 4,18C4,18 7,18 7,20C7,20 9,20 9,22H15C15,20 17,20 17,18C17,18 20,18 20,15C20,15 22,15 22,12C22,12 20,12 20,9C20,9 17,9 17,7C17,7 15,7 15,4C15,4 12,2 12,2Z" />
                                                </svg>
                                            </div>
                                            <p className="text-2xl font-bold text-orange-700 mb-2">101</p>
                                            <div className="flex space-x-2">
                                                <a href="tel:101" className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg text-center hover:bg-orange-700 transition-colors font-semibold">
                                                    Call Now
                                                </a>
                                                <a href="sms:101" className="flex-1 bg-orange-500 text-white px-4 py-2 rounded-lg text-center hover:bg-orange-600 transition-colors font-semibold">
                                                    SMS
                                                </a>
                                            </div>
                                        </div>

                                        {/* Women's Helpline */}
                                        <div className="bg-pink-50 border-2 border-pink-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-pink-800 text-lg">Women's Helpline</h4>
                                                <svg className="w-6 h-6 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8M12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12A2,2 0 0,0 12,10Z" />
                                                </svg>
                                            </div>
                                            <p className="text-2xl font-bold text-pink-700 mb-2">1091</p>
                                            <div className="flex space-x-2">
                                                <a href="tel:1091" className="flex-1 bg-pink-600 text-white px-4 py-2 rounded-lg text-center hover:bg-pink-700 transition-colors font-semibold">
                                                    Call Now
                                                </a>
                                                <a href="sms:1091" className="flex-1 bg-pink-500 text-white px-4 py-2 rounded-lg text-center hover:bg-pink-600 transition-colors font-semibold">
                                                    SMS
                                                </a>
                                            </div>
                                        </div>

                                        {/* Child Helpline */}
                                        <div className="bg-green-50 border-2 border-green-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-green-800 text-lg">Child Helpline</h4>
                                                <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12,2A3,3 0 0,1 15,5A3,3 0 0,1 12,8A3,3 0 0,1 9,5A3,3 0 0,1 12,2M12,9C14.67,9 20,10.33 20,13V14H18.5L17.5,13H6.5L5.5,14H4V13C4,10.33 9.33,9 12,9M12,10A6,6 0 0,0 6,16A6,6 0 0,0 12,22A6,6 0 0,0 18,16A6,6 0 0,0 12,10Z" />
                                                </svg>
                                            </div>
                                            <p className="text-2xl font-bold text-green-700 mb-2">1098</p>
                                            <div className="flex space-x-2">
                                                <a href="tel:1098" className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg text-center hover:bg-green-700 transition-colors font-semibold">
                                                    Call Now
                                                </a>
                                                <a href="sms:1098" className="flex-1 bg-green-500 text-white px-4 py-2 rounded-lg text-center hover:bg-green-600 transition-colors font-semibold">
                                                    SMS
                                                </a>
                                            </div>
                                        </div>

                                        {/* Disaster Management */}
                                        <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-5 hover:shadow-lg transition-shadow">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-purple-800 text-lg">Disaster Management</h4>
                                                <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M13,17H11V15H13V17M13,13H11V7H13V13Z" />
                                                </svg>
                                            </div>
                                            <p className="text-2xl font-bold text-purple-700 mb-2">1077</p>
                                            <div className="flex space-x-2">
                                                <a href="tel:1077" className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg text-center hover:bg-purple-700 transition-colors font-semibold">
                                                    Call Now
                                                </a>
                                                <a href="sms:1077" className="flex-1 bg-purple-500 text-white px-4 py-2 rounded-lg text-center hover:bg-purple-600 transition-colors font-semibold">
                                                    SMS
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Emergency Solutions & Guidelines */}
                                <section>
                                    <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                                        <svg className="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12,2L13.09,8.26L22,9L13.09,9.74L12,16L10.91,9.74L2,9L10.91,8.26L12,2Z" />
                                        </svg>
                                        Emergency Guidelines & Solutions
                                    </h3>
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 border-l-4 border-blue-500 p-4 rounded-lg">
                                            <h4 className="font-semibold text-blue-800 mb-2">Medical Emergency</h4>
                                            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                                <li>Call 108 for ambulance immediately</li>
                                                <li>Keep the patient calm and in a safe position</li>
                                                <li>Do not move the patient if there's a risk of spinal injury</li>
                                                <li>Provide first aid if trained, otherwise wait for professionals</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gray-50 border-l-4 border-orange-500 p-4 rounded-lg">
                                            <h4 className="font-semibold text-orange-800 mb-2">Fire Emergency</h4>
                                            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                                <li>Call 101 for fire department immediately</li>
                                                <li>Evacuate the area quickly and safely</li>
                                                <li>Use fire extinguisher only if safe to do so</li>
                                                <li>Do not use elevators during fire emergencies</li>
                                                <li>Stay low to avoid smoke inhalation</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gray-50 border-l-4 border-red-500 p-4 rounded-lg">
                                            <h4 className="font-semibold text-red-800 mb-2">Security Emergency</h4>
                                            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                                <li>Call 100 for police immediately</li>
                                                <li>Stay calm and provide clear information about the situation</li>
                                                <li>Move to a safe location if possible</li>
                                                <li>Do not confront the threat yourself</li>
                                                <li>Follow instructions from emergency responders</li>
                                            </ul>
                                        </div>

                                        <div className="bg-gray-50 border-l-4 border-green-500 p-4 rounded-lg">
                                            <h4 className="font-semibold text-green-800 mb-2">General Safety Tips</h4>
                                            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                                                <li>Stay calm and assess the situation</li>
                                                <li>Call the appropriate emergency number</li>
                                                <li>Provide your exact location clearly</li>
                                                <li>Follow instructions from emergency services</li>
                                                <li>Keep emergency contacts saved in your phone</li>
                                            </ul>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            <div className="mt-6 pt-6 border-t border-gray-200">
                                <p className="text-sm text-gray-600 text-center">
                                    <strong>Remember:</strong> In case of any emergency, stay calm and call the appropriate helpline number immediately.
                                    Help is always available.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Contact Section */}
            <section id="contact" className="bg-white/90 backdrop-blur-sm border-t-2 border-amber-200 py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <h3 className="text-2xl font-bold text-amber-800 mb-4">Get in Touch</h3>
                        <div className="flex justify-center space-x-8">
                            <div className="text-amber-700">
                                <p className="font-semibold">Email</p>
                                <p>info@ekalolsavam.com</p>
                            </div>
                            <div className="text-amber-700">
                                <p className="font-semibold">Phone</p>
                                <p>+91 9876543210</p>
                            </div>
                            <div className="text-amber-700">
                                <p className="font-semibold">Address</p>
                                <p>Kerala Cultural Center, Kochi</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default LandingPage;
