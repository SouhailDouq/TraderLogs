'use client'

import { useState } from 'react'
import { formatCurrency } from '@/utils/formatters'

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
}

interface TradeSetup {
  entrySignal: 'strong' | 'moderate' | 'weak' | 'avoid'
  entryPrice: number
  stopLoss: number
  takeProfit1: number
  takeProfit2: number
  riskRewardRatio: number
  positionScore: number
  signals: string[]
  warnings: string[]
}

export default function TradeAnalyzer() {
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

    // Volume analysis (using relative volume from Finviz)
    if (relativeVolume > 2) {
      signals.push('High relative volume (2x+ average) - strong interest')
      score += 20
    } else if (relativeVolume > 1.5) {
      signals.push('Above average relative volume - good interest')
      score += 10
    } else if (relativeVolume < 0.5 && relativeVolume > 0) {
      warnings.push('Low relative volume - lack of interest')
      score -= 10
    }

    // Near 52-week high (momentum)
    const highProximity = week52High > 0 ? (currentPrice / week52High) * 100 : 0
    if (highProximity > 95) {
      signals.push('At/near 52-week high - strong momentum')
      score += 25
    } else if (highProximity > 85) {
      signals.push('Near 52-week high - good momentum')
      score += 15
    } else if (highProximity < 50) {
      warnings.push('Far from 52-week high - weak momentum')
      score -= 5
    }

    // RSI analysis
    if (rsi > 0) {
      if (rsi < 30) {
        warnings.push('RSI oversold - potential reversal risk')
        score -= 5
      } else if (rsi > 70) {
        warnings.push('RSI overbought - potential pullback risk')
        score -= 10
      } else if (rsi >= 50 && rsi <= 70) {
        signals.push('RSI in bullish range (50-70)')
        score += 10
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

    // Calculate entry and exit levels
    const entryPrice = currentPrice
    const stopLoss = Math.max(sma20 * 0.95, currentPrice * 0.92) // 5% below SMA20 or 8% below current
    const takeProfit1 = currentPrice * 1.15 // 15% target
    const takeProfit2 = currentPrice * 1.25 // 25% target
    const riskAmount = entryPrice - stopLoss
    const rewardAmount = takeProfit1 - entryPrice
    const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0

    // Determine signal strength
    let entrySignal: 'strong' | 'moderate' | 'weak' | 'avoid'
    if (score >= 70) entrySignal = 'strong'
    else if (score >= 50) entrySignal = 'moderate'
    else if (score >= 30) entrySignal = 'weak'
    else entrySignal = 'avoid'

    return {
      entrySignal,
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

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'strong': return 'bg-green-100 border-green-300 text-green-800'
      case 'moderate': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'weak': return 'bg-orange-100 border-orange-300 text-orange-800'
      case 'avoid': return 'bg-red-100 border-red-300 text-red-800'
      default: return 'bg-gray-100 border-gray-300 text-gray-800'
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <a 
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </a>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Trade Setup Analyzer</h1>
          <p className="mt-2 text-gray-600">
            Analyze momentum/breakout setups for your swing trading strategy
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Stock Data Input</h2>
            
            <div className="space-y-6">
              {/* Basic Info - Finviz Style */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ticker
                    </label>
                    <input
                      type="text"
                      value={stockData.symbol}
                      onChange={(e) => setStockData({...stockData, symbol: e.target.value.toUpperCase()})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="AAPL"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Price
                    </label>
                    <input
                      type="number"
                      value={stockData.price || ''}
                      onChange={(e) => setStockData({...stockData, price: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="8.50"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Change
                    </label>
                    <input
                      type="text"
                      value={stockData.change}
                      onChange={(e) => setStockData({...stockData, change: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="+2.5%"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Market Cap
                    </label>
                    <input
                      type="text"
                      value={stockData.marketCap}
                      onChange={(e) => setStockData({...stockData, marketCap: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="500M"
                    />
                  </div>
                </div>
              </div>

              {/* Volume & Technical */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Volume & Technical</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Volume
                    </label>
                    <input
                      type="text"
                      value={stockData.volume}
                      onChange={(e) => setStockData({...stockData, volume: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="2.45M"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rel Volume
                    </label>
                    <input
                      type="text"
                      value={stockData.relVolume}
                      onChange={(e) => setStockData({...stockData, relVolume: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="1.34"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      RSI (14)
                    </label>
                    <input
                      type="text"
                      value={stockData.rsi}
                      onChange={(e) => setStockData({...stockData, rsi: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="62.5"
                    />
                  </div>
                </div>
              </div>

              {/* Moving Averages */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Moving Averages</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMA20
                    </label>
                    <input
                      type="text"
                      value={stockData.sma20}
                      onChange={(e) => setStockData({...stockData, sma20: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="8.20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMA50
                    </label>
                    <input
                      type="text"
                      value={stockData.sma50}
                      onChange={(e) => setStockData({...stockData, sma50: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="7.80"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SMA200
                    </label>
                    <input
                      type="text"
                      value={stockData.sma200}
                      onChange={(e) => setStockData({...stockData, sma200: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="6.50"
                    />
                  </div>
                </div>
              </div>

              {/* 52-Week Range */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">52-Week Range</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      52W High
                    </label>
                    <input
                      type="text"
                      value={stockData.week52High}
                      onChange={(e) => setStockData({...stockData, week52High: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="9.20"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      52W Low
                    </label>
                    <input
                      type="text"
                      value={stockData.week52Low}
                      onChange={(e) => setStockData({...stockData, week52Low: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="3.80"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Finviz Fields */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Additional Data (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      P/E
                    </label>
                    <input
                      type="text"
                      value={stockData.pe}
                      onChange={(e) => setStockData({...stockData, pe: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="15.2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Beta
                    </label>
                    <input
                      type="text"
                      value={stockData.beta}
                      onChange={(e) => setStockData({...stockData, beta: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="1.25"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ATR
                    </label>
                    <input
                      type="text"
                      value={stockData.atr}
                      onChange={(e) => setStockData({...stockData, atr: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Trade Analysis</h2>
            
            {hasData ? (
              <div className="space-y-6">
                {/* Signal Strength */}
                <div className={`p-4 rounded-lg border-2 ${getSignalColor(setup.entrySignal)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">Entry Signal</h3>
                    <span className="text-2xl font-bold uppercase">{setup.entrySignal}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Setup Score</span>
                    <span className="font-bold">{setup.positionScore}/100</span>
                  </div>
                </div>

                {/* Trade Levels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-600 mb-1">Entry Price</p>
                    <p className="text-xl font-bold text-blue-800">{formatCurrency(setup.entryPrice)}</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-600 mb-1">Stop Loss</p>
                    <p className="text-xl font-bold text-red-800">{formatCurrency(setup.stopLoss)}</p>
                    <p className="text-xs text-red-600">
                      {(((setup.entryPrice - setup.stopLoss) / setup.entryPrice) * 100).toFixed(1)}% risk
                    </p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600 mb-1">Take Profit 1</p>
                    <p className="text-xl font-bold text-green-800">{formatCurrency(setup.takeProfit1)}</p>
                    <p className="text-xs text-green-600">15% target</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600 mb-1">Take Profit 2</p>
                    <p className="text-xl font-bold text-green-800">{formatCurrency(setup.takeProfit2)}</p>
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
                    <span className="font-medium">Risk/Reward Ratio</span>
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
