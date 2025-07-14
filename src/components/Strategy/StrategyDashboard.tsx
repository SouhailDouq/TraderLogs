'use client'

import { useTradeStore } from '@/utils/store'
import { useState } from 'react'

interface VolumeData {
  count: number
  wins: number
}

type VolumeAnalysis = Record<string, VolumeData>
type PriceAnalysis = Record<string, VolumeData>

export default function StrategyDashboard() {
  const trades = useTradeStore(state => state.trades)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | 'all'>('all')

  // Filter trades by timeframe
  const filteredTrades = trades.filter(trade => {
    if (timeframe === 'all') return true
    const tradeDate = new Date(trade.date)
    const now = new Date()
    const days = timeframe === '7d' ? 7 : 30
    return (now.getTime() - tradeDate.getTime()) <= days * 24 * 60 * 60 * 1000
  })

  // Get only BUY trades for strategy compliance
  const buyTrades = filteredTrades.filter(trade => trade.type === 'BUY')
  
  // Calculate strategy compliance (only for entry conditions)
  const compliantTrades = buyTrades.filter(trade => 
    trade.price < 10 && 
    (trade.volume ?? 0) > 1000000
  )
  
  // Track performance of compliant vs non-compliant trades
  const getTradePerformance = (buyTrade: any) => {
    const sellTrade = filteredTrades.find(t => 
      t.type === 'SELL' && 
      t.symbol === buyTrade.symbol && 
      new Date(t.date) > new Date(buyTrade.date)
    )
    return sellTrade?.profitLoss ?? 0
  }

  const compliantPerformance = compliantTrades.map(getTradePerformance)
  const nonCompliantPerformance = buyTrades
    .filter(t => !compliantTrades.includes(t))
    .map(getTradePerformance)

  const winRate = (trades: any[]) => {
    const profitable = trades.filter(t => (t.profitLoss ?? 0) > 0).length
    return trades.length > 0 ? (profitable / trades.length * 100).toFixed(1) : '0.0'
  }

  // Calculate volume analysis
  const volumeAnalysis = filteredTrades
    .filter(t => t.volume && t.avgVolume)
    .reduce((acc: VolumeAnalysis, trade) => {
      const ratio = (trade.volume ?? 0) / (trade.avgVolume ?? 1)
      const bucket = ratio >= 2 ? 'high' : ratio >= 1 ? 'normal' : 'low'
      if (!acc[bucket]) acc[bucket] = { count: 0, wins: 0 }
      acc[bucket].count++
      if ((trade.profitLoss ?? 0) > 0) acc[bucket].wins++
      return acc
    }, {})

  // Calculate price range analysis
  const priceAnalysis = filteredTrades.reduce((acc: PriceAnalysis, trade) => {
    const bucket = trade.price < 5 ? 'under5' : 'under10'
    if (!acc[bucket]) acc[bucket] = { count: 0, wins: 0 }
    acc[bucket].count++
    if ((trade.profitLoss ?? 0) > 0) acc[bucket].wins++
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Strategy Analysis</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setTimeframe('7d')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              timeframe === '7d' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            7D
          </button>
          <button
            onClick={() => setTimeframe('30d')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              timeframe === '30d' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            30D
          </button>
          <button
            onClick={() => setTimeframe('all')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md ${
              timeframe === 'all' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="text-sm text-gray-600 bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Understanding Your Strategy Metrics</h3>
          <ul className="list-disc pl-4 space-y-2">
            <li><span className="font-medium">Strategy Compliance:</span> Shows what percentage of your trades follow your core strategy rules (price under $10 and volume over 1M). A higher compliance usually leads to better results.</li>
            <li><span className="font-medium">Win Rate Comparison:</span> Compares success rates between trades that follow your strategy vs those that don't. This helps validate if your strategy criteria are effective.</li>
            <li><span className="font-medium">Volume Analysis:</span> Shows win rates for different volume scenarios:
              - High: 2x above average volume (potential breakout)
              - Normal: Around average volume
              - Low: Below average volume (might indicate less interest)</li>
            <li><span className="font-medium">Price Range Analysis:</span> Tracks performance in different price ranges to help you focus on your most profitable price zones.</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">
            Entry Compliance
            <span className="ml-1 text-xs text-blue-600">(BUY trades meeting criteria)</span>
          </div>
          <div className="text-2xl font-bold text-blue-600">
            {((compliantTrades.length / buyTrades.length) * 100).toFixed(1)}%
          </div>
          <div className="text-sm text-gray-500 mt-2">
            {compliantTrades.length} of {buyTrades.length} BUY trades
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Win Rate Comparison</div>
          <div className="space-y-2">
            <div>
              <div className="text-sm font-medium text-gray-700">
                Compliant Trades
              </div>
              <div className="text-xl font-bold text-green-600">
                {compliantPerformance.filter(p => p > 0).length > 0 
                  ? ((compliantPerformance.filter(p => p > 0).length / compliantPerformance.length) * 100).toFixed(1)
                  : '0.0'}%
              </div>
              <div className="text-sm text-gray-500">
                Avg: ${(compliantPerformance.reduce((a, b) => a + b, 0) / compliantPerformance.length || 0).toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-700">
                Non-Compliant Trades
              </div>
              <div className="text-xl font-bold text-red-600">
                {nonCompliantPerformance.filter(p => p > 0).length > 0
                  ? ((nonCompliantPerformance.filter(p => p > 0).length / nonCompliantPerformance.length) * 100).toFixed(1)
                  : '0.0'}%
              </div>
              <div className="text-sm text-gray-500">
                Avg: ${(nonCompliantPerformance.reduce((a, b) => a + b, 0) / nonCompliantPerformance.length || 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">
            Volume Analysis
            <span className="ml-1 text-xs text-blue-600">(relative to avg volume)</span>
          </div>
          <div className="space-y-2">
            {Object.entries(volumeAnalysis).map(([label, data]) => (
              <div key={label}>
                <div className="text-sm font-medium text-gray-700">
                  {label.charAt(0).toUpperCase() + label.slice(1)} Volume
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {((data.wins / data.count) * 100).toFixed(1)}% ({data.count} trades)
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">
            Price Range Analysis
            <span className="ml-1 text-xs text-blue-600">(win rate by price zone)</span>
          </div>
          <div className="space-y-2">
            {Object.entries(priceAnalysis).map(([label, data]) => (
              <div key={label}>
                <div className="text-sm font-medium text-gray-700">
                  {label === 'under5' ? 'Under $5' : '$5 - $10'}
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {((data.wins / data.count) * 100).toFixed(1)}% ({data.count} trades)
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
