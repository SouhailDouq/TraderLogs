'use client';

import { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import { formatCurrency } from '@/utils/formatters';

interface AssetAllocationChartProps {
  positions: any[];
  totalValue: number;
  className?: string;
}

interface AllocationData {
  symbol: string;
  value: number;
  percentage: number;
  color: string;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#6366f1', '#ec4899', '#14b8a6',
  '#f97316', '#84cc16', '#06b6d4', '#8b5cf6'
];

export default function AssetAllocationChart({ positions, totalValue, className = '' }: AssetAllocationChartProps) {
  const isDarkMode = useDarkMode();
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  const allocationData = useMemo(() => {
    if (!positions.length || totalValue === 0) return [];

    return positions.map((position, index) => ({
      symbol: position.symbol,
      value: position.marketValue || (position.price * position.quantity),
      percentage: ((position.marketValue || (position.price * position.quantity)) / totalValue) * 100,
      color: COLORS[index % COLORS.length]
    })).sort((a, b) => b.value - a.value);
  }, [positions, totalValue]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <p className="font-semibold">{data.symbol}</p>
          <p className="text-sm">
            <span className="font-medium">Value: </span>
            {formatCurrency(data.value)}
          </p>
          <p className="text-sm">
            <span className="font-medium">Allocation: </span>
            {data.percentage.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, symbol }: any) => {
    if (percent < 0.05) return null; // Don't show labels for segments < 5%
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill={isDarkMode ? '#ffffff' : '#000000'} 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="500"
      >
        {symbol}
      </text>
    );
  };

  if (!allocationData.length) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm">No positions to display</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={allocationData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={80}
            innerRadius={40}
            fill="#8884d8"
            dataKey="value"
            onMouseEnter={(_, index) => setHoveredSegment(allocationData[index].symbol)}
            onMouseLeave={() => setHoveredSegment(null)}
          >
            {allocationData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke={hoveredSegment === entry.symbol ? '#ffffff' : 'none'}
                strokeWidth={hoveredSegment === entry.symbol ? 2 : 0}
                style={{
                  filter: hoveredSegment === entry.symbol ? 'brightness(1.1)' : 'none',
                  cursor: 'pointer'
                }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      
      {/* Center display */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          {hoveredSegment ? (
            <>
              <div className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {hoveredSegment}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {allocationData.find(d => d.symbol === hoveredSegment)?.percentage.toFixed(1)}%
              </div>
            </>
          ) : (
            <>
              <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {allocationData.length}
              </div>
              <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Positions
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
