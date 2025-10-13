import { FaRobot, FaSpinner } from 'react-icons/fa';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <FaRobot className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading AI Assistant</h2>
        <div className="flex items-center justify-center space-x-2">
          <FaSpinner className="animate-spin h-5 w-5 text-blue-600" />
          <p className="text-gray-600">Preparing your AI assistant...</p>
        </div>
      </div>
    </div>
  );
}
