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
}

export default function PremarketScanner() {
  const isDarkMode = useDarkMode()
  const [stocks, setStocks] = useState<PremarketStock[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastScan, setLastScan] = useState<string>('')
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [filters, setFilters] = useState({
    minChange: 3,
    maxChange: 15,
    minVolume: 1000000, // Match Finviz: >1M volume
    maxPrice: 10,
    minRelativeVolume: 1.5, // Match Finviz: >1.5x relative volume
    minScore: 60
  })

  const scanPremarket = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/premarket-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters)
      })
      
      if (response.ok) {
        const data = await response.json()
        setStocks(data.stocks || [])
        setLastScan(new Date().toLocaleTimeString())
      }
    } catch (error) {
      console.error('Premarket scan failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(scanPremarket, 60000) // Refresh every minute
    }
    return () => clearInterval(interval)
  }, [autoRefresh, filters])

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'Strong': return 'text-green-600 bg-green-100'
      case 'Moderate': return 'text-yellow-600 bg-yellow-100'
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
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">🌅 Momentum Premarket Scanner</h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Live momentum breakout candidates (4:00 AM - 9:30 AM EST)
              </p>
            </div>
            <div className={`px-4 py-2 rounded-lg ${
              isPremarketHours() 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  isPremarketHours() ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}></div>
                <span className="font-medium">
                  {isPremarketHours() ? 'PREMARKET LIVE' : 'MARKET CLOSED'}
                </span>
              </div>
              <div className="text-xs mt-1">
                {new Date().toLocaleTimeString('en-US', { 
                  timeZone: 'America/New_York',
                  hour: '2-digit', 
                  minute: '2-digit',
                  timeZoneName: 'short'
                })}
              </div>
            </div>
          </div>
          
          {!isPremarketHours() && (
            <div className={`mt-4 p-4 rounded-lg border ${
              isDarkMode 
                ? 'bg-yellow-900 border-yellow-700 text-yellow-200' 
                : 'bg-yellow-100 border-yellow-400 text-yellow-800'
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

        {/* Enhanced Controls */}
        <div className={`p-6 rounded-lg mb-6 ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border`}>
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex gap-4 items-center flex-wrap">
              <button
                onClick={scanPremarket}
                disabled={isLoading}
                className={`px-6 py-3 font-medium rounded-lg transition-all duration-200 ${
                  isLoading 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl'
                } text-white`}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Scanning...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span>🔍</span>
                    Scan Momentum Stocks
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
        <div className={`rounded-lg ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        } border overflow-hidden`}>
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold">
              Top Premarket Movers ({stocks.length}/3)
            </h2>
          </div>
          
          {stocks.length === 0 ? (
            <div className="p-8 text-center">
              <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {isLoading ? 'Loading top premarket movers...' : 'No movers found. Click "Refresh Movers" to load current data.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Symbol</th>
                    <th className="px-4 py-3 text-left font-medium">Price</th>
                    <th className="px-4 py-3 text-left font-medium">Change</th>
                    <th className="px-4 py-3 text-left font-medium">Volume</th>
                    <th className="px-4 py-3 text-left font-medium">Rel Vol</th>
                    <th className="px-4 py-3 text-left font-medium">Score</th>
                    <th className="px-4 py-3 text-left font-medium">Signal</th>
                    <th className="px-4 py-3 text-left font-medium">Market Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((stock, index) => (
                    <tr key={stock.symbol} className={`border-t ${
                      isDarkMode ? 'border-gray-700 hover:bg-gray-750' : 'border-gray-200 hover:bg-gray-50'
                    }`}>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => window.open(`/trade-analyzer?symbol=${stock.symbol}`, '_blank')}
                          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {stock.symbol}
                        </button>
                      </td>
                      <td className="px-4 py-3">${stock.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${
                          stock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-4 py-3">{stock.volume.toLocaleString()}</td>
                      <td className="px-4 py-3">{stock.relativeVolume.toFixed(1)}x</td>
                      <td className="px-4 py-3">
                        <span className={`font-bold ${
                          stock.score >= 80 ? 'text-green-600' :
                          stock.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {stock.score}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSignalColor(stock.signal)}`}>
                          {stock.signal}
                        </span>
                      </td>
                      <td className="px-4 py-3">{stock.marketCap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Enhanced Trading Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className={`p-6 rounded-lg ${
            isDarkMode ? 'bg-gradient-to-br from-blue-900 to-blue-800 border-blue-700' : 'bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200'
          } border`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span>💡</span>
              Today's Momentum Strategy Reminders
            </h3>
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="bg-white/50 dark:bg-gray-700/50 p-3 rounded">
                <div className="font-semibold text-blue-600 dark:text-blue-400 mb-1">🎯 Target Criteria</div>
                <div className="text-xs">Price &lt;$10 • Volume &gt;1M • RelVol &gt;1.5x</div>
              </div>
              
              <div className="bg-white/50 dark:bg-gray-700/50 p-3 rounded">
                <div className="font-semibold text-green-600 dark:text-green-400 mb-1">📈 Profit Targets</div>
                <div className="text-xs">3% (conservative) • 8% (moderate) • 15% (aggressive)</div>
              </div>
              
              <div className="bg-white/50 dark:bg-gray-700/50 p-3 rounded">
                <div className="font-semibold text-orange-600 dark:text-orange-400 mb-1">🔄 Trading 212</div>
                <div className="text-xs">Hold until green • No stop losses</div>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded text-xs text-yellow-800 dark:text-yellow-200 border border-yellow-200 dark:border-yellow-700">
                <span className="font-medium">⚠️ Always verify news catalysts before entry</span>
              </div>
            </div>
          </div>

          <div className={`p-6 rounded-lg ${
            isDarkMode ? 'bg-gradient-to-br from-purple-900 to-purple-800 border-purple-700' : 'bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200'
          } border`}>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <span>⏰</span>
              Optimal Timing (France Time)
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between items-center">
                <span>9:00 AM</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  isDarkMode ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-green-100 text-green-800'
                }`}>SCAN TIME</span>
              </div>
              <div className="flex justify-between items-center">
                <span>10:00-14:30</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  isDarkMode ? 'bg-blue-900/50 text-blue-300 border border-blue-700' : 'bg-blue-100 text-blue-800'
                }`}>PREMARKET</span>
              </div>
              <div className="flex justify-between items-center">
                <span>15:30</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  isDarkMode ? 'bg-orange-900/50 text-orange-300 border border-orange-700' : 'bg-orange-100 text-orange-800'
                }`}>MARKET OPEN</span>
              </div>
              <div className={`text-xs opacity-75 mt-2 ${
                isDarkMode ? 'text-purple-300' : 'text-purple-700'
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
