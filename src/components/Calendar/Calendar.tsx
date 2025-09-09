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
            className={`px-2 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 transition-all duration-200 rounded-lg hover:scale-105 ${
              isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Previous</span>
          </button>
          <h2 className={`text-lg sm:text-2xl font-bold text-center flex-1 mx-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            <span className="hidden sm:inline">{format(currentMonth, 'MMMM yyyy')}</span>
            <span className="sm:hidden">{format(currentMonth, 'MMM yy')}</span>
          </h2>
          <button
            onClick={() => onMonthChange(addMonths(currentMonth, 1))}
            className={`px-2 sm:px-4 py-2 flex items-center gap-1 sm:gap-2 transition-all duration-200 rounded-lg hover:scale-105 ${
              isDarkMode
                ? 'text-gray-300 hover:text-white hover:bg-gray-700'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Next</span>
            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Stock Search Bar - Mobile Responsive */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 shadow-sm">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className={`text-sm font-medium hidden sm:inline ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Search Stock History:
            </span>
            <span className={`text-xs font-medium sm:hidden ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Search:
            </span>
          </div>
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Stock symbol (e.g., AAPL, TSLA)"
                className={`w-full px-4 py-2.5 pr-12 rounded-xl border-2 transition-all duration-200 text-sm sm:text-base ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-blue-500 focus:bg-gray-600'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:bg-blue-50/30'
                } focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-gray-400`}
              />
              <button
                type="submit"
                disabled={searchLoading || !searchQuery.trim()}
                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all duration-200 ${
                  searchLoading || !searchQuery.trim()
                    ? 'text-gray-400 cursor-not-allowed'
                    : isDarkMode
                      ? 'text-gray-300 hover:text-white hover:bg-gray-600 hover:scale-110'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:scale-110'
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

      <div className={`p-2 sm:p-4 rounded-xl shadow-lg border transition-all duration-300 ${
        isDarkMode ? 'bg-gray-800 border-gray-700 shadow-gray-900/20' : 'bg-white border-gray-200 shadow-gray-200/40'
      }`}>
        {/* Day Headers - Mobile Responsive */}
        <div className="grid grid-cols-7 gap-1 sm:gap-4 mb-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayName) => (
            <div
              key={dayName}
              className={`text-center text-xs sm:text-sm font-semibold uppercase py-2 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              <span className="hidden sm:inline">{dayName}</span>
              <span className="sm:hidden">{dayName.charAt(0)}</span>
            </div>
          ))}
        </div>

        {/* Calendar Grid - Mobile Optimized */}
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day, idx) => (
            <div
              key={idx}
              onClick={() => handleDateClick(day.date)}
              title={day.hasData ? `${day.trades.length} trade${day.trades.length !== 1 ? 's' : ''} - ${day.closedTradesCount} closed, ${day.openTradesCount} open` : ''}
              className={`
                relative min-h-[60px] sm:min-h-[80px] p-1 sm:p-3 cursor-pointer 
                transition-all duration-200 border rounded-lg sm:rounded-xl
                hover:scale-105 active:scale-95
                ${isDarkMode 
                  ? `border-gray-600 ${!day.isCurrentMonth ? 'opacity-40 bg-gray-800' : 'bg-gray-700'} ${day.isToday ? 'ring-2 ring-blue-400 bg-blue-900/30 shadow-blue-400/20 shadow-lg' : ''} ${day.hasData ? 'hover:shadow-lg hover:border-gray-500 hover:bg-gray-650' : 'hover:bg-gray-600'}`
                  : `border-gray-200 ${!day.isCurrentMonth ? 'opacity-40 bg-gray-50' : 'bg-white'} ${day.isToday ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-blue-200/40 shadow-lg' : ''} ${day.hasData ? 'hover:shadow-lg hover:border-gray-300 hover:bg-gray-50' : 'hover:bg-gray-50'}`
                }
              `}
            >
              {/* Date Number */}
              <div className="flex justify-between items-start mb-1">
                <span className={`text-sm sm:text-lg font-bold ${
                  day.isToday 
                    ? 'text-blue-600 drop-shadow-sm' 
                    : isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {format(new Date(day.date), 'd')}
                </span>
                
                {/* Modern indicators */}
                {day.hasData && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    {day.closedTradesCount > 0 && (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full shadow-sm" 
                           title={`${day.closedTradesCount} closed trades`}></div>
                    )}
                    {day.openTradesCount > 0 && (
                      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gradient-to-r from-blue-400 to-cyan-500 rounded-full shadow-sm animate-pulse" 
                           title={`${day.openTradesCount} open positions`}></div>
                    )}
                  </div>
                )}
              </div>
              
              {/* P/L Display - Mobile Optimized */}
              {day.closedTradesCount > 0 && (
                <div className={`text-xs sm:text-sm font-bold truncate ${
                  day.isProfitable 
                    ? 'text-green-600 drop-shadow-sm' 
                    : day.profit < 0 
                      ? 'text-red-600 drop-shadow-sm' 
                      : 'text-gray-500'
                }`}>
                  {day.profit > 0 ? '+' : ''}
                  <span className="hidden sm:inline">{formatCurrency(day.profit)}</span>
                  <span className="sm:hidden">{formatCurrency(Math.abs(day.profit) < 100 ? day.profit : Math.round(day.profit))}</span>
                </div>
              )}
              
              {/* Open positions indicator */}
              {day.hasOpenPositions && day.closedTradesCount === 0 && (
                <div className={`text-xs font-semibold ${
                  isDarkMode ? 'text-blue-400' : 'text-blue-600'
                }`}>
                  <span className="hidden sm:inline">Open</span>
                  <span className="sm:hidden">•</span>
                </div>
              )}
            </div>
          ))}
        </div>
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
