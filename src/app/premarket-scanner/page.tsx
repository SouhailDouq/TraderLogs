'use client'

import { useState, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'

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
  priceAction?: 'bullish' | 'bearish' | 'neutral'
  volumeSpike?: boolean
  intradayChange?: number
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
  const [isInitialized, setIsInitialized] = useState(false)
  
  // Strategy-specific filter presets
  const strategyFilters: Record<TradingStrategy, StrategyFilters> = {
    momentum: {
      // Based on Finviz momentum screener criteria
      minChange: 0, // No minimum - we want new highs regardless of daily change
      maxChange: 100, // Allow big movers
      minVolume: 1000000, // >1M avg volume (matches sh_avgvol_o1000)
      maxPrice: 10, // <$10 price (matches sh_price_u10)
      minRelativeVolume: 1.5, // >1.5x relative volume (matches sh_relvol_o1.5)
      minScore: 0, // No score filter for momentum - let all stocks through
      minMarketCap: 300000000, // Small cap and over (matches cap_smallover ~$300M+)
      maxMarketCap: 10000000000 // Allow up to large cap
    },
    breakout: {
      // Finviz breakout strategy: gap up >10%, float <10M, price <$20, rel vol >5x
      minChange: 10, // Gap up >10% (ta_gap_u10)
      maxChange: 100, // Allow big gap moves
      minVolume: 0, // No minimum volume requirement in Finviz filter
      maxPrice: 20, // Price <$20 (sh_price_u20)
      minPrice: 0, // No minimum price in Finviz filter
      minRelativeVolume: 5.0, // Relative volume >5x (sh_relvol_o5)
      minScore: 0, // No score filter in Finviz
      minMarketCap: 0, // No market cap filter in Finviz
      maxMarketCap: 0, // No market cap filter in Finviz
      maxFloat: 10000000 // Float <10M shares (sh_float_u10)
    }
  }
  
  const [filters, setFilters] = useState<StrategyFilters>(strategyFilters.momentum)
  const [enabledFilters, setEnabledFilters] = useState({
    minChange: false,
    maxChange: false,
    minVolume: false,
    maxPrice: false,
    minPrice: false,
    minRelativeVolume: false,
    minScore: false,
    minMarketCap: false,
    maxMarketCap: false,
    maxFloat: false
  })
  const [showDecliningStocks, setShowDecliningStocks] = useState(true)
  const [hideHighRiskStocks, setHideHighRiskStocks] = useState(false)

  // Check if cached data is from current trading session
  const isDataFresh = (lastScanTime: string) => {
    try {
      const scanDate = new Date(lastScanTime)
      const now = new Date()
      const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
      
      // Check if scan is from today (ET timezone)
      const scanDateET = new Date(scanDate.toLocaleString("en-US", {timeZone: "America/New_York"}))
      const isSameDay = scanDateET.toDateString() === etTime.toDateString()
      
      if (!isSameDay) {
        console.log('Cached data is from a different day, clearing stale data')
        return false
      }
      
      // Extend cache time to 8 hours to persist data longer during trading session
      const hoursDiff = (now.getTime() - scanDate.getTime()) / (1000 * 60 * 60)
      if (hoursDiff > 8) {
        console.log(`Cached data is ${hoursDiff.toFixed(1)} hours old, clearing stale data`)
        return false
      }
      
      return true
    } catch (error) {
      console.error('Error checking data freshness:', error)
      return false
    }
  }

  // Load persisted data on component mount
  useEffect(() => {
    const loadPersistedData = () => {
      try {
        const savedStocks = localStorage.getItem('premarket-scanner-stocks')
        const savedLastScan = localStorage.getItem('premarket-scanner-last-scan')
        const savedStrategy = localStorage.getItem('premarket-scanner-strategy')
        
        // Check data freshness before loading
        if (savedLastScan && isDataFresh(savedLastScan)) {
          if (savedStocks) {
            const parsedStocks = JSON.parse(savedStocks)
            setStocks(parsedStocks)
            console.log(`Loaded ${parsedStocks.length} cached stocks from fresh scan`)
          }
          setLastScan(savedLastScan)
        } else {
          // Clear stale data
          console.log('Clearing stale cached data')
          localStorage.removeItem('premarket-scanner-stocks')
          localStorage.removeItem('premarket-scanner-last-scan')
        }
        
        if (savedStrategy && (savedStrategy === 'momentum' || savedStrategy === 'breakout')) {
          setSelectedStrategy(savedStrategy as TradingStrategy)
        }
      } catch (error) {
        console.error('Failed to load persisted scanner data:', error)
      } finally {
        setIsInitialized(true)
      }
    }

    loadPersistedData()
  }, [])

  // Persist data whenever stocks or strategy changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('premarket-scanner-stocks', JSON.stringify(stocks))
      } catch (error) {
        console.error('Failed to persist stocks data:', error)
      }
    }
  }, [stocks, isInitialized])

  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('premarket-scanner-strategy', selectedStrategy)
      } catch (error) {
        console.error('Failed to persist strategy:', error)
      }
    }
  }, [selectedStrategy, isInitialized])

  useEffect(() => {
    if (isInitialized && lastScan) {
      try {
        localStorage.setItem('premarket-scanner-last-scan', lastScan)
      } catch (error) {
        console.error('Failed to persist last scan time:', error)
      }
    }
  }, [lastScan, isInitialized])

  const clearResults = () => {
    setStocks([])
    setLastScan('')
    setError(null)
    
    // Clear persisted data
    try {
      localStorage.removeItem('premarket-scanner-stocks')
      localStorage.removeItem('premarket-scanner-last-scan')
    } catch (error) {
      console.error('Failed to clear persisted data:', error)
    }
  }

  const scanPremarket = async (isRetry = false) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/premarket-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...getActiveFilters(), strategy: selectedStrategy })
      })
      
      if (response.ok) {
        const data = await response.json()
        const processedStocks = (data.stocks || []).map((stock: PremarketStock) => ({
          ...stock,
          // Add price action classification based on change percentage
          priceAction: stock.changePercent > 3 ? 'bullish' : 
                      stock.changePercent < -3 ? 'bearish' : 'neutral',
          // Mark volume spikes (>2x relative volume)
          volumeSpike: stock.relativeVolume > 2,
          // Use changePercent as intradayChange for now
          intradayChange: stock.changePercent
        }))
        setStocks(processedStocks)
        const scanTime = new Date().toISOString()
        setLastScan(scanTime)
        setRetryCount(0)
        setError(null)
        
        // Persist the new scan results immediately
        try {
          localStorage.setItem('premarket-scanner-stocks', JSON.stringify(processedStocks))
          localStorage.setItem('premarket-scanner-last-scan', scanTime)
        } catch (error) {
          console.error('Failed to persist scan results:', error)
        }
      } else {
        // Handle specific error responses
        const errorData = await response.json().catch(() => null)
        
        if (response.status === 400 && errorData?.error?.includes('not available during regular market hours')) {
          setError(`⏰ ${errorData.message || 'Premarket scanner is only available during premarket hours (4:00 AM - 9:30 AM ET)'}`)
          return // Don't retry for market hours restriction
        } else {
          throw new Error(`API returned ${response.status}: ${response.statusText}`)
        }
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
    // Don't clear cached results when switching strategies - let user keep their data
    
    // Keep all filters disabled by default - user must explicitly enable them
    // This ensures all stocks are shown initially without any filtering
  }

  // Handle filter toggle
  const handleFilterToggle = (filterKey: keyof typeof enabledFilters) => {
    setEnabledFilters(prev => ({ ...prev, [filterKey]: !prev[filterKey] }))
  }

  // Handle filter value change
  const handleFilterChange = (filterKey: keyof StrategyFilters, value: number) => {
    setFilters(prev => ({ ...prev, [filterKey]: value }))
  }

  // Get active filters for API call
  const getActiveFilters = () => {
    const activeFilters: StrategyFilters = {
      minChange: enabledFilters.minChange ? filters.minChange : 0,
      maxChange: enabledFilters.maxChange ? filters.maxChange : 0,
      minVolume: enabledFilters.minVolume ? filters.minVolume : 0,
      maxPrice: enabledFilters.maxPrice ? filters.maxPrice : 0,
      minRelativeVolume: enabledFilters.minRelativeVolume ? filters.minRelativeVolume : 0,
      minScore: enabledFilters.minScore ? filters.minScore : 0,
      minMarketCap: enabledFilters.minMarketCap ? filters.minMarketCap : 0,
      maxMarketCap: enabledFilters.maxMarketCap ? filters.maxMarketCap : 0,
      minPrice: enabledFilters.minPrice ? filters.minPrice : 0,
      maxFloat: enabledFilters.maxFloat ? filters.maxFloat : 0
    }
    return activeFilters
  }

  // Filter stocks based on enabled filters and risk assessment
  const getFilteredStocks = () => {
    let filteredStocks = stocks
    
    // Apply enabled filters to cached results
    if (enabledFilters.minChange && filters.minChange > 0) {
      filteredStocks = filteredStocks.filter(stock => stock.changePercent >= filters.minChange)
    }
    
    if (enabledFilters.maxChange && filters.maxChange > 0) {
      filteredStocks = filteredStocks.filter(stock => stock.changePercent <= filters.maxChange)
    }
    
    if (enabledFilters.minVolume && filters.minVolume > 0) {
      filteredStocks = filteredStocks.filter(stock => stock.volume >= filters.minVolume)
    }
    
    if (enabledFilters.maxPrice && filters.maxPrice > 0) {
      filteredStocks = filteredStocks.filter(stock => stock.price <= filters.maxPrice)
    }
    
    if (enabledFilters.minPrice && filters.minPrice && filters.minPrice > 0) {
      filteredStocks = filteredStocks.filter(stock => stock.price >= (filters.minPrice || 0))
    }
    
    if (enabledFilters.minRelativeVolume && filters.minRelativeVolume > 0) {
      filteredStocks = filteredStocks.filter(stock => stock.relativeVolume >= filters.minRelativeVolume)
    }
    
    if (enabledFilters.minScore && filters.minScore > 0) {
      filteredStocks = filteredStocks.filter(stock => stock.score >= filters.minScore)
    }
    
    // Market cap filtering (assuming marketCap is a string like "$1.2B" or "$300M")
    if (enabledFilters.minMarketCap && filters.minMarketCap && filters.minMarketCap > 0) {
      filteredStocks = filteredStocks.filter(stock => {
        const marketCapValue = parseMarketCap(stock.marketCap)
        return marketCapValue >= (filters.minMarketCap || 0)
      })
    }
    
    if (enabledFilters.maxMarketCap && filters.maxMarketCap && filters.maxMarketCap > 0) {
      filteredStocks = filteredStocks.filter(stock => {
        const marketCapValue = parseMarketCap(stock.marketCap)
        return marketCapValue <= (filters.maxMarketCap || 0)
      })
    }
    
    // Filter declining stocks if option is disabled
    if (!showDecliningStocks) {
      filteredStocks = filteredStocks.filter(stock => stock.changePercent >= 0)
    }
    
    // Filter high-risk stocks (declining >5% with high scores)
    if (hideHighRiskStocks) {
      filteredStocks = filteredStocks.filter(stock => {
        // Hide stocks that are down >5% despite having good scores (potential false signals)
        if (stock.changePercent < -5 && stock.score > 60) {
          return false
        }
        return true
      })
    }
    
    return filteredStocks
  }

  // Helper function to parse market cap strings like "$1.2B" or "$300M"
  const parseMarketCap = (marketCapStr: string): number => {
    if (!marketCapStr) return 0
    
    const cleanStr = marketCapStr.replace(/[$,]/g, '').toUpperCase()
    const numMatch = cleanStr.match(/^([\d.]+)([BMK]?)/)
    
    if (!numMatch) return 0
    
    const num = parseFloat(numMatch[1])
    const suffix = numMatch[2]
    
    switch (suffix) {
      case 'B': return num * 1000000000
      case 'M': return num * 1000000
      case 'K': return num * 1000
      default: return num
    }
  }

  // Get risk warning for a stock
  const getRiskWarning = (stock: PremarketStock) => {
    if (stock.changePercent < -5 && stock.score > 60) {
      return {
        level: 'high',
        message: 'High Risk: Stock declining >5% despite good score - potential false signal'
      }
    }
    if (stock.changePercent < -3 && stock.score > 70) {
      return {
        level: 'medium', 
        message: 'Caution: Stock declining despite strong score - verify momentum'
      }
    }
    if (stock.changePercent < 0 && stock.volumeSpike && stock.relativeVolume > 3) {
      return {
        level: 'medium',
        message: 'Selling Pressure: High volume on declining stock - possible distribution'
      }
    }
    return null
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

  const getMarketStatus = () => {
    const now = new Date()
    const etTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}))
    const timeInMinutes = etTime.getHours() * 60 + etTime.getMinutes()
    
    // Skip weekends
    const dayOfWeek = etTime.getDay() // 0 = Sunday, 6 = Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return { status: 'closed', isOpen: false }
    }
    
    // Premarket: 4:00 AM - 9:30 AM ET (240-570 minutes)
    if (timeInMinutes >= 240 && timeInMinutes < 570) {
      return { status: 'premarket', isOpen: true }
    }
    
    // Regular hours: 9:30 AM - 4:00 PM ET (570-960 minutes)
    if (timeInMinutes >= 570 && timeInMinutes < 960) {
      return { status: 'regular', isOpen: true }
    }
    
    // After hours: 4:00 PM - 8:00 PM ET (960-1200 minutes)
    if (timeInMinutes >= 960 && timeInMinutes < 1200) {
      return { status: 'afterhours', isOpen: true }
    }
    
    return { status: 'closed', isOpen: false }
  }

  const isPremarketHours = () => getMarketStatus().isOpen

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
                    {(() => {
                      const marketStatus = getMarketStatus()
                      if (marketStatus.status === 'premarket') return 'PREMARKET OPEN'
                      if (marketStatus.status === 'regular') return 'MARKET OPEN'
                      if (marketStatus.status === 'afterhours') return 'AFTER HOURS'
                      return 'MARKET CLOSED'
                    })()}
                  </div>
                  <div className="text-sm opacity-90">
                    {new Date().toLocaleTimeString('en-US', { 
                      timeZone: 'America/New_York',
                      hour: '2-digit', 
                      minute: '2-digit',
                      timeZoneName: 'short'
                    })}
                  </div>
                  {stocks.length > 0 && (() => {
                    const now = Date.now()
                    const staleStocks = stocks.filter(stock => {
                      if (!stock.lastUpdated) return false
                      const dataAge = (now - new Date(stock.lastUpdated).getTime()) / (1000 * 60 * 60)
                      return dataAge > 4
                    })
                    if (staleStocks.length > 0) {
                      return (
                        <div className="text-xs mt-1 px-2 py-1 bg-yellow-500/20 text-yellow-200 rounded">
                          ⚠️ {staleStocks.length} stocks have stale data (&gt;4h old)
                        </div>
                      )
                    }
                    return null
                  })()}
                  {stocks.length > 0 && lastScan && (
                    <div className="text-xs opacity-75 mt-1">
                      📊 {stocks.length} stocks cached from {lastScan}
                    </div>
                  )}
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
                  <p className="font-medium">Market Hours: 4:00 AM - 8:00 PM ET (Premarket, Regular & Extended)</p>
                  <p className="text-sm opacity-90">Best momentum opportunities occur during active trading hours</p>
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
                  New highs • Above SMAs • &lt;$10 price • &gt;1M volume
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
                  Gap up &gt;10% • Float &lt;10M • Price &lt;$20 • Rel vol &gt;5x
                </div>
              </button>
            </div>
          </div>

          {/* Dynamic Filters */}
          <div className="mb-6">
            <h4 className="text-md font-semibold mb-4">
              Refinement Filters 
              <span className="text-sm font-normal text-gray-500 ml-2">
                (Quality stocks shown by default - check to refine further)
              </span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Min Change Filter */}
              <div className={`p-4 rounded-lg border ${
                enabledFilters.minChange 
                  ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                  : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledFilters.minChange}
                      onChange={() => handleFilterToggle('minChange')}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="font-medium">Min Change %</span>
                  </label>
                </div>
                {enabledFilters.minChange && (
                  <input
                    type="number"
                    value={filters.minChange}
                    onChange={(e) => handleFilterChange('minChange', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded border ${
                      isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    step="0.1"
                    min="-100"
                    max="100"
                  />
                )}
              </div>

              {/* Min Volume Filter */}
              <div className={`p-4 rounded-lg border ${
                enabledFilters.minVolume 
                  ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                  : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledFilters.minVolume}
                      onChange={() => handleFilterToggle('minVolume')}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="font-medium">Min Volume</span>
                  </label>
                </div>
                {enabledFilters.minVolume && (
                  <input
                    type="number"
                    value={filters.minVolume}
                    onChange={(e) => handleFilterChange('minVolume', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded border ${
                      isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    step="100000"
                    min="0"
                  />
                )}
              </div>

              {/* Max Price Filter */}
              <div className={`p-4 rounded-lg border ${
                enabledFilters.maxPrice 
                  ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                  : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledFilters.maxPrice}
                      onChange={() => handleFilterToggle('maxPrice')}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="font-medium">Max Price</span>
                  </label>
                </div>
                {enabledFilters.maxPrice && (
                  <input
                    type="number"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded border ${
                      isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    step="1"
                    min="0"
                  />
                )}
              </div>

              {/* Min Price Filter (Breakout only) */}
              {selectedStrategy === 'breakout' && (
                <div className={`p-4 rounded-lg border ${
                  enabledFilters.minPrice 
                    ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                    : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabledFilters.minPrice}
                        onChange={() => handleFilterToggle('minPrice')}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="font-medium">Min Price</span>
                    </label>
                  </div>
                  {enabledFilters.minPrice && (
                    <input
                      type="number"
                      value={filters.minPrice || 0}
                      onChange={(e) => handleFilterChange('minPrice', parseFloat(e.target.value) || 0)}
                      className={`w-full px-3 py-2 rounded border ${
                        isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      step="0.1"
                      min="0"
                    />
                  )}
                </div>
              )}

              {/* Min Relative Volume Filter */}
              <div className={`p-4 rounded-lg border ${
                enabledFilters.minRelativeVolume 
                  ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                  : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledFilters.minRelativeVolume}
                      onChange={() => handleFilterToggle('minRelativeVolume')}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="font-medium">Min Rel. Volume</span>
                  </label>
                </div>
                {enabledFilters.minRelativeVolume && (
                  <input
                    type="number"
                    value={filters.minRelativeVolume}
                    onChange={(e) => handleFilterChange('minRelativeVolume', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded border ${
                      isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    step="0.1"
                    min="0"
                  />
                )}
              </div>

              {/* Min Score Filter */}
              <div className={`p-4 rounded-lg border ${
                enabledFilters.minScore 
                  ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                  : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledFilters.minScore}
                      onChange={() => handleFilterToggle('minScore')}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="font-medium">Min Score</span>
                  </label>
                </div>
                {enabledFilters.minScore && (
                  <input
                    type="number"
                    value={filters.minScore}
                    onChange={(e) => handleFilterChange('minScore', parseInt(e.target.value) || 0)}
                    className={`w-full px-3 py-2 rounded border ${
                      isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    step="5"
                    min="0"
                    max="100"
                  />
                )}
              </div>

              {/* Min Market Cap Filter */}
              <div className={`p-4 rounded-lg border ${
                enabledFilters.minMarketCap 
                  ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                  : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledFilters.minMarketCap}
                      onChange={() => handleFilterToggle('minMarketCap')}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="font-medium">Min Market Cap</span>
                  </label>
                </div>
                {enabledFilters.minMarketCap && (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={filters.minMarketCap ? filters.minMarketCap / 1000000 : 0}
                      onChange={(e) => handleFilterChange('minMarketCap', (parseFloat(e.target.value) || 0) * 1000000)}
                      className={`w-full px-3 py-2 rounded border ${
                        isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      step="50"
                      min="0"
                      placeholder="Million $"
                    />
                    <div className="text-xs text-gray-500">Value in millions (e.g., 300 = $300M)</div>
                  </div>
                )}
              </div>

              {/* Max Market Cap Filter */}
              <div className={`p-4 rounded-lg border ${
                enabledFilters.maxMarketCap 
                  ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                  : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={enabledFilters.maxMarketCap}
                      onChange={() => handleFilterToggle('maxMarketCap')}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <span className="font-medium">Max Market Cap</span>
                  </label>
                </div>
                {enabledFilters.maxMarketCap && (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={filters.maxMarketCap ? filters.maxMarketCap / 1000000 : 0}
                      onChange={(e) => handleFilterChange('maxMarketCap', (parseFloat(e.target.value) || 0) * 1000000)}
                      className={`w-full px-3 py-2 rounded border ${
                        isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
                      step="1000"
                      min="0"
                      placeholder="Million $"
                    />
                    <div className="text-xs text-gray-500">Value in millions (e.g., 10000 = $10B)</div>
                  </div>
                )}
              </div>

              {/* Max Float Filter (Breakout only) */}
              {selectedStrategy === 'breakout' && (
                <div className={`p-4 rounded-lg border ${
                  enabledFilters.maxFloat 
                    ? isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
                    : isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enabledFilters.maxFloat}
                        onChange={() => handleFilterToggle('maxFloat')}
                        className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <span className="font-medium">Max Float</span>
                    </label>
                  </div>
                  {enabledFilters.maxFloat && (
                    <div className="space-y-2">
                      <input
                        type="number"
                        value={filters.maxFloat ? filters.maxFloat / 1000000 : 0}
                        onChange={(e) => handleFilterChange('maxFloat', (parseFloat(e.target.value) || 0) * 1000000)}
                        className={`w-full px-3 py-2 rounded border ${
                          isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-300'
                        }`}
                        step="1"
                        min="0"
                        placeholder="Million shares"
                      />
                      <div className="text-xs text-gray-500">Value in millions (e.g., 10 = 10M shares)</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Risk Management Controls */}
          <div className={`p-4 rounded-xl mb-6 border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
            <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
              <span>⚠️</span>
              Risk Management Filters
            </h4>
            <div className="flex flex-wrap gap-4">
              <label className={`flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={showDecliningStocks}
                  onChange={(e) => setShowDecliningStocks(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span>Show declining stocks</span>
              </label>
              <label className={`flex items-center gap-2 cursor-pointer ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <input
                  type="checkbox"
                  checked={hideHighRiskStocks}
                  onChange={(e) => setHideHighRiskStocks(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                />
                <span>Hide high-risk false signals</span>
              </label>
            </div>
            <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              High-risk: Stocks declining &gt;5% despite good scores (potential false signals)
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
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span className="text-lg">Scanning...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedStrategy === 'momentum' ? '🚀' : '💥'}</span>
                    <span className="text-lg">Scan {selectedStrategy === 'momentum' ? 'Momentum' : 'Breakout'} Stocks</span>
                  </div>
                )}
              </button>
              
              {stocks.length > 0 && (
                <button
                  onClick={clearResults}
                  disabled={isLoading}
                  className={`px-6 py-4 font-medium rounded-xl transition-all duration-300 transform hover:scale-105 ${
                    isLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300 border border-gray-600'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700 border border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span>🗑️</span>
                    <span>Clear Results</span>
                  </div>
                </button>
              )}
              
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
        <div className={`rounded-xl shadow-lg overflow-hidden ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          {/* Persistence indicator */}
          <div className={`px-6 py-3 border-b ${
            isDarkMode ? 'bg-gray-750 border-gray-700 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-600'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">💾</span>
                <span className="text-sm font-medium">
                  Results cached - will persist until next scan or manual clear
                </span>
              </div>
              <div className="text-xs opacity-75">
                Last updated: {lastScan}
              </div>
            </div>
          </div>
          <div className={`p-6 border-b ${
            isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
          }`}>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <span className="text-3xl">📊</span>
                Top {selectedStrategy === 'momentum' ? 'Momentum' : 'Breakout'} Candidates
              </h2>
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                  getFilteredStocks().length > 0 
                    ? 'bg-green-100 text-green-800 border border-green-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200'
                }`}>
                  {getFilteredStocks().length} shown
                </div>
                {stocks.length !== getFilteredStocks().length && (
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {stocks.length - getFilteredStocks().length} filtered
                  </div>
                )}
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
          
          {getFilteredStocks().length === 0 && !error ? (
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
                      {stocks.length === 0 ? `No ${selectedStrategy} candidates found` : 'All stocks filtered out'}
                    </p>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      {stocks.length === 0 ? 'Try adjusting filters or scan again for fresh data' : 'Try enabling declining stocks or adjusting risk filters'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
          
          {getFilteredStocks().length > 0 && (
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
                  {getFilteredStocks().map((stock, index) => {
                    const riskWarning = getRiskWarning(stock)
                    return (
                    <tr key={stock.symbol} className={`border-t transition-all duration-200 ${
                      riskWarning?.level === 'high' ? 
                        (isDarkMode ? 'border-red-700 bg-red-900/10 hover:bg-red-900/20' : 'border-red-300 bg-red-50 hover:bg-red-100') :
                      riskWarning?.level === 'medium' ?
                        (isDarkMode ? 'border-yellow-700 bg-yellow-900/10 hover:bg-yellow-900/20' : 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100') :
                      isDarkMode ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <td className="px-6 py-5">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xl text-blue-600">{stock.symbol}</span>
                            {stock.priceAction === 'bearish' && (
                              <span className="text-red-500 text-lg" title="Bearish price action">📉</span>
                            )}
                            {stock.volumeSpike && (
                              <span className="text-orange-500 text-sm" title="Volume spike detected">🔥</span>
                            )}
                          </div>
                          {riskWarning && (
                            <div className={`px-2 py-1 rounded text-xs font-medium ${
                              riskWarning.level === 'high' ? 
                                (isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700') :
                                (isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                            }`} title={riskWarning.message}>
                              {riskWarning.level === 'high' ? '⚠️ HIGH RISK' : '⚠️ CAUTION'}
                            </div>
                          )}
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
                            : stock.changePercent < -5 
                              ? 'bg-red-200 text-red-800 border-2 border-red-400'
                              : 'bg-red-100 text-red-700 border border-red-200'
                        }`}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                          {stock.changePercent < -5 && (
                            <span className="ml-1 text-xs">⚠️</span>
                          )}
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
                    )
                  })}
                </tbody>
              </table>
            </div>
            
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-4 p-4">
              {getFilteredStocks().map((stock, index) => {
                const riskWarning = getRiskWarning(stock)
                return (
                <div key={stock.symbol} className={`p-4 rounded-xl border shadow-lg ${
                  riskWarning?.level === 'high' ? 
                    (isDarkMode ? 'bg-red-900/10 border-red-700' : 'bg-red-50 border-red-300') :
                  riskWarning?.level === 'medium' ?
                    (isDarkMode ? 'bg-yellow-900/10 border-yellow-700' : 'bg-yellow-50 border-yellow-300') :
                  isDarkMode ? 'bg-gray-750 border-gray-600' : 'bg-white border-gray-200'
                }`}>
                  {riskWarning && (
                    <div className={`mb-3 p-2 rounded-lg text-xs font-medium ${
                      riskWarning.level === 'high' ? 
                        (isDarkMode ? 'bg-red-900/30 text-red-300' : 'bg-red-100 text-red-700') :
                        (isDarkMode ? 'bg-yellow-900/30 text-yellow-300' : 'bg-yellow-100 text-yellow-700')
                    }`}>
                      {riskWarning.message}
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-2xl text-blue-600">{stock.symbol}</span>
                        {stock.priceAction === 'bearish' && (
                          <span className="text-red-500 text-lg" title="Bearish price action">📉</span>
                        )}
                        {stock.volumeSpike && (
                          <span className="text-orange-500 text-sm" title="Volume spike detected">🔥</span>
                        )}
                      </div>
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
                      <div className={`text-xl font-bold flex items-center justify-center gap-1 ${
                        stock.changePercent >= 0 ? 'text-green-600' : 
                        stock.changePercent < -5 ? 'text-red-700' : 'text-red-600'
                      }`}>
                        {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        {stock.changePercent < -5 && (
                          <span className="text-xs">⚠️</span>
                        )}
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
                )
              })}
            </div>
            </>
          )}
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
