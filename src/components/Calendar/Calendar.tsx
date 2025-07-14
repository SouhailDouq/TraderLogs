'use client'

import { useTradeStore, Trade } from '@/utils/store'
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isToday, addDays, addMonths } from 'date-fns'
import { useState } from 'react'
import TradeModal from '@/components/Trade/TradeModal'

interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  hasData: boolean
  trades: Trade[]
  profit: number
  isProfitable: boolean
}

const selectProcessedTrades = (state: any) => state.processedTrades

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
      const profit = dayTrades.reduce((sum: number, t: Trade) => sum + (t.profitLoss ?? 0), 0)

      days.push({
        date: dateStr,
        isCurrentMonth: isSameMonth(day, currentMonth),
        isToday: isToday(day),
        hasData: dayTrades.length > 0,
        trades: dayTrades,
        profit,
        isProfitable: profit > 0
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
        const dayProfit = dayTrades.reduce((sum: number, t: { profitLoss?: number }) => sum + (t.profitLoss ?? 0), 0)
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
                  ${Math.abs(dayProfit).toFixed(2)}
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
      <div className="flex items-center justify-between">
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, -1))}
          className="p-2 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Previous</span>
        </button>
        <h2 className="text-2xl font-bold text-gray-800">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-2 text-gray-600 hover:text-gray-900 flex items-center gap-2 transition-colors duration-200"
        >
          <span>Next</span>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden shadow-sm">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
          (dayName) => (
            <div
              key={dayName}
              className="bg-gray-100 py-2 text-center text-gray-600 font-semibold text-sm"
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
              relative p-3 text-center cursor-pointer transition-all duration-200
              hover:shadow-md hover:z-10 hover:scale-105 transform
              ${day.isCurrentMonth
                ? 'bg-white'
                : 'bg-gray-50 text-gray-400'
              }
              ${day.isToday
                ? 'bg-blue-50 text-blue-600 font-semibold ring-2 ring-blue-200'
                : ''
              }
              ${day.hasData
                ? day.isProfitable
                  ? 'hover:bg-green-50'
                  : 'hover:bg-red-50'
                : 'hover:bg-gray-50'
              }
            `}
          >
            <div className="text-sm mb-1">{format(new Date(day.date), 'd')}</div>
            {day.hasData && (
              <div
                className={`
                  text-xs font-medium rounded-full px-2 py-1
                  ${day.isProfitable 
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                  }
                `}
              >
                <div>{day.trades.length} trade{day.trades.length !== 1 ? 's' : ''}</div>
                <div className="font-bold">${Math.abs(day.profit).toFixed(2)}</div>
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
