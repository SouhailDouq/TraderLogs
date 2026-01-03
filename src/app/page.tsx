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
  // Force dark mode always
  const isDarkMode = true

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
          const mappedTrades = data.trades.map((dbTrade: any) => {
            const normalizedDate = dbTrade.date.includes('T') 
              ? dbTrade.date.split('T')[0] 
              : dbTrade.date
            
            return {
              id: dbTrade.id, // Use the actual database ID
              date: normalizedDate, // Normalize ISO date to yyyy-MM-dd format
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
              },
              // Position tracking fields
              positionOpenedAt: dbTrade.positionOpenedAt,
              exitDeadline: dbTrade.exitDeadline,
              exitReason: dbTrade.exitReason,
              // Additional fields for proper display and P&L calculation
              broker: dbTrade.broker,
              source: dbTrade.source,
              fees: dbTrade.fees,
              total: dbTrade.total,
              notes: dbTrade.notes,
              currency: dbTrade.currency // Currency for USD to EUR conversion
            }
          })
          console.log('Mapped trades with database IDs:', mappedTrades)
          
          // Log trades with deadlines for debugging
          const tradesWithDeadlines = mappedTrades.filter((t: any) => t.exitDeadline)
          if (tradesWithDeadlines.length > 0) {
            console.log('📅 Trades with deadlines loaded:', tradesWithDeadlines.map((t: any) => ({
              symbol: t.symbol,
              exitDeadline: t.exitDeadline,
              positionOpenedAt: t.positionOpenedAt,
              exitReason: t.exitReason
            })))
          }
          
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg text-white font-bold transition-all duration-300 ${
            isDarkMode 
              ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
              : 'bg-gradient-to-br from-emerald-600 to-emerald-700'
          }`}>
            TL
          </div>
          <h1 className={`text-4xl font-bold transition-colors ${
            isDarkMode 
              ? 'bg-gradient-to-r from-emerald-400 to-emerald-300 bg-clip-text text-transparent' 
              : 'bg-gradient-to-r from-emerald-700 to-emerald-800 bg-clip-text text-transparent'
          }`}>
            TraderLogs
          </h1>
        </div>
        <p className={`text-lg max-w-2xl mx-auto ${
          isDarkMode ? 'text-slate-300' : 'text-slate-600'
        }`}>
          Your complete momentum trading command center. From premarket scanning to performance analysis.
        </p>
        
        {/* Quick Actions */}
        <div className="flex items-center justify-center gap-4 mt-6">
          <button 
            onClick={() => setCurrentMonth(new Date())}
            className={`px-4 py-2 text-sm font-semibold rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 ${
              isDarkMode
                ? 'text-slate-200 hover:text-white hover:bg-slate-700/50 bg-slate-700/30 border border-slate-600/30'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 bg-slate-50/50 border border-slate-200'
            }`}
          >
            📅 Today
          </button>
          <a 
            href="/premarket-scanner"
            className="px-6 py-3 text-sm font-semibold rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-emerald-500/40"
          >
            🌅 Start Scanning
          </a>
        </div>
      </div>

      {/* Momentum Trading Workflow */}
      <div className="mb-12">
        <div className={`rounded-2xl shadow-xl border backdrop-blur-sm transition-all duration-300 p-8 ${
          isDarkMode 
            ? 'bg-slate-800/90 border-slate-700/60 shadow-slate-900/30' 
            : 'bg-white/90 border-slate-200/60 shadow-slate-200/30'
        }`}>
          <div className="text-center mb-8">
            <h2 className={`text-xl font-bold transition-colors ${
              isDarkMode ? 'text-slate-100' : 'text-slate-900'
            }`}>
              ⚡ 4-Step Trading Workflow
            </h2>
            <p className={`text-sm font-medium transition-colors ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Your systematic approach to momentum trading success
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {/* Step 1: Premarket Scanner */}
            <a href="/premarket-scanner" className={`group block p-6 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 ${
              isDarkMode 
                ? 'border-orange-600/30 bg-gradient-to-br from-orange-700/10 to-orange-800/5 hover:border-orange-500/50 hover:from-orange-700/20 hover:to-orange-800/10 hover:shadow-orange-500/20' 
                : 'border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100/50 hover:border-orange-300 hover:from-orange-100 hover:to-orange-200/50 hover:shadow-orange-200/30'
            }`}>
              <div className="text-center">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">🌅</div>
                <h3 className={`font-bold text-base mb-2 ${
                  isDarkMode ? 'text-orange-200' : 'text-orange-700'
                }`}>
                  1. Premarket Scan
                </h3>
                <p className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-orange-300/80' : 'text-orange-600'
                }`}>
                  Find high-momentum candidates with volume spikes
                </p>
              </div>
            </a>

            {/* Step 2: Risk Management */}
            <a href="/risk-management" className={`group block p-6 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 ${
              isDarkMode 
                ? 'border-indigo-600/30 bg-gradient-to-br from-indigo-700/10 to-indigo-800/5 hover:border-indigo-500/50 hover:from-indigo-700/20 hover:to-indigo-800/10 hover:shadow-indigo-500/20' 
                : 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-indigo-100/50 hover:border-indigo-300 hover:from-indigo-100 hover:to-indigo-200/50 hover:shadow-indigo-200/30'
            }`}>
              <div className="text-center">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">🛡️</div>
                <h3 className={`font-bold text-base mb-2 ${
                  isDarkMode ? 'text-indigo-200' : 'text-indigo-700'
                }`}>
                  2. Position Sizing
                </h3>
                <p className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-indigo-300/80' : 'text-indigo-600'
                }`}>
                  Calculate optimal position size and risk levels
                </p>
              </div>
            </a>

            {/* Step 3: Trade Entry */}
            <a href="/trade-entry" className={`group block p-6 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 ${
              isDarkMode 
                ? 'border-emerald-600/30 bg-gradient-to-br from-emerald-700/10 to-emerald-800/5 hover:border-emerald-500/50 hover:from-emerald-700/20 hover:to-emerald-800/10 hover:shadow-emerald-500/20' 
                : 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 hover:border-emerald-300 hover:from-emerald-100 hover:to-emerald-200/50 hover:shadow-emerald-200/30'
            }`}>
              <div className="text-center">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">🎯</div>
                <h3 className={`font-bold text-base mb-2 ${
                  isDarkMode ? 'text-emerald-200' : 'text-emerald-700'
                }`}>
                  3. Plan Trade
                </h3>
                <p className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-emerald-300/80' : 'text-emerald-600'
                }`}>
                  Set entry points and profit targets
                </p>
              </div>
            </a>

            {/* Step 4: Monitor Portfolio */}
            <a href="/portfolio" className={`group block p-6 rounded-2xl border transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 ${
              isDarkMode 
                ? 'border-amber-600/30 bg-gradient-to-br from-amber-700/10 to-amber-800/5 hover:border-amber-500/50 hover:from-amber-700/20 hover:to-amber-800/10 hover:shadow-amber-500/20' 
                : 'border-amber-200 bg-gradient-to-br from-amber-50 to-amber-100/50 hover:border-amber-300 hover:from-amber-100 hover:to-amber-200/50 hover:shadow-amber-200/30'
            }`}>
              <div className="text-center">
                <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-200">📊</div>
                <h3 className={`font-bold text-base mb-2 ${
                  isDarkMode ? 'text-amber-200' : 'text-amber-700'
                }`}>
                  4. Monitor & Exit
                </h3>
                <p className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-amber-300/80' : 'text-amber-600'
                }`}>
                  Track positions and execute exits
                </p>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className={`rounded-2xl shadow-xl border backdrop-blur-sm p-8 mb-8 transition-all duration-300 ${
            isDarkMode 
              ? 'bg-slate-800/90 border-slate-700/60 shadow-slate-900/30' 
              : 'bg-white/90 border-slate-200/60 shadow-slate-200/30'
          }`}>
            <ClientCalendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
          </div>
          <div className={`rounded-2xl shadow-xl border backdrop-blur-sm p-8 transition-all duration-300 ${
            isDarkMode 
              ? 'bg-slate-800/90 border-slate-700/60 shadow-slate-900/30' 
              : 'bg-white/90 border-slate-200/60 shadow-slate-200/30'
          }`}>
            <ClientTradeSummary />
          </div>
        </div>
        <div className="lg:col-span-4 space-y-8">
          <MonthlyPnL selectedMonth={currentMonth} />
          <div className={`rounded-2xl shadow-xl border backdrop-blur-sm p-8 transition-all duration-300 ${
            isDarkMode 
              ? 'bg-slate-800/90 border-slate-700/60 shadow-slate-900/30' 
              : 'bg-white/90 border-slate-200/60 shadow-slate-200/30'
          }`}>
            <ClientTradeUpload />
          </div>
        </div>
      </div>
    </div>
  )
}
