"use client";

import { useState, useRef, useEffect } from 'react';
import { format, subDays, subMonths, isSameDay, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DateRangePickerProps {
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  className?: string;
  presets?: {
    label: string;
    value: 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'custom';
  }[];
}

export default function DateRangePicker({ 
  onDateRangeChange, 
  className = '',
  presets = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Week', value: 'thisWeek' },
    { label: 'Last Week', value: 'lastWeek' },
    { label: 'This Month', value: 'thisMonth' },
    { label: 'Last Month', value: 'lastMonth' },
    { label: 'Custom', value: 'custom' },
  ]
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<string>('thisWeek');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [tempRange, setTempRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Initialize with default range
  useEffect(() => {
    applyPreset('thisWeek');
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const applyPreset = (preset: string) => {
    const today = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (preset) {
      case 'today':
        start = today;
        end = today;
        break;
      case 'yesterday':
        start = subDays(today, 1);
        end = subDays(today, 1);
        break;
      case 'thisWeek':
        start = subDays(today, today.getDay());
        end = new Date();
        break;
      case 'lastWeek':
        start = subDays(today, today.getDay() + 7);
        end = subDays(today, today.getDay() + 1);
        break;
      case 'thisMonth':
        start = startOfMonth(today);
        end = new Date();
        break;
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        start = startOfMonth(lastMonth);
        end = endOfMonth(lastMonth);
        break;
      case 'custom':
        setShowCustomPicker(true);
        return;
    }

    setDateRange({ start, end });
    setTempRange({ start, end });
    onDateRangeChange({ start, end });
    setShowCustomPicker(false);
  };

  const handleDateSelect = (date: Date) => {
    if (!tempRange.start || (tempRange.start && tempRange.end)) {
      // Start a new range
      setTempRange({ start: date, end: null });
    } else {
      // Complete the range
      const start = date < tempRange.start! ? date : tempRange.start;
      const end = date < tempRange.start! ? tempRange.start : date;
      setTempRange({ start, end });
      setDateRange({ start, end });
      onDateRangeChange({ start, end });
      setShowCustomPicker(false);
    }
  };

  const isInRange = (date: Date) => {
    if (!tempRange.start) return false;
    if (tempRange.start && !tempRange.end) {
      return isSameDay(date, tempRange.start);
    }
    if (tempRange.start && tempRange.end) {
      return isWithinInterval(date, { start: tempRange.start, end: tempRange.end });
    }
    return false;
  };

  const formatDateRange = () => {
    if (!dateRange.start) return 'Select date range';
    if (!dateRange.end) return format(dateRange.start, 'MMM d, yyyy');
    if (isSameDay(dateRange.start, dateRange.end)) {
      return format(dateRange.start, 'MMM d, yyyy');
    }
    return `${format(dateRange.start, 'MMM d')} - ${format(dateRange.end, 'MMM d, yyyy')}`;
  };

  const renderCustomDatePicker = () => {
    const days = [];
    const today = new Date();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(today.getFullYear(), today.getMonth(), i);
      days.push(date);
    }

    return (
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1 text-xs text-center text-gray-500 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const isSelected = isInRange(date);
            const isToday = isSameDay(date, new Date());
            
            return (
              <button
                key={index}
                onClick={() => handleDateSelect(date)}
                className={`w-8 h-8 rounded-full text-sm flex items-center justify-center ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : isToday
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'hover:bg-gray-100'
                }`}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`} ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <CalendarIcon className="w-4 h-4 text-gray-500" />
        <span>{formatDateRange()}</span>
        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-10 mt-1 w-72 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
          >
            {!showCustomPicker ? (
              <div className="p-2">
                <div className="grid grid-cols-2 gap-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => {
                        setSelectedPreset(preset.value);
                        applyPreset(preset.value);
                      }}
                      className={`px-3 py-2 text-sm text-left rounded-md ${
                        selectedPreset === preset.value
                          ? 'bg-indigo-50 text-indigo-700'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between p-3 border-b">
                  <h3 className="text-sm font-medium text-gray-900">Select date range</h3>
                  <button
                    onClick={() => setShowCustomPicker(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                {renderCustomDatePicker()}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
