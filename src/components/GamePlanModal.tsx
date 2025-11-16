'use client'

import { useState, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'

export interface GamePlan {
  // Core Strategy
  strategy: string // e.g., "Momentum Breakout", "Premarket Gap"
  type: string // e.g., "Long", "Short"
  holdingPeriod: string // e.g., "Intraday", "1-3 days", "Swing"
  
  // Entry Plan
  entrySignal: string // What triggered the trade
  entryStyle: string // e.g., "Market order", "Limit order", "Scale in"
  
  // Exit Plan
  takeProfitTargets: string // e.g., "3% (quick), 8% (moderate), 15% (aggressive)"
  takeProfitStyle: string // e.g., "All at once", "Scale out", "Trailing stop"
  stopLoss: string // Stop loss level and reasoning
  
  // Risk Management
  positionSize: string // Position sizing rationale
  bailoutIndicators: string // When to exit early (red flags)
}

interface GamePlanModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (gamePlan: GamePlan) => void
  initialData?: Partial<GamePlan>
  stockSymbol?: string
  stockPrice?: number
}

export default function GamePlanModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  stockSymbol,
  stockPrice
}: GamePlanModalProps) {
  const isDarkMode = useDarkMode()
  
  const [gamePlan, setGamePlan] = useState<GamePlan>({
    strategy: initialData?.strategy || 'Momentum Breakout',
    type: initialData?.type || 'Long',
    holdingPeriod: initialData?.holdingPeriod || 'Intraday',
    entrySignal: initialData?.entrySignal || '',
    entryStyle: initialData?.entryStyle || 'Market order at open',
    takeProfitTargets: initialData?.takeProfitTargets || '3%, 8%, 15%',
    takeProfitStyle: initialData?.takeProfitStyle || 'Scale out (1/3 at each target)',
    stopLoss: initialData?.stopLoss || '',
    positionSize: initialData?.positionSize || '',
    bailoutIndicators: initialData?.bailoutIndicators || ''
  })

  useEffect(() => {
    if (isOpen && initialData) {
      setGamePlan({
        strategy: initialData.strategy || 'Momentum Breakout',
        type: initialData.type || 'Long',
        holdingPeriod: initialData.holdingPeriod || 'Intraday',
        entrySignal: initialData.entrySignal || '',
        entryStyle: initialData.entryStyle || 'Market order at open',
        takeProfitTargets: initialData.takeProfitTargets || '3%, 8%, 15%',
        takeProfitStyle: initialData.takeProfitStyle || 'Scale out (1/3 at each target)',
        stopLoss: initialData.stopLoss || '',
        positionSize: initialData.positionSize || '',
        bailoutIndicators: initialData.bailoutIndicators || ''
      })
    }
  }, [isOpen, initialData])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(gamePlan)
    onClose()
  }

  const quickFillMomentum = () => {
    const entryPrice = stockPrice || 0
    setGamePlan({
      ...gamePlan,
      strategy: 'Momentum Breakout',
      type: 'Long',
      holdingPeriod: 'Intraday',
      entrySignal: `High volume + near 20-day high + above all SMAs`,
      entryStyle: 'Market order at open',
      takeProfitTargets: stockPrice 
        ? `$${(entryPrice * 1.03).toFixed(2)} (3%), $${(entryPrice * 1.08).toFixed(2)} (8%), $${(entryPrice * 1.15).toFixed(2)} (15%)`
        : '3%, 8%, 15%',
      takeProfitStyle: 'Scale out: 1/3 at each target',
      stopLoss: stockPrice
        ? `$${(entryPrice * 0.95).toFixed(2)} (-5% hard stop)`
        : '-5% hard stop',
      positionSize: '€400-600 (standard momentum position)',
      bailoutIndicators: 'Volume dries up, breaks below SMA20, bearish MACD crossover'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className={`w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl border transition-colors ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Header */}
        <div className={`sticky top-0 z-10 px-6 py-4 border-b backdrop-blur-sm ${
          isDarkMode ? 'bg-gray-800/95 border-gray-700' : 'bg-white/95 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className={`text-2xl font-bold transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                📋 Game Plan
              </h2>
              {stockSymbol && (
                <p className={`text-sm mt-1 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {stockSymbol} {stockPrice && `@ $${stockPrice.toFixed(2)}`}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quick Fill Button */}
          <div className={`p-4 rounded-xl border-2 border-dashed ${
            isDarkMode ? 'bg-blue-500/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <h4 className={`font-semibold ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
                  ⚡ Quick Fill
                </h4>
                <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Auto-fill with momentum breakout template
                </p>
              </div>
              <button
                type="button"
                onClick={quickFillMomentum}
                className="px-4 py-2 text-sm font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:scale-105 transition-all shadow-lg"
              >
                Fill Template
              </button>
            </div>
          </div>

          {/* Strategy & Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Strategy *
              </label>
              <select
                value={gamePlan.strategy}
                onChange={(e) => setGamePlan({ ...gamePlan, strategy: e.target.value })}
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option>Momentum Breakout</option>
                <option>Premarket Gap</option>
                <option>Volume Spike</option>
                <option>News Catalyst</option>
                <option>Mean Reversion</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Type *
              </label>
              <select
                value={gamePlan.type}
                onChange={(e) => setGamePlan({ ...gamePlan, type: e.target.value })}
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option>Long</option>
                <option>Short</option>
              </select>
            </div>
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-200' : 'text-gray-700'
              }`}>
                Holding Period *
              </label>
              <select
                value={gamePlan.holdingPeriod}
                onChange={(e) => setGamePlan({ ...gamePlan, holdingPeriod: e.target.value })}
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
              >
                <option>Intraday</option>
                <option>1-3 days</option>
                <option>Swing (1-2 weeks)</option>
                <option>Position (weeks+)</option>
              </select>
            </div>
          </div>

          {/* Entry Plan */}
          <div className={`p-4 rounded-xl ${
            isDarkMode ? 'bg-green-500/10' : 'bg-green-50'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${
              isDarkMode ? 'text-green-400' : 'text-green-700'
            }`}>
              🎯 Entry Plan
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Entry Signal *
                </label>
                <textarea
                  value={gamePlan.entrySignal}
                  onChange={(e) => setGamePlan({ ...gamePlan, entrySignal: e.target.value })}
                  placeholder="What triggered this trade? (e.g., High volume + near 20-day high + above all SMAs)"
                  required
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Entry Style *
                </label>
                <input
                  type="text"
                  value={gamePlan.entryStyle}
                  onChange={(e) => setGamePlan({ ...gamePlan, entryStyle: e.target.value })}
                  placeholder="e.g., Market order at open, Limit order at $X.XX"
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Exit Plan */}
          <div className={`p-4 rounded-xl ${
            isDarkMode ? 'bg-blue-500/10' : 'bg-blue-50'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${
              isDarkMode ? 'text-blue-400' : 'text-blue-700'
            }`}>
              🎯 Exit Plan
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Take Profit Targets *
                </label>
                <input
                  type="text"
                  value={gamePlan.takeProfitTargets}
                  onChange={(e) => setGamePlan({ ...gamePlan, takeProfitTargets: e.target.value })}
                  placeholder="e.g., 3%, 8%, 15% or $X.XX, $Y.YY, $Z.ZZ"
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Take Profit Style *
                </label>
                <input
                  type="text"
                  value={gamePlan.takeProfitStyle}
                  onChange={(e) => setGamePlan({ ...gamePlan, takeProfitStyle: e.target.value })}
                  placeholder="e.g., All at once, Scale out (1/3 at each target)"
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Stop Loss *
                </label>
                <input
                  type="text"
                  value={gamePlan.stopLoss}
                  onChange={(e) => setGamePlan({ ...gamePlan, stopLoss: e.target.value })}
                  placeholder="e.g., -5% hard stop, Below SMA20"
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Risk Management */}
          <div className={`p-4 rounded-xl ${
            isDarkMode ? 'bg-red-500/10' : 'bg-red-50'
          }`}>
            <h3 className={`text-lg font-bold mb-4 ${
              isDarkMode ? 'text-red-400' : 'text-red-700'
            }`}>
              🛡️ Risk Management
            </h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Position Size *
                </label>
                <input
                  type="text"
                  value={gamePlan.positionSize}
                  onChange={(e) => setGamePlan({ ...gamePlan, positionSize: e.target.value })}
                  placeholder="e.g., €400-600 (standard momentum position)"
                  required
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-gray-200' : 'text-gray-700'
                }`}>
                  Bailout Indicators *
                </label>
                <textarea
                  value={gamePlan.bailoutIndicators}
                  onChange={(e) => setGamePlan({ ...gamePlan, bailoutIndicators: e.target.value })}
                  placeholder="When to exit early? (e.g., Volume dries up, breaks below SMA20, bearish MACD)"
                  required
                  rows={2}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 placeholder-gray-500'
                  }`}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-3 font-semibold rounded-lg transition-colors ${
                isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-lg hover:scale-105 transition-all shadow-lg"
            >
              Save Game Plan
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
