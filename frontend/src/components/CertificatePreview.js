import React from 'react';

const CertificatePreview = ({ certificateData }) => {
    const {
        participant_name = "Participant Name",
        school_name = "School Name",
        district_name = "District Name",
        category = "HSS",
        event_name = "Event Name",
        event_date = new Date(),
        certificate_type = "participation",
        prize = "",
        issue_date = new Date(),
        certificate_number = "CERT-XXX-XXXXXX"
    } = certificateData || {};

    // Format dates
    const formattedIssueDate = new Date(issue_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const formattedEventDate = new Date(event_date).getFullYear();

    // Determine certificate title
    const certTitle = certificate_type === 'merit' ? "CERTIFICATE OF MERIT" : "CERTIFICATE OF PARTICIPATION";

    // Determine prize text
    let prizeText = "";
    if (certificate_type === 'merit' && prize) {
        const prizeMap = {
            '1st': 'and secured 1st Prize',
            '2nd': 'and secured 2nd Prize',
            '3rd': 'and secured 3rd Prize',
            'consolation': 'and received Consolation Prize',
            'participation': 'as a participant'
        };
        prizeText = prizeMap[prize] || `and received ${prize}`;
    } else {
        prizeText = "as a participant";
    }

    return (
        <div className="w-full max-w-6xl mx-auto bg-white shadow-2xl rounded-lg overflow-hidden">
            <style jsx>{`
        @media print {
          body {
            margin: 0;
          }
          .certificate-container {
            box-shadow: none;
            border: none;
          }
        }
      `}</style>

            <div
                className="certificate-container p-8 relative overflow-hidden"
                style={{
                    minHeight: '842px', // A4 height in pixels at 96 DPI
                    minWidth: '1190px', // A4 width in pixels at 96 DPI
                    backgroundColor: '#fdfaf0', // Light cream background
                    fontFamily: 'serif',
                    backgroundImage: `
            linear-gradient(rgba(173, 216, 230, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(173, 216, 230, 0.1) 1px, transparent 1px)
          `,
                    backgroundSize: '50px 50px',
                    transform: 'scale(0.7)',
                    transformOrigin: 'top left',
                    width: '170%',
                    height: '170%'
                }}
            >
                {/* Border */}
                <div
                    className="absolute inset-4 border-4 border-black"
                    style={{ borderColor: '#000', borderWidth: '2px' }}
                ></div>

                {/* Top Blue Accent Line */}
                <div
                    className="absolute top-4 left-4 right-4 h-2"
                    style={{ backgroundColor: '#1e3a8a' }} // Dark blue
                ></div>

                {/* Content Area */}
                <div className="relative z-10 h-full flex flex-col">
                    {/* Header */}
                    <div className="text-center py-8">
                        <h1
                            className="text-3xl font-bold mb-2"
                            style={{ color: '#1e3a8a' }}
                        >
                            KERALA KALOLSAVAM
                        </h1>
                    </div>

                    {/* Certificate Title */}
                    <div className="text-center py-6">
                        <h2
                            className="text-5xl font-bold mb-8"
                            style={{ color: '#1e3a8a', fontFamily: 'Georgia, serif' }}
                        >
                            {certTitle}
                        </h2>
                    </div>

                    {/* Main Content */}
                    <div className="flex-grow flex items-center justify-center px-12">
                        <div className="text-center max-w-3xl">
                            <p className="text-xl mb-4 leading-relaxed">
                                This is to certify that <span className="font-bold text-lg">{participant_name}</span>
                            </p>
                            <p className="text-xl mb-4 leading-relaxed">
                                of <span className="font-bold">{school_name}</span>, District: <span className="font-bold">{district_name}</span>
                            </p>
                            <p className="text-xl mb-4 leading-relaxed">
                                Category: <span className="font-bold">{category}</span>
                            </p>
                            <p className="text-xl mb-4 leading-relaxed">
                                has successfully participated in the event '<span className="font-bold">{event_name}</span>'
                            </p>
                            <p className="text-xl mb-8 leading-relaxed">
                                {prizeText} held during the {formattedEventDate} Kalolsavam.
                            </p>
                        </div>
                    </div>

                    {/* Authorization Section */}
                    <div className="text-center py-6">
                        <p
                            className="text-lg mb-8"
                            style={{ color: '#1e3a8a' }}
                        >
                            Authorized by Kalolsavam Management
                        </p>

                        <div className="flex justify-around max-w-2xl mx-auto mb-8">
                            {/* Left Signature Block */}
                            <div className="text-center">
                                <div className="border-t-2 border-black w-48 h-1 mx-auto mb-2"></div>
                                <p className="text-sm">Chairperson / Program Chairman</p>
                            </div>

                            {/* Right Signature Block */}
                            <div className="text-center">
                                <div className="border-t-2 border-black w-48 h-1 mx-auto mb-2"></div>
                                <p className="text-sm">General Convener / Authorized Officer</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex justify-between items-center px-12 py-4 text-sm">
                        <div>
                            Date: {formattedIssueDate}
                        </div>
                        <div className="text-center">
                            Certificate No: {certificate_number}
                        </div>
                        <div>
                            Verification QR Code
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CertificatePreview;