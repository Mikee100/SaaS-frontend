"use client";
import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '@/utils/api';
import { FaMobile, FaSpinner, FaCheckCircle, FaTimesCircle, FaExclamationTriangle, FaClock } from 'react-icons/fa';

interface MpesaPaymentProps {
  amount: number;
  saleData?: any;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

interface MpesaTransaction {
  id: string;
  phoneNumber: string;
  amount: number;
  status: 'pending' | 'success' | 'failed' | 'cancelled' | 'timeout' | 'stock_unavailable';
  checkoutRequestId: string;
  mpesaReceipt?: string;
  message?: string;
  createdAt: string;
}

export default function MpesaPayment({ amount, saleData, onSuccess, onError, onCancel }: MpesaPaymentProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<MpesaTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  // Status polling
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (currentTransaction && currentTransaction.status === 'pending') {
      interval = setInterval(async () => {
        try {
          const response = await apiGet(`/mpesa/status/${currentTransaction.checkoutRequestId}`);
          if (response.success && response.data) {
            const updatedTransaction = response.data;
            setCurrentTransaction(updatedTransaction);
            
            if (updatedTransaction.status === 'success') {
              setStatusMessage('Payment successful! Processing your order...');
              setTimeout(() => {
                onSuccess(updatedTransaction.id);
              }, 2000);
            } else if (updatedTransaction.status === 'failed') {
              setError(updatedTransaction.message || 'Payment failed');
              setIsProcessing(false);
            } else if (updatedTransaction.status === 'cancelled') {
              setError('Payment was cancelled');
              setIsProcessing(false);
            } else if (updatedTransaction.status === 'timeout') {
              setError('Payment request timed out');
              setIsProcessing(false);
            } else if (updatedTransaction.status === 'stock_unavailable') {
              setError('Stock unavailable for one or more items');
              setIsProcessing(false);
            }
          }
        } catch (err) {
          console.error('Error checking payment status:', err);
        }
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentTransaction, onSuccess]);

  const validatePhoneNumber = (phone: string) => {
    const phoneRegex = /^(07|2547|25407|\+2547)\d{8}$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('07')) {
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      return cleaned;
    } else if (cleaned.length === 9) {
      return '254' + cleaned;
    }
    
    return cleaned;
  };

  const handleInitiatePayment = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number (07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX)');
      return;
    }

    if (amount < 10) {
      setError('Minimum amount is 10 KES');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setStatusMessage('Initiating payment request...');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const response = await apiPost('/mpesa/initiate', {
        phoneNumber: formattedPhone,
        amount: Math.floor(amount),
        saleData: saleData
      });

      if (response.success) {
        setCurrentTransaction({
          id: response.data.transactionId,
          phoneNumber: formattedPhone,
          amount: Math.floor(amount),
          status: 'pending',
          checkoutRequestId: response.data.checkoutRequestId,
          message: 'Payment request sent to your phone',
          createdAt: new Date().toISOString()
        });
        setStatusMessage('Payment request sent to your phone. Please check your M-Pesa app and enter your PIN.');
      } else {
        setError(response.error || 'Failed to initiate payment');
        setIsProcessing(false);
      }
    } catch (err: any) {
      console.error('M-Pesa payment error:', err);
      setError(err.message || 'Failed to initiate payment');
      setIsProcessing(false);
    }
  };

  const handleCancelPayment = async () => {
    if (currentTransaction?.checkoutRequestId) {
      try {
        await apiPost(`/mpesa/cancel/${currentTransaction.checkoutRequestId}`);
      } catch (err) {
        console.error('Error cancelling payment:', err);
      }
    }
    onCancel();
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <FaCheckCircle className="w-6 h-6 text-green-600" />;
      case 'failed':
      case 'cancelled':
      case 'timeout':
      case 'stock_unavailable':
        return <FaTimesCircle className="w-6 h-6 text-red-600" />;
      case 'pending':
        return <FaClock className="w-6 h-6 text-yellow-600" />;
      default:
        return <FaExclamationTriangle className="w-6 h-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'failed':
      case 'cancelled':
      case 'timeout':
      case 'stock_unavailable':
        return 'text-red-600';
      case 'pending':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <FaMobile className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">M-Pesa Payment</h3>
        </div>
        <p className="text-sm text-gray-600">Enter your M-Pesa phone number to receive payment request</p>
      </div>

      {/* Payment Form */}
      {!currentTransaction && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              M-Pesa Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="07XXXXXXXX or 2547XXXXXXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500 mt-1">
              Enter the phone number registered with M-Pesa
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Amount to pay:</span>
              <span className="font-bold text-lg text-gray-800">KES {amount.toFixed(2)}</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FaTimesCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleInitiatePayment}
              disabled={isProcessing || !phoneNumber.trim()}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <FaMobile className="w-4 h-4" />
                  Send Payment Request
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Payment Status */}
      {currentTransaction && (
        <div className="space-y-4">
          <div className="text-center">
            {getStatusIcon(currentTransaction.status)}
            <h4 className={`font-semibold mt-2 ${getStatusColor(currentTransaction.status)}`}>
              {currentTransaction.status === 'pending' && 'Payment Request Sent'}
              {currentTransaction.status === 'success' && 'Payment Successful'}
              {currentTransaction.status === 'failed' && 'Payment Failed'}
              {currentTransaction.status === 'cancelled' && 'Payment Cancelled'}
              {currentTransaction.status === 'timeout' && 'Payment Timed Out'}
              {currentTransaction.status === 'stock_unavailable' && 'Stock Unavailable'}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {currentTransaction.message || statusMessage}
            </p>
          </div>

          {currentTransaction.status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-medium text-blue-800 mb-2">Next Steps:</h5>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Check your phone for the M-Pesa prompt</li>
                <li>2. Enter your M-Pesa PIN when prompted</li>
                <li>3. Wait for payment confirmation</li>
                <li>4. Your order will be processed automatically</li>
              </ol>
            </div>
          )}

          {currentTransaction.status === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">Payment Details</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div>Receipt: {currentTransaction.mpesaReceipt || 'N/A'}</div>
                <div>Amount: KES {currentTransaction.amount.toFixed(2)}</div>
                <div>Phone: {currentTransaction.phoneNumber}</div>
              </div>
            </div>
          )}

          {(currentTransaction.status === 'failed' || currentTransaction.status === 'cancelled' || currentTransaction.status === 'timeout' || currentTransaction.status === 'stock_unavailable') && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <FaTimesCircle className="w-4 h-4 text-red-600" />
                <span className="font-medium text-red-800">Payment Failed</span>
              </div>
              <p className="text-sm text-red-700 mb-3">
                {currentTransaction.message || 'The payment could not be completed. Please try again or use a different payment method.'}
              </p>
              <button
                onClick={() => {
                  setCurrentTransaction(null);
                  setError(null);
                  setStatusMessage('');
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                Try Again
              </button>
            </div>
          )}

          {currentTransaction.status === 'pending' && (
            <div className="flex gap-3">
              <button
                onClick={handleCancelPayment}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel Payment
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 