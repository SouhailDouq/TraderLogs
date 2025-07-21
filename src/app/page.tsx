'use client';

import { useEffect, useState } from 'react'
import { useTradeStore } from '@/utils/store'
import { format } from 'date-fns'
import ClientCalendar from '@/components/Calendar/Calendar'
import ClientTradeUpload from '@/components/Trade/TradeUpload'
import ClientTradeSummary from '@/components/Trade/TradeSummary'
import ClientStrategyDashboard from '@/components/Strategy/StrategyDashboard'
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-gray-900">Trade Journal</h1>
            <div className="h-5 w-px bg-gray-200" />
            <div className="text-sm text-gray-500">
              {tradeTimeRange.earliest && tradeTimeRange.latest ? (
                <>
                  Trading data from{' '}
                  <span className="font-medium">
                    {format(tradeTimeRange.earliest, 'MMM d, yyyy')}
                  </span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {format(tradeTimeRange.latest, 'MMM d, yyyy')}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">No trading data available</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors duration-200"
            >
              Today
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <ClientCalendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <ClientStrategyDashboard />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <ClientTradeUpload />
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6">
              <ClientTradeSummary />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
