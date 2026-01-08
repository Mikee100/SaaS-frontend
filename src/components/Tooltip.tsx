"use client";
import { useState, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  children: ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export default function Tooltip({ children, content, position = 'right' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({});
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const style: React.CSSProperties = {
        position: 'fixed',
        zIndex: 9999,
      };

      switch (position) {
        case 'top':
          style.top = rect.top - 8;
          style.left = rect.left + rect.width / 2;
          style.transform = 'translateX(-50%)';
          break;
        case 'bottom':
          style.top = rect.bottom + 8;
          style.left = rect.left + rect.width / 2;
          style.transform = 'translateX(-50%)';
          break;
        case 'left':
          style.top = rect.top + rect.height / 2;
          style.left = rect.left - 8;
          style.transform = 'translateY(-50%)';
          break;
        case 'right':
          style.top = rect.top + rect.height / 2;
          style.left = rect.right + 8;
          style.transform = 'translateY(-50%)';
          break;
      }

      setTooltipStyle(style);
    }
  }, [isVisible, position]);

  return (
    <>
      <div 
        ref={triggerRef}
        className="relative block w-full"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && typeof window !== 'undefined' && createPortal(
        <div 
          className="px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg whitespace-nowrap"
          style={tooltipStyle}
        >
          {content}
          {/* Arrow */}
          <div className={`absolute w-0 h-0 border-4 border-transparent ${
            position === 'top' ? 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-900' :
            position === 'bottom' ? 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-900' :
            position === 'left' ? 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-900' :
            'right-full top-1/2 transform -translate-y-1/2 border-r-gray-900'
          }`} />
        </div>,
        document.body
      )}
    </>
  );
}