'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const Calendar = dynamic(() => import('@/components/Calendar/Calendar'), { ssr: false })

export default function ClientCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  return (
    <Calendar 
      currentMonth={currentMonth}
      onMonthChange={setCurrentMonth}
    />
  )
}
