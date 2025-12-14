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
    <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm hover:scale-[1.02] ${
      isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
    }`}>
      <h3 className={`text-sm font-semibold transition-colors ${
        isDarkMode ? 'text-gray-300' : 'text-gray-600'
      }`}>
        {title}
      </h3>
      <p className={`text-2xl font-bold mt-2 ${
        color === 'green' ? 'text-green-600 dark:text-green-400' :
        color === 'red' ? 'text-red-600 dark:text-red-400' :
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-sm mt-1 font-medium transition-colors ${
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
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
              isDarkMode 
                ? 'bg-gradient-to-br from-violet-500 to-violet-600' 
                : 'bg-gradient-to-br from-violet-600 to-violet-700'
            }`}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className={`text-3xl font-bold transition-colors ${
                isDarkMode 
                  ? 'bg-gradient-to-r from-violet-400 to-violet-300 bg-clip-text text-transparent' 
                  : 'bg-gradient-to-r from-violet-700 to-violet-800 bg-clip-text text-transparent'
              }`}>
                Performance Analytics
              </h1>
              <p className={`text-base transition-colors ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Track your momentum trading success
              </p>
            </div>
          </div>
        </div>

        {/* Momentum Target Achievement */}
        <div className="mb-6 sm:mb-8">
          <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
          }`}>
            <div className="flex items-center gap-3 mb-6">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
                isDarkMode 
                  ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                  : 'bg-gradient-to-br from-emerald-600 to-emerald-700'
              }`}>
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Target Achievement
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-500/10 dark:to-green-600/5 border border-green-200 dark:border-green-500/30 text-center transition-all duration-300 hover:scale-[1.02]">
                <div className={`text-3xl font-bold mb-2 ${
                  performanceData.momentumMetrics.target3Hits > 0 ? 'text-green-600 dark:text-green-400' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {performanceData.momentumMetrics.target3Hits}
                </div>
                <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  3% Target Hits
                </div>
                <div className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Conservative gains
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-600/5 border border-blue-200 dark:border-blue-500/30 text-center transition-all duration-300 hover:scale-[1.02]">
                <div className={`text-3xl font-bold mb-2 ${
                  performanceData.momentumMetrics.target8Hits > 0 ? 'text-blue-600 dark:text-blue-400' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {performanceData.momentumMetrics.target8Hits}
                </div>
                <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  8% Target Hits
                </div>
                <div className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Moderate momentum
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-500/10 dark:to-purple-600/5 border border-purple-200 dark:border-purple-500/30 text-center transition-all duration-300 hover:scale-[1.02]">
                <div className={`text-3xl font-bold mb-2 ${
                  performanceData.momentumMetrics.target15Hits > 0 ? 'text-purple-600 dark:text-purple-400' : isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {performanceData.momentumMetrics.target15Hits}
                </div>
                <div className={`text-sm font-semibold ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  15% Target Hits
                </div>
                <div className={`text-xs mt-1 font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
                  {performanceData.totalTrades > 0 && performanceData.momentumMetrics?.target3Hits ? 
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
            value={`${(performanceData.winRate || 0).toFixed(1)}%`}
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
            value={`${(performanceData.momentumMetrics?.avgMomentumGain || 0).toFixed(1)}%`}
            subtitle="Average winning trade return"
            color={performanceData.momentumMetrics.avgMomentumGain >= 8 ? 'green' : performanceData.momentumMetrics.avgMomentumGain >= 3 ? 'default' : 'red'}
          />
        </div>

        {/* Advanced Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* Premarket Performance */}
          <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Premarket Stats
              </h2>
            </div>
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
                  {(performanceData.momentumMetrics?.premarketWinRate || 0).toFixed(1)}%
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

          <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
            isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className={`text-xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Risk/Reward
              </h2>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={`text-sm transition-colors ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Profit Factor:</span>
                <span className={`font-medium ${
                  performanceData.profitFactor >= 2 ? 'text-green-600' : 
                  performanceData.profitFactor >= 1 ? 'text-blue-600' : 'text-red-600'
                }`}>
                  {performanceData.profitFactor === Infinity ? '∞' : (performanceData.profitFactor || 0).toFixed(2)}
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
        <div className={`rounded-2xl shadow-lg border p-6 mb-8 transition-all duration-300 backdrop-blur-sm ${
          isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className={`text-xl font-bold transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Monthly Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="grid grid-cols-12 gap-2 sm:gap-4">
                {performanceData.monthlyData.map((month, index) => (
                  <div key={index} className="text-center">
                    <div className={`h-24 flex items-end justify-center mb-2 rounded-xl transition-all duration-300 hover:scale-105 ${
                      month.pnl >= 0 ? 'bg-gradient-to-t from-green-100 to-green-50 dark:from-green-500/20 dark:to-green-500/5' : 'bg-gradient-to-t from-red-100 to-red-50 dark:from-red-500/20 dark:to-red-500/5'
                    }`}>
                      <div
                        className={`w-full rounded-lg shadow-sm ${
                          month.pnl >= 0 ? 'bg-gradient-to-t from-green-500 to-green-400' : 'bg-gradient-to-t from-red-500 to-red-400'
                        }`}
                        style={{
                          height: `${Math.max(Math.abs(month.pnl) / Math.max(...performanceData.monthlyData.map(m => Math.abs(m.pnl))) * 100, 8)}%`
                        }}
                      />
                    </div>
                    <p className={`text-xs font-semibold transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      {month.month.split(' ')[0]}
                    </p>
                    <p className={`text-xs font-bold transition-colors ${
                      month.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
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
        <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 hover:scale-105 backdrop-blur-sm ${
          isDarkMode ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white/90 border-slate-200/50'
        }`}>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <h2 className={`text-xl font-bold transition-colors ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Strategy Performance
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className={`border-b transition-colors ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-200'
                }`}>
                  <th className={`text-left py-2 px-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Strategy</th>
                  <th className={`text-right py-2 px-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Trades</th>
                  <th className={`text-right py-2 px-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Win Rate</th>
                  <th className={`text-right py-2 px-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>Expectancy</th>
                  <th className={`text-right py-2 px-2 text-sm font-medium transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>P&L</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(performanceData.strategyBreakdown)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => b.expectancy - a.expectancy)
                  .map(([strategy, data]: [string, any]) => (
                  <tr key={strategy} className={`border-b transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-200'
                  }`}>
                    <td className={`py-3 px-2 text-sm font-medium transition-colors ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {strategy}
                      {data.expectancy > 10 && (
                        <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-semibold">
                          🚀 Best
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-2 text-sm text-right transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {data.trades}
                    </td>
                    <td className={`py-3 px-2 text-sm text-right transition-colors ${
                      data.winRate >= 60 ? 'text-green-600 dark:text-green-400 font-semibold' :
                      data.winRate >= 50 ? isDarkMode ? 'text-gray-300' : 'text-gray-600' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {(data.winRate || 0).toFixed(1)}%
                    </td>
                    <td className={`py-3 px-2 text-sm text-right font-bold ${
                      data.expectancy > 5 ? 'text-green-600 dark:text-green-400' :
                      data.expectancy > 0 ? 'text-blue-600 dark:text-blue-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(data.expectancy)}
                      <div className={`text-xs font-normal mt-0.5 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        per trade
                      </div>
                    </td>
                    <td className={`py-3 px-2 text-sm text-right font-medium ${
                      data.pnl >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                      {formatCurrency(data.pnl)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Strategy Comparison Insight */}
          {Object.keys(performanceData.strategyBreakdown).length > 1 && (
            <div className={`mt-6 p-4 rounded-xl border ${
              isDarkMode ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className={`text-sm font-semibold mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-800'
              }`}>
                💡 Strategy Insights
              </div>
              <div className={`text-xs space-y-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                {(() => {
                  const strategies = Object.entries(performanceData.strategyBreakdown)
                    .sort(([, a]: [string, any], [, b]: [string, any]) => b.expectancy - a.expectancy);
                  const best = strategies[0];
                  const worst = strategies[strategies.length - 1];
                  
                  return (
                    <>
                      <p>• <strong>{best[0]}</strong> has the highest expectancy at {formatCurrency((best[1] as any).expectancy)} per trade</p>
                      {(worst[1] as any).expectancy < 0 && (
                        <p className="text-red-600 dark:text-red-400">• <strong>{worst[0]}</strong> has negative expectancy - consider avoiding this strategy</p>
                      )}
                      <p className="pt-2 font-semibold">
                        ✅ Focus on strategies with highest expectancy for better long-term results
                      </p>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
