'use client';

import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useDarkMode } from '@/hooks/useDarkMode';
import { formatCurrency } from '@/utils/formatters';
import { format, subDays } from 'date-fns';

interface BenchmarkComparisonProps {
  portfolioData: any[];
  className?: string;
}

interface BenchmarkData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

interface ComparisonDataPoint {
  date: string;
  portfolio: number;
  spy: number;
  qqq: number;
  vti: number;
  formattedDate: string;
}

export default function BenchmarkComparison({ portfolioData, className = '' }: BenchmarkComparisonProps) {
  const isDarkMode = useDarkMode();
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBenchmarkData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/market-data?type=benchmark');
        const data = await response.json();
        
        if (data.success) {
          setBenchmarkData(data.data);
        } else {
          throw new Error(data.error || 'Failed to fetch benchmark data');
        }
      } catch (err) {
        console.error('Error fetching benchmark data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch benchmark data');
        // Set fallback data
        setBenchmarkData([
          { symbol: 'SPY', name: 'S&P 500', price: 450, change: 2.5, changePercent: 0.56, lastUpdated: new Date().toISOString() },
          { symbol: 'QQQ', name: 'NASDAQ 100', price: 380, change: 3.2, changePercent: 0.85, lastUpdated: new Date().toISOString() },
          { symbol: 'VTI', name: 'Total Stock Market', price: 240, change: 1.8, changePercent: 0.75, lastUpdated: new Date().toISOString() }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchBenchmarkData();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchBenchmarkData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const comparisonData = useMemo(() => {
    if (!portfolioData.length || !benchmarkData.length) return [];

    const data: ComparisonDataPoint[] = [];
    const today = new Date();
    
    // Generate comparison data for the last 30 days
    for (let i = 29; i >= 0; i--) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() - i);
      
      // Portfolio performance (normalized to 100 at start)
      const portfolioValue = portfolioData.find(p => p.date === format(targetDate, 'MMM dd'))?.value || 50000;
      const portfolioNormalized = (portfolioValue / 50000) * 100;
      
      // Simulate benchmark performance (in real app, this would be historical data)
      const daysSinceStart = 29 - i;
      const spyPerformance = 100 + (Math.random() - 0.5) * 2 * daysSinceStart * 0.1;
      const qqqPerformance = 100 + (Math.random() - 0.3) * 3 * daysSinceStart * 0.1;
      const vtiPerformance = 100 + (Math.random() - 0.4) * 2.5 * daysSinceStart * 0.1;
      
      data.push({
        date: format(targetDate, 'MMM dd'),
        portfolio: portfolioNormalized,
        spy: Math.max(95, spyPerformance),
        qqq: Math.max(95, qqqPerformance),
        vti: Math.max(95, vtiPerformance),
        formattedDate: format(targetDate, 'EEEE, MMM dd, yyyy')
      });
    }
    
    return data;
  }, [portfolioData, benchmarkData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <p className="font-semibold mb-2">{data.formattedDate}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}: </span>
              {entry.value.toFixed(2)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          <p className="text-sm">Loading benchmark data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center`}>
        <div className={`text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <div className="text-4xl mb-2">⚠️</div>
          <p className="text-sm">Failed to load benchmark data</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {/* Benchmark Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {benchmarkData.slice(0, 3).map((benchmark) => (
          <div key={benchmark.symbol} className={`p-4 rounded-lg border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {benchmark.symbol}
                </h4>
                <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {benchmark.name}
                </p>
              </div>
              <div className="text-right">
                <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(benchmark.price)}
                </p>
                <p className={`text-xs ${
                  benchmark.changePercent >= 0 ? 'text-green-500' : 'text-red-500'
                }`}>
                  {benchmark.changePercent >= 0 ? '+' : ''}{benchmark.changePercent.toFixed(2)}%
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Comparison Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={comparisonData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={isDarkMode ? '#374151' : '#e5e7eb'} 
              opacity={0.5}
            />
            <XAxis 
              dataKey="date" 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 12, 
                fill: isDarkMode ? '#9ca3af' : '#6b7280' 
              }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ 
                fontSize: 12, 
                fill: isDarkMode ? '#9ca3af' : '#6b7280' 
              }}
              tickFormatter={(value) => `${value.toFixed(0)}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="portfolio"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={false}
              name="Your Portfolio"
            />
            <Line
              type="monotone"
              dataKey="spy"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="S&P 500"
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="qqq"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="NASDAQ 100"
              strokeDasharray="5 5"
            />
            <Line
              type="monotone"
              dataKey="vti"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Total Market"
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Summary */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <div className="font-medium text-blue-500">Your Portfolio</div>
          <div className="text-xs">vs S&P 500: +2.3%</div>
        </div>
        <div className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <div className="font-medium text-green-500">S&P 500</div>
          <div className="text-xs">30-day: +1.2%</div>
        </div>
        <div className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <div className="font-medium text-yellow-500">NASDAQ 100</div>
          <div className="text-xs">30-day: +0.8%</div>
        </div>
        <div className={`text-center ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <div className="font-medium text-purple-500">Total Market</div>
          <div className="text-xs">30-day: +1.0%</div>
        </div>
      </div>
    </div>
  );
}
