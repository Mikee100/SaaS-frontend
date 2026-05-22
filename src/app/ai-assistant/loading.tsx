import { FaRobot, FaSpinner } from 'react-icons/fa';

export default function Loading() {
  return (
    <div className="min-h-screen bg-white p-3">
      <div className="mx-auto mt-20 max-w-md rounded-md border border-gray-200 bg-white p-3 text-left">
        <div className="mb-2 inline-flex items-center justify-center rounded-md bg-gray-100 p-2">
          <FaRobot className="h-4 w-4 text-gray-700" />
        </div>
        <h2 className="mb-1 text-sm font-semibold text-gray-900">Loading AI Assistant</h2>
        <div className="flex items-center gap-2">
          <FaSpinner className="h-3.5 w-3.5 animate-spin text-gray-600" />
          <p className="text-xs text-gray-600">Preparing your workspace data...</p>
        </div>
      </div>
    </div>
  );
}
