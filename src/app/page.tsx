'use client';

import { useEffect, useState } from 'react'
import { useTradeStore } from '@/utils/store'
import { format } from 'date-fns'
import { useDarkMode } from '@/hooks/useDarkMode'
import ClientCalendar from '@/components/Calendar/Calendar'
import ClientTradeUpload from '@/components/Trade/TradeUpload'
import ClientTradeSummary from '@/components/Trade/TradeSummary'
import ClientStrategyDashboard from '@/components/Strategy/StrategyDashboard'
import MonthlyPnL from '@/components/Trade/MonthlyPnL'
import { TradeStore } from '@/utils/store'

// Use individual selectors for better performance
const selectSetTrades = (state: TradeStore) => state.setTrades
const selectClearTrades = (state: TradeStore) => state.clearTrades

export default function Home() {
  const setTrades = useTradeStore(state => state.setTrades)
  const clearTrades = useTradeStore(state => state.clearTrades)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [dateRange, setDateRange] = useState<{ start: Date; end: Date } | null>(null)
  const [tradeTimeRange, setTradeTimeRange] = useState<{ earliest: Date | null; latest: Date | null }>({ earliest: null, latest: null })
  const isDarkMode = useDarkMode()

  useEffect(() => {
    // Load trades from database on page load
    const loadTrades = async () => {
      try {
        // Clear existing trades first
        clearTrades()

        console.log('Fetching trades...')
        const response = await fetch('/api/trades')
        if (!response.ok) throw new Error('Failed to fetch trades')
        const data = await response.json()
        console.log('API response:', data)
        
        // Set trades in store
        if (data.trades && Array.isArray(data.trades)) {
          console.log('Setting trades in store:', data.trades)
          // Map database trades to frontend format, ensuring we use database IDs
          const mappedTrades = data.trades.map((dbTrade: any) => ({
            id: dbTrade.id, // Use the actual database ID
            date: dbTrade.date,
            symbol: dbTrade.symbol,
            type: dbTrade.type,
            name: dbTrade.name || '',
            price: dbTrade.price,
            quantity: dbTrade.quantity,
            profitLoss: dbTrade.profitLoss || 0,
            journal: dbTrade.journal || {
              notes: '',
              tags: [],
              emotion: 'neutral',
              rating: 3,
              createdAt: new Date().toISOString()
            }
          }))
          console.log('Mapped trades with database IDs:', mappedTrades)
          setTrades(mappedTrades)
          
          // Set date range from trades
          if (data.trades.length > 0) {
            const dates = data.trades.map((trade: { date: string }) => new Date(trade.date))
            setDateRange({
              start: new Date(Math.min(...dates)),
              end: new Date(Math.max(...dates))
            })
          } else {
            setDateRange(null)
          }
        } else {
          console.error('Invalid trades data structure:', data)
          setDateRange(null)
        }
        
        // Fetch trade time range from the API
        try {
          const timeRangeResponse = await fetch('/api/trades/time-range')
          if (timeRangeResponse.ok) {
            const timeRangeData = await timeRangeResponse.json()
            setTradeTimeRange({
              earliest: timeRangeData.earliest ? new Date(timeRangeData.earliest) : null,
              latest: timeRangeData.latest ? new Date(timeRangeData.latest) : null
            })
          }
        } catch (error) {
          console.error('Failed to fetch trade time range:', error)
        }
      } catch (error) {
        console.error('Failed to fetch trades:', error)
        setDateRange(null)
      }
    }
    loadTrades()
  }, [])

  return (
    <div className={`min-h-screen transition-colors ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              🚀 TraderLogs
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors duration-200 ${
                isDarkMode
                  ? 'text-gray-200 hover:text-white hover:bg-gray-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Today
            </button>
          </div>
        </div>

        {/* Momentum Trading Workflow */}
        <div className="mb-8">
          <div className={`rounded-lg shadow-sm border p-6 transition-colors ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h2 className={`text-xl font-semibold mb-4 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              ⚡ Trading Workflow
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Step 1: Premarket Scanner */}
              <a href="/premarket-scanner" className={`block p-4 rounded-lg border transition-all hover:scale-105 ${
                isDarkMode 
                  ? 'border-blue-500/30 bg-blue-500/10 hover:border-blue-400/50 hover:bg-blue-500/20' 
                  : 'border-blue-200 bg-blue-50 hover:border-blue-300 hover:bg-blue-100'
              }`}>
                <div className="text-center">
                  <div className="text-2xl mb-2">🌅</div>
                  <h3 className={`font-semibold text-sm mb-1 ${
                    isDarkMode ? 'text-blue-300' : 'text-blue-700'
                  }`}>
                    1. Premarket Scan
                  </h3>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-blue-200/80' : 'text-blue-600'
                  }`}>
                    Find momentum candidates
                  </p>
                </div>
              </a>

              {/* Step 2: Risk Management */}
              <a href="/risk-management" className={`block p-4 rounded-lg border transition-all hover:scale-105 ${
                isDarkMode 
                  ? 'border-gray-500/30 bg-gray-500/10 hover:border-gray-400/50 hover:bg-gray-500/20' 
                  : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'
              }`}>
                <div className="text-center">
                  <div className="text-2xl mb-2">🛡️</div>
                  <h3 className={`font-semibold text-sm mb-1 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    2. Position Sizing
                  </h3>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-gray-200/80' : 'text-gray-600'
                  }`}>
                    Calculate risk & size
                  </p>
                </div>
              </a>

              {/* Step 3: Trade Entry */}
              <a href="/trade-entry" className={`block p-4 rounded-lg border transition-all hover:scale-105 ${
                isDarkMode 
                  ? 'border-green-500/30 bg-green-500/10 hover:border-green-400/50 hover:bg-green-500/20' 
                  : 'border-green-200 bg-green-50 hover:border-green-300 hover:bg-green-100'
              }`}>
                <div className="text-center">
                  <div className="text-2xl mb-2">🎯</div>
                  <h3 className={`font-semibold text-sm mb-1 ${
                    isDarkMode ? 'text-green-300' : 'text-green-700'
                  }`}>
                    3. Plan Trade
                  </h3>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-green-200/80' : 'text-green-600'
                  }`}>
                    Entry & targets
                  </p>
                </div>
              </a>

              {/* Step 4: Monitor Portfolio */}
              <a href="/portfolio" className={`block p-4 rounded-lg border transition-all hover:scale-105 ${
                isDarkMode 
                  ? 'border-orange-500/30 bg-orange-500/10 hover:border-orange-400/50 hover:bg-orange-500/20' 
                  : 'border-orange-200 bg-orange-50 hover:border-orange-300 hover:bg-orange-100'
              }`}>
                <div className="text-center">
                  <div className="text-2xl mb-2">📊</div>
                  <h3 className={`font-semibold text-sm mb-1 ${
                    isDarkMode ? 'text-orange-300' : 'text-orange-700'
                  }`}>
                    4. Monitor & Exit
                  </h3>
                  <p className={`text-xs ${
                    isDarkMode ? 'text-orange-200/80' : 'text-orange-600'
                  }`}>
                    Track & exit
                  </p>
                </div>
              </a>
            </div>

          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className={`rounded-lg shadow-sm border p-6 mb-6 transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <ClientCalendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
            </div>
            <div className={`rounded-lg shadow-sm border p-6 transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <ClientStrategyDashboard />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <MonthlyPnL selectedMonth={currentMonth} />
            <div className={`rounded-lg shadow-sm border p-6 transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <ClientTradeUpload />
            </div>
            <div className={`rounded-lg shadow-sm border p-6 transition-colors ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700' 
                : 'bg-white border-gray-200'
            }`}>
              <ClientTradeSummary />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
