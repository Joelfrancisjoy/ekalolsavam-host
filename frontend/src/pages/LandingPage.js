import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LandingPage = () => {
    const navigate = useNavigate();
        const [currentSlide, setCurrentSlide] = useState(0);
    const [showAboutModal, setShowAboutModal] = useState(false);

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
