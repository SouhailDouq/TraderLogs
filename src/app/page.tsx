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

  useEffect(() => {
    // Load trades from database on page load
    const loadTrades = async () => {
      try {
        // Clear existing trades first
        clearTrades()

        const response = await fetch('/api/trades')
        if (!response.ok) throw new Error('Failed to fetch trades')
        const data = await response.json()
        clearTrades()
        setTrades(data)
        
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
      } catch (error) {
        console.error('Failed to fetch trades:', error)
      }
    }
    loadTrades()
  }, [])

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b">
        <div className="container mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-800">Trade Journal</h1>
              <div className="h-6 w-px bg-gray-200" />
              <div className="text-sm text-gray-500">
                {dateRange ? (
                  <span>
                    Trading data from{' '}
                    <span className="font-medium text-gray-900">
                      {format(dateRange.start, 'MMM d, yyyy')}
                    </span>
                    {' '}to{' '}
                    <span className="font-medium text-gray-900">
                      {format(dateRange.end, 'MMM d, yyyy')}
                    </span>
                  </span>
                ) : (
                  'No trading data available'
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentMonth(new Date())}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors duration-200"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <div className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8">
            <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
              <ClientCalendar currentMonth={currentMonth} onMonthChange={setCurrentMonth} />
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <ClientStrategyDashboard />
            </div>
          </div>
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <ClientTradeUpload />
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6">
              <ClientTradeSummary />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
