'use client'

import { useTradeStore, Trade, TradeStore } from '@/utils/store'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isToday, addDays, addMonths } from 'date-fns'
import { useState } from 'react'
import TradeModal from '@/components/Trade/TradeModal'
import StockSearchModal from '@/components/StockSearchModal'
import { formatCurrency } from '@/utils/formatters'
import { useDarkMode } from '@/hooks/useDarkMode'

interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  hasData: boolean
  trades: Trade[]
  profit: number
  isProfitable: boolean
  hasOpenPositions: boolean
  closedTradesCount: number
  openTradesCount: number
}

const selectProcessedTrades = (state: TradeStore) => {
  console.log('Store state:', state)
  return state.processedTrades
}

interface CalendarProps {
  currentMonth: Date
  onMonthChange: (date: Date) => void
}

export default function Calendar({ currentMonth, onMonthChange }: CalendarProps) {
  const isDarkMode = useDarkMode()
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResult, setSearchResult] = useState<any>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const processedTrades = useTradeStore(selectProcessedTrades)

  const getDays = (): CalendarDay[] => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const days: CalendarDay[] = []
    let day = start

    while (day <= end) {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayTrades = processedTrades[dateStr] || []
      
      // Calculate profit from trades with profit/loss (closed positions)
      // Handle case where isOpen might be null from database
      const closedTrades = dayTrades.filter(t => t.isOpen === false || (t.isOpen === null && t.profitLoss !== 0))
      const openTrades = dayTrades.filter(t => t.isOpen === true || (t.isOpen === null && t.profitLoss === 0))
      const profit = closedTrades.reduce((sum: number, t: Trade) => sum + (t.profitLoss ?? 0), 0)

      days.push({
        date: dateStr,
        isCurrentMonth: isSameMonth(day, currentMonth),
        isToday: isToday(day),
        hasData: dayTrades.length > 0,
        trades: dayTrades,
        profit,
        isProfitable: profit > 0,
        hasOpenPositions: openTrades.length > 0,
        closedTradesCount: closedTrades.length,
        openTradesCount: openTrades.length
      })

      day = addDays(day, 1)
    }

    return days
  }

  const days = getDays()
  const handleDateClick = (date: string) => {
    setSelectedDate(new Date(date))
  }

  const closeModal = () => {
    setSelectedDate(null)
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setSearchLoading(true)
    try {
      const response = await fetch(`/api/trades/search?symbol=${encodeURIComponent(searchQuery.trim())}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResult(data)
        setShowSearchModal(true)
      } else {
        console.error('Search failed')
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setSearchLoading(false)
    }
  }

  const closeSearchModal = () => {
    setShowSearchModal(false)
    setSearchResult(null)
  }

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart)
    const endDate = endOfWeek(monthEnd)

    const rows = []
    let days = []
    let day = startDate

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const formattedDate = format(day, 'yyyy-MM-dd')
        const dayTrades = processedTrades[formattedDate] || []
        const hasData = dayTrades.length > 0
        const dayProfit = dayTrades.reduce((sum: number, t: Trade) => sum + (t.profitLoss ?? 0), 0)
        const isProfitable = dayProfit > 0

        days.push(
          <div
            key={day.toString()}
            className={`relative w-full h-24 flex flex-col items-center justify-start p-2 border ${
              isToday(day) ? 'bg-blue-50' : ''
            } ${
              selectedDate && format(selectedDate, 'yyyy-MM-dd') === formattedDate
                ? 'border-blue-500'
                : 'border-gray-200'
            } ${!isSameMonth(day, monthStart) ? 'text-gray-400' : ''}`}
            onClick={() => handleDateClick(formattedDate)}
          >
            <span className={`text-sm ${isToday(day) ? 'text-blue-500 font-bold' : ''}`}>
              {format(day, 'd')}
            </span>
            {hasData && (
              <>
                <div className="mt-1 text-xs text-gray-600">
                  {dayTrades.length} trade{dayTrades.length !== 1 ? 's' : ''}
                </div>
                <div className={`mt-1 text-xs ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {isProfitable ? '+' : ''}
                  {formatCurrency(dayProfit)}
                </div>
              </>
            )}
          </div>
        )

        day = addDays(day, 1)
      }

      rows.push(
        <div key={day.toString()} className="grid grid-cols-7 gap-px">
          {days}
        </div>
      )
      days = []
    }

    return <div className="bg-gray-200 gap-px">{rows}</div>
  }

  const handlePrevMonth = () => {
    onMonthChange(addMonths(currentMonth, -1))
  }

  const handleNextMonth = () => {
    onMonthChange(addMonths(currentMonth, 1))
  }

  // Calculate date range from trades
  const getDateRange = () => {
    const dates = Object.keys(processedTrades)
    if (dates.length === 0) return null
    
    const sortedDates = dates.sort()
    return {
      start: new Date(sortedDates[0]),
      end: new Date(sortedDates[sortedDates.length - 1])
    }
  }

  const dateRange = getDateRange()

  return (
    <div className="space-y-6">
      <div className={`p-4 rounded-lg shadow-sm border mb-4 transition-colors ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header with navigation and title */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, -1))}
            className={`px-4 py-2 flex items-center gap-2 transition-colors duration-200 rounded-lg ${
              isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium">Previous</span>
          </button>
          <h2 className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className={`px-4 py-2 flex items-center gap-2 transition-colors duration-200 rounded-lg ${
              isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium">Next</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Stock Search Bar */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className={`text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Search Stock History:
            </span>
          </div>
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter stock symbol (e.g., BTM, , TSLA)"
                className={`w-full px-4 py-2 pr-12 rounded-lg border transition-colors ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500'
                } focus:outline-none focus:ring-2 focus:ring-blue-500/20`}
              />
              <button
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded transition-colors ${
                  searchLoading || !searchQuery.trim()
                    ? 'text-gray-400 cursor-not-allowed'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {searchLoading ? (
                  <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`grid grid-cols-7 gap-4 p-4 rounded-lg shadow-sm border transition-colors ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
          (dayName) => (
            <div
              key={dayName}
              className={`text-center text-sm font-medium uppercase pb-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              {dayName}
            </div>
          )
        )}

        {days.map((day, idx) => (
          <div
            key={idx}
            onClick={() => handleDateClick(day.date)}
            title={day.hasData ? `${day.trades.length} trade${day.trades.length !== 1 ? 's' : ''} - ${day.closedTradesCount} closed, ${day.openTradesCount} open` : ''}
            className={`
              relative min-h-[80px] p-3 cursor-pointer transition-all duration-200
              border rounded-lg
              ${isDarkMode 
                ? `border-gray-600 ${!day.isCurrentMonth ? 'opacity-50 bg-gray-800' : 'bg-gray-700'} ${day.isToday ? 'ring-2 ring-blue-400 bg-blue-900/30' : ''} ${day.hasData ? 'hover:shadow-md hover:border-gray-500' : 'hover:bg-gray-600'}`
                : `border-gray-200 ${!day.isCurrentMonth ? 'opacity-50 bg-gray-50' : 'bg-white'} ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''} ${day.hasData ? 'hover:shadow-md hover:border-gray-300' : 'hover:bg-gray-50'}`
              }
            `}
          >
            {/* Date */}
            <div className="flex justify-between items-start mb-2">
              <span className={`text-lg font-semibold ${
                day.isToday 
                  ? 'text-blue-600' 
                  : isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                {format(new Date(day.date), 'd')}
              </span>
              
              {/* Simple indicators */}
              {day.hasData && (
                <div className="flex items-center gap-1">
                  {day.closedTradesCount > 0 && (
                    <div className="w-2 h-2 bg-gray-400 rounded-full" title={`${day.closedTradesCount} closed trades`}></div>
                  )}
                  {day.openTradesCount > 0 && (
                    <div className="w-2 h-2 bg-blue-400 rounded-full" title={`${day.openTradesCount} open positions`}></div>
                  )}
                </div>
              )}
            </div>
            
            {/* Only show P/L if there are closed trades */}
            {day.closedTradesCount > 0 && (
              <div className={`text-sm font-semibold ${
                day.isProfitable 
                  ? 'text-green-600' 
                  : day.profit < 0 
                    ? 'text-red-600' 
                    : 'text-gray-500'
              }`}>
                {day.profit > 0 ? '+' : ''}
                {formatCurrency(day.profit)}
              </div>
            )}
            
            {/* Simple text for open-only days */}
            {day.hasOpenPositions && day.closedTradesCount === 0 && (
              <div className={`text-xs font-medium ${
                isDarkMode ? 'text-blue-400' : 'text-blue-600'
              }`}>
                Open
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedDate && (
        <TradeModal
          isOpen={!!selectedDate}
          onClose={() => setSelectedDate(null)}
          trades={processedTrades[format(selectedDate, 'yyyy-MM-dd')] || []}
          date={format(selectedDate, 'yyyy-MM-dd')}
        />
      )}

      <StockSearchModal
        isOpen={showSearchModal}
        onClose={closeSearchModal}
        searchResult={searchResult}
        loading={searchLoading}
      />
    </div>
  )
}
