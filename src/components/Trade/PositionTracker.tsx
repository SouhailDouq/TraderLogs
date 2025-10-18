'use client'

import { useState } from 'react'
import { formatCurrency } from '@/utils/formatters'
import { format, differenceInDays } from 'date-fns'

interface PositionTrackerProps {
  tradeId: string
  symbol: string
  openDate: string
  positionOpenedAt?: string
  exitDeadline?: string
  exitReason?: string
  onSave: (data: { positionOpenedAt: string; exitDeadline?: string; exitReason?: string }) => void
}

export default function PositionTracker({
  tradeId,
  symbol,
  openDate,
  positionOpenedAt,
  exitDeadline,
  exitReason,
  onSave
}: PositionTrackerProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [deadline, setDeadline] = useState(exitDeadline ? format(new Date(exitDeadline), 'yyyy-MM-dd') : '')
  const [reason, setReason] = useState(exitReason || '')

  const actualOpenDate = positionOpenedAt || openDate
  const daysHeld = differenceInDays(new Date(), new Date(actualOpenDate))
  
  const daysUntilDeadline = deadline 
    ? differenceInDays(new Date(deadline), new Date())
    : null

  const isDeadlineApproaching = daysUntilDeadline !== null && daysUntilDeadline <= 3 && daysUntilDeadline >= 0
  const isDeadlinePassed = daysUntilDeadline !== null && daysUntilDeadline < 0

  const handleSave = () => {
    // Ensure we always save positionOpenedAt (use current date if not set)
    const openedAt = positionOpenedAt || openDate
    onSave({
      positionOpenedAt: openedAt,
      exitDeadline: deadline || undefined,
      exitReason: reason || undefined
    })
    setIsEditing(false)
  }

  const handleClear = () => {
    setDeadline('')
    setReason('')
    const openedAt = positionOpenedAt || openDate
    onSave({
      positionOpenedAt: openedAt,
      exitDeadline: undefined,
      exitReason: undefined
    })
    setIsEditing(false)
  }

  return (
    <div className="bg-gray-700/30 border border-gray-600 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Position Tracking
        </h4>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            {deadline ? 'Edit' : 'Set Deadline'}
          </button>
        )}
      </div>

      {/* Position Duration */}
      <div className="flex items-center gap-2 text-sm">
        <span className="text-gray-400">Position held for:</span>
        <span className="font-semibold text-white">
          {daysHeld} day{daysHeld !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Deadline Display/Edit */}
      {!isEditing && deadline && (
        <div className={`p-3 rounded-lg border ${
          isDeadlinePassed
            ? 'bg-red-900/20 border-red-500/30'
            : isDeadlineApproaching
              ? 'bg-yellow-900/20 border-yellow-500/30'
              : 'bg-blue-900/20 border-blue-500/30'
        }`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isDeadlinePassed && (
                  <span className="text-red-400 text-xs font-semibold">⚠️ DEADLINE PASSED</span>
                )}
                {isDeadlineApproaching && !isDeadlinePassed && (
                  <span className="text-yellow-400 text-xs font-semibold">⚠️ DEADLINE APPROACHING</span>
                )}
                {!isDeadlineApproaching && !isDeadlinePassed && (
                  <span className="text-blue-400 text-xs font-semibold">📅 Exit Deadline Set</span>
                )}
              </div>
              <div className="text-sm text-gray-300">
                <span className="font-semibold">{format(new Date(deadline), 'MMM d, yyyy')}</span>
                <span className="text-gray-400 ml-2">
                  ({Math.abs(daysUntilDeadline!)} day{Math.abs(daysUntilDeadline!) !== 1 ? 's' : ''} {daysUntilDeadline! < 0 ? 'overdue' : 'remaining'})
                </span>
              </div>
              {reason && (
                <div className="text-xs text-gray-400 mt-1">
                  Reason: {reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Mode */}
      {isEditing && (
        <div className="space-y-3 pt-2 border-t border-gray-600">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Exit Deadline (if not profitable by this date)
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Reason for deadline (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Move capital to better opportunity"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleSave}
              className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save Deadline
            </button>
            {deadline && (
              <button
                onClick={handleClear}
                className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Helpful Tip */}
      {!deadline && !isEditing && (
        <div className="text-xs text-gray-500 italic">
          💡 Set a deadline to remind yourself when to exit if the position isn't profitable
        </div>
      )}
    </div>
  )
}
