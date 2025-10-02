"use client";
import { useState } from 'react';
import { FaEnvelope, FaPaperPlane, FaTimes } from 'react-icons/fa';

export default function ContactPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // TODO: Implement actual API call to send message
    // For now, just simulate submission
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      // Reset form
      setSubject('');
      setMessage('');
      setIsUrgent(false);
    }, 1000);
  };

  const handleCancel = () => {
    setSubject('');
    setMessage('');
    setIsUrgent(false);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <FaPaperPlane className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-green-800 mb-2">Message Sent Successfully!</h2>
          <p className="text-green-700 mb-4">
            Thank you for contacting us. We typically respond within 24 hours for standard inquiries and within 4 hours for urgent issues.
          </p>
          <button
            onClick={() => setSubmitted(false)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Admin</h1>
        <p className="text-gray-600">Get in touch with our support team</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center gap-3 mb-6">
          <FaEnvelope className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">Send a Message</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a subject...</option>
              <option value="general">General Support</option>
              <option value="technical">Technical Issue</option>
              <option value="feature">Feature Request</option>
              <option value="billing">Billing Question</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              rows={8}
              placeholder="Please describe your issue or question in detail..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="urgent"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="urgent" className="text-sm text-gray-700 cursor-pointer">
              Mark as urgent (requires faster response)
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !subject || !message}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <FaPaperPlane className="w-4 h-4" />
                  Send Message
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FaTimes className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-800 mb-2">Response Time</h3>
          <p className="text-sm text-blue-600">
            We typically respond within 24 hours for standard inquiries and within 4 hours for urgent issues.
            For critical technical issues, please call our support hotline.
          </p>
        </div>
      </div>
    </div>
  );
}
