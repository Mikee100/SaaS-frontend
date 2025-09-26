"use client";
import { FaCalculator, FaHistory, FaUser, FaPrint, FaDownload, FaQrcode, FaKeyboard } from 'react-icons/fa';

interface QuickActionProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
  disabled?: boolean;
}

export function QuickAction({ icon, label, onClick, color = "bg-blue-500", disabled = false }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-3 rounded-lg text-white transition-all duration-200 hover:scale-105 ${
        disabled ? 'bg-gray-400 cursor-not-allowed' : color
      }`}
      title={label}
    >
      <div className="flex flex-col items-center gap-1">
        <div className="text-xl">{icon}</div>
        <span className="text-xs font-medium">{label}</span>
      </div>
    </button>
  );
}

export function QuickActionsPanel() {
  const actions = [
    {
      icon: <FaCalculator />,
      label: "Calculator",
      action: () => window.open('/calculator', '_blank'),
      color: "bg-blue-500"
    },
    {
      icon: <FaHistory />,
      label: "History",
      action: () => window.open('/sales/history', '_blank'),
      color: "bg-green-500"
    },
    {
      icon: <FaUser />,
      label: "Customers",
      action: () => window.open('/users', '_blank'),
      color: "bg-purple-500"
    },
    {
      icon: <FaPrint />,
      label: "Print",
      action: () => window.print(),
      color: "bg-orange-500"
    },
    {
      icon: <FaDownload />,
      label: "Export",
      action: () => console.log('Export sales data'),
      color: "bg-indigo-500"
    },
    {
      icon: <FaQrcode />,
      label: "Scan",
      action: () => console.log('Open scanner'),
      color: "bg-teal-500"
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
        <FaKeyboard className="text-blue-600" />
        Quick Actions
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action, index) => (
          <QuickAction
            key={index}
            icon={action.icon}
            label={action.label}
            onClick={action.action}
            color={action.color}
          />
        ))}
      </div>
    </div>
  );
} 