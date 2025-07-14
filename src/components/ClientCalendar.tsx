'use client'

import dynamic from 'next/dynamic'
import { ReactElement } from 'react'

interface CalendarProps {
  children: (props: {
    day: Date
    formattedDate: string
    handleDateClick: (date: string) => void
    isSelected: boolean
    isToday: boolean
    isSameMonth: boolean
    processedTrades: { [key: string]: any[] }
  }) => ReactElement
}

const Calendar = dynamic<CalendarProps>(() => import('@/components/Calendar/Calendar'), { ssr: false })

export default function ClientCalendar() {
  return (
    <Calendar>
      {({ day, formattedDate, handleDateClick, isSelected, isToday, isSameMonth, processedTrades }) => {
        const dayTrades = processedTrades[formattedDate] || []
        const hasData = dayTrades.length > 0
        const dayProfit = dayTrades.reduce((sum, t) => sum + (t.profitLoss ?? 0), 0)
        const isProfitable = dayProfit > 0

        return (
          <button
            key={day.toString()}
            className={`relative w-full h-24 flex flex-col items-center justify-start p-2 border ${isToday ? 'bg-blue-50' : ''} ${
              isSelected ? 'border-blue-500' : 'border-gray-200'
            } ${!isSameMonth ? 'text-gray-400' : ''}`}
            onClick={() => handleDateClick(formattedDate)}
          >
            <span className={`text-sm ${isToday ? 'text-blue-500 font-bold' : ''}`}>
              {day.getDate()}
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
          </button>
        )
      }}
    </Calendar>
  )
}
