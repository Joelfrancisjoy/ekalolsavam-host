import React from 'react';

const VirtualReceipt = ({ paymentData, studentDetails, eventDetails, recheckRequest, onClose }) => {
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString('en-IN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
                {/* Receipt Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white p-6 text-center relative">
                    <h2 className="text-2xl font-bold">Payment Receipt</h2>
                    <p className="opacity-90">Transaction Successful</p>
                    <button
                        onClick={onClose || (() => window.location.reload())}
                        className="absolute top-4 right-4 text-white hover:text-gray-200"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Receipt Content */}
                <div className="p-6 space-y-6">
                    {/* Transaction Status */}
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-green-600">Payment Successful!</h3>
                        <p className="text-gray-600">Your transaction has been completed successfully</p>
                    </div>

                    {/* Participant Details */}
                    <div className="border-t border-b border-gray-200 py-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Participant Information</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Name:</span>
                                <span className="font-medium">{studentDetails?.first_name ? `${studentDetails.first_name} ${studentDetails.last_name || ''}`.trim() : (recheckRequest?.participant_name || 'N/A')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Email:</span>
                                <span className="font-medium">{studentDetails?.email || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Phone:</span>
                                <span className="font-medium">{studentDetails?.phone || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Username:</span>
                                <span className="font-mono text-xs">{studentDetails?.username || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Event Information */}
                    <div className="border-b border-gray-200 py-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Event Information</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Event Name:</span>
                                <span className="font-medium">{eventDetails?.name || recheckRequest?.event_name || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Category:</span>
                                <span className="font-medium">{eventDetails?.category || recheckRequest?.event_category || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Date:</span>
                                <span className="font-medium">{eventDetails?.date ? new Date(eventDetails.date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Chest Number:</span>
                                <span className="font-mono font-medium">{recheckRequest?.participant_chess_number || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Payment Details */}
                    <div className="border-b border-gray-200 py-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Payment Details</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Amount Paid:</span>
                                <span className="font-bold text-green-600">₹{typeof paymentData?.amount === 'number' ? paymentData.amount.toFixed(2) : (typeof paymentData?.amount === 'string' ? parseFloat(paymentData.amount).toFixed(2) : '100.00')}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Currency:</span>
                                <span className="font-medium">{paymentData?.currency || 'INR'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Payment Method:</span>
                                <span className="font-medium">Razorpay</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Transaction ID:</span>
                                <span className="font-mono text-xs">{paymentData?.razorpay_payment_id || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Transaction Information */}
                    <div className="py-4">
                        <h4 className="font-semibold text-gray-800 mb-3">Transaction Information</h4>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">Order ID:</span>
                                <span className="font-mono text-xs">{paymentData?.razorpay_order_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                    Captured
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-600">Date & Time:</span>
                                <span className="font-medium">{formatDate(paymentData?.created_at || new Date().toISOString())}</span>
                            </div>
                        </div>
                    </div>

                    {/* Confirmation Message */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <p className="text-sm text-blue-800 text-center">
                            <strong>Confirmation:</strong> Your recheck request payment has been successfully processed.
                            The recheck request will be processed by our team as per the schedule.
                        </p>
                    </div>

                    {/* Close Button */}
                    <div className="pt-4 space-y-3">
                        <button
                            onClick={onClose || (() => window.location.reload())}
                            className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200"
                        >
                            Continue to Dashboard
                        </button>
                        <button
                            onClick={onClose || (() => window.location.reload())}
                            className="w-full py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-all duration-200"
                        >
                            Close Receipt
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VirtualReceipt;