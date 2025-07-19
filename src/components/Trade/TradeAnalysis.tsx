'use client'

import { useTradeStore } from '@/utils/store'
import { useState } from 'react'
import { formatCurrency } from '@/utils/formatters'

interface TradeAnalysisProps {
  symbol: string
  buyDate: string
  sellDate: string
  buyPrice: number
  sellPrice: number
  quantity: number
  profitLoss: number
}

export default function TradeAnalysis({ 
  symbol, 
  buyDate, 
  sellDate, 
  buyPrice, 
  sellPrice,
  quantity,
  profitLoss 
}: TradeAnalysisProps) {
  // Calculate hold time in days
  const holdTime = sellDate ? Math.round(
    (new Date(sellDate).getTime() - new Date(buyDate).getTime()) / (1000 * 60 * 60 * 24)
  ) : 0

  // Calculate max potential based on highest price during hold period
  const maxPotential = {
    price: sellPrice ? Math.max(buyPrice, sellPrice) * 1.1 : buyPrice * 1.1, // Placeholder until we integrate price history
    profit: sellPrice ? (Math.max(buyPrice, sellPrice) * 1.1 - buyPrice) * quantity : 0
  }

  // Calculate optimal exit suggestion
  const getExitSuggestion = () => {
    if (profitLoss <= 0) {
      return {
        type: 'warning',
        message: 'Consider using a stop loss to limit losses',
        suggestion: 'Set stop loss at 7-10% below entry'
      }
    }

    if (holdTime > 5 && profitLoss > 0) {
      return {
        type: 'info',
        message: 'Extended hold time with profit',
        suggestion: 'Consider taking profits earlier, around 3-5 days'
      }
    }

    return {
      type: 'success',
      message: 'Trade within optimal parameters',
      suggestion: 'Continue with current strategy'
    }
  }

  const exitSuggestion = getExitSuggestion()

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Hold Time</div>
          <div className="text-2xl font-bold text-blue-600">
            {holdTime} days
          </div>
          <div className="text-sm text-gray-500 mt-1">
            {holdTime <= 3 ? 'Short-term' : holdTime <= 7 ? 'Medium-term' : 'Long-term'} hold
          </div>
        </div>

        <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
          <div className="text-sm text-gray-500 mb-1">Max Potential</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(maxPotential.profit)}
          </div>
          <div className="text-sm text-gray-500 mt-1">
            At price: {formatCurrency(maxPotential.price)}
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="text-sm text-gray-500 mb-2">Exit Analysis</div>
        <div className={`text-sm font-medium ${
          exitSuggestion.type === 'warning' ? 'text-red-600' :
          exitSuggestion.type === 'info' ? 'text-blue-600' :
          'text-green-600'
        }`}>
          {exitSuggestion.message}
        </div>
        <div className="text-sm text-gray-600 mt-1">
          {exitSuggestion.suggestion}
        </div>
      </div>

      <div className="text-xs text-gray-500 mt-2">
        * Max potential is estimated. Integration with price history data coming soon.
      </div>
    </div>
  )
}
