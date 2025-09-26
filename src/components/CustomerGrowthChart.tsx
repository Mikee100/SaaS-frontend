import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUsers, FiTrendingUp, FiTrendingDown, FiInfo, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

interface DataPoint {
  date: Date;
  value: number;
  formattedDate: string;
  x?: number;
  y?: number;
}

interface TooltipData extends DataPoint {
  x: number;
  y: number;
}

interface CustomerGrowthChartProps {
  growthData: Record<string, number>;
  title?: string;
  height?: number;
  className?: string;
}

const GRADIENT_ID = 'customerGradient';
const LINE_COLOR = '#8b5cf6';
const HIGHLIGHT_COLOR = '#7c3aed';
const GRID_COLOR = '#f1f5f9';
const TEXT_COLOR = '#64748b';
const CARD_BG = 'rgba(255, 255, 255, 0.8)';
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.05)';
const TRANSITION_DURATION = '0.3s';

export default function CustomerGrowthChart({ 
  growthData = {}, 
  title = 'Customer Growth',
  height = 400,
  className = ''
}: CustomerGrowthChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('1M');
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        // Removed setDimensions and related code
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (!growthData || Object.keys(growthData).length === 0) {
    return (
      <div 
        ref={chartRef}
        className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300 ${
          isExpanded ? 'fixed inset-4 z-50 m-auto max-w-6xl max-h-[90vh]' : 'h-full'
        } ${className}`}
        style={{
          height: isExpanded ? '90vh' : `${height}px`,
          width: isExpanded ? '90vw' : '100%',
          maxWidth: isExpanded ? '1200px' : 'none',
        }}
      >
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center flex flex-col items-center justify-center" style={{ minHeight: `${height}px` }}>
          <div className="bg-gray-100 p-3 rounded-full mb-3">
            <FiUsers className="text-gray-400" size={24} />
          </div>
          <h3 className="text-gray-700 font-medium mb-1">No Customer Data</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            There&apos;s no customer data available for the selected time period.
          </p>
        </div>
      </div>
    );
  }

  // Format and sort data
  const sortedData = Object.entries(growthData).map(([date, value]) => {
    const d = new Date(date);
    return {
      date: d,
      value,
      formattedDate: d.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      })
    };
  }).sort((a, b) => a.date.getTime() - b.date.getTime());

  const values = sortedData.map(d => d.value);
  const maxValue = Math.max(...values, 1);
  const growthRate = ((values[values.length - 1] - values[0]) / (values[0] || 1)) * 100;
  const isPositive = growthRate >= 0;
  const totalChange = values[values.length - 1] - values[0];

  // Generate points for the line
  const points = sortedData.map((item, i) => {
    const x = (i / (sortedData.length - 1)) * 100;
    const y = 100 - (item.value / maxValue) * 90; // 90% of height to leave some padding
    return { 
      ...item,
      x, 
      y 
    };
  });

  // Create smooth curve for the line
  const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const linePath = `M${linePoints}`;
  
  // Create path for the area with curve
  const areaPath = `
    M0,100 
    L0,${points[0]?.y || 100} 
    ${points.map(p => `L${p.x},${p.y}`).join(' ')} 
    L${points[points.length - 1]?.x || 100},100 
    Z
  `;

  // Handle point hover for tooltip
  const handlePointHover = (point: DataPoint, isHovered: boolean) => {
    if (isHovered && point.x !== undefined && point.y !== undefined) {
      setTooltip({
        ...point,
        x: point.x,
        y: point.y,
        date: point.date,
        value: point.value,
        formattedDate: point.formattedDate
      });
    } else {
      setTooltip(null);
    }
  };

  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Format number with K/M suffix
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  return (
    <div 
      ref={chartRef}
      className={`bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 m-auto max-w-6xl max-h-[90vh]' : 'h-full'
      } ${className}`}
      style={{
        height: isExpanded ? '90vh' : `${height}px`,
        width: isExpanded ? '90vw' : '100%',
        maxWidth: isExpanded ? '1200px' : 'none',
      }}
    >
      {isExpanded && (
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={toggleExpanded}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
            aria-label="Minimize chart"
          >
            <FiMinimize2 size={20} />
          </button>
        </div>
      )}

      <motion.div 
        className="h-full flex flex-col"
        initial={false}
        animate={{ opacity: 1 }}
        layout
      >
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 px-6 pt-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiUsers className="mr-2 text-purple-500" size={20} />
              {title}
              <button 
                onClick={() => {}}
                className="ml-2 text-gray-400 hover:text-gray-600"
                title="More information"
              >
                <FiInfo size={16} />
              </button>
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {activeFilter === '1W' ? 'Last 7 days' : 
               activeFilter === '1M' ? 'Last 30 days' :
               activeFilter === '3M' ? 'Last 90 days' :
               activeFilter === '1Y' ? 'Last 12 months' : 'All time'}
            </p>
          </div>
          
          <div className="flex items-center mt-3 sm:mt-0 space-x-1 bg-gray-50 p-1 rounded-lg">
            {['1W', '1M', '3M', '1Y', 'ALL'].map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeFilter === filter
                    ? 'bg-white shadow-sm text-purple-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-4">
          <div className="bg-purple-50 p-4 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-purple-600">Total Customers</p>
                <p className="text-xl font-bold text-gray-900">{formatNumber(values[values.length - 1])}</p>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiUsers className="text-purple-600" size={20} />
              </div>
            </div>
            <div className="mt-2 flex items-center text-xs">
              <span className={`inline-flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
                {Math.abs(growthRate).toFixed(1)}% from last period
              </span>
            </div>
          </div>
          
          <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500">New This Period</p>
                <p className="text-lg font-semibold text-gray-900">
                  {totalChange >= 0 ? '+' : ''}{formatNumber(totalChange)}
                </p>
              </div>
              <div className="p-2 bg-gray-50 rounded-lg">
                <FiTrendingUp className="text-gray-600" size={20} />
              </div>
            </div>
            <div className="mt-2 text-xs text-gray-500">
              {sortedData.length} data points
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="relative flex-1 min-h-[300px] p-6 pt-2 pb-6">
          <div className="absolute inset-0 w-full h-full">
            <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
              {/* Background */}
              <rect width="100%" height="100%" fill="white" />
              
              {/* Grid lines */}
              {[0, 25, 50, 75, 100].map((y, i) => (
                <line 
                  key={`h-grid-${i}`}
                  x1="0" 
                  y1={y} 
                  x2="100" 
                  y2={y} 
                  stroke={GRID_COLOR}
                  strokeWidth="0.5"
                  strokeDasharray="4 2"
                />
              ))}
              
              {/* Vertical grid lines */}
              {points.length > 0 && points.map((point, i) => {
                if (i % Math.ceil(points.length / 5) === 0) {
                  return (
                    <line 
                      key={`v-grid-${i}`}
                      x1={point.x} 
                      y1="0" 
                      x2={point.x} 
                      y2="100" 
                      stroke={GRID_COLOR}
                      strokeWidth="0.5"
                      strokeDasharray="4 2"
                    />
                  );
                }
                return null;
              })}
              
              {/* Y-axis labels */}
              {[0, 25, 50, 75, 100].map((y, i) => {
                const value = maxValue ? (maxValue * (100 - y) / 100).toFixed(maxValue < 100 ? 1 : 0) : 0;
                return (
                  <text
                    key={`y-label-${i}`}
                    x="-10"
                    y={y + 3}
                    textAnchor="end"
                    fontSize="8"
                    fill={TEXT_COLOR}
                    className="font-sans text-[8px] font-medium"
                  >
                    {formatNumber(Number(value))}
                  </text>
                );
              })}
              
              {/* Area fill */}
              <path 
                d={areaPath}
                fill={`url(#${GRADIENT_ID})`}
                fillOpacity="0.15"
                stroke="none"
                style={{ transition: `fill-opacity ${TRANSITION_DURATION} ease` }}
              />
              
              <defs>
                <linearGradient id={GRADIENT_ID} x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
                </linearGradient>
              </defs>
              
              {/* Main line */}
              <path 
                d={linePath}
                fill="none"
                stroke={LINE_COLOR}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  filter: 'drop-shadow(0px 2px 4px rgba(139, 92, 246, 0.3))',
                  transition: `stroke ${TRANSITION_DURATION} ease, stroke-width ${TRANSITION_DURATION} ease`
                }}
              />
              
              {/* Data points */}
              {points.map((point, i) => (
                <g 
                  key={i}
                  onMouseEnter={() => handlePointHover(point, true)}
                  onMouseLeave={() => handlePointHover(point, false)}
                  className="cursor-pointer"
                >
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={tooltip && tooltip.date.getTime() === point.date.getTime() ? 8 : 5}
                    fill="white"
                    stroke={tooltip && tooltip.date.getTime() === point.date.getTime() ? HIGHLIGHT_COLOR : LINE_COLOR}
                    strokeWidth={tooltip && tooltip.date.getTime() === point.date.getTime() ? 3 : 2}
                    className="transition-all duration-300 ease-out"
                    style={{
                      filter: 'drop-shadow(0px 2px 4px rgba(139, 92, 246, 0.3))',
                      opacity: tooltip && tooltip.date.getTime() !== point.date.getTime() ? 0 : 1,
                      transition: `r ${TRANSITION_DURATION} ease, stroke ${TRANSITION_DURATION} ease, opacity 0.2s ease`
                    }}
                  >
                    <title>
                      {point.value.toLocaleString()} customers on {point.formattedDate}
                    </title>
                  </circle>
                  
                  {/* Hover effect */}
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={tooltip?.date.getTime() === point.date.getTime() ? 20 : 0}
                    fill={HIGHLIGHT_COLOR}
                    fillOpacity={tooltip?.date.getTime() === point.date.getTime() ? 0.08 : 0}
                    className="pointer-events-none"
                    style={{
                      transition: `r ${TRANSITION_DURATION} ease, fill-opacity ${TRANSITION_DURATION} ease`
                    }}
                  />
                </g>
              ))}
              
              {/* Tooltip line */}
              {tooltip && (
                <line
                  x1={tooltip.x}
                  y1="0"
                  x2={tooltip.x}
                  y2="100"
                  stroke={HIGHLIGHT_COLOR}
                  strokeWidth="0.5"
                  strokeDasharray="4 2"
                  className="pointer-events-none"
                />
              )}
            </svg>
            
            {/* Tooltip */}
            <AnimatePresence>
              {tooltip && (
                <motion.div
                  className="absolute rounded-xl shadow-xl p-3 pointer-events-none z-10 backdrop-blur-sm"
                  style={{
                    background: CARD_BG,
                    boxShadow: `0 10px 15px -3px ${SHADOW_COLOR}, 0 4px 6px -2px ${SHADOW_COLOR}`,
                    border: '1px solid rgba(226, 232, 240, 0.7)',
                    left: `${tooltip.x}%`,
                    top: `${tooltip.y - 80}px`,
                    transform: 'translateX(-50%)',
                    minWidth: '160px'
                  }}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {tooltip.formattedDate}
                  </div>
                  <div className="text-xl font-bold text-purple-600">
                    {tooltip.value.toLocaleString()} customers
                  </div>
                  <div 
                    className="absolute -bottom-1.5 left-1/2 w-3 h-3 bg-white border-r border-b border-gray-100 transform -translate-x-1/2 rotate-45"
                    style={{
                      boxShadow: '2px 2px 2px -1px rgba(0,0,0,0.05)'
                    }}
                  ></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* X-axis labels */}
        <div className="px-6 pb-2 flex justify-between text-xs text-gray-400">
          {points.length > 0 && (
            <>
              <div>{new Date(sortedData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              <div className="text-center w-full">
                {activeFilter === '1W' ? 'Last 7 Days' : 
                 activeFilter === '1M' ? 'Last 30 Days' :
                 activeFilter === '3M' ? 'Last 90 Days' :
                 activeFilter === '1Y' ? 'Last 12 Months' : 'All Time'}
              </div>
              <div>{new Date(sortedData[sortedData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </>
          )}
        </div>
        
        {!isExpanded && (
          <div className="absolute top-4 right-4">
            <button
              onClick={toggleExpanded}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full"
              aria-label="Expand chart"
            >
              <FiMaximize2 size={18} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}