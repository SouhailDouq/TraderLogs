'use client'

import { useTradeStore, Trade, TradeStore } from '@/utils/store'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isToday, addDays, addMonths } from 'date-fns'
import { useState } from 'react'
import TradeModal from '@/components/Trade/TradeModal'
import { formatCurrency } from '@/utils/formatters'

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
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const processedTrades = useTradeStore(selectProcessedTrades)

  const getDays = (): CalendarDay[] => {
    const start = startOfWeek(startOfMonth(currentMonth))
    const end = endOfWeek(endOfMonth(currentMonth))
    const days: CalendarDay[] = []
    let day = start

    while (day <= end) {
      const dateStr = format(day, 'yyyy-MM-dd')
      const dayTrades = processedTrades[dateStr] || []
      
      // Calculate profit only from closed positions
      const closedTrades = dayTrades.filter(t => !t.isOpen)
      const openTrades = dayTrades.filter(t => t.isOpen)
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
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, -1))}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors duration-200 rounded-lg hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="font-medium">Previous</span>
        </button>
        <h2 className="text-2xl font-bold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors duration-200 rounded-lg hover:bg-gray-50"
        >
          <span className="font-medium">Next</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
          (dayName) => (
            <div
              key={dayName}
              className="text-center text-sm font-medium text-gray-500 uppercase pb-2"
            >
              {dayName}
            </div>
          )
        )}

        {days.map((day, idx) => (
          <div
            key={idx}
            onClick={() => handleDateClick(day.date)}
            className={`
              relative p-3 cursor-pointer transition-all duration-200
              border border-gray-200 rounded-lg
              ${!day.isCurrentMonth ? 'opacity-50' : ''}
              ${day.isToday ? 'ring-2 ring-blue-500' : ''}
              ${day.hasData ? 'hover:shadow-lg' : 'hover:bg-gray-50'}
            `}
          >
            <div className="flex justify-between items-center mb-2">
              <span className={`text-lg font-medium ${day.isToday ? 'text-blue-600' : 'text-gray-900'}`}>
                {format(new Date(day.date), 'd')}
              </span>
              {day.hasData && (
                <span className="text-sm font-medium text-gray-500">
                  {day.trades.length} trade{day.trades.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            {day.hasData && (
              <div className="space-y-1">
                {/* Show trade counts with differentiation */}
                <div className="flex items-center gap-1 text-xs">
                  {day.closedTradesCount > 0 && (
                    <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                      {day.closedTradesCount} closed
                    </span>
                  )}
                  {day.openTradesCount > 0 && (
                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                      {day.openTradesCount} open
                    </span>
                  )}
                </div>
                
                {/* Show realized P/L only for closed positions */}
                {day.closedTradesCount > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase">Realized P/L</div>
                    <div className={`text-sm font-bold ${day.isProfitable ? 'text-green-600' : day.profit < 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {day.profit > 0 ? '+' : ''}
                      {formatCurrency(day.profit)}
                    </div>
                  </div>
                )}
                
                {/* Show indicator for open positions only */}
                {day.hasOpenPositions && day.closedTradesCount === 0 && (
                  <div className="text-xs text-blue-600 font-medium">
                    Open positions
                  </div>
                )}
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
    </div>
  )
}
