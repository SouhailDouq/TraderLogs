'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/utils/formatters'
import { useDarkMode } from '@/hooks/useDarkMode'
import { useCurrency } from '@/hooks/useCurrency'
import { convertCurrency, formatCurrencyWithSymbol } from '@/utils/currency'
import CurrencySwitcher from '@/components/CurrencySwitcher'
// Removed direct API import - now using backend route

interface StockData {
  symbol: string
  price: number
  change: string
  volume: string
  avgVolume: string
  marketCap: string
  pe: string
  forwardPE: string
  peg: string
  epsThisY: string
  epsNextY: string
  salesQQ: string
  epsQQ: string
  insiderOwn: string
  insiderTrans: string
  instOwn: string
  instTrans: string
  roa: string
  roe: string
  roi: string
  grossMargin: string
  operMargin: string
  profitMargin: string
  sma20: string
  sma50: string
  sma200: string
  week52High: string
  week52Low: string
  rsi: string
  relVolume: string
  avgVolume10d: string
  beta: string
  atr: string
  volatility: string
  optionable: string
  shortable: string
  macd?: string
  macdSignal?: string
  macdHistogram?: string
  marketContext?: {
    vix: number
    spyTrend: 'bullish' | 'bearish' | 'neutral'
    spyPrice: number
    spyChange: number
    marketCondition: 'trending' | 'volatile' | 'sideways'
    sectorRotation: {
      technology: number
      financials: number
      energy: number
    }
  }
  dataQuality?: {
    isRealData: boolean
    source: string
    warnings: string[]
    reliability: 'high' | 'medium' | 'low'
  }
  // Real-time intraday data
  intradayChange?: number
  intradayVolume?: number
  volumeSpike?: boolean
  priceAction?: 'bullish' | 'bearish' | 'neutral'
}

interface TradeSetup {
  signal: 'Strong' | 'Moderate' | 'Weak' | 'Avoid'
  entryPrice: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  riskRewardRatio: number
  positionScore: number
  signals: string[]
  warnings: string[]
}

interface WatchlistStock {
  symbol: string
  signal: 'Strong' | 'Moderate' | 'Weak' | 'Avoid'
  positionScore: number
  entryPrice: number
  analyzedAt: string
  stockData: StockData
}

export default function TradeAnalyzer() {
  const isDarkMode = useDarkMode()
  const { currency, toggleCurrency } = useCurrency()
  
  // Helper function to format currency with conversion
  const formatPrice = (amount: number): string => {
    // Stock data comes in USD from APIs, convert if needed
    const convertedAmount = convertCurrency(amount, 'USD', currency)
    return formatCurrencyWithSymbol(convertedAmount, currency)
  }
  
  const [stockData, setStockData] = useState<StockData>({
    symbol: '',
    price: 0,
    change: '',
    volume: '',
    avgVolume: '',
    marketCap: '',
    pe: '',
    forwardPE: '',
    peg: '',
    epsThisY: '',
    epsNextY: '',
    salesQQ: '',
    epsQQ: '',
    insiderOwn: '',
    insiderTrans: '',
    instOwn: '',
    instTrans: '',
    roa: '',
    roe: '',
    roi: '',
    grossMargin: '',
    operMargin: '',
    profitMargin: '',
    sma20: '',
    sma50: '',
    sma200: '',
    week52High: '',
    week52Low: '',
    rsi: '',
    relVolume: '',
    avgVolume10d: '',
    beta: '',
    atr: '',
    volatility: '',
    optionable: '',
    shortable: ''
  })

  const [isLoading, setIsLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [tickerInput, setTickerInput] = useState('')
  
  // Daily watchlist state
  const [dailyWatchlist, setDailyWatchlist] = useState<WatchlistStock[]>([])
  const [lastResetDate, setLastResetDate] = useState<string>('')

  const fetchStockDataFromAPI = async () => {
    if (!tickerInput.trim()) {
      setApiError('Please enter a ticker symbol')
      return
    }

    setIsLoading(true)
    setApiError(null)

    try {
      // Use our backend API route to avoid CORS issues
      const response = await fetch(`/api/stock-data?symbol=${encodeURIComponent(tickerInput.trim().toUpperCase())}`)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.error) {
        throw new Error(data.error)
      }
      
      if (data) {
        setStockData({
          ...stockData,
          symbol: data.symbol,
          price: data.price,
          change: data.change,
          volume: data.volume,
          marketCap: data.marketCap,
          pe: data.pe,
          beta: data.beta,
          sma20: data.sma20,
          sma50: data.sma50,
          sma200: data.sma200,
          week52High: data.week52High,
          week52Low: data.week52Low,
          rsi: data.rsi,
          relVolume: data.relVolume,
          macd: data.macd,
          macdSignal: data.macdSignal,
          macdHistogram: data.macdHistogram,
          // Real-time intraday data
          intradayChange: data.intradayChange,
          intradayVolume: data.intradayVolume,
          volumeSpike: data.volumeSpike,
          priceAction: data.priceAction,
          marketContext: data.marketContext,
          dataQuality: data.dataQuality,
          // Keep other fields as they were
          avgVolume: stockData.avgVolume,
          forwardPE: stockData.forwardPE,
          peg: stockData.peg,
          epsThisY: stockData.epsThisY,
          epsNextY: stockData.epsNextY,
          salesQQ: stockData.salesQQ,
          epsQQ: stockData.epsQQ,
          insiderOwn: stockData.insiderOwn,
          insiderTrans: stockData.insiderTrans,
          instOwn: stockData.instOwn,
          instTrans: stockData.instTrans,
          roa: stockData.roa,
          roe: stockData.roe,
          roi: stockData.roi,
          grossMargin: stockData.grossMargin,
          operMargin: stockData.operMargin,
          profitMargin: stockData.profitMargin,
          avgVolume10d: stockData.avgVolume10d,
          atr: stockData.atr,
          volatility: stockData.volatility,
          optionable: stockData.optionable,
          shortable: stockData.shortable
        })
        setApiError(null)
      } else {
        setApiError('Failed to fetch stock data. Please check the ticker symbol.')
      }
    } catch (error) {
      setApiError('Error fetching stock data. Please try again.')
      console.error('API Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const analyzeSetup = (): TradeSetup => {
    const signals: string[] = []
    const warnings: string[] = []
    let score = 0

    // Helper function to parse percentage strings
    const parsePercent = (str: string): number => {
      if (!str) return 0
      return parseFloat(str.replace('%', '')) || 0
    }

    // Helper function to parse number strings
    const parseNumber = (str: string): number => {
      if (!str) return 0
      return parseFloat(str.replace(/[^0-9.-]/g, '')) || 0
    }

    const currentPrice = stockData.price
    const sma20 = parseNumber(stockData.sma20)
    const sma50 = parseNumber(stockData.sma50)
    const sma200 = parseNumber(stockData.sma200)
    const week52High = parseNumber(stockData.week52High)
    const relativeVolume = parseNumber(stockData.relVolume)
    const rsi = parseNumber(stockData.rsi)
    
    // Market context analysis
    const marketContext = stockData.marketContext
    let marketMultiplier = 1.0 // Base multiplier for market conditions
    
    if (marketContext) {
      // VIX analysis - high volatility reduces reliability
      if (marketContext.vix && marketContext.vix > 25) {
        warnings.push(`High market volatility (VIX: ${marketContext.vix.toFixed(1)}) - increased risk`)
        marketMultiplier *= 0.8
      } else if (marketContext.vix && marketContext.vix < 15) {
        signals.push(`Low volatility environment (VIX: ${marketContext.vix.toFixed(1)}) - favorable conditions`)
        marketMultiplier *= 1.1
      }
      
      // SPY trend analysis
      if (marketContext.spyTrend === 'bearish') {
        warnings.push(`Market in bearish trend (SPY: ${marketContext.spyChange ? marketContext.spyChange.toFixed(2) : 'N/A'}%) - breakouts may fail`)
        marketMultiplier *= 0.7
      } else if (marketContext.spyTrend === 'bullish') {
        signals.push(`Market in bullish trend (SPY: +${marketContext.spyChange ? marketContext.spyChange.toFixed(2) : 'N/A'}%) - favorable for breakouts`)
        marketMultiplier *= 1.2
      }
      
      // Market condition analysis
      if (marketContext.marketCondition === 'volatile') {
        warnings.push('Volatile market conditions - use smaller position sizes')
      } else if (marketContext.marketCondition === 'trending') {
        signals.push('Trending market conditions - favorable for momentum plays')
        score += 10
      }
    } else {
      warnings.push('Market context unavailable - use extra caution')
      marketMultiplier *= 0.9
    }
    
    // CRITICAL: Real-time price validation - reject high scores on declining stocks
    const intradayChange = stockData.intradayChange || 0
    const priceAction = stockData.priceAction || 'neutral'
    const volumeSpike = stockData.volumeSpike || false
    
    // Debug logging
    console.log('DEBUG - OPEN Analysis:')
    console.log('Raw stockData:', stockData)
    console.log('intradayChange from stockData:', stockData.intradayChange)
    console.log('intradayChange variable:', intradayChange)
    console.log('priceAction:', priceAction)
    console.log('volumeSpike:', volumeSpike)
    
    // Major decline override - cap scores for stocks down significantly
    if (intradayChange < -5) {
      warnings.push(`Stock down ${Math.abs(intradayChange).toFixed(1)}% today - high risk despite technical signals`)
      marketMultiplier *= 0.3 // Severely reduce score
      warnings.push('Score heavily penalized due to significant intraday decline')
    } else if (intradayChange < -3) {
      warnings.push(`Stock down ${Math.abs(intradayChange).toFixed(1)}% today - caution advised`)
      marketMultiplier *= 0.5 // Reduce score by half
    } else if (intradayChange < -1.5) {
      warnings.push(`Stock down ${Math.abs(intradayChange).toFixed(1)}% today - weak intraday momentum`)
      marketMultiplier *= 0.7
    }
    
    // Volume spike analysis for selling pressure
    if (volumeSpike && intradayChange < -2) {
      warnings.push('High volume selling detected - potential breakdown in progress')
      marketMultiplier *= 0.4 // Further penalty for high-volume selling
    } else if (volumeSpike && intradayChange > 2) {
      signals.push('High volume buying detected - strong momentum confirmation')
      score += 15
    }
    
    // Price action momentum check
    if (priceAction === 'bearish') {
      warnings.push('Bearish intraday price action - technical signals may be outdated')
      score -= 20
    } else if (priceAction === 'bullish') {
      signals.push('Bullish intraday price action - momentum confirmation')
      score += 10
    }
    
    // Data quality assessment
    const dataQuality = stockData.dataQuality
    if (dataQuality) {
      if (dataQuality.reliability === 'low') {
        warnings.push('Low data reliability - verify key metrics manually')
        marketMultiplier *= 0.8
      } else if (dataQuality.reliability === 'high') {
        signals.push('High quality real-time data available')
        score += 5
      }
    }

    // Price above moving averages (trend confirmation)
    if (currentPrice > sma20 && sma20 > 0) {
      signals.push('Above 20-day SMA (short-term uptrend)')
      score += 20
    } else if (sma20 > 0) {
      warnings.push('Below 20-day SMA (weak short-term trend)')
    }

    if (currentPrice > sma50 && sma50 > 0) {
      signals.push('Above 50-day SMA (medium-term uptrend)')
      score += 15
    } else if (sma50 > 0) {
      warnings.push('Below 50-day SMA (weak medium-term trend)')
    }

    if (currentPrice > sma200 && sma200 > 0) {
      signals.push('Above 200-day SMA (long-term uptrend)')
      score += 10
    } else if (sma200 > 0) {
      warnings.push('Below 200-day SMA (bearish long-term trend)')
    }

    // Enhanced volume analysis with data quality consideration
    const volumeReliable = dataQuality?.reliability !== 'low'
    if (relativeVolume > 3 && volumeReliable) {
      signals.push('Exceptional relative volume (3x+ average) - very strong interest')
      score += 25
    } else if (relativeVolume > 2) {
      signals.push(`High relative volume (${relativeVolume.toFixed(1)}x average) - strong interest`)
      score += volumeReliable ? 20 : 15
    } else if (relativeVolume > 1.5) {
      signals.push(`Above average relative volume (${relativeVolume.toFixed(1)}x) - good interest`)
      score += volumeReliable ? 10 : 7
    } else if (relativeVolume < 0.8 && relativeVolume > 0) {
      warnings.push(`Low relative volume (${relativeVolume.toFixed(1)}x) - lack of interest`)
      score -= 10
    } else if (!volumeReliable) {
      warnings.push('Volume data estimated - verify on Finviz manually')
    }

    // Enhanced 52-week high analysis with market context
    const highProximity = week52High > 0 ? (currentPrice / week52High) * 100 : 0
    if (highProximity > 98) {
      // Very close to 52-week high - check market conditions
      if (marketContext?.marketCondition === 'volatile') {
        warnings.push('At 52-week high in volatile market - potential reversal risk')
        score += 10
      } else {
        signals.push('Breaking new 52-week high - exceptional momentum')
        score += 30
      }
    } else if (highProximity > 90) {
      signals.push(`Near 52-week high (${highProximity.toFixed(1)}%) - strong momentum`)
      score += 20
    } else if (highProximity > 75) {
      signals.push(`Good proximity to 52-week high (${highProximity.toFixed(1)}%) - decent momentum`)
      score += 10
    } else if (highProximity < 50) {
      warnings.push(`Far from 52-week high (${highProximity.toFixed(1)}%) - weak momentum`)
      score -= 8
    }

    // Enhanced RSI analysis with MACD confirmation
    if (rsi > 0) {
      if (rsi < 30) {
        warnings.push(`RSI oversold (${rsi.toFixed(1)}) - potential reversal risk`)
        score -= 8
      } else if (rsi > 80) {
        warnings.push(`RSI extremely overbought (${rsi.toFixed(1)}) - high pullback risk`)
        score -= 15
      } else if (rsi > 70) {
        warnings.push(`RSI overbought (${rsi.toFixed(1)}) - potential pullback risk`)
        score -= 10
      } else if (rsi >= 55 && rsi <= 70) {
        signals.push(`RSI in bullish range (${rsi.toFixed(1)}) - good momentum`)
        score += 12
      } else if (rsi >= 45 && rsi < 55) {
        signals.push(`RSI neutral (${rsi.toFixed(1)}) - no momentum bias`)
        score += 5
      }
    }
    
    // MACD analysis for additional confirmation
    if (stockData.macd && stockData.macdSignal && stockData.macdHistogram) {
      const macd = parseFloat(stockData.macd)
      const macdSignal = parseFloat(stockData.macdSignal)
      const macdHist = parseFloat(stockData.macdHistogram)
      
      if (macd > macdSignal && macdHist > 0) {
        signals.push('MACD bullish crossover - momentum confirmation')
        score += 15
      } else if (macd < macdSignal && macdHist < 0) {
        warnings.push('MACD bearish - momentum divergence')
        score -= 12
      } else if (Math.abs(macdHist) < 0.001) {
        signals.push('MACD near crossover - watch for momentum shift')
        score += 5
      }
    }

    // Price under $10 (your criteria)
    if (currentPrice <= 10) {
      signals.push('Price under $10 - meets criteria')
      score += 5
    } else {
      warnings.push('Price above $10 - outside typical range')
    }

    // Market cap analysis
    const marketCap = parseNumber(stockData.marketCap)
    if (stockData.marketCap.includes('B') && marketCap < 2) {
      signals.push('Small cap stock - higher volatility potential')
      score += 5
    } else if (stockData.marketCap.includes('M') && marketCap < 500) {
      signals.push('Small cap stock - higher volatility potential')
      score += 5
    }

    // Apply market context multiplier to final score and cap at 100
    const rawScore = score
    score = Math.round(score * marketMultiplier)
    
    // Cap score at 100 maximum
    if (score > 100) {
      score = 100
    }
    
    if (marketMultiplier !== 1.0) {
      if (marketMultiplier > 1.0) {
        signals.push(`Score boosted by favorable market conditions (${(marketMultiplier * 100).toFixed(0)}%) - Raw: ${rawScore}, Final: ${score}`)
      } else {
        warnings.push(`Score reduced by unfavorable market conditions (${(marketMultiplier * 100).toFixed(0)}%) - Raw: ${rawScore}, Final: ${score}`)
      }
    }
    
    // Enhanced entry and exit levels with volatility adjustment
    const entryPrice = currentPrice
    const volatilityMultiplier = marketContext?.vix && typeof marketContext.vix === 'number' ? Math.max(0.8, Math.min(1.3, marketContext.vix / 20)) : 1.0
    
    // Dynamic stop loss based on market volatility and technical levels
    const technicalStop = Math.max(sma20 * 0.95, currentPrice * 0.92)
    const volatilityStop = currentPrice * (1 - (0.08 * volatilityMultiplier))
    const stopLoss = Math.max(technicalStop, volatilityStop)
    
    // Dynamic profit targets based on market conditions
    const baseTarget1 = marketContext?.marketCondition === 'trending' ? 1.18 : 1.15
    const baseTarget2 = marketContext?.marketCondition === 'trending' ? 1.30 : 1.25
    
    const takeProfit1 = currentPrice * baseTarget1
    const takeProfit2 = currentPrice * baseTarget2
    const riskAmount = entryPrice - stopLoss
    const rewardAmount = takeProfit1 - entryPrice
    const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0

    // Enhanced signal strength determination with market context
    let signal: 'Strong' | 'Moderate' | 'Weak' | 'Avoid'
    
    // Adjust thresholds based on market conditions (but keep reasonable ranges)
    const strongThreshold = marketContext?.marketCondition === 'volatile' ? 75 : 70
    const moderateThreshold = marketContext?.marketCondition === 'volatile' ? 55 : 50
    const weakThreshold = marketContext?.marketCondition === 'volatile' ? 35 : 30
    
    // For very high scores (85+), require extra confirmation in volatile markets
    if (score >= 85 && marketContext?.marketCondition === 'volatile') {
      signal = 'Moderate' // Downgrade from Strong in volatile conditions
      warnings.push('High score in volatile market - downgraded to Moderate signal')
    } else if (score >= strongThreshold) {
      signal = 'Strong'
    } else if (score >= moderateThreshold) {
      signal = 'Moderate'
    } else if (score >= weakThreshold) {
      signal = 'Weak'
    } else {
      signal = 'Avoid'
    }
    
    // Additional risk warnings for high volatility
    if (marketContext?.vix && typeof marketContext.vix === 'number' && marketContext.vix > 30) {
      warnings.push('Extreme market volatility - consider reducing position size by 50%')
    } else if (marketContext?.vix && typeof marketContext.vix === 'number' && marketContext.vix > 25) {
      warnings.push('High market volatility - consider reducing position size by 25%')
    }

    return {
      signal,
      entryPrice,
      stopLoss,
      takeProfit1,
      takeProfit2,
      riskRewardRatio,
      positionScore: score,
      signals,
      warnings
    }
  }

  const setup = analyzeSetup()
  const hasData = stockData.symbol && stockData.price > 0
  
  // Check data quality for warnings
  const hasDataQualityIssues = stockData.symbol && stockData.dataQuality && (!stockData.dataQuality?.isRealData || stockData.dataQuality?.warnings.length > 0)

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Strong': return 'bg-green-100 border-green-300 text-green-800'
      case 'Moderate': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'Weak': return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'Avoid': return 'bg-red-100 border-red-300 text-red-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  // Daily watchlist functions
  const getCurrentDate = () => new Date().toISOString().split('T')[0]
  
  // Load watchlist from database
  const loadWatchlistFromDB = async () => {
    try {
      const response = await fetch('/api/watchlist')
      if (!response.ok) throw new Error('Failed to fetch watchlist')
      
      const data = await response.json()
      const watchlist = data.watchlist || []
      
      // Sort watchlist by signal strength and score
      const signalPriority = { 'Strong': 4, 'Moderate': 3, 'Weak': 2, 'Avoid': 1 }
      watchlist.sort((a: WatchlistStock, b: WatchlistStock) => {
        const aPriority = signalPriority[a.signal]
        const bPriority = signalPriority[b.signal]
        if (aPriority !== bPriority) return bPriority - aPriority
        return b.positionScore - a.positionScore
      })
      
      setDailyWatchlist(watchlist)
      setLastResetDate(getCurrentDate())
    } catch (error) {
      console.error('Error loading watchlist from database:', error)
      setDailyWatchlist([])
      setLastResetDate(getCurrentDate())
    }
  }
  
  // Add stock to database
  const addStockToDB = async (stock: WatchlistStock) => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(stock),
      })
      
      if (!response.ok) throw new Error('Failed to add to watchlist')
      
      // Reload watchlist from database to get updated list
      await loadWatchlistFromDB()
    } catch (error) {
      console.error('Error adding to watchlist:', error)
    }
  }
  
  // Manual reset function
  const handleManualReset = async () => {
    try {
      const response = await fetch('/api/watchlist', {
        method: 'DELETE',
      })
      
      if (!response.ok) throw new Error('Failed to clear watchlist')
      
      setDailyWatchlist([])
    } catch (error) {
      console.error('Error clearing watchlist:', error)
    }
  }
  
  const addToWatchlist = async (stock: WatchlistStock) => {
    await addStockToDB(stock)
  }
  
  // Initialize watchlist on component mount
  useEffect(() => {
    loadWatchlistFromDB()
  }, [])
  
  // Handle adding current analysis to watchlist
  const handleAddToWatchlist = async () => {
    if (!hasData || !stockData.symbol) return
    
    const watchlistStock: WatchlistStock = {
      symbol: stockData.symbol,
      signal: setup.signal,
      positionScore: setup.positionScore,
      entryPrice: setup.entryPrice,
      analyzedAt: new Date().toISOString(),
      stockData: stockData
    }
    
    await addToWatchlist(watchlistStock)
  }

  return (
    <main className={`min-h-screen transition-colors ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <a 
              href="/"
              className={`flex items-center gap-2 transition-colors duration-200 ${
                isDarkMode
                  ? 'text-gray-300 hover:text-gray-100'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </a>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>Trade Setup Analyzer</h1>
              <p className={`mt-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>
                Analyze momentum/breakout setups for your swing trading strategy
              </p>
            </div>
            <CurrencySwitcher currency={currency} onToggle={toggleCurrency} />
          </div>
        </div>

        {/* Daily Top 3 Watchlist */}
        {dailyWatchlist.length > 0 && (
          <div className={`mb-8 rounded-lg shadow-lg p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                <h2 className={`text-xl font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>Today's Watchlist</h2>
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-500'
                }`}>({getCurrentDate()})</span>
                <span className={`text-sm ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-400'
                }`}>• {dailyWatchlist.length} stocks</span>
              </div>
              <button
                onClick={handleManualReset}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors duration-200"
                title="Clear today's watchlist"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Clear List
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {dailyWatchlist.map((stock, index) => (
                <div key={stock.symbol} className={`p-4 rounded-lg border-2 ${getSignalColor(stock.signal)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-gray-700">#{index + 1}</span>
                      <span className="text-lg font-semibold">{stock.symbol}</span>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      stock.signal === 'Strong' ? 'bg-green-100 text-green-800' :
                      stock.signal === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                      stock.signal === 'Weak' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {stock.signal}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Score:</span>
                      <span className="font-medium">{stock.positionScore}/100</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Entry:</span>
                      <span className="font-medium">{formatPrice(stock.entryPrice)}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      Analyzed: {new Date(stock.analyzedAt).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Market Context Display */}
        {stockData.marketContext && (
          <div className={`mb-6 rounded-lg shadow-lg p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-800'
              }`}>Market Context</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* VIX */}
              <div className={`p-4 rounded-lg border ${
                stockData.marketContext.vix && stockData.marketContext.vix > 25 ? 'bg-red-50 border-red-200' :
                stockData.marketContext.vix && stockData.marketContext.vix < 15 ? 'bg-green-50 border-green-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <p className="text-sm font-medium text-gray-600 mb-1">VIX (Fear Index)</p>
                <p className={`text-2xl font-bold ${
                  stockData.marketContext.vix && stockData.marketContext.vix > 25 ? 'text-red-600' :
                  stockData.marketContext.vix && stockData.marketContext.vix < 15 ? 'text-green-600' :
                  'text-yellow-600'
                }`}>
                  {stockData.marketContext.vix ? stockData.marketContext.vix.toFixed(1) : 'N/A'}
                </p>
                <p className="text-xs text-gray-500">
                  {stockData.marketContext.marketCondition ? stockData.marketContext.marketCondition.charAt(0).toUpperCase() + stockData.marketContext.marketCondition.slice(1) : 'Unknown'}
                </p>
              </div>
              
              {/* SPY Trend */}
              <div className={`p-4 rounded-lg border ${
                stockData.marketContext.spyTrend === 'bullish' ? 'bg-green-50 border-green-200' :
                stockData.marketContext.spyTrend === 'bearish' ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-sm font-medium text-gray-600 mb-1">SPY Trend</p>
                <p className={`text-lg font-bold ${
                  stockData.marketContext.spyTrend === 'bullish' ? 'text-green-600' :
                  stockData.marketContext.spyTrend === 'bearish' ? 'text-red-600' :
                  'text-gray-600'
                }`}>
                  {stockData.marketContext.spyTrend ? stockData.marketContext.spyTrend.toUpperCase() : 'N/A'}
                </p>
                <p className={`text-sm ${
                  stockData.marketContext.spyChange && stockData.marketContext.spyChange >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stockData.marketContext.spyChange ? (stockData.marketContext.spyChange >= 0 ? '+' : '') + stockData.marketContext.spyChange.toFixed(2) + '%' : 'N/A'}
                </p>
              </div>
              
              {/* Technology Sector */}
              <div className={`p-4 rounded-lg border ${
                stockData.marketContext.sectorRotation?.technology && stockData.marketContext.sectorRotation.technology > 2 ? 'bg-green-50 border-green-200' :
                stockData.marketContext.sectorRotation?.technology && stockData.marketContext.sectorRotation.technology < -2 ? 'bg-red-50 border-red-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                <p className="text-sm font-medium text-gray-600 mb-1">Tech Sector (XLK)</p>
                <p className={`text-lg font-bold ${
                  stockData.marketContext.sectorRotation?.technology && stockData.marketContext.sectorRotation.technology >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stockData.marketContext.sectorRotation?.technology ? 
                    (stockData.marketContext.sectorRotation.technology >= 0 ? '+' : '') + stockData.marketContext.sectorRotation.technology.toFixed(1) + '%' : 
                    'N/A'
                  }
                </p>
                <p className="text-xs text-gray-500">5-day change</p>
              </div>
              
              {/* Market Condition Summary */}
              <div className={`p-4 rounded-lg border ${
                stockData.marketContext.spyTrend === 'bullish' && stockData.marketContext.vix && stockData.marketContext.vix < 20 ? 'bg-green-50 border-green-200' :
                stockData.marketContext.spyTrend === 'bearish' || (stockData.marketContext.vix && stockData.marketContext.vix > 25) ? 'bg-red-50 border-red-200' :
                'bg-yellow-50 border-yellow-200'
              }`}>
                <p className="text-sm font-medium text-gray-600 mb-1">Overall Condition</p>
                <p className={`text-lg font-bold ${
                  stockData.marketContext.spyTrend === 'bullish' && stockData.marketContext.vix && stockData.marketContext.vix < 20 ? 'text-green-600' :
                  stockData.marketContext.spyTrend === 'bearish' || (stockData.marketContext.vix && stockData.marketContext.vix > 25) ? 'text-red-600' :
                  'text-yellow-600'
                }`}>
                  {stockData.marketContext.spyTrend === 'bullish' && stockData.marketContext.vix && stockData.marketContext.vix < 20 ? 'FAVORABLE' :
                   stockData.marketContext.spyTrend === 'bearish' || (stockData.marketContext.vix && stockData.marketContext.vix > 25) ? 'CAUTIOUS' :
                   'NEUTRAL'}
                </p>
                <p className="text-xs text-gray-500">
                  {stockData.marketContext.spyTrend === 'bullish' && stockData.marketContext.vix && stockData.marketContext.vix < 20 ? 'Good for breakouts' :
                   stockData.marketContext.spyTrend === 'bearish' || (stockData.marketContext.vix && stockData.marketContext.vix > 25) ? 'High risk environment' :
                   'Mixed signals'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Data Quality Warning */}
        {hasDataQualityIssues && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-medium text-orange-800 mb-2">⚠️ Data Quality Warning</h3>
                <div className="text-sm text-orange-700 space-y-1">
                  <p><strong>Source:</strong> {stockData.dataQuality?.source}</p>
                  <p><strong>Reliability:</strong> {stockData.dataQuality?.reliability?.toUpperCase()}</p>
                  
                  {/* Data Quality Level Indicator */}
                  <div className="mt-2 p-2 bg-orange-100 rounded border-l-4 border-orange-400">
                    <p className="text-xs font-medium text-orange-800 mb-1">Data Quality Level:</p>
                    {stockData.dataQuality?.reliability === 'high' ? (
                      <p className="text-xs text-green-700">✅ <strong>High Quality</strong> → Real-time data with MACD confirmation</p>
                    ) : stockData.dataQuality?.reliability === 'medium' ? (
                      <p className="text-xs text-yellow-700">⚠️ <strong>Medium Quality</strong> → Real technical data, limited fundamentals</p>
                    ) : (
                      <p className="text-xs text-red-700">🚨 <strong>Low Quality</strong> → Estimated data, use caution</p>
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="text-xs font-medium text-orange-800 mb-1">Specific Issues:</p>
                    {stockData.dataQuality?.warnings.map((warning, index) => (
                      <p key={index} className="text-xs text-orange-700">• {warning}</p>
                    ))}
                  </div>
                  
                  <p className="mt-3 font-medium text-orange-800">
                    🚨 <strong>Use caution when trading based on this analysis</strong>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className={`rounded-lg shadow-lg p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-semibold mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Stock Data Input</h2>
            
            <div className="space-y-6">
              {/* API Ticker Lookup */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-800 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Quick Lookup (Auto-Fill)
                </h3>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={tickerInput}
                      onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
                      onKeyPress={(e) => e.key === 'Enter' && fetchStockDataFromAPI()}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-blue-500 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-blue-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="Enter ticker symbol (e.g., AAPL, TSLA)"
                      disabled={isLoading}
                    />
                  </div>
                  <button
                    onClick={fetchStockDataFromAPI}
                    disabled={isLoading || !tickerInput.trim()}
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium rounded-md transition-colors duration-200 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Fetch Data
                      </>
                    )}
                  </button>
                </div>
                {apiError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {apiError}
                    </p>
                  </div>
                )}
                <div className="mt-3">
                  <p className="text-sm text-blue-600">
                    💡 <strong>Pro tip:</strong> Enter any US stock ticker to auto-fill the data below, or continue with manual entry from Finviz.
                  </p>
                </div>
              </div>

              {/* Manual Entry Divider */}
              <div className="flex items-center">
                <div className="flex-1 border-t border-gray-300"></div>
                <div className="px-4 text-sm text-gray-500 bg-gray-50">OR ENTER MANUALLY</div>
                <div className="flex-1 border-t border-gray-300"></div>
              </div>

              {/* Basic Info - Finviz Style */}
              <div>
                <h3 className={`text-lg font-medium mb-4 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Ticker
                    </label>
                    <input
                      type="text"
                      value={stockData.symbol}
                      onChange={(e) => setStockData({...stockData, symbol: e.target.value.toUpperCase()})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="AAPL"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Price
                    </label>
                    <input
                      type="number"
                      value={stockData.price || ''}
                      onChange={(e) => setStockData({...stockData, price: Number(e.target.value)})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="8.50"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Change
                    </label>
                    <input
                      type="text"
                      value={stockData.change}
                      onChange={(e) => setStockData({...stockData, change: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="+2.5%"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Market Cap
                    </label>
                    <input
                      type="text"
                      value={stockData.marketCap}
                      onChange={(e) => setStockData({...stockData, marketCap: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="500M"
                    />
                  </div>
                </div>
              </div>

              {/* Volume & Technical */}
              <div>
                <h3 className={`text-lg font-medium mb-4 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>Volume & Technical</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Volume
                    </label>
                    <input
                      type="text"
                      value={stockData.volume}
                      onChange={(e) => setStockData({...stockData, volume: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="2.45M"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Rel Volume
                    </label>
                    <input
                      type="text"
                      value={stockData.relVolume}
                      onChange={(e) => setStockData({...stockData, relVolume: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="1.34"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      RSI (14)
                    </label>
                    <input
                      type="text"
                      value={stockData.rsi}
                      onChange={(e) => setStockData({...stockData, rsi: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="62.5"
                    />
                  </div>
                </div>
              </div>

              {/* Moving Averages */}
              <div>
                <h3 className={`text-lg font-medium mb-4 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>Moving Averages</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SMA20
                    </label>
                    <input
                      type="text"
                      value={stockData.sma20}
                      onChange={(e) => setStockData({...stockData, sma20: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="8.20"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SMA50
                    </label>
                    <input
                      type="text"
                      value={stockData.sma50}
                      onChange={(e) => setStockData({...stockData, sma50: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="7.80"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      SMA200
                    </label>
                    <input
                      type="text"
                      value={stockData.sma200}
                      onChange={(e) => setStockData({...stockData, sma200: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="6.50"
                    />
                  </div>
                </div>
              </div>

              {/* 52-Week Range */}
              <div>
                <h3 className={`text-lg font-medium mb-4 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>52-Week Range</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      52W High
                    </label>
                    <input
                      type="text"
                      value={stockData.week52High}
                      onChange={(e) => setStockData({...stockData, week52High: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="9.20"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      52W Low
                    </label>
                    <input
                      type="text"
                      value={stockData.week52Low}
                      onChange={(e) => setStockData({...stockData, week52Low: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="3.80"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Finviz Fields */}
              <div>
                <h3 className={`text-lg font-medium mb-4 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>Additional Data (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      P/E
                    </label>
                    <input
                      type="text"
                      value={stockData.pe}
                      onChange={(e) => setStockData({...stockData, pe: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="15.2"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      Beta
                    </label>
                    <input
                      type="text"
                      value={stockData.beta}
                      onChange={(e) => setStockData({...stockData, beta: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="1.25"
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      ATR
                    </label>
                    <input
                      type="text"
                      value={stockData.atr}
                      onChange={(e) => setStockData({...stockData, atr: e.target.value})}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                      placeholder="0.31"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  💡 <strong>Tip:</strong> Copy data directly from Finviz screener. Only Price, SMA values, 52W High, and Rel Volume are required for analysis.
                </p>
              </div>
            </div>
          </div>

          {/* Analysis Results */}
          <div className={`rounded-lg shadow-lg p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <h2 className={`text-xl font-semibold mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Trade Analysis</h2>
            
            {hasData ? (
              <div className="space-y-6">
                {/* Signal Strength */}
                <div className={`p-4 rounded-lg border-2 ${getSignalColor(setup.signal)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Entry Signal</h3>
                    <span className="text-2xl font-bold uppercase">{setup.signal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Setup Score</span>
                    <span className="font-bold">{setup.positionScore}/100</span>
                  </div>
                </div>

                {/* Add to Watchlist Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleAddToWatchlist}
                    className="flex items-center gap-2 px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white font-medium rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    Add to Today's Watchlist
                  </button>
                </div>

                {/* Trade Levels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-600 mb-1">Entry Price</p>
                    <p className="text-xl font-bold text-blue-800">{formatPrice(setup.entryPrice)}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-600 mb-1">Stop Loss</p>
                    <p className="text-xl font-bold text-red-800">{formatPrice(setup.stopLoss)}</p>
                    <p className="text-xs text-red-600">
                      {(((setup.entryPrice - setup.stopLoss) / setup.entryPrice) * 100).toFixed(1)}% risk
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600 mb-1">Take Profit 1</p>
                    <p className="text-xl font-bold text-green-800">{formatPrice(setup.takeProfit1)}</p>
                    <p className="text-xs text-green-600">15% target</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600 mb-1">Take Profit 2</p>
                    <p className="text-xl font-bold text-green-800">{formatPrice(setup.takeProfit2)}</p>
                    <p className="text-xs text-green-600">25% target</p>
                  </div>
                </div>

                {/* Risk/Reward */}
                <div className={`p-4 rounded-lg border ${
                  setup.riskRewardRatio >= 2 ? 'bg-green-50 border-green-200' : 
                  setup.riskRewardRatio >= 1 ? 'bg-yellow-50 border-yellow-200' : 
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Risk/Reward Ratio</span>
                    <span className={`text-xl font-bold ${
                      setup.riskRewardRatio >= 2 ? 'text-green-600' : 
                      setup.riskRewardRatio >= 1 ? 'text-yellow-600' : 
                      'text-red-600'
                    }`}>
                      {setup.riskRewardRatio.toFixed(2)}:1
                    </span>
                  </div>
                </div>

                {/* Positive Signals */}
                {setup.signals.length > 0 && (
                  <div>
                    <h4 className="font-medium text-green-700 mb-2">✅ Positive Signals</h4>
                    <div className="space-y-2">
                      {setup.signals.map((signal, index) => (
                        <div key={index} className="bg-green-50 border border-green-200 rounded p-2 text-sm text-green-800">
                          {signal}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {setup.warnings.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">⚠️ Warnings</h4>
                    <div className="space-y-2">
                      {setup.warnings.map((warning, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-800">
                          {warning}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Strategy Notes */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="font-medium text-gray-700 mb-2">Strategy Notes</h4>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• This analysis is based on your momentum/breakout strategy</p>
                    <p>• Look for stocks above key moving averages with high volume</p>
                    <p>• Best setups are near 52-week highs with strong volume</p>
                    <p>• Consider scaling out at multiple profit targets</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500">Enter stock data to analyze trade setup</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
