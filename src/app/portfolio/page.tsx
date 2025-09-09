'use client';

import { useState, useEffect, useMemo } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTradeStore } from '@/utils/store';
import { formatCurrency } from '@/utils/formatters';
import { format } from 'date-fns';
import PortfolioChart from '@/components/Charts/PortfolioChart';
import AssetAllocationChart from '@/components/Charts/AssetAllocationChart';
import PortfolioHeatMap from '@/components/Charts/PortfolioHeatMap';
import BenchmarkComparison from '@/components/Charts/BenchmarkComparison';
import { UnifiedStockData } from '@/services/marketstackService';

export default function MonitorPage() {
  const isDarkMode = useDarkMode();
  const { processedTrades, trades } = useTradeStore();
  const [refreshTime, setRefreshTime] = useState(new Date());
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isLoading, setIsLoading] = useState(false);
  const [marketData, setMarketData] = useState<{ [symbol: string]: UnifiedStockData }>({});
  const [marketDataLoading, setMarketDataLoading] = useState(false);
  const [marketDataError, setMarketDataError] = useState<string | null>(null);
  const [selectedView, setSelectedView] = useState<'overview' | 'heatmap' | 'benchmark'>('overview');
  const [isMounted, setIsMounted] = useState(false);
  const [momentumAlerts, setMomentumAlerts] = useState<any[]>([]);
  const [marketStatus, setMarketStatus] = useState<'premarket' | 'open' | 'closed'>('closed');

  // Fix hydration issue by ensuring component is mounted before showing time
  useEffect(() => {
    setIsMounted(true);
    
    // Check market status
    const checkMarketStatus = () => {
      const now = new Date();
      const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const hour = estTime.getHours();
      const minutes = estTime.getMinutes();
      const currentTime = hour * 60 + minutes;
      
      if (currentTime >= 240 && currentTime < 570) { // 4:00 AM - 9:30 AM EST
        setMarketStatus('premarket');
      } else if (currentTime >= 570 && currentTime < 960) { // 9:30 AM - 4:00 PM EST
        setMarketStatus('open');
      } else {
        setMarketStatus('closed');
      }
    };
    
    checkMarketStatus();
    const statusInterval = setInterval(checkMarketStatus, 60000);
    return () => clearInterval(statusInterval);
  }, []);

  // Auto-refresh every 30 seconds and fetch real market data
  useEffect(() => {
    const fetchMarketData = async () => {
      const openTrades = trades.filter(trade => trade.isOpen);
      if (openTrades.length === 0) return;

      setMarketDataLoading(true);
      setMarketDataError(null);

      try {
        const uniqueSymbols = [...new Set(openTrades.map(trade => trade.symbol))];
        const marketDataMap: { [symbol: string]: UnifiedStockData } = {};
        
        // Batch symbols into groups of 10 to respect API limits
        const batchSize = 10;
        const batches = [];
        for (let i = 0; i < uniqueSymbols.length; i += batchSize) {
          batches.push(uniqueSymbols.slice(i, i + batchSize));
        }

        // Fetch data for each batch
        for (const batch of batches) {
          const symbols = batch.join(',');
          const response = await fetch(`/api/market-data?symbols=${symbols}`);
          const data = await response.json();

          if (data.success) {
            data.data.forEach((item: UnifiedStockData) => {
              marketDataMap[item.symbol] = item;
            });
          } else {
            console.warn(`Failed to fetch data for batch: ${symbols}`, data.error);
            // Continue with other batches even if one fails
          }
        }
        
        setMarketData(marketDataMap);
        setLastUpdated(new Date());
        
        // Generate momentum alerts
        generateMomentumAlerts(marketDataMap, openTrades);
        
        // Clear any previous errors if we got some data
        if (Object.keys(marketDataMap).length > 0) {
          setMarketDataError(null);
        }
      } catch (error) {
        console.error('Error fetching market data:', error);
        setMarketDataError(error instanceof Error ? error.message : 'Failed to fetch market data');
      } finally {
        setMarketDataLoading(false);
      }
    };

    // Initial fetch
    fetchMarketData();

    // Set up intervals
    const marketDataInterval = setInterval(fetchMarketData, 60000); // Every minute
    const refreshInterval = setInterval(() => {
      setRefreshTime(new Date());
    }, 30000); // Every 30 seconds

    return () => {
      clearInterval(marketDataInterval);
      clearInterval(refreshInterval);
    };
  }, [trades]);

  // Generate momentum alerts based on market data
  const generateMomentumAlerts = (marketDataMap: { [symbol: string]: UnifiedStockData }, openTrades: any[]) => {
    const alerts: any[] = [];
    
    openTrades.forEach(trade => {
      const marketInfo = marketDataMap[trade.symbol];
      if (!marketInfo) return;
      
      const currentPrice = marketInfo.price;
      const entryPrice = trade.price;
      const changePercent = ((currentPrice - entryPrice) / entryPrice) * 100;
      
      // Momentum target alerts (3%, 8%, 15%)
      if (changePercent >= 15) {
        alerts.push({
          type: 'target_hit',
          level: 'aggressive',
          symbol: trade.symbol,
          message: `🎯 ${trade.symbol} hit 15% target! Consider taking profits.`,
          changePercent: changePercent.toFixed(2),
          priority: 'high'
        });
      } else if (changePercent >= 8) {
        alerts.push({
          type: 'target_hit',
          level: 'moderate',
          symbol: trade.symbol,
          message: `📈 ${trade.symbol} hit 8% target! Momentum building.`,
          changePercent: changePercent.toFixed(2),
          priority: 'medium'
        });
      } else if (changePercent >= 3) {
        alerts.push({
          type: 'target_hit',
          level: 'conservative',
          symbol: trade.symbol,
          message: `✅ ${trade.symbol} hit 3% target! Early momentum confirmed.`,
          changePercent: changePercent.toFixed(2),
          priority: 'low'
        });
      }
      
      // Risk alerts
      if (changePercent <= -10) {
        alerts.push({
          type: 'risk_alert',
          symbol: trade.symbol,
          message: `⚠️ ${trade.symbol} down ${Math.abs(changePercent).toFixed(2)}%! Consider exit strategy.`,
          changePercent: changePercent.toFixed(2),
          priority: 'high'
        });
      } else if (changePercent <= -5) {
        alerts.push({
          type: 'risk_alert',
          symbol: trade.symbol,
          message: `📉 ${trade.symbol} down ${Math.abs(changePercent).toFixed(2)}%. Monitor closely.`,
          changePercent: changePercent.toFixed(2),
          priority: 'medium'
        });
      }
      
      // Volume spike alerts (using relative volume if available)
      if (marketInfo.volume && marketInfo.volume > 1000000) { // High volume threshold
        alerts.push({
          type: 'volume_spike',
          symbol: trade.symbol,
          message: `🔥 ${trade.symbol} high volume detected! ${(marketInfo.volume / 1000000).toFixed(1)}M shares.`,
          priority: 'medium'
        });
      }
    });
    
    setMomentumAlerts(alerts);
  };

  // Calculate portfolio metrics from open positions with real market data
  const portfolioMetrics = useMemo(() => {
    const openTrades = trades.filter(trade => trade.isOpen);
    
    console.log('Portfolio Debug - Open trades:', openTrades.length);
    console.log('Portfolio Debug - All trades:', trades.length);
    
    // Debug open positions by symbol
    const openPositionsBySymbol = openTrades.reduce((acc, trade) => {
      if (!acc[trade.symbol]) acc[trade.symbol] = [];
      acc[trade.symbol].push({ quantity: trade.quantity, price: trade.price, date: trade.date });
      return acc;
    }, {} as Record<string, any[]>);
    
    console.log('Open positions by symbol:', Object.keys(openPositionsBySymbol).map(symbol => ({
      symbol,
      trades: openPositionsBySymbol[symbol].length,
      totalShares: openPositionsBySymbol[symbol].reduce((sum, t) => sum + t.quantity, 0),
      avgPrice: openPositionsBySymbol[symbol].reduce((sum, t) => sum + (t.price * t.quantity), 0) / 
                openPositionsBySymbol[symbol].reduce((sum, t) => sum + t.quantity, 0)
    })));
    
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

    // Use real market data when available, fallback to original trade price (no simulation)
    const totalValue = openTrades.reduce((sum, trade) => {
      const marketPrice = marketData[trade.symbol]?.price;
      // If no market data, use the original trade price (current value = cost basis)
      const currentPrice = marketPrice || trade.price;
      return sum + (currentPrice * trade.quantity);
    }, 0);

    // Calculate day change from market data only
    const dayChange = openTrades.reduce((sum, trade) => {
      const marketInfo = marketData[trade.symbol];
      if (marketInfo) {
        return sum + (marketInfo.change * trade.quantity);
      }
      // If no market data, assume no change for the day
      return sum;
    }, 0);

    const unrealizedPnL = totalValue - totalInvested;
    const realizedPnL = trades.filter(t => !t.isOpen).reduce((sum, t) => sum + (t.profitLoss || 0), 0);
    const totalPnL = unrealizedPnL + realizedPnL;

    return {
      totalValue,
      totalPnL,
      dayChange,
      openPositions: openTrades.length,
      totalInvested,
      unrealizedPnL,
      realizedPnL
    };
  }, [trades, marketData, refreshTime]);

  const openPositions = useMemo(() => {
    return trades.filter(trade => trade.isOpen).map(trade => {
      const marketInfo = marketData[trade.symbol];
      // Use real market price if available, otherwise use original trade price (no gain/loss)
      const currentPrice = marketInfo?.price || trade.price;
      const marketValue = currentPrice * trade.quantity;
      const costBasis = trade.price * trade.quantity;
      const unrealizedPnL = marketValue - costBasis;
      const unrealizedPnLPercent = costBasis > 0 ? (unrealizedPnL / costBasis) * 100 : 0;
      
      return {
        ...trade,
        currentPrice,
        marketValue,
        costBasis,
        unrealizedPnL,
        unrealizedPnLPercent,
        marketInfo
      };
    });
  }, [trades, marketData, refreshTime]);

  const StatCard = ({ title, value, subtitle, color = 'default', icon }: { title: string; value: string | number; subtitle: string; color?: string; icon: string }) => (
    <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
      isDarkMode ? 'bg-slate-800/90 border-slate-700/60' : 'bg-white/90 border-slate-200/60'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-semibold transition-colors ${
          isDarkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          {title}
        </h3>
        {icon && (
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
              : 'bg-gradient-to-br from-amber-600 to-amber-700'
          }`}>
            <span className="text-white text-sm">{icon}</span>
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold mb-2 ${
        color === 'green' ? 'text-emerald-600 dark:text-emerald-400' :
        color === 'red' ? 'text-red-600 dark:text-red-400' :
        isDarkMode ? 'text-slate-100' : 'text-slate-900'
      }`}>
        {value}
      </p>
      {subtitle && (
        <p className={`text-sm transition-colors ${
          isDarkMode ? 'text-slate-400' : 'text-slate-500'
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-gradient-to-br from-amber-500 to-amber-600' 
                    : 'bg-gradient-to-br from-amber-600 to-amber-700'
                }`}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h1 className={`text-3xl font-bold transition-colors ${
                    isDarkMode 
                      ? 'bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent' 
                      : 'bg-gradient-to-r from-amber-700 to-amber-800 bg-clip-text text-transparent'
                  }`}>
                    Portfolio Monitor
                  </h1>
                  <p className={`text-base transition-colors ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    Real-time momentum tracking with intelligent alerts
                  </p>
                </div>
              </div>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium inline-block ${
                marketStatus === 'premarket' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                marketStatus === 'open' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                'bg-slate-100 text-slate-800 dark:bg-slate-800/50 dark:text-slate-300'
              }`}>
                {marketStatus === 'premarket' ? '🌅 Premarket Active' :
                 marketStatus === 'open' ? '🔔 Market Open' : '🌙 Market Closed'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {marketDataLoading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Updating...</span>
                </div>
              )}
              {marketDataError && (
                <div className="flex items-center gap-2 text-red-500">
                  <span className="text-sm">⚠️ {marketDataError}</span>
                </div>
              )}
              <div className={`text-sm transition-colors ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}>
                Last updated: {isMounted ? format(lastUpdated, 'HH:mm:ss') : '--:--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* Momentum Alerts */}
        {momentumAlerts.length > 0 && (
          <div className="mb-8">
            <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
              isDarkMode ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white/90 border-slate-200/50'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <h2 className={`text-xl font-bold transition-colors ${
                  isDarkMode ? 'text-slate-100' : 'text-slate-900'
                }`}>
                  Live Alerts
                </h2>
              </div>
              <div className="grid gap-3">
                {momentumAlerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-xl border-l-4 transition-all duration-300 hover:scale-102 ${
                      alert.priority === 'high' ? 'border-red-500 bg-gradient-to-r from-red-50 to-red-25 dark:from-red-500/20 dark:to-red-500/5' :
                      alert.priority === 'medium' ? 'border-blue-500 bg-gradient-to-r from-blue-50 to-blue-25 dark:from-blue-500/20 dark:to-blue-500/5' :
                      'border-green-500 bg-gradient-to-r from-green-50 to-green-25 dark:from-green-500/20 dark:to-green-500/5'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <p className={`text-sm font-medium ${
                        alert.priority === 'high' ? 'text-red-800' :
                        alert.priority === 'medium' ? 'text-blue-800' :
                        'text-green-800'
                      }`}>
                        {alert.message}
                      </p>
                      {alert.changePercent && (
                        <span className={`text-xs font-bold ${
                          parseFloat(alert.changePercent) >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {parseFloat(alert.changePercent) >= 0 ? '+' : ''}{alert.changePercent}%
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Portfolio Value"
            value={portfolioMetrics.openPositions > 0 ? formatCurrency(portfolioMetrics.totalValue) : "No Open Positions"}
            subtitle={`${portfolioMetrics.openPositions} open positions`}
            color={portfolioMetrics.totalValue > 0 ? 'green' : 'default'}
            icon="💼"
          />
          <StatCard
            title="Total P&L"
            value={formatCurrency(portfolioMetrics.totalPnL)}
            subtitle="Realized + Unrealized"
            color={portfolioMetrics.totalPnL >= 0 ? 'green' : 'red'}
            icon="📈"
          />
          <StatCard
            title="Day Change"
            value={portfolioMetrics.openPositions > 0 ? formatCurrency(portfolioMetrics.dayChange) : "Market Closed"}
            subtitle="Today's movement"
            color={portfolioMetrics.dayChange >= 0 ? 'green' : 'red'}
            icon="📊"
          />
          <StatCard
            title="Unrealized P&L"
            value={portfolioMetrics.openPositions > 0 ? formatCurrency(portfolioMetrics.unrealizedPnL) : "All Positions Closed"}
            subtitle="Open positions"
            color={portfolioMetrics.unrealizedPnL >= 0 ? 'green' : 'red'}
            icon="⏳"
          />
        </div>

        {/* View Selector */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-3">
            {[
              { key: 'overview', label: '📊 Overview', icon: '📊' },
              { key: 'heatmap', label: '🔥 Heat Map', icon: '🔥' },
              { key: 'benchmark', label: '📈 Benchmark', icon: '📈' }
            ].map((view) => (
              <button
                key={view.key}
                onClick={() => setSelectedView(view.key as any)}
                className={`px-6 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg ${
                  selectedView === view.key
                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-slate-500/25'
                    : (isDarkMode ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-700/90 border border-slate-700/50' : 'bg-white/90 text-slate-700 hover:bg-slate-50/90 border border-slate-200/50')
                }`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        {openPositions.length > 0 && (
          <div className="mb-6 sm:mb-8">
            {selectedView === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className={`lg:col-span-2 rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
                  isDarkMode ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white/90 border-slate-200/50'
                }`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                      </svg>
                    </div>
                    <h3 className={`text-xl font-bold transition-colors ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Portfolio Performance
                    </h3>
                  </div>
                  <div className="h-48 sm:h-64">
                    <PortfolioChart 
                      trades={trades} 
                      portfolioValue={portfolioMetrics.totalValue}
                      className="w-full h-full"
                    />
                  </div>
                </div>

                <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
                  isDarkMode ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white/90 border-slate-200/50'
                }`}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                    </div>
                    <h3 className={`text-xl font-bold transition-colors ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      Asset Allocation
                    </h3>
                  </div>
                  <div className="h-48 sm:h-64 relative">
                    <AssetAllocationChart 
                      positions={openPositions}
                      totalValue={portfolioMetrics.totalValue}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            )}

            {selectedView === 'heatmap' && (
              <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
                isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
              }`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-bold transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Risk Heat Map
                  </h3>
                </div>
                <PortfolioHeatMap 
                  positions={openPositions}
                  totalValue={portfolioMetrics.totalValue}
                  className="min-h-96"
                />
              </div>
            )}

            {selectedView === 'benchmark' && (
              <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
                isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
              }`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-bold transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Benchmark Comparison
                  </h3>
                </div>
                <BenchmarkComparison 
                  portfolioData={[]}
                  className="min-h-96"
                />
              </div>
            )}
          </div>
        )}

        {/* Trading History and Open Positions */}
        {openPositions.length > 0 ? (
          <div className={`rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-sm ${
            isDarkMode ? 'bg-slate-800/90 border-slate-700/50' : 'bg-white/90 border-slate-200/50'
          }`}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 8l2 2 4-4" />
                  </svg>
                </div>
                <h2 className={`text-xl font-bold transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Open Positions
                </h2>
              </div>
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
                          <div>
                            <div>{formatCurrency(position.currentPrice)}</div>
                            {position.marketInfo && (
                              <div className={`text-xs ${
                                position.marketInfo.change >= 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {position.marketInfo.change >= 0 ? '+' : ''}{position.marketInfo.changePercent?.toFixed(2)}%
                              </div>
                            )}
                          </div>
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
            </div>
          </div>
        ) : (
          <div className={`rounded-2xl shadow-lg border transition-all duration-300 backdrop-blur-sm ${
            isDarkMode ? 'bg-slate-800/90 border-slate-700/60' : 'bg-white/90 border-slate-200/60'
          }`}>
            <div className="p-8 text-center border-b border-slate-200 dark:border-slate-700">
              <div className="text-4xl mb-3">✅</div>
              <h3 className={`text-lg font-bold mb-2 ${
                isDarkMode ? 'text-slate-200' : 'text-slate-800'
              }`}>
                All Positions Closed
              </h3>
              <p className={`text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Great job! No open positions means no overnight risk.
              </p>
            </div>
            
            <div className="p-6">
              <h4 className={`text-md font-semibold mb-4 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-700'
              }`}>
                Recent Closed Trades
              </h4>
              {trades.filter(t => !t.isOpen && t.profitLoss !== 0).slice(0, 5).map((trade, index) => (
                <div key={trade.id} className={`flex justify-between items-center py-2 px-3 rounded-lg mb-2 ${
                  isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{trade.symbol}</span>
                    <span className={`text-xs px-2 py-1 rounded ${
                      trade.profitLoss > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {trade.profitLoss > 0 ? '+' : ''}{formatCurrency(trade.profitLoss)}
                    </span>
                  </div>
                  <span className={`text-xs ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-600'
                  }`}>
                    {format(new Date(trade.date), 'MMM dd')}
                  </span>
                </div>
              ))}
              {trades.filter(t => !t.isOpen && t.profitLoss !== 0).length === 0 && (
                <p className={`text-sm text-center py-4 ${
                  isDarkMode ? 'text-slate-500' : 'text-slate-500'
                }`}>
                  No closed trades yet. Start trading to build your history!
                </p>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Risk Management & Momentum Tracking */}
        {openPositions.length > 0 && (
          <div className="mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Risk Alerts */}
              <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
                isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
              }`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-bold transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Risk Management
                  </h3>
                </div>
                <div className="space-y-4">
                  {openPositions.filter(p => p.unrealizedPnLPercent < -10).length > 0 ? (
                    <div className="p-4 bg-gradient-to-r from-red-50 to-red-25 dark:from-red-500/20 dark:to-red-500/5 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                        ⚠️ {openPositions.filter(p => p.unrealizedPnLPercent < -10).length} position(s) down more than 10%
                      </p>
                      <div className="mt-2 text-xs text-red-600 dark:text-red-400">
                        Consider exit strategy or position sizing review
                      </div>
                    </div>
                  ) : (
                    <div className={`p-4 rounded-xl border ${
                      isDarkMode ? 'bg-gradient-to-r from-green-500/20 to-green-500/5 border-green-800' : 'bg-gradient-to-r from-green-50 to-green-25 border-green-200'
                    }`}>
                      <p className={`text-sm font-semibold ${
                        isDarkMode ? 'text-green-300' : 'text-green-800'
                      }`}>
                        ✅ All positions within acceptable risk levels
                      </p>
                    </div>
                  )}
                  
                  {/* Trading 212 Reminder */}
                  <div className={`p-4 rounded-xl border ${
                    isDarkMode ? 'bg-gradient-to-r from-blue-500/20 to-blue-500/5 border-blue-800' : 'bg-gradient-to-r from-blue-50 to-blue-25 border-blue-200'
                  }`}>
                    <p className={`text-sm font-medium ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-800'
                    }`}>
                      💡 <strong>Strategy:</strong> Hold until profitable - No stop-loss orders
                    </p>
                  </div>
                </div>
              </div>

              {/* Momentum Targets */}
              <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
                isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
              }`}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                  <h3 className={`text-xl font-bold transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Price Targets
                  </h3>
                </div>
                <div className="space-y-4">
                  {openPositions.map(position => {
                    const targets = [
                      { percent: 3, label: 'Conservative', reached: position.unrealizedPnLPercent >= 3 },
                      { percent: 8, label: 'Moderate', reached: position.unrealizedPnLPercent >= 8 },
                      { percent: 15, label: 'Aggressive', reached: position.unrealizedPnLPercent >= 15 }
                    ];
                    
                    return (
                      <div key={position.id} className={`p-4 rounded-xl border transition-all duration-300 hover:scale-102 ${
                        isDarkMode ? 'border-gray-600/50 bg-gradient-to-r from-gray-700/50 to-gray-700/25' : 'border-gray-200/50 bg-gradient-to-r from-gray-50 to-gray-25'
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-sm font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {position.symbol}
                          </span>
                          <span className={`text-xs font-bold ${
                            position.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {position.unrealizedPnLPercent >= 0 ? '+' : ''}{position.unrealizedPnLPercent.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex gap-1">
                          {targets.map(target => (
                            <div
                              key={target.percent}
                              className={`flex-1 h-2 rounded-sm ${
                                target.reached ? 'bg-green-500' : 
                                isDarkMode ? 'bg-gray-600' : 'bg-gray-300'
                              }`}
                              title={`${target.label}: ${target.percent}%`}
                            />
                          ))}
                        </div>
                        <div className="flex justify-between text-xs mt-1">
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>3%</span>
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>8%</span>
                          <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>15%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
