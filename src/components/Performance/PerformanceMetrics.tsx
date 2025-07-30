'use client'

import { useTradeStore } from '@/utils/store'
import { formatCurrency } from '@/utils/formatters'

export default function PerformanceMetrics() {
  const stats = useTradeStore(state => state.stats)
  
  if (!stats) {
    return <div className="p-6">Loading performance metrics...</div>
  }

  const winRate = stats.totalTrades > 0 ? (stats.profitableTrades / stats.totalTrades * 100).toFixed(1) : '0.0'
  const avgProfit = stats.profitableTrades > 0 ? (stats.netProfit / stats.profitableTrades).toFixed(2) : '0.00'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
      {/* Total Trades */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Total Trades</h3>
        <div className="text-3xl font-bold text-blue-600">{stats.totalTrades}</div>
        <div className="text-sm text-gray-600 mt-1">All time</div>
      </div>

      {/* Win Rate */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Win Rate</h3>
        <div className="text-3xl font-bold text-green-600">{winRate}%</div>
        <div className="text-sm text-gray-600 mt-1">
          {stats.profitableTrades} wins, {stats.losingTrades} losses
        </div>
      </div>

      {/* Net Profit */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Net Profit</h3>
        <div className={`text-3xl font-bold ${
          stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
        }`}>
          {formatCurrency(stats.netProfit)}
        </div>
        <div className="text-sm text-gray-600 mt-1">Total P&L</div>
      </div>

      {/* Average Profit */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Avg Profit</h3>
        <div className="text-3xl font-bold text-blue-600">${avgProfit}</div>
        <div className="text-sm text-gray-600 mt-1">Per winning trade</div>
      </div>
    </div>
  )
}
