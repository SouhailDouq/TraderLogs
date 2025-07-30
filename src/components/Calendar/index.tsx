'use client'

import { useState } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth } from 'date-fns'
import { useTradeStore } from '@/utils/store'
import dynamic from 'next/dynamic'

const TradeModal = dynamic(() => import('../Trade/TradeModal'), { ssr: false })

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const { processedTrades } = useTradeStore()

  const daysInMonth = eachDayOfInterval({
    start: startOfMonth(currentDate),
    end: endOfMonth(currentDate),
  })

  const startingDayOfWeek = startOfMonth(currentDate).getDay()
  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))
  }

  const getDayClass = (date: Date) => {
    if (!isSameMonth(date, currentDate)) return 'text-gray-400'
    
    const dateStr = format(date, 'yyyy-MM-dd')
    const trades = processedTrades[dateStr] || []
    const totalProfit = trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0)

    let classes = 'h-24 lg:h-32 border rounded-lg p-2 cursor-pointer transition-all duration-200'
    
    if (trades.length > 0) {
      classes += totalProfit >= 0 
        ? ' bg-green-50 hover:bg-green-100 border-green-200' 
        : ' bg-red-50 hover:bg-red-100 border-red-200'
    } else {
      classes += ' hover:bg-gray-50'
    }

    return classes
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Trade Calendar</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            ←
          </button>
          <h3 className="text-lg font-medium">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <button
            onClick={goToNextMonth}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-center font-medium text-gray-500 text-sm py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {Array(startingDayOfWeek)
          .fill(null)
          .map((_, index) => (
            <div key={`empty-${index}`} className="h-24 lg:h-32" />
          ))}

        {daysInMonth.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd')
          const trades = processedTrades[dateStr] || []
          const totalProfit = trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0)

          return (
            <div
              key={dateStr}
              className={getDayClass(date)}
              onClick={() => setSelectedDate(dateStr)}
            >
              <div className="flex justify-end">
                <span className="text-sm font-medium">{format(date, 'd')}</span>
              </div>
              {trades.length > 0 && (
                <div className="mt-2 text-center">
                  <span
                    className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                      totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {selectedDate && (
        <TradeModal
          isOpen={true}
          date={selectedDate}
          trades={processedTrades[selectedDate] || []}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  )
}
