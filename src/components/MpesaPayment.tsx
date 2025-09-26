"use client";
import { useState, useEffect } from 'react';
import { apiPost, apiGet } from '@/utils/api';
import { FaMobile, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

interface MpesaPaymentProps {
  amount: number;
  saleData?: Record<string, unknown>;
  onSuccess: (transactionId: string) => void;
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

export default function MpesaPayment({ amount, saleData, onSuccess, onCancel }: MpesaPaymentProps) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTransaction, setCurrentTransaction] = useState<MpesaTransaction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Status polling with exponential backoff
  useEffect(() => {
    let interval: NodeJS.Timeout;
    let attempt = 0;
    const maxAttempts = 15;
    const baseDelay = 3000;
    let isMounted = true;
    
    const checkPaymentStatus = async () => {
      if (!currentTransaction?.checkoutRequestId || !isMounted) {
        console.log('Skipping status check: No checkoutRequestId or component unmounted');
        return;
      }
      
      console.log(`Checking payment status (attempt ${attempt + 1}/${maxAttempts})`);
      
      try {
        const response = await apiGet(`/mpesa/status/${currentTransaction.checkoutRequestId}`);
        console.log('Payment status response:', response);
        
        type MpesaStatusResponse = {
          success: boolean;
          data: MpesaTransaction;
          error?: string;
        };

        const resp = response as MpesaStatusResponse;
        if (
          typeof response === 'object' &&
          response !== null &&
          'success' in response &&
          resp.success &&
          'data' in response
        ) {
          const updatedTransaction = resp.data;
          console.log('Updated transaction status:', updatedTransaction.status);
          
          if (currentTransaction.status !== updatedTransaction.status) {
            console.log('Status changed from', currentTransaction.status, 'to', updatedTransaction.status);
            setCurrentTransaction(updatedTransaction);
          }
          
          switch (updatedTransaction.status) {
            case 'success':
              console.log('Payment successful, preparing success flow...');
              setStatusMessage('Payment successful! Processing your order...');
              if (interval) clearTimeout(interval);
              setTimeout(() => {
                if (isMounted) {
                  console.log('Calling onSuccess callback with transaction ID:', updatedTransaction.id);
                  onSuccess(updatedTransaction.id);
                }
              }, 1000);
              return;
              
            case 'failed':
              console.log('Payment failed:', updatedTransaction.message);
              setError(updatedTransaction.message || 'Payment was not completed');
              setIsProcessing(false);
              return;
              
            case 'cancelled':
              console.log('Payment was cancelled');
              setError('Payment was cancelled');
              setIsProcessing(false);
              return;
              
            case 'timeout':
              console.log('Payment request timed out');
              setError('Payment request timed out. Please try again.');
              setIsProcessing(false);
              return;
              
            case 'stock_unavailable':
              console.log('Stock unavailable for items');
              setError('Some items in your cart are no longer available. Please try again.');
              setIsProcessing(false);
              return;
              
            case 'pending':
              console.log('Payment still pending...');
              break;
              
            default:
              console.warn('Unknown status received:', updatedTransaction.status);
              break;
          }
        } else {
          console.warn('Unexpected response format:', response);
        }
      } catch (err) {
        console.error('Error checking payment status:', err);
      }
      
      attempt++;
      
      if (attempt >= maxAttempts) {
        console.log('Max attempts reached, stopping polling');
        if (isMounted) {
          setError('Payment verification is taking longer than expected. Please check your M-Pesa statement and contact support if needed.');
          setIsProcessing(false);
        }
        return;
      }
      
      const delay = Math.min(baseDelay * Math.pow(2, Math.floor(attempt / 2)), 30000);
      console.log(`Next check in ${delay}ms`);
      
      if (isMounted) {
        interval = setTimeout(checkPaymentStatus, delay);
      }
    };
    
    if (currentTransaction?.status === 'pending' && isMounted) {
      console.log('Starting payment status polling...');
      checkPaymentStatus();
    }
    
    return () => {
      console.log('Cleaning up payment status polling');
      isMounted = false;
      if (interval) clearTimeout(interval);
    };
  }, [currentTransaction, onSuccess]);

  const validatePhoneNumber = (phone: string) => {
    // Accepts:
    // - 07XXXXXXXX (10 digits starting with 07)
    // - 7XXXXXXXX (9 digits starting with 7)
    // - 2547XXXXXXXX (12 digits starting with 254)
    // - +2547XXXXXXXX (13 digits starting with +254)
    const phoneRegex = /^(?:07\d{8}|7\d{8}|2547\d{8}|\+2547\d{8})$/;
    return phoneRegex.test(phone);
  };

  const formatPhoneNumber = (phone: string) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('0')) {
      // Convert 07... to 2547...
      return '254' + cleaned.substring(1);
    } else if (cleaned.startsWith('254')) {
      // Already in 254 format
      return cleaned;
    } else if (cleaned.startsWith('7') && cleaned.length === 9) {
      // Convert 7... to 2547...
      return '254' + cleaned;
    } else if (cleaned.startsWith('+254')) {
      // Convert +254... to 254...
      return cleaned.substring(1);
    }
    
    // If we get here, the format isn't recognized, but we'll try to use it as is
    return cleaned;
  };

  const handleInitiatePayment = async () => {
    console.log('Initiating M-Pesa payment...');
    if (!phoneNumber.trim()) {
      console.log('Validation failed: No phone number');
      setError('Please enter a phone number');
      return;
    }

    if (!validatePhoneNumber(phoneNumber)) {
      console.log('Validation failed: Invalid phone number format');
      setError('Please enter a valid phone number (07XXXXXXXX, 2547XXXXXXXX, or +2547XXXXXXXX)');
      return;
    }

    if (amount < 10) {
      console.log('Validation failed: Amount too low');
      setError('Minimum amount is 10 KES');
      return;
    }

    console.log('Setting up payment request...');
    setIsProcessing(true);
    setError(null);
    setStatusMessage('Initiating payment request...');

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      const reference = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      
      console.log('Sending payment request to server...', {
        phoneNumber: formattedPhone,
        amount: Math.ceil(amount),
        reference,
        saleData: {
          ...saleData,
          reference,
          timestamp: new Date().toISOString()
        }
      });
      
      const response = await apiPost('/mpesa/initiate', {
        phoneNumber: formattedPhone,
        amount: Math.ceil(amount),
        accountReference: reference,
        transactionDesc: `Payment for order ${reference}`,
        saleData: {
          ...saleData,
          reference,
          timestamp: new Date().toISOString()
        }
      });

      console.log('Payment initiation response:', response);

      // Type guard for response
      if (
        typeof response === 'object' &&
        response !== null &&
        'success' in response
      ) {
        const res = response as {
          success: boolean;
          data?: { transactionId: string; checkoutRequestId: string };
          error?: string;
        };

        if (res.success) {
          console.log('Payment initiated successfully, starting polling...');
          setCurrentTransaction({
            id: res.data!.transactionId,
            phoneNumber: formattedPhone,
            amount: Math.ceil(amount),
            status: 'pending',
            checkoutRequestId: res.data!.checkoutRequestId,
            message: 'Payment request sent to your phone',
            createdAt: new Date().toISOString()
          });

          setStatusMessage('Payment request sent to your phone. Please check your M-Pesa app and enter your PIN.');
        } else {
          console.error('Payment initiation failed:', res.error);
          throw new Error(res.error || 'Failed to initiate payment');
        }
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || 'Failed to process payment');
      } else {
        setError('Failed to process payment');
      }
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
        <p className="text-sm text-gray-600">
          {currentTransaction?.status === 'pending' 
            ? 'Waiting for payment confirmation...' 
            : 'Enter your M-Pesa phone number to receive payment request'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaTimesCircle className="h-5 w-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Status Message */}
      {statusMessage && (
        <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              {isProcessing ? (
                <FaSpinner className="h-5 w-5 text-blue-600 animate-spin" />
              ) : (
                <FaCheckCircle className="h-5 w-5 text-blue-600" />
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">{statusMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Payment Form */}
      {!currentTransaction?.checkoutRequestId && (
        <div className="space-y-4">
          <div>
            <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
              M-Pesa Phone Number
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">+254</span>
              </div>
              <input
                type="tel"
                name="phoneNumber"
                id="phoneNumber"
                value={phoneNumber}
                onChange={(e) => {
                  // Remove all non-digit characters
                  const value = e.target.value.replace(/\D/g, '');
                  
                  // Auto-format as user types
                  let formatted = '';
                  if (value.startsWith('0')) {
                    // If starts with 0, keep it but limit to 10 digits total
                    formatted = value.substring(0, 10);
                  } else if (value.startsWith('254')) {
                    // If starts with 254, limit to 12 digits total
                    formatted = value.substring(0, 12);
                  } else if (value.startsWith('7')) {
                    // If starts with 7, limit to 9 digits
                    formatted = value.substring(0, 9);
                  } else {
                    // Otherwise just take the first 12 digits
                    formatted = value.substring(0, 12);
                  }
                  
                  setPhoneNumber(formatted);
                }}
                className="pl-12 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="7XXXXXXXX"
                disabled={isProcessing}
                autoComplete="tel"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Enter your M-Pesa registered phone number
            </p>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>Amount to pay:</span>
              <span className="font-semibold">KES {amount.toLocaleString()}</span>
            </div>
            <div className="text-xs text-gray-500">
              A payment request will be sent to your phone
            </div>
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleInitiatePayment}
              disabled={isProcessing || !phoneNumber.trim()}
              className={`flex-1 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isProcessing || !phoneNumber.trim()
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
              }`}
            >
              {isProcessing ? (
                <>
                  <FaSpinner className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Processing...
                </>
              ) : (
                'Pay Now'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Payment Status */}
      {currentTransaction?.checkoutRequestId && (
        <div className="text-center py-4">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            {currentTransaction.status === 'pending' ? (
              <FaSpinner className="h-6 w-6 text-blue-600 animate-spin" />
            ) : currentTransaction.status === 'success' ? (
              <FaCheckCircle className="h-6 w-6 text-green-600" />
            ) : (
              <FaTimesCircle className="h-6 w-6 text-red-600" />
            )}
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            {currentTransaction.status === 'pending' 
              ? 'Waiting for Payment...' 
              : currentTransaction.status === 'success'
              ? 'Payment Successful!'
              : 'Payment Failed'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {currentTransaction.message || 'Processing your payment...'}
          </p>
          
          {currentTransaction.status === 'pending' && (
            <div className="mt-4">
              <div className="text-xs text-gray-500 mb-2">
                Haven&apos;t received the request?
              </div>
              <button
                type="button"
                onClick={handleInitiatePayment}
                disabled={isProcessing}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {isProcessing ? (
                  <>
                    <FaSpinner className="animate-spin -ml-1 mr-1 h-3 w-3" />
                    Resending...
                  </>
                ) : (
                  'Resend Payment Request'
                )}
              </button>
            </div>
          )}
          
          {currentTransaction.status !== 'pending' && (
            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  if (currentTransaction.status === 'success') {
                    onSuccess(currentTransaction.id);
                  } else {
                    onCancel();
                  }
                }}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {currentTransaction.status === 'success' ? 'Continue' : 'Try Again'}
              </button>
            </div>
          )}
        </div>
      )}
      {currentTransaction?.status === 'failed' && (
        <div className="mt-4 text-center">
          <p>We couldn&apos;t process your payment. Please try again.</p>
        </div>
      )}
    </div>
  );
}
