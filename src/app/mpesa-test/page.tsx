"use client";
import { useState } from 'react';
import { apiPost } from '@/utils/api';
import AuthGuard from '@/components/AuthGuard';
import { FaMobile, FaSpinner, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

export default function MpesaTestPage() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState(10);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestPayment = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    if (amount < 10) {
      setError('Minimum amount is 10 KES');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiPost('/mpesa/initiate', {
        phoneNumber: phoneNumber.replace(/^0/, '254').replace(/^\+/, ''),
        amount: Math.floor(amount),
        saleData: {
          items: [{ productId: 'test', quantity: 1, price: amount }],
          total: amount,
          paymentMethod: 'mpesa',
          customerName: 'Test Customer',
          customerPhone: phoneNumber,
          idempotencyKey: `test_${Date.now()}`
        }
      });

      setResult(response);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate payment');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AuthGuard>
      <div className="p-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">M-Pesa Integration Test</h1>
          <p className="text-gray-600">Test the M-Pesa payment integration with sandbox credentials</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
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
              Use a valid Kenyan phone number format
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (KES)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              min="10"
              step="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500 mt-1">
              Minimum amount is 10 KES
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2">
                <FaTimesCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleTestPayment}
            disabled={isProcessing || !phoneNumber.trim()}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <FaSpinner className="w-4 h-4 animate-spin" />
                Testing Payment...
              </>
            ) : (
              <>
                <FaMobile className="w-4 h-4" />
                Test M-Pesa Payment
              </>
            )}
          </button>

          {result && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <FaCheckCircle className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-800">Test Result</span>
              </div>
              <pre className="text-sm text-green-700 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-medium text-blue-800 mb-2">Test Instructions:</h3>
            <ol className="text-sm text-blue-700 space-y-1">
              <li>1. Enter a valid Kenyan phone number</li>
              <li>2. Set an amount (minimum 10 KES)</li>
              <li>3. Click "Test M-Pesa Payment"</li>
              <li>4. Check your phone for the M-Pesa prompt</li>
              <li>5. Use PIN: 1234 (sandbox)</li>
              <li>6. Check the transaction status in M-Pesa Transactions page</li>
            </ol>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
} 