'use client';

import { useMemo, useState } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { formatCurrency } from '@/utils/formatters';

interface PortfolioHeatMapProps {
  positions: any[];
  totalValue: number;
  className?: string;
}

interface HeatMapData {
  symbol: string;
  value: number;
  percentage: number;
  pnl: number;
  pnlPercent: number;
  riskScore: number;
  size: number;
}

export default function PortfolioHeatMap({ positions, totalValue, className = '' }: PortfolioHeatMapProps) {
  const isDarkMode = useDarkMode();
  const [hoveredPosition, setHoveredPosition] = useState<HeatMapData | null>(null);

  const heatMapData = useMemo(() => {
    if (!positions.length || totalValue === 0) return [];

    const data = positions.map(position => {
      const value = position.marketValue || (position.price * position.quantity);
      const percentage = (value / totalValue) * 100;
      const pnl = position.unrealizedPnL || 0;
      const pnlPercent = position.unrealizedPnLPercent || 0;
      
      // Calculate risk score based on position size and volatility
      const riskScore = Math.min(100, percentage * 2 + Math.abs(pnlPercent) * 0.5);
      
      return {
        symbol: position.symbol,
        value,
        percentage,
        pnl,
        pnlPercent,
        riskScore,
        size: Math.max(60, Math.min(200, percentage * 8)) // Size based on allocation
      };
    }).sort((a, b) => b.value - a.value);

    return data;
  }, [positions, totalValue]);

  const getColorByPnL = (pnlPercent: number) => {
    if (pnlPercent > 10) return isDarkMode ? '#10b981' : '#059669'; // Strong green
    if (pnlPercent > 5) return isDarkMode ? '#34d399' : '#10b981'; // Green
    if (pnlPercent > 0) return isDarkMode ? '#6ee7b7' : '#34d399'; // Light green
    if (pnlPercent > -5) return isDarkMode ? '#fbbf24' : '#f59e0b'; // Yellow
    if (pnlPercent > -10) return isDarkMode ? '#fb923c' : '#ea580c'; // Orange
    return isDarkMode ? '#ef4444' : '#dc2626'; // Red
  };

  const getRiskLevel = (riskScore: number) => {
    if (riskScore > 80) return 'Very High';
    if (riskScore > 60) return 'High';
    if (riskScore > 40) return 'Medium';
    if (riskScore > 20) return 'Low';
    return 'Very Low';
  };

  if (!heatMapData.length) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="text-4xl mb-2">🔥</div>
          <p className="text-sm">No positions to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className} relative`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-4">
        {heatMapData.map((position, index) => (
          <div
            key={position.symbol}
            className="relative group cursor-pointer transition-all duration-200 hover:scale-105"
            style={{
              minHeight: `${position.size}px`,
              backgroundColor: getColorByPnL(position.pnlPercent),
              borderRadius: '8px',
              opacity: hoveredPosition && hoveredPosition.symbol !== position.symbol ? 0.6 : 1
            }}
            onMouseEnter={() => setHoveredPosition(position)}
            onMouseLeave={() => setHoveredPosition(null)}
          >
            <div className="absolute inset-0 p-3 flex flex-col justify-between text-white">
              <div>
                <div className="font-bold text-lg">{position.symbol}</div>
                <div className="text-sm opacity-90">
                  {position.percentage.toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">
                  {formatCurrency(position.value)}
                </div>
                <div className="text-xs opacity-90">
                  {position.pnl >= 0 ? '+' : ''}{position.pnlPercent.toFixed(1)}%
                </div>
              </div>
            </div>
            
            {/* Risk indicator */}
            <div className="absolute top-2 right-2">
              <div 
                className={`w-3 h-3 rounded-full border-2 border-white ${
                  position.riskScore > 60 ? 'bg-red-500' :
                  position.riskScore > 40 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                title={`Risk: ${getRiskLevel(position.riskScore)}`}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {hoveredPosition && (
        <div className={`absolute z-10 p-4 rounded-lg shadow-lg border pointer-events-none transition-all duration-200 ${
          isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`} style={{
          top: '20px',
          right: '20px',
          maxWidth: '250px'
        }}>
          <div className="space-y-2">
            <div className="font-bold text-lg">{hoveredPosition.symbol}</div>
            
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">Value:</span>
                <div>{formatCurrency(hoveredPosition.value)}</div>
              </div>
              <div>
                <span className="font-medium">Allocation:</span>
                <div>{hoveredPosition.percentage.toFixed(1)}%</div>
              </div>
              <div>
                <span className="font-medium">P&L:</span>
                <div className={hoveredPosition.pnl >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {formatCurrency(hoveredPosition.pnl)}
                </div>
              </div>
              <div>
                <span className="font-medium">P&L %:</span>
                <div className={hoveredPosition.pnlPercent >= 0 ? 'text-green-500' : 'text-red-500'}>
                  {hoveredPosition.pnl >= 0 ? '+' : ''}{hoveredPosition.pnlPercent.toFixed(1)}%
                </div>
              </div>
              <div className="col-span-2">
                <span className="font-medium">Risk Level:</span>
                <div className={`inline-block ml-2 px-2 py-1 rounded text-xs ${
                  hoveredPosition.riskScore > 60 ? 'bg-red-100 text-red-800' :
                  hoveredPosition.riskScore > 40 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-green-100 text-green-800'
                }`}>
                  {getRiskLevel(hoveredPosition.riskScore)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Profitable</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Neutral</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Loss</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <div className="w-3 h-3 bg-red-500 rounded-full border border-white"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>High Risk</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full border border-white"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Low Risk</span>
        </div>
      </div>
    </div>
  );
}
