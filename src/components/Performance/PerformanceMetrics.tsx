'use client'

import { useTradeStore } from '@/utils/store'
import { format } from 'date-fns'

export default function PerformanceMetrics() {
  const summary = useTradeStore(state => state.summary)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      {/* Best & Worst Stocks */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Best Performing Stock</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Symbol</span>
              <span className="font-medium text-gray-900">{summary.bestStock.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total P/L</span>
              <span className="font-medium text-green-600">
                ${summary.bestStock.totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-medium text-gray-900">
                {summary.bestStock.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Best Trade</span>
              <span className="font-medium text-green-600">
                ${summary.bestStock.bestTrade.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Worst Performing Stock</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Symbol</span>
              <span className="font-medium text-gray-900">{summary.worstStock.symbol}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total P/L</span>
              <span className="font-medium text-red-600">
                ${summary.worstStock.totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-medium text-gray-900">
                {summary.worstStock.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Worst Trade</span>
              <span className="font-medium text-red-600">
                ${summary.worstStock.worstTrade.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Best & Worst Days */}
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Best Trading Day</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Date</span>
              <span className="font-medium text-gray-900">
                {format(new Date(summary.bestDay.date), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total P/L</span>
              <span className="font-medium text-green-600">
                ${summary.bestDay.totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-medium text-gray-900">
                {summary.bestDay.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Number of Trades</span>
              <span className="font-medium text-gray-900">
                {summary.bestDay.tradeCount}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Worst Trading Day</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Date</span>
              <span className="font-medium text-gray-900">
                {format(new Date(summary.worstDay.date), 'MMM d, yyyy')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total P/L</span>
              <span className="font-medium text-red-600">
                ${summary.worstDay.totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Win Rate</span>
              <span className="font-medium text-gray-900">
                {summary.worstDay.winRate.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Number of Trades</span>
              <span className="font-medium text-gray-900">
                {summary.worstDay.tradeCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hold Time Analysis */}
      <div className="md:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Hold Time Analysis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-700 mb-1">Average Hold Time</div>
              <div className="text-2xl font-bold text-blue-900">
                {summary.avgHoldTime.toFixed(1)} days
              </div>
              <div className="text-sm text-blue-600 mt-1">
                {summary.avgHoldTime <= 3 ? 'Short-term trader' : 
                 summary.avgHoldTime <= 7 ? 'Medium-term swing trader' : 
                 'Long-term position trader'}
              </div>
            </div>

            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-sm text-green-700 mb-1">Win Rate by Hold Time</div>
              <div className="text-2xl font-bold text-green-900">
                {summary.winRate.toFixed(1)}%
              </div>
              <div className="text-sm text-green-600 mt-1">
                Overall success rate
              </div>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-sm text-purple-700 mb-1">Trade Count</div>
              <div className="text-2xl font-bold text-purple-900">
                {summary.tradeCount}
              </div>
              <div className="text-sm text-purple-600 mt-1">
                Total closed positions
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
