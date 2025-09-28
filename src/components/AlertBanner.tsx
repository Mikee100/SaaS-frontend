"use client";
import {useState } from 'react';
import { FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTimes, FaBell } from 'react-icons/fa';

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read?: boolean;
  actionUrl?: string;
  actionText?: string;
}

interface AlertBannerProps {
  alerts?: Alert[];
  showToast?: boolean;
}

export default function AlertBanner({ alerts = [] }: AlertBannerProps) {
  // Mock alerts for demo - in real app, fetch from API
  const mockAlerts: Alert[] = [
    {
      id: '1',
      type: 'warning',
      title: 'Low Stock Alert',
      message: '5 products are running low on stock',
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      actionUrl: '/inventory',
      actionText: 'View Inventory',
    },
    {
      id: '2',
      type: 'info',
      title: 'Sales Target',
      message: 'You\'re 85% towards your monthly sales goal',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    },
    {
      id: '3',
      type: 'success',
      title: 'New Customer',
      message: 'Welcome your newest customer!',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    },
  ];

  const [localAlerts, setLocalAlerts] = useState<Alert[]>(alerts.length > 0 ? alerts : mockAlerts);
  const [showAll, setShowAll] = useState(false);
 
  // Temporarily disabled toast functionality to prevent re-rendering issues
  // useEffect(() => {
  //   // Show toast notifications for unread alerts (only once per alert)
  //   if (showToast) {
  //     localAlerts
  //       .filter(alert => !alert.read && !shownToastsRef.current.has(alert.id))
  //       .forEach(alert => {
  //         toast(alert.message, {
  //           icon: alert.type === 'warning' ? '⚠️' : alert.type === 'error' ? '❌' : alert.type === 'success' ? '✅' : 'ℹ️',
  //           duration: 5000,
  //         });
  //         shownToastsRef.current.add(alert.id);
  //       });
  //   }
  // }, [localAlerts, showToast]);

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'error':
        return <FaExclamationTriangle className="text-red-500" />;
      case 'success':
        return <FaCheckCircle className="text-green-500" />;
      case 'info':
      default:
        return <FaInfoCircle className="text-blue-500" />;
    }
  };

  const getAlertStyles = (type: Alert['type']) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'info':
      default:
        return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };


  const dismissAlert = (id: string) => {
    setLocalAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const unreadCount = localAlerts.filter(alert => !alert.read).length;
  const displayAlerts = showAll ? localAlerts : localAlerts.slice(0, 3);

  if (localAlerts.length === 0) {
    return null;
  }

  return (
    <>
      {/* <Toaster position="top-right" /> */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FaBell className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-800">Alerts & Notifications</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                {unreadCount} new
              </span>
            )}
          </div>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        </div>

        <div className="space-y-3">
          {displayAlerts.map((alert) => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border ${getAlertStyles(alert.type)} ${
                !alert.read ? 'ring-2 ring-opacity-50' : ''
              } ${alert.type === 'warning' ? 'ring-yellow-300' : ''}
                ${alert.type === 'error' ? 'ring-red-300' : ''}
                ${alert.type === 'success' ? 'ring-green-300' : ''}
                ${alert.type === 'info' ? 'ring-blue-300' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <h4 className="font-medium">{alert.title}</h4>
                    <p className="text-sm mt-1">{alert.message}</p>
                    <p className="text-xs mt-2 opacity-75">
                      {alert.timestamp.toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {alert.actionUrl && alert.actionText && (
                    <a
                      href={alert.actionUrl}
                      className="text-sm px-3 py-1 bg-white bg-opacity-50 rounded hover:bg-opacity-75 transition-colors"
                    >
                      {alert.actionText}
                    </a>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="p-1 hover:bg-black hover:bg-opacity-10 rounded"
                  >
                    <FaTimes className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {localAlerts.length > 3 && !showAll && (
          <div className="text-center mt-4">
            <button
              onClick={() => setShowAll(true)}
              className="text-sm text-gray-600 hover:text-gray-800"
            >
              View {localAlerts.length - 3} more alerts
            </button>
          </div>
        )}
      </div>
    </>
  );
}
