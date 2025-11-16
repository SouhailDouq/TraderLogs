'use client'

import { useDarkMode } from '@/hooks/useDarkMode'
import { GamePlan } from './GamePlanModal'

interface GamePlanDisplayProps {
  gamePlan: GamePlan
  onEdit?: () => void
  compact?: boolean
}

export default function GamePlanDisplay({ gamePlan, onEdit, compact = false }: GamePlanDisplayProps) {
  const isDarkMode = useDarkMode()

  if (compact) {
    return (
      <div className={`p-4 rounded-xl border ${
        isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-gray-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            📋 Game Plan
          </h4>
          {onEdit && (
            <button
              onClick={onEdit}
              className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Edit
            </button>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Strategy:</span>
            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {gamePlan.strategy}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Targets:</span>
            <span className={`font-medium ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
              {gamePlan.takeProfitTargets}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Stop:</span>
            <span className={`font-medium ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>
              {gamePlan.stopLoss}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className={`px-6 py-4 border-b ${
        isDarkMode ? 'border-gray-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            📋 Game Plan
          </h3>
          {onEdit && (
            <button
              onClick={onEdit}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                isDarkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Edit Plan
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Overview */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className={`text-xs font-medium mb-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Strategy
            </div>
            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {gamePlan.strategy}
            </div>
          </div>
          <div>
            <div className={`text-xs font-medium mb-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Type
            </div>
            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {gamePlan.type}
            </div>
          </div>
          <div>
            <div className={`text-xs font-medium mb-1 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Holding Period
            </div>
            <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {gamePlan.holdingPeriod}
            </div>
          </div>
        </div>

        {/* Entry Plan */}
        <div className={`p-4 rounded-xl ${
          isDarkMode ? 'bg-green-500/10' : 'bg-green-50'
        }`}>
          <h4 className={`text-sm font-bold mb-3 ${
            isDarkMode ? 'text-green-400' : 'text-green-700'
          }`}>
            🎯 Entry Plan
          </h4>
          <div className="space-y-2">
            <div>
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Entry Signal
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {gamePlan.entrySignal}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Entry Style
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {gamePlan.entryStyle}
              </div>
            </div>
          </div>
        </div>

        {/* Exit Plan */}
        <div className={`p-4 rounded-xl ${
          isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
        }`}>
          <h4 className={`text-sm font-bold mb-3 ${
            isDarkMode ? 'text-blue-400' : 'text-blue-700'
          }`}>
            🎯 Exit Plan
          </h4>
          <div className="space-y-2">
            <div>
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Take Profit Targets
              </div>
              <div className={`text-sm font-semibold ${
                isDarkMode ? 'text-green-400' : 'text-green-600'
              }`}>
                {gamePlan.takeProfitTargets}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Take Profit Style
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {gamePlan.takeProfitStyle}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Stop Loss
              </div>
              <div className={`text-sm font-semibold ${
                isDarkMode ? 'text-red-400' : 'text-red-600'
              }`}>
                {gamePlan.stopLoss}
              </div>
            </div>
          </div>
        </div>

        {/* Risk Management */}
        <div className={`p-4 rounded-xl ${
          isDarkMode ? 'bg-red-500/10' : 'bg-red-50'
        }`}>
          <h4 className={`text-sm font-bold mb-3 ${
            isDarkMode ? 'text-red-400' : 'text-red-700'
          }`}>
            🛡️ Risk Management
          </h4>
          <div className="space-y-2">
            <div>
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Position Size
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {gamePlan.positionSize}
              </div>
            </div>
            <div>
              <div className={`text-xs font-medium mb-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Bailout Indicators
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                {gamePlan.bailoutIndicators}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
