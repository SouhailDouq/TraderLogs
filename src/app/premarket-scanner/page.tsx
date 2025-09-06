'use client'

import { useState, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import ApiUsageDashboard from '@/components/ApiUsageDashboard'

interface PremarketStock {
  symbol: string
  price: number
  change: number
  changePercent: number
  volume: number
  relativeVolume: number
  score: number
  signal: 'Strong' | 'Moderate' | 'Weak' | 'Avoid'
  marketCap: string
  lastUpdated: string
  strategy?: 'momentum' | 'breakout'
  news?: {
    count: number
    sentiment: number
    topCatalyst?: string
    recentCount: number
  }
}

type TradingStrategy = 'momentum' | 'breakout'

interface StrategyFilters {
  minChange: number
  maxChange: number
  minVolume: number
  maxPrice: number
  minPrice?: number
  minRelativeVolume: number
  minScore: number
  minMarketCap?: number
  maxMarketCap?: number
  maxFloat?: number
}

export default function PremarketScanner() {
  const isDarkMode = useDarkMode()
  const [stocks, setStocks] = useState<PremarketStock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastScan, setLastScan] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [selectedStrategy, setSelectedStrategy] = useState<TradingStrategy>('momentum')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  // Strategy-specific filter presets
  const strategyFilters: Record<TradingStrategy, StrategyFilters> = {
    momentum: {
      // Based on Finviz momentum screener criteria
      minChange: 0, // No minimum - we want new highs regardless of daily change
      maxChange: 100, // Allow big movers
      minVolume: 1000000, // >1M avg volume (matches sh_avgvol_o1000)
      maxPrice: 10, // <$10 price (matches sh_price_u10)
      minRelativeVolume: 1.5, // >1.5x relative volume (matches sh_relvol_o1.5)
      minScore: 50, // Lower threshold for momentum plays
      minMarketCap: 300000000, // Small cap and over (matches cap_smallover ~$300M+)
      maxMarketCap: 10000000000 // Allow up to large cap
    },
    breakout: {
      // News-driven breakout strategy with low float focus
      minChange: 10, // Minimum 10% premarket move
      maxChange: 100, // Allow big premarket moves
      minVolume: 500000, // Base volume requirement
      maxPrice: 20, // $2-$20 price range (minPrice handled separately)
      minPrice: 2, // Minimum $2 price
      minRelativeVolume: 5.0, // 5x above 30-day average volume
      minScore: 45, // More realistic threshold for breakout opportunities
      minMarketCap: 50000000, // $50M minimum
      maxMarketCap: 10000000000, // $10B maximum
      maxFloat: 10000000 // Under 10M float shares
    }
  }
  
  const [filters, setFilters] = useState<StrategyFilters>(strategyFilters.momentum)

  const scanPremarket = async (isRetry = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/premarket-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...filters, strategy: selectedStrategy })
      })
      
      if (response.ok) {
        const data = await response.json()
        setStocks(data.stocks || [])
        setLastScan(new Date().toLocaleTimeString())
        setRetryCount(0)
        setError(null)
      } else {
        throw new Error(`API returned ${response.status}: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Premarket scan failed:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(`Scan failed: ${errorMessage}`)
      
      // Auto-retry up to 3 times with exponential backoff
      if (!isRetry && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s, 4s
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          scanPremarket(true)
        }, delay)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Handle strategy change
  const handleStrategyChange = (strategy: TradingStrategy) => {
    setSelectedStrategy(strategy)
    setFilters(strategyFilters[strategy])
    setStocks([]) // Clear previous results
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(scanPremarket, 60000) // Refresh every minute
    }
    return () => clearInterval(interval)
  }, [autoRefresh, filters, selectedStrategy])

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Strong': return 'text-green-600 bg-green-100'
      case 'Moderate': return 'text-blue-600 bg-blue-100'
      case 'Weak': return 'text-orange-600 bg-orange-100'
      case 'Avoid': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const isPremarketHours = () => {
    const now = new Date()
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000)
    const est = new Date(utc + (-5 * 3600000)) // EST timezone
    const hour = est.getHours()
    return hour >= 4 && hour < 9.5 // 4:00 AM - 9:30 AM EST
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                🌅 Premarket Stock Scanner
              </h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Strategy-based stock screening for optimal trading opportunities
              </p>
            </div>
            <div className={`px-6 py-4 rounded-xl shadow-lg ${
              isPremarketHours() 
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${
                  isPremarketHours() ? 'bg-white animate-pulse' : 'bg-white/70'
                }`}></div>
                <div>
                  <div className="font-bold text-lg">
                    {isPremarketHours() ? 'PREMARKET LIVE' : 'MARKET CLOSED'}
                  </div>
                  <div className="text-sm opacity-90">
                    {new Date().toLocaleTimeString('en-US', { 
                      timeZone: 'America/New_York',
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {!isPremarketHours() && (
            <div className={`mt-4 p-4 rounded-lg border ${
              isDarkMode 
                ? 'bg-blue-900/20 border-blue-700 text-blue-200' 
                : 'bg-blue-50 border-blue-300 text-blue-800'
            }`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">⏰</span>
                <div>
                  <p className="font-medium">Premarket Hours: 4:00 AM - 9:30 AM EST</p>
                  <p className="text-sm opacity-90">Best momentum opportunities occur during active premarket trading</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Strategy Selector */}
        <div className={`p-6 rounded-xl mb-8 shadow-lg ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4">Trading Strategy</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => handleStrategyChange('momentum')}
                className={`p-4 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  selectedStrategy === 'momentum'
                    ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-xl ring-2 ring-green-300'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">🚀</span>
                  <span className="text-lg font-bold">Momentum Strategy</span>
                </div>
                <div className="text-sm opacity-90 text-left">
                  High % moves • &lt;$10 price • &gt;1M volume • Quick profits
                </div>
              </button>
              <button
                onClick={() => handleStrategyChange('breakout')}
                className={`p-4 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 ${
                  selectedStrategy === 'breakout'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-xl ring-2 ring-blue-300'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">📈</span>
                  <span className="text-lg font-bold">Breakout Strategy</span>
                </div>
                <div className="text-sm opacity-90 text-left">
                  News catalyst • Low float • $2-$20 range • Big moves
                </div>
              </button>
            </div>
          </div>

          {/* Current Strategy Info */}
          <div className={`p-6 rounded-xl mb-6 ${
            selectedStrategy === 'momentum'
              ? isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'
              : isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
          } border shadow-inner`}>
            <div className="flex items-start gap-3">
              <div className="text-2xl">
                {selectedStrategy === 'momentum' ? '🚀' : '📈'}
              </div>
              <div>
                <h4 className="font-semibold mb-2">
                  {selectedStrategy === 'momentum' ? 'Momentum Strategy' : 'Breakout Strategy'}
                </h4>
                <div className="text-sm space-y-1">
                  {selectedStrategy === 'momentum' ? (
                    <>
                      <p>• Price change: {filters.minChange}% - {filters.maxChange}%</p>
                      <p>• Volume: &gt;{(filters.minVolume / 1000000).toFixed(1)}M shares</p>
                      <p>• Price: &lt;${filters.maxPrice}</p>
                      <p>• Relative volume: &gt;{filters.minRelativeVolume}x</p>
                      <p>• Market cap: ${(filters.minMarketCap! / 1000000).toFixed(0)}M+</p>
                    </>
                  ) : (
                    <>
                      <p>• Premarket move: {filters.minChange}%+ (news catalyst)</p>
                      <p>• Volume surge: {filters.minRelativeVolume}x above average</p>
                      <p>• Price range: ${filters.minPrice} - ${filters.maxPrice}</p>
                      <p>• Float: &lt;{(filters.maxFloat! / 1000000).toFixed(0)}M shares</p>
                      <p>• Market cap: ${(filters.minMarketCap! / 1000000).toFixed(0)}M - ${(filters.maxMarketCap! / 1000000000).toFixed(0)}B</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex gap-4 items-center flex-wrap">
              <button
                onClick={() => scanPremarket()}
                disabled={isLoading}
                className={`px-8 py-4 font-bold rounded-xl transition-all duration-300 transform hover:scale-105 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : selectedStrategy === 'momentum'
                      ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-xl hover:shadow-2xl'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-xl hover:shadow-2xl'
                } text-white`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-lg">Scanning...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🔍</span>
                    <span className="text-lg">Scan {selectedStrategy === 'momentum' ? 'Momentum' : 'Breakout'} Stocks</span>
                  </div>
                )}
              </button>
              
              <label className={`flex items-center gap-2 cursor-pointer ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>Auto-refresh (1 min)</span>
              </label>
              
              {lastScan && (
                <div className={`flex items-center gap-2 text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <span>🕒</span>
                  <span>Last update: {lastScan}</span>
                  {autoRefresh && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                    }`}>
                      Auto-refreshing
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Quick Filter Presets */}
            <div className="flex gap-2 items-center">
              <span className={`text-sm font-medium ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>Quick Filters:</span>
              <button
                onClick={() => setFilters({...filters, minChange: 5, maxChange: 15, minVolume: 1000000, minRelativeVolume: 1.5, minScore: 70})}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  isDarkMode 
                    ? 'border-green-600 text-green-400 hover:bg-green-900' 
                    : 'border-green-600 text-green-600 hover:bg-green-50'
                }`}
              >
                Conservative (5-15%)
              </button>
              <button
                onClick={() => setFilters({...filters, minChange: 3, maxChange: 20, minVolume: 1000000, minRelativeVolume: 1.5, minScore: 60})}
                className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                  isDarkMode 
                    ? 'border-blue-600 text-blue-400 hover:bg-blue-900' 
                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                }`}
              >
                Aggressive (3-20%)
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className={`rounded-xl shadow-xl ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border overflow-hidden`}>
          <div className={`p-6 border-b ${
            isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">📊</span>
                Top {selectedStrategy === 'momentum' ? 'Momentum' : 'Breakout'} Candidates
              </h2>
              <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                stocks.length > 0 
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-gray-100 text-gray-600 border border-gray-200'
              }`}>
                {stocks.length} found
              </div>
            </div>
          </div>
          
          {error && (
            <div className={`p-6 mb-4 rounded-xl border-2 ${
              isDarkMode ? 'bg-red-900/20 border-red-700 text-red-200' : 'bg-red-50 border-red-300 text-red-800'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-lg">Scan Error</h4>
                  <p className="text-sm opacity-90">{error}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => scanPremarket(false)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-red-700 hover:bg-red-600 text-white' 
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  🔄 Retry Scan
                </button>
                <button
                  onClick={() => setError(null)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    isDarkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Dismiss
                </button>
              </div>
              {retryCount > 0 && (
                <div className="mt-3 text-sm opacity-75">
                  Retry attempt {retryCount}/3
                </div>
              )}
            </div>
          )}
          
          {stocks.length === 0 && !error ? (
            <div className="p-8 text-center">
              {isLoading ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <p className={`text-lg font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Scanning {selectedStrategy} opportunities...
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Analyzing market data and applying filters
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <span className="text-6xl opacity-50">📊</span>
                  <div>
                    <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      No {selectedStrategy} candidates found
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      Try adjusting filters or scan again for fresh data
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
          
          {stocks.length > 0 && (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                  <tr>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Change</th>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Volume</th>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Rel Vol</th>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">News</th>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Score</th>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Signal</th>
                    <th className="px-6 py-4 text-left font-bold text-sm uppercase tracking-wider">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock, index) => (
                    <tr key={stock.symbol} className={`border-t transition-all duration-200 ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <td className="px-6 py-5">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                          <span className="font-bold text-xl text-blue-600">{stock.symbol}</span>
                          <button
                            onClick={() => window.open(`/trade-analyzer?symbol=${stock.symbol}`, '_blank')}
                            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 w-fit"
                            title="Analyze this stock"
                          >
                            <span>📊</span>
                            <span className="font-medium">Analyze</span>
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-lg font-bold">${stock.price.toFixed(2)}</span>
                      </td>
                      <td className="px-6 py-5">
                        <div className={`inline-flex items-center px-3 py-2 rounded-lg font-bold text-lg ${
                          stock.changePercent >= 0 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-center">
                          <div className="font-bold text-lg">{(stock.volume / 1000000).toFixed(1)}M</div>
                          <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>volume</div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-center">
                          <div className={`font-bold text-lg ${
                            stock.relativeVolume >= 5 ? 'text-red-600' :
                            stock.relativeVolume >= 3 ? 'text-orange-600' :
                            stock.relativeVolume >= 2 ? 'text-yellow-600' : 'text-blue-600'
                          }`}>{stock.relativeVolume.toFixed(1)}x</div>
                          <div className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>rel vol</div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {stock.news ? (
                          <div className="text-center">
                            <button
                              onClick={() => window.open(`/stock-news?symbol=${stock.symbol}`, '_blank')}
                              className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                              title="View news articles"
                            >
                              <div className="flex items-center justify-center gap-2 mb-1">
                                <span className={`text-lg ${
                                  stock.news.sentiment > 0.3 ? 'text-green-600' :
                                  stock.news.sentiment < -0.3 ? 'text-red-600' : 'text-gray-600'
                                }`}>
                                  {stock.news.sentiment > 0.3 ? '📈' : 
                                   stock.news.sentiment < -0.3 ? '📉' : '📰'}
                                </span>
                                <span className="font-bold text-sm">{stock.news.count}</span>
                              </div>
                              {stock.news.topCatalyst && (
                                <div className={`text-xs px-2 py-1 rounded-full ${
                                  isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {stock.news.topCatalyst}
                                </div>
                              )}
                              {stock.news.recentCount > 0 && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-1">
                                  {stock.news.recentCount} recent
                                </div>
                              )}
                            </button>
                          </div>
                        ) : (
                          <div className="text-center text-gray-400">
                            <span className="text-lg">📰</span>
                            <div className="text-xs">No news</div>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full ${
                            stock.score >= 80 ? 'bg-green-500' :
                            stock.score >= 60 ? 'bg-blue-500' : 
                            stock.score >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}></div>
                          <span className={`font-bold text-xl ${
                            stock.score >= 80 ? 'text-green-600' :
                            stock.score >= 60 ? 'text-blue-600' : 
                            stock.score >= 45 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {stock.score}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wide shadow-sm ${
                          stock.signal === 'Strong' ? 'bg-green-100 text-green-800 border-2 border-green-300' :
                          stock.signal === 'Moderate' ? 'bg-blue-100 text-blue-800 border-2 border-blue-300' :
                          stock.signal === 'Weak' ? 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300' :
                          'bg-red-100 text-red-800 border-2 border-red-300'
                        }`}>
                          {stock.signal}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-base font-bold">{stock.marketCap || 'Unknown'}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4 p-4">
              {stocks.map((stock, index) => (
                <div key={stock.symbol} className={`p-4 rounded-xl border shadow-lg ${
                  isDarkMode ? 'bg-gray-750 border-gray-600' : 'bg-white border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-2xl text-blue-600">{stock.symbol}</span>
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                        stock.score >= 80 ? 'bg-green-100 text-green-700' :
                        stock.score >= 60 ? 'bg-blue-100 text-blue-700' : 
                        stock.score >= 45 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        <div className={`w-3 h-3 rounded-full ${
                          stock.score >= 80 ? 'bg-green-500' :
                          stock.score >= 60 ? 'bg-blue-500' : 
                          stock.score >= 45 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <span className="font-bold">{stock.score}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase ${
                      stock.signal === 'Strong' ? 'bg-green-100 text-green-800' :
                      stock.signal === 'Moderate' ? 'bg-blue-100 text-blue-800' :
                      stock.signal === 'Weak' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {stock.signal}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500 mb-1">Price</div>
                      <div className="text-xl font-bold">${stock.price.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500 mb-1">Change</div>
                      <div className={`text-xl font-bold ${
                        stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500 mb-1">Volume</div>
                      <div className="text-lg font-bold">{(stock.volume / 1000000).toFixed(1)}M</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs font-medium text-gray-500 mb-1">Rel Vol</div>
                      <div className={`text-lg font-bold ${
                        stock.relativeVolume >= 5 ? 'text-red-600' :
                        stock.relativeVolume >= 3 ? 'text-orange-600' :
                        stock.relativeVolume >= 2 ? 'text-yellow-600' : 'text-blue-600'
                      }`}>{stock.relativeVolume.toFixed(1)}x</div>
                    </div>
                  </div>
                  
                  {/* News Section for Mobile */}
                  {stock.news && (
                    <button
                      onClick={() => window.open(`/stock-news?symbol=${stock.symbol}`, '_blank')}
                      className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg w-full hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-lg ${
                            stock.news.sentiment > 0.3 ? 'text-green-600' :
                            stock.news.sentiment < -0.3 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {stock.news.sentiment > 0.3 ? '📈' : 
                             stock.news.sentiment < -0.3 ? '📉' : '📰'}
                          </span>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {stock.news.count} news articles
                          </span>
                        </div>
                        {stock.news.recentCount > 0 && (
                          <span className="text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-2 py-1 rounded-full font-medium">
                            {stock.news.recentCount} recent
                          </span>
                        )}
                      </div>
                      {stock.news.topCatalyst && (
                        <div className="text-xs text-gray-600 dark:text-gray-400 text-left">
                          <span className="font-medium">Top catalyst:</span> {stock.news.topCatalyst}
                        </div>
                      )}
                    </button>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="text-gray-500">Market Cap: </span>
                      <span className="font-bold">{stock.marketCap || 'Unknown'}</span>
                    </div>
                    <button
                      onClick={() => window.open(`/trade-analyzer?symbol=${stock.symbol}`, '_blank')}
                      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2"
                      title="Analyze this stock"
                    >
                      <span>📊</span>
                      <span className="font-medium">Analyze</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
        </div>

        {/* API Usage Dashboard */}
        <div className="mb-8">
          <ApiUsageDashboard />
        </div>

        {/* Enhanced Trading Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          <div className={`p-6 rounded-xl border shadow-lg ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span>💡</span>
              {selectedStrategy === 'momentum' ? 'Momentum Strategy Tips' : 'Breakout Strategy Tips'}
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              {selectedStrategy === 'momentum' ? (
                <>
                  <div className={`p-3 rounded border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`font-semibold mb-1 ${
                      isDarkMode ? 'text-green-300' : 'text-green-600'
                    }`}>🚀 Momentum Signals</div>
                    <div className={`text-xs ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>New highs • Strong volume • Above moving averages</div>
                  </div>
                  <div className={`p-3 rounded border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`font-semibold mb-1 ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-600'
                    }`}>📈 Profit Targets</div>
                    <div className={`text-xs ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>Quick 5-15% moves • Ride the momentum • Cut losses at -3%</div>
                  </div>
                </>
              ) : (
                <>
                  <div className={`p-3 rounded border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`font-semibold mb-1 ${
                      isDarkMode ? 'text-blue-300' : 'text-blue-600'
                    }`}>📰 News Catalyst</div>
                    <div className={`text-xs ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>10%+ premarket move • 5x volume surge • Breaking news</div>
                  </div>
                  <div className={`p-3 rounded border ${
                    isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                  }`}>
                    <div className={`font-semibold mb-1 ${
                      isDarkMode ? 'text-orange-300' : 'text-orange-600'
                    }`}>⚡ Low Float Power</div>
                    <div className={`text-xs ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>&lt;10M float • $2-$20 range • 50-200% potential</div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className={`p-6 rounded-xl border shadow-lg ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span>⏰</span>
              Optimal Timing (France Time)
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span>9:00 AM</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isDarkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-100 text-green-700'
                }`}>SCAN TIME</span>
              </div>
              <div className="flex justify-between items-center">
                <span>10:00-14:30</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isDarkMode ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-100 text-blue-700'
                }`}>PREMARKET</span>
              </div>
              <div className="flex justify-between items-center">
                <span>15:30</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  isDarkMode ? 'bg-orange-900/30 text-orange-300' : 'bg-orange-100 text-orange-700'
                }`}>MARKET OPEN</span>
              </div>
              <div className={`text-xs mt-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Best entries: 9-11 AM France time
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
