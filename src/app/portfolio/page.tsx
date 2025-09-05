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
                Real-time portfolio tracking with alerts and targets
              </p>
              <div className={`mt-2 px-3 py-1 rounded-full text-xs font-medium inline-block ${
                marketStatus === 'premarket' ? 'bg-orange-100 text-orange-800' :
                marketStatus === 'open' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {marketStatus === 'premarket' ? '🌅 Premarket Active' :
                 marketStatus === 'open' ? '🔔 Market Open' : '🌙 Market Closed'}
              </div>
            </div>
            <div className="flex items-center gap-4">
              {marketDataLoading && (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Updating...</span>
                </div>
              )}
              {marketDataError && (
                <div className="flex items-center gap-2 text-red-500">
                  <span className="text-sm">⚠️ {marketDataError}</span>
                </div>
              )}
              <div className={`text-sm transition-colors ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}>
                Last updated: {isMounted ? format(lastUpdated, 'HH:mm:ss') : '--:--:--'}
              </div>
            </div>
          </div>
        </div>

        {/* Momentum Alerts */}
        {momentumAlerts.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h2 className={`text-lg font-semibold mb-4 transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🚨 Live Alerts
              </h2>
              <div className="grid gap-3">
                {momentumAlerts.slice(0, 5).map((alert, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border-l-4 ${
                      alert.priority === 'high' ? 'border-red-500 bg-red-50' :
                      alert.priority === 'medium' ? 'border-blue-500 bg-blue-50' :
                      'border-green-500 bg-green-50'
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
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
        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'overview', label: '📊 Overview', icon: '📊' },
              { key: 'heatmap', label: '🔥 Heat Map', icon: '🔥' },
              { key: 'benchmark', label: '📈 Benchmark', icon: '📈' }
            ].map((view) => (
              <button
                key={view.key}
                onClick={() => setSelectedView(view.key as any)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedView === view.key
                    ? (isDarkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white')
                    : (isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
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
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className={`lg:col-span-2 rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    📈 Portfolio Performance
                  </h3>
                  <div className="h-48 sm:h-64">
                    <PortfolioChart 
                      trades={trades} 
                      portfolioValue={portfolioMetrics.totalValue}
                      className="w-full h-full"
                    />
                  </div>
                </div>

                <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
                  isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}>
                  <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    🥧 Asset Allocation
                  </h3>
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
              <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🔥 Risk Heat Map
                </h3>
                <PortfolioHeatMap 
                  positions={openPositions}
                  totalValue={portfolioMetrics.totalValue}
                  className="min-h-96"
                />
              </div>
            )}

            {selectedView === 'benchmark' && (
              <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  📈 Benchmark Comparison
                </h3>
                <BenchmarkComparison 
                  portfolioData={[]}
                  className="min-h-96"
                />
              </div>
            )}
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
            )}
          </div>
        </div>

        {/* Enhanced Risk Management & Momentum Tracking */}
        {openPositions.length > 0 && (
          <div className="mt-6 sm:mt-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Alerts */}
              <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🚨 Risk Management
                </h3>
                <div className="space-y-3">
                  {openPositions.filter(p => p.unrealizedPnLPercent < -10).length > 0 ? (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-800">
                        ⚠️ {openPositions.filter(p => p.unrealizedPnLPercent < -10).length} position(s) down more than 10%
                      </p>
                      <div className="mt-2 text-xs text-red-600">
                        Consider exit strategy or position sizing review
                      </div>
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
                  
                  {/* Trading 212 Reminder */}
                  <div className={`p-3 rounded-lg border ${
                    isDarkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'
                  }`}>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-800'
                    }`}>
                      💡 <strong>Strategy:</strong> Hold until profitable - No stop-loss orders
                    </p>
                  </div>
                </div>
              </div>

              {/* Momentum Targets */}
              <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🎯 Price Targets
                </h3>
                <div className="space-y-3">
                  {openPositions.map(position => {
                    const targets = [
                      { percent: 3, label: 'Conservative', reached: position.unrealizedPnLPercent >= 3 },
                      { percent: 8, label: 'Moderate', reached: position.unrealizedPnLPercent >= 8 },
                      { percent: 15, label: 'Aggressive', reached: position.unrealizedPnLPercent >= 15 }
                    ];
                    
                    return (
                      <div key={position.id} className={`p-2 rounded border ${
                        isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
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
