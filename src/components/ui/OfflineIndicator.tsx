"use client";

import { useDashboard } from '@/contexts/DashboardContext';

const OfflineIndicator = () => {
  const { isOnline, error } = useDashboard();

  if (isOnline && !error) {
    return null;
  }

  const getBackgroundColor = () => {
    if (error) return 'bg-red-500'; // Error state
    if (!isOnline) return 'bg-yellow-500'; // Offline state
    return 'bg-gray-500'; // Default, should not be seen
  };

  const getMessage = () => {
    if (error) return error;
    if (!isOnline) return "You are currently offline. Changes will be synced when you're back online.";
    return '';
  };

  return (
    <div className={`fixed bottom-0 left-0 right-0 p-2 text-white text-center text-sm ${getBackgroundColor()}`}>
      {getMessage()}
    </div>
  );
};

export default OfflineIndicator;
