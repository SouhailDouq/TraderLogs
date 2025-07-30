'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTradeStore } from '@/utils/store';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';

export default function MonitorPage() {
  const isDarkMode = useDarkMode();
  const { processedTrades, trades } = useTradeStore();
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{ day: string; value: number; change: number; date?: string; tradesCount?: number } | null>(null);
  const [hoveredSegment, setHoveredSegment] = useState<{ symbol: string; percentage: number; value: number } | null>(null);

  // Auto-refresh every 30 seconds (simulating real-time updates)
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTime(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Calculate portfolio metrics from open positions
  const portfolioMetrics = useMemo(() => {
    const openTrades = trades.filter(trade => trade.isOpen);
    
    if (openTrades.length === 0) {
      return {
        totalValue: 0,
        totalPnL: 0,
        dayChange: 0,
        openPositions: 0,
        totalInvested: 0,
        unrealizedPnL: 0,
        realizedPnL: 0
      };
    }

    const totalInvested = openTrades.reduce((sum, trade) => {
      return sum + (trade.price * trade.quantity);
    }, 0);

    // Simulate current prices (in real app, this would come from API)
    const totalValue = openTrades.reduce((sum, trade) => {
      const currentPrice = trade.price * (0.95 + Math.random() * 0.1); // ±5% random variation
      return sum + (currentPrice * trade.quantity);
    }, 0);

    const unrealizedPnL = totalValue - totalInvested;
    const realizedPnL = trades.filter(t => !t.isOpen).reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalPnL = unrealizedPnL + realizedPnL;
    const dayChange = totalValue * (Math.random() * 0.04 - 0.02); // ±2% daily variation

    return {
      totalValue,
      totalPnL,
      dayChange,
      openPositions: openTrades.length,
      totalInvested,
      unrealizedPnL,
      realizedPnL
    };
  }, [trades, refreshTime]);

  const openPositions = useMemo(() => {
    return trades.filter(trade => trade.isOpen).map(trade => {
      const currentPrice = trade.price * (0.95 + Math.random() * 0.1);
      const marketValue = currentPrice * trade.quantity;
      const costBasis = trade.price * trade.quantity;
      const unrealizedPnL = marketValue - costBasis;
      const unrealizedPnLPercent = (unrealizedPnL / costBasis) * 100;
      
      return {
        ...trade,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPnL,
        unrealizedPnLPercent
      };
    });
  }, [trades, refreshTime]);

  const StatCard = ({ title, value, subtitle, color = 'default', icon }: { title: string; value: string | number; subtitle: string; color?: string; icon: string }) => (
    <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-medium transition-colors ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {title}
        </h3>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`text-xl sm:text-2xl font-bold mt-2 ${
        color === 'green' ? 'text-green-600' :
        color === 'red' ? 'text-red-600' :
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-xs sm:text-sm mt-1 transition-colors ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}>
          {subtitle}
        </p>
      )}
    </div>
  );

  return (
    <div className={`min-h-screen transition-colors ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className={`text-2xl sm:text-3xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                👁️ Portfolio Monitor
              </h1>
              <p className={`mt-2 text-sm sm:text-base transition-colors ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Real-time monitoring of your open positions
              </p>
            </div>
            <div className={`mt-4 sm:mt-0 text-sm transition-colors ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}>
              Last updated: {format(refreshTime, 'HH:mm:ss')}
            </div>
          </div>
        </div>

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Portfolio Value"
            value={formatCurrency(portfolioMetrics.totalValue)}
            subtitle={`${portfolioMetrics.dayChange >= 0 ? '+' : ''}${formatCurrency(portfolioMetrics.dayChange)} today`}
            color={portfolioMetrics.dayChange >= 0 ? 'green' : 'red'}
            icon="💰"
          />
          <StatCard
            title="Total P&L"
            value={formatCurrency(portfolioMetrics.totalPnL)}
            subtitle={`${((portfolioMetrics.totalPnL / Math.max(portfolioMetrics.totalInvested, 1)) * 100).toFixed(2)}% return`}
            color={portfolioMetrics.totalPnL >= 0 ? 'green' : 'red'}
            icon="📈"
          />
          <StatCard
            title="Unrealized P&L"
            value={formatCurrency(portfolioMetrics.unrealizedPnL)}
            subtitle="Open positions"
            color={portfolioMetrics.unrealizedPnL >= 0 ? 'green' : 'red'}
            icon="⏳"
          />
          <StatCard
            title="Open Positions"
            value={portfolioMetrics.openPositions}
            subtitle={`${formatCurrency(portfolioMetrics.totalInvested)} invested`}
            icon="📊"
          />
        </div>

        {/* Portfolio Performance Chart */}
        {openPositions.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className={`lg:col-span-2 rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                📈 Portfolio Performance (7 Days)
              </h3>
              <div className="h-48 sm:h-64">
                <div className="relative h-full">
                  {/* Improved line chart with better visibility */}
                  <svg className="w-full h-full" viewBox="0 0 420 240">
                    <defs>
                      <linearGradient id="portfolioGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={portfolioMetrics.totalPnL >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={portfolioMetrics.totalPnL >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    
                    {/* Background */}
                    <rect width="420" height="200" fill="transparent" />
                    
                    {/* Grid lines */}
                    {[0, 1, 2, 3, 4].map(i => (
                      <line key={`h-${i}`} x1="40" y1={40 + i * 30} x2="380" y2={40 + i * 30} stroke={isDarkMode ? '#4b5563' : '#d1d5db'} strokeWidth="1" strokeDasharray="2,2" />
                    ))}
                    {[0, 1, 2, 3, 4, 5, 6].map(i => (
                      <line key={`v-${i}`} x1={40 + i * 50} y1="40" x2={40 + i * 50} y2="160" stroke={isDarkMode ? '#4b5563' : '#d1d5db'} strokeWidth="1" strokeDasharray="2,2" />
                    ))}
                    
                    {/* Generate real portfolio performance data from actual trades */}
                    {(() => {
                      const chartData = [];
                      const today = new Date();
                      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'];
                      
                      // Calculate portfolio value for each of the last 7 days using real trade data
                      for (let i = 0; i <= 6; i++) {
                        const targetDate = new Date(today);
                        targetDate.setDate(today.getDate() - (6 - i));
                        const dateStr = targetDate.toISOString().split('T')[0];
                        
                        // Calculate cumulative P&L up to this date
                        const tradesUpToDate = trades.filter(trade => {
                          const tradeDate = new Date(trade.date);
                          return tradeDate <= targetDate;
                        });
                        
                        const cumulativePnL = tradesUpToDate.reduce((sum, trade) => {
                          return sum + (trade.profitLoss || 0);
                        }, 0);
                        
                        // Assume starting portfolio value (you can adjust this)
                        const startingValue = 50000;
                        const portfolioValue = startingValue + cumulativePnL;
                        
                        // Calculate daily change
                        const previousValue: number = i === 0 ? startingValue : chartData[i-1].value;
                        const change: number = i === 0 ? 0 : ((portfolioValue - previousValue) / previousValue) * 100;
                        
                        // Scale to chart height (normalize between 40 and 160)
                        const minValue = Math.min(startingValue, portfolioValue) * 0.9;
                        const maxValue = Math.max(startingValue, portfolioValue) * 1.1;
                        const normalizedValue = (portfolioValue - minValue) / (maxValue - minValue);
                        const y = 160 - (normalizedValue * 120);
                        
                        chartData.push({
                          x: 40 + i * 50,
                          y: Math.max(40, Math.min(160, y)),
                          value: portfolioValue,
                          day: days[i],
                          change: change,
                          date: dateStr,
                          tradesCount: tradesUpToDate.length
                        });
                      }
                      
                      const pathData = chartData.map((point, i) => 
                        i === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`
                      ).join(' ');
                      
                      const areaData = `${pathData} L ${chartData[chartData.length - 1].x} 160 L ${chartData[0].x} 160 Z`;
                      
                      return (
                        <>
                          {/* Area fill */}
                          <path
                            d={areaData}
                            fill="url(#portfolioGradient)"
                          />
                          {/* Main line */}
                          <path
                            d={pathData}
                            fill="none"
                            stroke={portfolioMetrics.totalPnL >= 0 ? '#10b981' : '#ef4444'}
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                          {/* Interactive data points */}
                          {chartData.map((point, i) => (
                            <g key={i}>
                              {/* Invisible hover area */}
                              <rect
                                x={point.x - 25}
                                y="40"
                                width="50"
                                height="120"
                                fill="transparent"
                                style={{ cursor: 'pointer' }}
                                onMouseEnter={() => setHoveredPoint({
                                  day: point.day,
                                  value: point.value,
                                  change: point.change
                                })}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                              {/* Data point */}
                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={hoveredPoint?.day === point.day ? "6" : "4"}
                                fill={portfolioMetrics.totalPnL >= 0 ? '#10b981' : '#ef4444'}
                                stroke={isDarkMode ? '#1f2937' : '#ffffff'}
                                strokeWidth="2"
                                style={{ 
                                  cursor: 'pointer',
                                  transition: 'r 0.2s ease',
                                  filter: hoveredPoint?.day === point.day ? 'drop-shadow(0 0 6px rgba(16, 185, 129, 0.6))' : 'none'
                                }}
                              />
                              {/* Hover line */}
                              {hoveredPoint?.day === point.day && (
                                <line
                                  x1={point.x}
                                  y1="40"
                                  x2={point.x}
                                  y2="160"
                                  stroke={portfolioMetrics.totalPnL >= 0 ? '#10b981' : '#ef4444'}
                                  strokeWidth="1"
                                  strokeDasharray="4,4"
                                  opacity="0.7"
                                />
                              )}
                            </g>
                          ))}
                        </>
                      );
                    })()}
                    
                    {/* Y-axis labels */}
                    <text x="25" y="45" fontSize="10" fill={isDarkMode ? '#9ca3af' : '#6b7280'} textAnchor="end">High</text>
                    <text x="25" y="105" fontSize="10" fill={isDarkMode ? '#9ca3af' : '#6b7280'} textAnchor="end">Mid</text>
                    <text x="25" y="165" fontSize="10" fill={isDarkMode ? '#9ca3af' : '#6b7280'} textAnchor="end">Low</text>
                  </svg>
                  
                  {/* Chart labels */}
                  <div className="absolute bottom-4 left-0 right-0 flex justify-between px-10 text-xs">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today'].map((day, i) => (
                      <span key={i} className={`font-medium ${
                        i === 6 ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                      }`}>{day}</span>
                    ))}
                  </div>
                  
                  {/* Tooltip */}
                  {hoveredPoint && (
                    <div className={`absolute z-10 px-3 py-2 rounded-lg shadow-lg border text-sm pointer-events-none transition-all duration-200 ${
                      isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
                    }`} style={{
                      left: `${((hoveredPoint.day === 'Today' ? 6 : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(hoveredPoint.day)) * 50 + 40) / 420 * 100}%`,
                      top: '10px',
                      transform: 'translateX(-50%)'
                    }}>
                      <div className="font-semibold text-center mb-1">{hoveredPoint.day}</div>
                      <div className="text-center">
                        <div className="font-medium">{formatCurrency(hoveredPoint.value)}</div>
                        <div className={`text-xs ${
                          hoveredPoint.change >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {hoveredPoint.change >= 0 ? '+' : ''}{hoveredPoint.change.toFixed(2)}%
                        </div>
                        {hoveredPoint.tradesCount !== undefined && (
                          <div className={`text-xs mt-1 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {hoveredPoint.tradesCount} trades executed
                          </div>
                        )}
                        <div className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          {hoveredPoint.date}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Asset Allocation Chart */}
            <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🥧 Asset Allocation
              </h3>
              <div className="h-48 sm:h-64 flex items-center justify-center">
                <div className="relative">
                  {/* Improved donut chart */}
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    {(() => {
                      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];
                      const radius = 60;
                      const circumference = 2 * Math.PI * radius;
                      let cumulativePercentage = 0;
                      
                      return (
                        <>
                          {/* Background circle */}
                          <circle
                            cx="80"
                            cy="80"
                            r={radius}
                            fill="none"
                            stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                            strokeWidth="20"
                          />
                          
                          {/* Asset allocation segments */}
                          {openPositions.map((position, index) => {
                            const percentage = (position.marketValue / portfolioMetrics.totalValue) * 100;
                            const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
                            const strokeDashoffset = -cumulativePercentage * circumference / 100;
                            const isHovered = hoveredSegment?.symbol === position.symbol;
                            
                            cumulativePercentage += percentage;
                            
                            return (
                              <g key={position.id}>
                                {/* Main segment */}
                                <circle
                                  cx="80"
                                  cy="80"
                                  r={radius}
                                  fill="none"
                                  stroke={colors[index % colors.length]}
                                  strokeWidth={isHovered ? "24" : "20"}
                                  strokeDasharray={strokeDasharray}
                                  strokeDashoffset={strokeDashoffset}
                                  transform="rotate(-90 80 80)"
                                  style={{
                                    cursor: 'pointer',
                                    transition: 'stroke-width 0.2s ease',
                                    filter: isHovered ? 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))' : 'none',
                                    opacity: hoveredSegment && !isHovered ? 0.6 : 1
                                  }}
                                  onMouseEnter={() => setHoveredSegment({
                                    symbol: position.symbol,
                                    percentage: percentage,
                                    value: position.marketValue
                                  })}
                                  onMouseLeave={() => setHoveredSegment(null)}
                                />
                                {/* Hover highlight */}
                                {isHovered && (
                                  <circle
                                    cx="80"
                                    cy="80"
                                    r={radius + 5}
                                    fill="none"
                                    stroke={colors[index % colors.length]}
                                    strokeWidth="2"
                                    strokeDasharray={strokeDasharray}
                                    strokeDashoffset={strokeDashoffset}
                                    transform="rotate(-90 80 80)"
                                    opacity="0.4"
                                  />
                                )}
                              </g>
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      {hoveredSegment ? (
                        <>
                          <div className={`text-sm font-bold transition-colors ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {hoveredSegment.symbol}
                          </div>
                          <div className={`text-xs font-medium transition-colors ${
                            isDarkMode ? 'text-blue-400' : 'text-blue-600'
                          }`}>
                            {hoveredSegment.percentage.toFixed(1)}%
                          </div>
                          <div className={`text-xs transition-colors ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {formatCurrency(hoveredSegment.value)}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className={`text-lg font-bold transition-colors ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {openPositions.length}
                          </div>
                          <div className={`text-xs transition-colors ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            Positions
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              {/* Legend */}
              <div className="mt-4 space-y-2 max-h-32 overflow-y-auto">
                {openPositions.map((position, index) => {
                  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6'];
                  const percentage = (position.marketValue / portfolioMetrics.totalValue) * 100;
                  return (
                    <div key={position.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center">
                        <div
                          className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className={`truncate ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          {position.symbol}
                        </span>
                      </div>
                      <span className={`ml-2 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Open Positions Table */}
        <div className={`rounded-lg shadow-sm border transition-colors ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="p-4 sm:p-6">
            <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Open Positions
            </h2>
            
            {openPositions.length === 0 ? (
              <div className={`text-center py-8 transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                <p className="text-lg mb-2">📭 No open positions</p>
                <p className="text-sm">Execute some trades to start monitoring your portfolio</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className={`border-b transition-colors ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <th className={`text-left py-3 px-2 text-sm font-medium transition-colors ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Symbol</th>
                      <th className={`text-right py-3 px-2 text-sm font-medium transition-colors ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Qty</th>
                      <th className={`text-right py-3 px-2 text-sm font-medium transition-colors ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Avg Cost</th>
                      <th className={`text-right py-3 px-2 text-sm font-medium transition-colors ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Current</th>
                      <th className={`text-right py-3 px-2 text-sm font-medium transition-colors ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Market Value</th>
                      <th className={`text-right py-3 px-2 text-sm font-medium transition-colors ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>Unrealized P&L</th>
                      <th className={`text-right py-3 px-2 text-sm font-medium transition-colors ${
                        isDarkMode ? 'text-gray-300' : 'text-gray-600'
                      }`}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {openPositions.map((position, index) => (
                      <tr key={position.id} className={`border-b transition-colors ${
                        isDarkMode ? 'border-gray-700' : 'border-gray-200'
                      }`}>
                        <td className={`py-3 px-2 transition-colors ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          <div>
                            <div className="font-medium">{position.symbol}</div>
                            <div className={`text-xs transition-colors ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-500'
                            }`}>
                              {position.side?.toUpperCase() || 'LONG'} • {position.date}
                            </div>
                          </div>
                        </td>
                        <td className={`py-3 px-2 text-right text-sm transition-colors ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {position.quantity}
                        </td>
                        <td className={`py-3 px-2 text-right text-sm transition-colors ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {formatCurrency(position.price)}
                        </td>
                        <td className={`py-3 px-2 text-right text-sm transition-colors ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                          {formatCurrency(position.currentPrice)}
                        </td>
                        <td className={`py-3 px-2 text-right font-medium transition-colors ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {formatCurrency(position.marketValue)}
                        </td>
                        <td className={`py-3 px-2 text-right font-medium ${
                          position.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(position.unrealizedPnL)}
                        </td>
                        <td className={`py-3 px-2 text-right font-medium ${
                          position.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Risk Management Alerts */}
        {openPositions.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🚨 Risk Alerts
              </h3>
              <div className="space-y-3">
                {openPositions.filter(p => p.unrealizedPnLPercent < -10).length > 0 ? (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-800">
                      ⚠️ {openPositions.filter(p => p.unrealizedPnLPercent < -10).length} position(s) down more than 10%
                    </p>
                  </div>
                ) : (
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-green-900/20 border border-green-800' : 'bg-green-50 border border-green-200'
                  }`}>
                    <p className={`text-sm ${
                      isDarkMode ? 'text-green-300' : 'text-green-800'
                    }`}>
                      ✅ All positions within acceptable risk levels
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
