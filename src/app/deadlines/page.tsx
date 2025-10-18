'use client'

import { useEffect, useState } from 'react'
import { Trade } from '@/utils/store'
import { formatCurrency } from '@/utils/formatters'
import { format, differenceInDays } from 'date-fns'
import { toast } from 'react-hot-toast'
import { useDarkMode } from '@/hooks/useDarkMode'

interface OpenPosition extends Trade {
  daysHeld: number
  daysUntilDeadline: number | null
  isOverdue: boolean
  isApproaching: boolean
}

export default function DeadlinesPage() {
  const isDarkMode = useDarkMode()
  const [positions, setPositions] = useState<OpenPosition[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOpenPositions = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/trades')
      if (!response.ok) throw new Error('Failed to fetch trades')
      
      const data = await response.json()
      const trades = data.trades || []
      
      console.log('📊 Total trades fetched:', trades.length)
      console.log('🔍 Checking for open positions with deadlines...')
      
      // Log all trades to see their status
      trades.forEach((t: Trade) => {
        if (t.isOpen) {
          console.log(`  - ${t.symbol}: isOpen=${t.isOpen}, exitDeadline=${t.exitDeadline}, positionOpenedAt=${t.positionOpenedAt}`)
        }
      })
      
      // Filter for positions with deadlines (show all with deadlines, not just isOpen)
      const today = new Date()
      const openWithDeadlines = trades
        .filter((t: Trade) => {
          const hasDeadline = t.exitDeadline !== null && t.exitDeadline !== undefined
          if (hasDeadline) {
            console.log(`  ✅ ${t.symbol} has deadline: ${t.exitDeadline}, isOpen: ${t.isOpen}`)
          }
          return hasDeadline
        })
        .map((t: Trade) => {
          const openDate = new Date(t.positionOpenedAt || t.date)
          const deadline = new Date(t.exitDeadline!)
          const daysUntilDeadline = differenceInDays(deadline, today)
          
          return {
            ...t,
            daysHeld: differenceInDays(today, openDate),
            daysUntilDeadline,
            isOverdue: daysUntilDeadline < 0,
            isApproaching: daysUntilDeadline >= 0 && daysUntilDeadline <= 3
          }
        })
        .sort((a: OpenPosition, b: OpenPosition) => {
          // Sort by deadline (soonest first)
          return (a.daysUntilDeadline || 0) - (b.daysUntilDeadline || 0)
        })
      
      console.log(`✅ Found ${openWithDeadlines.length} positions with deadlines`)
      if (openWithDeadlines.length > 0) {
        console.log('Positions:', openWithDeadlines.map((p: OpenPosition) => `${p.symbol} (deadline: ${p.exitDeadline})`))
      }
      
      setPositions(openWithDeadlines)
    } catch (error) {
      console.error('Error fetching positions:', error)
      toast.error('Failed to load positions')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkClosed = async (trade: Trade) => {
    try {
      console.log(`🔒 Marking ${trade.symbol} as closed, clearing deadline`)
      
      // Clear the deadline to remove from active deadlines list
      const response = await fetch(`/api/trades/${trade.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          exitDeadline: null,
          exitReason: null,
          positionOpenedAt: null // Clear this too for clean slate
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ Failed to mark as closed:', errorText)
        throw new Error('Failed to update trade')
      }
      
      const updatedTrade = await response.json()
      console.log('✅ Trade updated, deadline cleared:', updatedTrade)
      
      toast.success(`${trade.symbol} removed from deadlines`)
      fetchOpenPositions() // Refresh the list
    } catch (error) {
      console.error('Error marking position as closed:', error)
      toast.error('Failed to mark position as closed')
    }
  }

  useEffect(() => {
    fetchOpenPositions()
  }, [])

  if (loading) {
    return (
      <div className={`min-h-screen p-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto"></div>
            <p className={`mt-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loading positions...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`min-h-screen p-4 sm:p-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl sm:text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            📅 Position Deadlines
          </h1>
          <p className={`text-sm sm:text-base ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Track your open positions and exit deadlines
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className={`p-4 sm:p-6 rounded-xl border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Positions
            </div>
            <div className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {positions.length}
            </div>
          </div>

          <div className={`p-4 sm:p-6 rounded-xl border ${
            isDarkMode ? 'bg-red-900/20 border-red-500/30' : 'bg-red-50 border-red-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              Overdue
            </div>
            <div className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {positions.filter(p => p.isOverdue).length}
            </div>
          </div>

          <div className={`p-4 sm:p-6 rounded-xl border ${
            isDarkMode ? 'bg-yellow-900/20 border-yellow-500/30' : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
              Due Soon (≤3 days)
            </div>
            <div className={`text-2xl sm:text-3xl font-bold ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
              {positions.filter(p => p.isApproaching && !p.isOverdue).length}
            </div>
          </div>
        </div>

        {/* Positions List */}
        {positions.length === 0 ? (
          <div className={`text-center py-12 rounded-xl border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="text-4xl mb-4">🎉</div>
            <h3 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              No Active Deadlines
            </h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              You don't have any open positions with deadlines set.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {positions.map((position) => (
              <div
                key={position.id}
                className={`p-4 sm:p-6 rounded-xl border-2 transition-all ${
                  position.isOverdue
                    ? isDarkMode
                      ? 'bg-red-900/20 border-red-500/50'
                      : 'bg-red-50 border-red-300'
                    : position.isApproaching
                      ? isDarkMode
                        ? 'bg-yellow-900/20 border-yellow-500/50'
                        : 'bg-yellow-50 border-yellow-300'
                      : isDarkMode
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  {/* Left: Stock Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {position.symbol}
                      </h3>
                      {position.isOverdue && (
                        <span className="px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded-full">
                          OVERDUE
                        </span>
                      )}
                      {position.isApproaching && !position.isOverdue && (
                        <span className="px-2 py-1 text-xs font-semibold bg-yellow-500 text-white rounded-full">
                          DUE SOON
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Entry Price
                        </div>
                        <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatCurrency(position.price)}
                        </div>
                      </div>
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Quantity
                        </div>
                        <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {position.quantity} shares
                        </div>
                      </div>
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Days Held
                        </div>
                        <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {position.daysHeld} days
                        </div>
                      </div>
                      <div>
                        <div className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                          Total Value
                        </div>
                        <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                          {formatCurrency(position.price * position.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Deadline Info & Action */}
                  <div className="flex flex-col sm:items-end gap-3">
                    <div className="text-right">
                      <div className={`text-sm font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        Exit Deadline
                      </div>
                      <div className={`text-lg font-bold ${
                        position.isOverdue
                          ? 'text-red-500'
                          : position.isApproaching
                            ? 'text-yellow-500'
                            : isDarkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {format(new Date(position.exitDeadline!), 'MMM d, yyyy')}
                      </div>
                      <div className={`text-sm ${
                        position.isOverdue
                          ? 'text-red-500'
                          : position.isApproaching
                            ? 'text-yellow-500'
                            : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                      }`}>
                        {position.isOverdue
                          ? `${Math.abs(position.daysUntilDeadline!)} days overdue`
                          : `${position.daysUntilDeadline} days remaining`
                        }
                      </div>
                    </div>

                    <button
                      onClick={() => handleMarkClosed(position)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                    >
                      ✓ Remove Deadline
                    </button>
                  </div>
                </div>

                {/* Reason */}
                {position.exitReason && (
                  <div className={`mt-4 pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      Exit Reason:
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      {position.exitReason}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
