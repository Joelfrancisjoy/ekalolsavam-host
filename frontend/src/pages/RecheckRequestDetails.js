import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import resultService from '../services/resultService';
import http from '../services/http-common';
import UserInfoHeader from '../components/UserInfoHeader';
import volunteerService from '../services/volunteerService';
import VirtualReceipt from '../components/VirtualReceipt';
// import { toast } from 'react-toastify'; // Temporarily commented out until we set up the ToastProvider

const RecheckRequestDetails = () => {
    const { recheckRequestId } = useParams();
    const [result, setResult] = useState(null);
    const [recheckRequest, setRecheckRequest] = useState(null);
    const [eventDetails, setEventDetails] = useState(null);
    const [studentDetails, setStudentDetails] = useState(null);
    const [registration, setRegistration] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState('');
    const [paymentSuccess, setPaymentSuccess] = useState('');
    const [recheckPayment, setRecheckPayment] = useState(null);
    const [showVirtualReceipt, setShowVirtualReceipt] = useState(false);
    const [paymentVerificationData, setPaymentVerificationData] = useState(null);

    const closeVirtualReceipt = () => {
        setShowVirtualReceipt(false);
        setPaymentVerificationData(null);
    };


    useEffect(() => {
        const loadUserData = async () => {
            try {
                const userResponse = await http.get('/api/auth/current/');
                setCurrentUser(userResponse.data);
            } catch (error) {
                console.error('Failed to fetch user:', error);
            }
        };
        loadUserData();
    }, []);

    useEffect(() => {
        const loadDetails = async () => {
            try {
                setLoading(true);
                setError('');
                setPaymentError('');
                setPaymentSuccess('');

                const role = String(currentUser?.role || '').toLowerCase();
                if (!role) {
                    return;
                }

                if (role === 'student') {
                    const details = await resultService.getAcceptedRecheckDetails(recheckRequestId);
                    setRecheckRequest(details?.recheck_request || null);
                    setResult(details?.result || null);
                    setEventDetails(details?.event || null);
                    setStudentDetails(details?.student || null);
                    setRegistration(details?.registration || null);
                    setRecheckPayment(details?.recheck_payment || null);
                } else {
                    const recheckRequestDetails = await volunteerService.getRecheckRequestDetails(recheckRequestId);
                    setRecheckRequest(recheckRequestDetails.data);
                    const resultDetails = await resultService.getResultDetails(recheckRequestDetails.data.result);
                    setResult(resultDetails);
                    setEventDetails(resultDetails?.event || null);
                    setStudentDetails(resultDetails?.participant_details || null);
                }
            } catch (err) {
                console.error('Failed to load details:', err);
                const msg = err?.response?.data?.error || 'Failed to load recheck request details';
                setError(msg);
            } finally {
                setLoading(false);
            }
        };

        if (recheckRequestId && currentUser) {
            loadDetails();
        }
    }, [recheckRequestId, currentUser?.role]);

    const handlePayment = async () => {
        setPaymentError('');
        setPaymentSuccess('');
        setPaymentLoading(true);

        const role = String(currentUser?.role || '').toLowerCase();
        if (role !== 'student') {
            setPaymentError('Only students can process payments.');
            setPaymentLoading(false);
            return;
        }

        try {
            // Check if recheck request details are loaded properly
            if (!recheckRequest || !recheckRequest.recheck_request_id) {
                setPaymentError('Recheck request details not loaded properly. Please refresh the page.');
                setPaymentLoading(false);
                return;
            }

            // Initiate payment with backend
            const response = await http.post(`/api/scores/student/recheck-request/${recheckRequestId}/initiate-payment/`);

            // Check if recheck-specific payment is required
            if (response.data.payment_required === false) {
                setPaymentError('No payment required');
                setPaymentLoading(false);
                return;
            }

            const { order_id, amount } = response.data;

            // Validate response data
            if (!order_id || !amount) {
                setPaymentError('Invalid payment data received from server');
                setPaymentLoading(false);
                return;
            }

            // Load Razorpay script dynamically
            const loadRazorpayScript = () => {
                return new Promise((resolve, reject) => {
                    if (window.Razorpay) {
                        resolve(window.Razorpay);
                        return;
                    }

                    const script = document.createElement('script');
                    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
                    script.onload = () => resolve(window.Razorpay);
                    script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
                    script.async = true;
                    document.head.appendChild(script);
                });
            };

            try {
                await loadRazorpayScript();
            } catch (scriptError) {
                setPaymentError('Failed to load payment gateway. Please try again later.');
                setPaymentLoading(false);
                return;
            }

            // Configure Razorpay options
            const options = {
                key: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_RP6aD2gNdAuoRE',
                amount: Math.round(amount * 100), // Convert to paisa
                currency: 'INR',
                name: 'Kalolsavam Recheck Request',
                description: 'Payment for recheck request',
                order_id: order_id,
                handler: async function (response) {
                    try {
                        // Verify payment with backend
                        const verifyResponse = await http.post('/api/scores/student/recheck-request/verify-payment/', {
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                        });

                        setPaymentSuccess(verifyResponse.data.message);

                        // Update recheck payment status in real-time
                        setRecheckPayment(prev => ({
                            ...prev,
                            paid: prev?.fee || 100, // Set paid amount equal to fee
                            payment_required: false // Mark payment as not required anymore
                        }));

                        // Set payment verification data for receipt
                        setPaymentVerificationData({
                            ...verifyResponse.data,
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: parseFloat(recheckPayment?.fee || '100'), // Use actual recheck fee amount
                            currency: 'INR',
                            created_at: new Date().toISOString()
                        });

                        // Show virtual receipt instead of reloading
                        setShowVirtualReceipt(true);
                    } catch (error) {
                        console.error('Payment verification failed:', error);
                        setPaymentError(error?.response?.data?.error || error?.response?.data?.detail || error?.message || 'Payment verification failed');
                        // Reload the page to refresh data
                        window.location.reload();
                    }
                },
                prefill: {
                    name: studentDetails?.first_name ? `${studentDetails.first_name} ${studentDetails.last_name || ''}`.trim() : '',
                    email: studentDetails?.email || '',
                    contact: studentDetails?.phone || '',
                },
                theme: {
                    color: '#FF5A16',
                },
            };

            try {
                // Open Razorpay checkout
                const rzp = new window.Razorpay(options);
                rzp.open();
            } catch (checkoutError) {
                console.error('Error opening Razorpay checkout:', checkoutError);
                setPaymentError('Failed to open payment gateway. Please try again later.');
                setPaymentLoading(false);
            }

        } catch (error) {
            console.error('Payment initiation failed:', error);
            // Improved error handling
            if (error.response) {
                // Server responded with error status
                setPaymentError(error.response.data.error || error.response.data.detail || 'Payment initiation failed');
            } else if (error.request) {
                // Request was made but no response received
                setPaymentError('Network error. Please check your connection and try again.');
            } else {
                // Something else happened
                setPaymentError(error.message || 'Payment initiation failed');
            }
        } finally {
            setPaymentLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                <div className="max-w-4xl mx-auto">
                    <UserInfoHeader user={currentUser} title="Recheck Request Details" subtitle="View and process accepted recheck requests" />
                    <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center mt-8">
                        <svg className="w-12 h-12 text-red-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-red-800 font-semibold">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                <div className="max-w-4xl mx-auto">
                    <UserInfoHeader user={currentUser} title="Recheck Request Details" subtitle="View and process accepted recheck requests" />

                    <div className="space-y-6 mt-8">
                        {/* Event Details */}
                        <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                                <h2 className="text-2xl font-bold">Event Details</h2>
                                <p className="opacity-90">Information about the event where the result was achieved</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Event Information</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Event Name:</span>
                                                <span className="font-medium text-xl text-gray-900">{eventDetails?.name || recheckRequest?.event_name || result?.event_name || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Category:</span>
                                                <span className="font-medium text-xl text-gray-900">{eventDetails?.category || recheckRequest?.event_category || result?.category || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Date:</span>
                                                <span className="font-medium text-xl text-gray-900">
                                                    {eventDetails?.date ? new Date(eventDetails.date).toLocaleDateString() : (result?.event?.date ? new Date(result.event.date).toLocaleDateString() : 'N/A')}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Venue:</span>
                                                <span className="font-medium text-xl text-gray-900">{eventDetails?.venue?.name || result?.event?.venue?.name || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Result Information</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Final Score:</span>
                                                <span className="font-bold text-emerald-600 text-2xl">{recheckRequest?.final_score || result?.total_score || result?.total_score === 0 ? result?.total_score : 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Rank:</span>
                                                <span className="font-bold text-2xl text-gray-900">#{result?.rank || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Chest Number:</span>
                                                <span className="font-mono font-medium text-xl text-gray-900">{registration?.chess_number || recheckRequest?.participant_chess_number || result?.chest_number || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Student Details */}
                        <div className="bg-white rounded-2xl shadow-lg border-2 border-blue-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-6 text-white">
                                <h2 className="text-2xl font-bold">Student Details</h2>
                                <p className="opacity-90">Information about the student who requested the recheck</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Personal Information</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Name:</span>
                                                <span className="font-medium text-xl text-gray-900">{studentDetails?.first_name ? `${studentDetails.first_name} ${studentDetails.last_name || ''}`.trim() : (recheckRequest?.participant_name || result?.full_name || 'N/A')}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Username:</span>
                                                <span className="font-mono font-medium text-xl text-gray-900">{studentDetails?.username || recheckRequest?.participant_username || result?.participant_details?.username || 'N/A'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Email:</span>
                                                <span className="font-medium text-xl text-gray-900">{studentDetails?.email || result?.participant_details?.email || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Academic Information</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">School:</span>
                                                <span className="font-medium text-xl text-gray-900">{studentDetails?.school?.name || result?.participant_details?.school?.name || 'Pioneer Public School'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Class:</span>
                                                <span className="font-medium text-xl text-gray-900">{studentDetails?.student_class || result?.participant_details?.student_class || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recheck Request Details */}
                        <div className="bg-white rounded-2xl shadow-lg border-2 border-green-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-6 text-white">
                                <h2 className="text-2xl font-bold">Recheck Request Details</h2>
                                <p className="opacity-90">Information about the recheck request and its status</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Request Information</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Status:</span>
                                                <span className="px-4 py-2 rounded-full text-lg font-bold bg-green-100 text-green-800">
                                                    {recheckRequest?.status || 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Requested On:</span>
                                                <span className="font-medium text-xl text-gray-900">
                                                    {recheckRequest?.submitted_at ? new Date(recheckRequest.submitted_at).toLocaleString() : 'N/A'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Accepted On:</span>
                                                <span className="font-medium text-xl text-gray-900">
                                                    {recheckRequest?.accepted_at ? new Date(recheckRequest.accepted_at).toLocaleString() : 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Request Details</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Reason:</span>
                                                <span className="font-medium text-xl text-gray-900">{recheckRequest?.reason || 'not satisfied with the result'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Assigned Volunteer:</span>
                                                <span className="font-medium text-xl text-gray-900">
                                                    {recheckRequest?.assigned_volunteer?.username || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Payment Information */}
                        <div className="bg-white rounded-2xl shadow-lg border-2 border-purple-200 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
                                <h2 className="text-2xl font-bold">Payment Information</h2>
                                <p className="opacity-90">Registration and payment details for the event</p>
                            </div>
                            <div className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Amounts</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Registration Amount:</span>
                                                <span className="font-bold text-xl text-gray-900">₹{registration?.registration_amount ?? '100.00'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Amount Paid:</span>
                                                <span className="font-bold text-xl text-green-600">₹{registration?.amount_paid ?? '0.00'}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Outstanding:</span>
                                                <span className="font-bold text-xl text-gray-900">₹{(registration?.registration_amount ?? '100.00') - (registration?.amount_paid ?? '0.00')}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-semibold text-gray-800 mb-2">Payment Status</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Registration Status:</span>
                                                <span className={`px-4 py-2 rounded-full text-lg font-bold ${((registration?.amount_paid ?? 0) < (registration?.registration_amount ?? 100)) ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {(registration?.amount_paid ?? 0) < (registration?.registration_amount ?? 100) ? 'Pending' : 'Paid'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                                <span className="text-lg font-medium text-gray-700">Recheck Fee Status:</span>
                                                <span className={`px-4 py-2 rounded-full text-lg font-bold ${((recheckPayment?.paid ?? 0) < (recheckPayment?.fee ?? 100)) ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                                    {(recheckPayment?.paid ?? 0) < (recheckPayment?.fee ?? 100) ? 'Pending' : 'Paid'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {paymentError && (
                                    <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-lg text-sm font-medium text-red-800">
                                        {paymentError}
                                    </div>
                                )}

                                {paymentSuccess && (
                                    <div className="mt-4 p-3 bg-green-100 border border-green-300 rounded-lg text-sm font-medium text-green-800">
                                        {paymentSuccess}
                                    </div>
                                )}

                                <div className="mt-6">
                                    <button
                                        onClick={handlePayment}
                                        disabled={paymentLoading || !(recheckPayment?.payment_required)}
                                        className={`w-full py-4 px-6 text-white font-bold text-xl rounded-xl hover:transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${recheckPayment?.payment_required ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700' : 'bg-gray-400 cursor-not-allowed'}`}
                                    >
                                        {paymentLoading ? 'Processing...' : recheckPayment?.payment_required ? 'Start Payment' : 'Payment Completed'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Virtual Receipt Modal */}
            {showVirtualReceipt && paymentVerificationData && (
                <VirtualReceipt
                    paymentData={paymentVerificationData}
                    studentDetails={studentDetails}
                    eventDetails={eventDetails}
                    recheckRequest={recheckRequest}
                    onClose={closeVirtualReceipt}
                />
            )}
        </>
    );
};

export default RecheckRequestDetails;