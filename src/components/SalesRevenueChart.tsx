import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiInfo, FiDollarSign, FiTrendingUp, FiTrendingDown, FiMaximize2, FiMinimize2 } from 'react-icons/fi';

interface DataPoint {
  date: Date;
  amount: number;
  formattedDate: string;
  formattedMonth: string;
  formattedDay: string;
  isHovered?: boolean;
  x?: number;
  y?: number;
}

interface TooltipData extends DataPoint {
  x: number;
  y: number;
}

interface SalesRevenueChartProps {
  salesData: Record<string, number>;
  title?: string;
  height?: number;
  className?: string;
}

const GRADIENT_ID = 'salesGradient';
const LINE_COLOR = '#4f46e5';
const HIGHLIGHT_COLOR = '#4338ca';
const GRID_COLOR = '#f1f5f9';
const TEXT_COLOR = '#64748b';
const CARD_BG = 'rgba(255, 255, 255, 0.8)';
const SHADOW_COLOR = 'rgba(0, 0, 0, 0.05)';
const TRANSITION_DURATION = '0.3s';

export default function SalesRevenueChart({ 
  salesData = {}, 
  title = 'Sales Revenue',
  height = 400,
  className = ''
}: SalesRevenueChartProps) {
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('1M');
  const chartRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (chartRef.current) {
        setDimensions({
          width: chartRef.current.offsetWidth,
          height: chartRef.current.offsetHeight
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (!salesData || Object.keys(salesData).length === 0) {
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
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full"
              aria-label="Minimize chart"
            >
              <FiMinimize2 size={20} />
            </button>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center flex flex-col items-center justify-center" style={{ minHeight: `${height}px` }}>
          <div className="bg-gray-100 p-3 rounded-full mb-3">
            <FiDollarSign className="text-gray-400" size={24} />
          </div>
          <h3 className="text-gray-700 font-medium mb-1">No Sales Data</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            There's no sales data available for the selected time period.
          </p>
        </div>
      </div>
    );
  }

  // Format and sort data
  const sortedData = React.useMemo(() => {
    return Object.entries(salesData)
      .map(([date, amount]) => {
        const d = new Date(date);
        return {
          date: d,
          amount,
          formattedDate: d.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
          }),
          formattedMonth: d.toLocaleDateString('en-US', { month: 'short' }),
          formattedDay: d.getDate().toString(),
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [salesData]);

  // Calculate metrics
  const { totalRevenue, maxRevenue, minRevenue, avgRevenue, percentChange } = React.useMemo(() => {
    const total = sortedData.reduce((sum, item) => sum + item.amount, 0);
    const max = Math.max(...sortedData.map(item => item.amount), 0);
    const min = Math.min(...sortedData.map(item => item.amount), 0);
    const avg = sortedData.length > 0 ? total / sortedData.length : 0;
    
    // Calculate percentage change from previous period
    let change = 0;
    if (sortedData.length > 1) {
      const lastPeriod = sortedData[sortedData.length - 1].amount;
      const prevPeriod = sortedData[sortedData.length - 2].amount;
      change = prevPeriod ? ((lastPeriod - prevPeriod) / prevPeriod) * 100 : 0;
    }
    
    return {
      totalRevenue: total,
      maxRevenue: max,
      minRevenue: min,
      avgRevenue: avg,
      percentChange: change
    };
  }, [sortedData]);

  // Generate SVG paths and points
  const { points, areaPath, linePath } = React.useMemo(() => {
    if (sortedData.length === 0) return { points: [], areaPath: '', linePath: '' };
    
    const paddingTop = 20; // Extra padding at the top
    const paddingBottom = 30; // Extra padding at the bottom
    const effectiveHeight = 100 - paddingTop - paddingBottom;
    
    const points = sortedData.map((item, i) => {
      const x = (i / (sortedData.length - 1 || 1)) * 100;
      const y = paddingTop + (1 - (item.amount / (maxRevenue || 1))) * effectiveHeight;
      return { 
        ...item, 
        x, 
        y,
        isHovered: false
      };
    });
    
    // Create smooth curve for the line
    const linePoints = points.map(p => `${p.x},${p.y}`).join(' ');
    const linePath = `M${linePoints}`;
    
    // Create path for the area with curve
    const areaPoints = [
      `M0,${100 - paddingBottom}`,
      `L0,${points[0]?.y || 100 - paddingBottom}`,
      ...points.map(p => `L${p.x},${p.y}`),
      `L${points[points.length - 1]?.x || 100},${100 - paddingBottom}`,
      'Z'
    ].join(' ');
    
    return { points, areaPath: areaPoints, linePath };
  }, [sortedData, maxRevenue]);

  // Format currency with compact notation for large numbers
  const formatCurrency = (value: number, compact = false) => {
    if (compact && Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    }
    if (compact && Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: value < 1 ? 2 : 0
    }).format(value);
  };
  
  // Handle point hover for tooltip
  const handlePointHover = (point: DataPoint, isHovered: boolean) => {
    if (isHovered && point.x !== undefined && point.y !== undefined) {
      setTooltip({
        ...point,
        x: point.x,
        y: point.y,
        // Ensure all required properties from DataPoint are included
        date: point.date,
        amount: point.amount,
        formattedDate: point.formattedDate,
        formattedMonth: point.formattedMonth,
        formattedDay: point.formattedDay
      });
    } else {
      setTooltip(null);
    }
  };

  // Handle click on filter button
  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    // In a real app, you would filter the data based on the selected time period
    // For now, we'll just update the active filter state
  };

  // Toggle expanded view
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
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
              <FiDollarSign className="mr-2 text-indigo-500" size={20} />
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
          
          <div className="flex items-center mt-3 sm:mt-0 space-x-1">
            {['1W', '1M', '3M', '1Y', 'ALL'].map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterClick(filter)}
                className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                  activeFilter === filter
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-6 pt-4">
        <div className="bg-indigo-50 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-600">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalRevenue, true)}</p>
            </div>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FiDollarSign className="text-indigo-600" size={20} />
            </div>
          </div>
          <div className="mt-2 flex items-center text-xs">
            <span className={`inline-flex items-center ${percentChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {percentChange >= 0 ? <FiTrendingUp className="mr-1" /> : <FiTrendingDown className="mr-1" />}
              {Math.abs(percentChange).toFixed(1)}% from last period
            </span>
          </div>
        </div>
        
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Avg. Daily</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(avgRevenue)}</p>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg">
              <FiTrendingUp className="text-gray-600" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Based on {sortedData.length} days
          </div>
        </div>
        </div>
        {/* Chart Area */}
      <div className="relative flex-1 min-h-[400px] p-6 pt-2 pb-6">
        <div className="absolute inset-0 w-full h-full">
          <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
            {/* Background */}
            <rect width="100%" height="100%" fill="white" />
            {/* Grid lines */}
            {[0, 25, 50, 75, 100].map((y, i) => (
              <line 
                key={`grid-${i}`}
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
              const value = maxRevenue ? (maxRevenue * (100 - y) / 100).toFixed(maxRevenue < 100 ? 1 : 0) : 0;
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
                  {formatCurrency(Number(value), true)}
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
                filter: 'drop-shadow(0px 2px 4px rgba(99, 102, 241, 0.3))',
                transition: `stroke ${TRANSITION_DURATION} ease, stroke-width ${TRANSITION_DURATION} ease`
              }}
              strokeDasharray={points.length < 2 ? '0' : undefined}
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
                    filter: 'drop-shadow(0px 2px 4px rgba(99, 102, 241, 0.3))',
                    opacity: tooltip && tooltip.date.getTime() !== point.date.getTime() ? 0 : 1,
                    transition: `r ${TRANSITION_DURATION} ease, stroke ${TRANSITION_DURATION} ease, opacity 0.2s ease`
                  }}
                >
                  <title>
                    {point.formattedDate}: {formatCurrency(point.amount)}
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
                stroke="#c7d2fe"
                strokeWidth="1"
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
              <div className="text-xl font-bold text-indigo-600">
                {formatCurrency(tooltip.amount)}
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
            <span>{points[0].formattedDate}</span>
            {points.length > 2 && (
              <span>{points[Math.floor(points.length / 2)].formattedDate}</span>
            )}
            <span>{points[points.length - 1].formattedDate}</span>
          </>
        )}
      </div>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 px-6 pb-6 pt-2">
        {/* Total Revenue */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-50 border border-indigo-100 p-4 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-600">Total Revenue</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {formatCurrency(totalRevenue, true)}
              </p>
            </div>
            <div className="p-2 bg-white/50 rounded-lg backdrop-blur-sm">
              <FiDollarSign className="text-indigo-500" size={20} />
            </div>
          </div>
          <div className="mt-3 flex items-center">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              percentChange >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {percentChange >= 0 ? (
                <FiTrendingUp className="mr-1" size={12} />
              ) : (
                <FiTrendingDown className="mr-1" size={12} />
              )}
              {Math.abs(percentChange).toFixed(1)}%
            </span>
            <span className="text-xs text-gray-500 ml-2">vs previous period</span>
          </div>
        </div>
        
        {/* Average Daily Revenue */}
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Avg. Daily</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(avgRevenue, true)}
              </p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <FiTrendingUp className="text-green-500" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Per day average
          </div>
        </div>
        
        {/* Peak Day */}
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Peak Day</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(maxRevenue, true)}
              </p>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg">
              <FiTrendingUp className="text-amber-500" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Highest single day
          </div>
        </div>
        
        {/* Lowest Day */}
        <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Lowest Day</p>
              <p className="text-xl font-semibold text-gray-900">
                {formatCurrency(minRevenue, true)}
              </p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg">
              <FiTrendingDown className="text-blue-500" size={20} />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Lowest single day
          </div>
        </div>
      </div>
      
      {isExpanded && (
        <div className="absolute bottom-4 right-4 z-10">
          <div className="flex items-center text-xs text-gray-500">
            <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-1"></span>
            <span>Revenue</span>
          </div>
        </div>
      )}
    </motion.div>
  </div>
  );
}
