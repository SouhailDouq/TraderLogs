'use client';
// @ts-nocheck

import { useState, useMemo } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTradeStore } from '@/utils/store';
import { formatCurrency } from '@/utils/formatters';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';

export default function PerformancePage() {
  const isDarkMode = useDarkMode();
  const { processedTrades, stats } = useTradeStore();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [selectedMetric, setSelectedMetric] = useState('pnl');

  // Calculate comprehensive performance metrics with momentum analysis
  const performanceData = useMemo(() => {
    const allTrades = Object.values(processedTrades).flat().filter(trade => !trade.isOpen);
    
    if (allTrades.length === 0) {
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalPnL: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        sharpeRatio: 0,
        maxDrawdown: 0,
        monthlyData: [],
        strategyBreakdown: {},
        bestTrade: null,
        worstTrade: null,
        momentumMetrics: {
          target3Hits: 0,
          target8Hits: 0,
          target15Hits: 0,
          avgHoldTime: 0,
          premarketTrades: 0,
          premarketWinRate: 0,
          avgMomentumGain: 0
        }
      };
    }

    const winningTrades = allTrades.filter(t => (t.profitLoss || 0) > 0);
    const losingTrades = allTrades.filter(t => (t.profitLoss || 0) < 0);
    const totalPnL = allTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalWins = winningTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0));
    
    // Monthly performance data
    const monthlyData: any[] = [];
    const startDate = subMonths(new Date(), 11);
    const months = eachMonthOfInterval({ start: startDate, end: new Date() });
    
    months.forEach(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthTrades = allTrades.filter(trade => {
        const tradeDate = parseISO(trade.date);
        return tradeDate >= monthStart && tradeDate <= monthEnd;
      });
      
      const monthPnL = monthTrades.reduce((sum, t) => sum + (t.profitLoss || 0), 0);
      monthlyData.push({
        month: format(month, 'MMM yyyy'),
        pnl: monthPnL,
        trades: monthTrades.length,
        winRate: monthTrades.length > 0 ? (monthTrades.filter(t => (t.profitLoss || 0) > 0).length / monthTrades.length) * 100 : 0
      });
    });

    // Strategy breakdown
    const strategyBreakdown: any = {};
    allTrades.forEach(trade => {
      const strategy = trade.strategy || 'Unknown';
      if (!strategyBreakdown[strategy]) {
        strategyBreakdown[strategy] = { trades: 0, pnl: 0, wins: 0 };
      }
      strategyBreakdown[strategy].trades++;
      strategyBreakdown[strategy].pnl += trade.profitLoss || 0;
      if ((trade.profitLoss || 0) > 0) strategyBreakdown[strategy].wins++;
    });

    // Best and worst trades
    const bestTrade = allTrades.length > 0 ? allTrades.reduce((best, trade) => 
      (trade.profitLoss || 0) > (best.profitLoss || 0) ? trade : best
    ) : null;
    const worstTrade = allTrades.length > 0 ? allTrades.reduce((worst, trade) => 
      (trade.profitLoss || 0) < (worst.profitLoss || 0) ? trade : worst
    ) : null;

    // Calculate momentum-specific metrics
    const momentumTrades = allTrades.filter(t => 
      t.strategy && (t.strategy.toLowerCase().includes('momentum') || 
                     t.strategy.toLowerCase().includes('breakout') ||
                     t.strategy.toLowerCase().includes('premarket'))
    );
    
    const target3Hits = allTrades.filter(t => {
      const returnPercent = ((t.profitLoss || 0) / ((t.price || 0) * (t.quantity || 0))) * 100;
      return returnPercent >= 3;
    }).length;
    
    const target8Hits = allTrades.filter(t => {
      const returnPercent = ((t.profitLoss || 0) / ((t.price || 0) * (t.quantity || 0))) * 100;
      return returnPercent >= 8;
    }).length;
    
    const target15Hits = allTrades.filter(t => {
      const returnPercent = ((t.profitLoss || 0) / ((t.price || 0) * (t.quantity || 0))) * 100;
      return returnPercent >= 15;
    }).length;

    // Premarket trades analysis (trades executed between 4:00-9:30 AM EST)
    const premarketTrades = allTrades.filter(t => {
      if (!t.time) return false;
      const [hours, minutes] = t.time.split(':').map(Number);
      const timeInMinutes = hours * 60 + minutes;
      return timeInMinutes >= 240 && timeInMinutes < 570; // 4:00 AM - 9:30 AM EST
    });
    
    const premarketWins = premarketTrades.filter(t => (t.profitLoss || 0) > 0);
    const premarketWinRate = premarketTrades.length > 0 ? (premarketWins.length / premarketTrades.length) * 100 : 0;

    // Average momentum gain for winning trades
    const avgMomentumGain = winningTrades.length > 0 ? 
      winningTrades.reduce((sum, t) => {
        const returnPercent = ((t.profitLoss || 0) / ((t.price || 0) * (t.quantity || 0))) * 100;
        return sum + returnPercent;
      }, 0) / winningTrades.length : 0;

    const momentumMetrics = {
      target3Hits,
      target8Hits,
      target15Hits,
      avgHoldTime: 0, // Could be calculated if we had exit timestamps
      premarketTrades: premarketTrades.length,
      premarketWinRate,
      avgMomentumGain
    };

    return {
      totalTrades: allTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: (winningTrades.length / allTrades.length) * 100,
      totalPnL,
      avgWin: winningTrades.length > 0 ? totalWins / winningTrades.length : 0,
      avgLoss: losingTrades.length > 0 ? totalLosses / losingTrades.length : 0,
      profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
      monthlyData,
      strategyBreakdown,
      bestTrade,
      worstTrade,
      momentumMetrics
    };
  }, [processedTrades]);

  const StatCard = ({ title, value, subtitle, color = 'default' }: { title: string; value: string | number; subtitle: string; color?: string }) => (
    <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-sm font-medium transition-colors ${
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>
        {title}
      </h3>
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
          <h1 className={`text-2xl sm:text-3xl font-bold transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            📈 Performance Analytics
          </h1>
          <p className={`mt-2 text-sm sm:text-base transition-colors ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Track your trading performance and target achievements
          </p>
        </div>

        {/* Momentum Target Achievement */}
        <div className="mb-6 sm:mb-8">
          <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              🎯 Target Achievement
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  performanceData.momentumMetrics.target3Hits > 0 ? 'text-green-600' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {performanceData.momentumMetrics.target3Hits}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  3% Target Hits
                </div>
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Conservative gains
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  performanceData.momentumMetrics.target8Hits > 0 ? 'text-blue-600' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {performanceData.momentumMetrics.target8Hits}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  8% Target Hits
                </div>
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Moderate momentum
                </div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold mb-1 ${
                  performanceData.momentumMetrics.target15Hits > 0 ? 'text-purple-600' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {performanceData.momentumMetrics.target15Hits}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  15% Target Hits
                </div>
                <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Aggressive breakouts
                </div>
              </div>
            </div>
            
            {/* Target Achievement Rate */}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Target Achievement Rate
                </span>
                <span className={`text-sm font-bold ${
                  performanceData.totalTrades > 0 && performanceData.momentumMetrics.target3Hits > 0 ? 'text-green-600' : 
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {performanceData.totalTrades > 0 ? 
                    ((performanceData.momentumMetrics.target3Hits / performanceData.totalTrades) * 100).toFixed(1) : '0'}%
                </span>
              </div>
              <div className={`w-full bg-gray-200 rounded-full h-2 ${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${performanceData.totalTrades > 0 ? 
                      (performanceData.momentumMetrics.target3Hits / performanceData.totalTrades) * 100 : 0}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <StatCard
            title="Total Trades"
            value={performanceData.totalTrades}
            subtitle="Completed positions"
          />
          <StatCard
            title="Win Rate"
            value={`${performanceData.winRate.toFixed(1)}%`}
            subtitle={`${performanceData.winningTrades}W / ${performanceData.losingTrades}L`}
            color={performanceData.winRate >= 50 ? 'green' : 'red'}
          />
          <StatCard
            title="Total P&L"
            value={formatCurrency(performanceData.totalPnL)}
            subtitle="All time performance"
            color={performanceData.totalPnL >= 0 ? 'green' : 'red'}
          />
          <StatCard
            title="Avg Momentum Gain"
            value={`${performanceData.momentumMetrics.avgMomentumGain.toFixed(1)}%`}
            subtitle="Average winning trade return"
            color={performanceData.momentumMetrics.avgMomentumGain >= 8 ? 'green' : performanceData.momentumMetrics.avgMomentumGain >= 3 ? 'default' : 'red'}
          />
        </div>

        {/* Advanced Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Premarket Performance */}
          <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              🌅 Premarket Stats
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Premarket Trades:</span>
                <span className={`font-medium transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {performanceData.momentumMetrics.premarketTrades}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Premarket Win Rate:</span>
                <span className={`font-medium ${
                  performanceData.momentumMetrics.premarketWinRate >= 60 ? 'text-green-600' : 
                  performanceData.momentumMetrics.premarketWinRate >= 40 ? 'text-orange-600' : 'text-red-600'
                }`}>
                  {performanceData.momentumMetrics.premarketWinRate.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Best Time:</span>
                <span className={`font-medium transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Premarket Hours
                </span>
              </div>
            </div>
          </div>

          <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              📊 Risk/Reward
            </h2>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Profit Factor:</span>
                <span className={`font-medium ${
                  performanceData.profitFactor >= 2 ? 'text-green-600' : 
                  performanceData.profitFactor >= 1 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {performanceData.profitFactor === Infinity ? '∞' : performanceData.profitFactor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Average Win:</span>
                <span className={`font-medium text-green-600`}>
                  {formatCurrency(performanceData.avgWin)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Average Loss:</span>
                <span className={`font-medium text-red-600`}>
                  {formatCurrency(performanceData.avgLoss)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Best Trade:</span>
                <span className={`font-medium text-green-600`}>
                  {performanceData.bestTrade ? formatCurrency(performanceData.bestTrade.profitLoss || 0) : 'No trades'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Performance Chart */}
        <div className={`rounded-lg shadow-sm border p-4 sm:p-6 mb-6 sm:mb-8 transition-colors ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Monthly Performance
          </h2>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="grid grid-cols-12 gap-2 sm:gap-4">
                {performanceData.monthlyData.map((month, index) => (
                  <div key={index} className="text-center">
                    <div className={`h-20 sm:h-24 flex items-end justify-center mb-2 ${
                      month.pnl >= 0 ? 'bg-green-100' : 'bg-red-100'
                    } rounded`}>
                      <div
                        className={`w-full rounded ${
                          month.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                        }`}
                        style={{
                          height: `${Math.max(Math.abs(month.pnl) / Math.max(...performanceData.monthlyData.map(m => Math.abs(m.pnl))) * 100, 5)}%`
                        }}
                      />
                    </div>
                    <p className={`text-xs font-medium transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {month.month.split(' ')[0]}
                    </p>
                    <p className={`text-xs transition-colors ${
                      month.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(month.pnl)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Breakdown */}
        <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <h2 className={`text-lg sm:text-xl font-semibold mb-4 transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Strategy Performance
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className={`border-b transition-colors ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <th className={`text-left py-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Strategy</th>
                  <th className={`text-right py-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Trades</th>
                  <th className={`text-right py-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Win Rate</th>
                  <th className={`text-right py-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(performanceData.strategyBreakdown).map(([strategy, data]: [string, any]) => (
                  <tr key={strategy} className={`border-b transition-colors ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <td className={`py-3 text-sm transition-colors ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {strategy}
                    </td>
                    <td className={`py-3 text-sm text-right transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {data.trades}
                    </td>
                    <td className={`py-3 text-sm text-right transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {((data.wins / data.trades) * 100).toFixed(1)}%
                    </td>
                    <td className={`py-3 text-sm text-right font-medium ${
                      data.pnl >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatCurrency(data.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
