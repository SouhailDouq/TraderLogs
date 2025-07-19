'use client'

import { Card } from '@/components/ui/card'
import PerformanceMetrics from '@/components/Performance/PerformanceMetrics'
import StrategyDashboard from '@/components/Strategy/StrategyDashboard'
import { useTradeStore } from '@/utils/store'

export default function PerformancePage() {
  const summary = useTradeStore(state => state.summary)

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Performance Analytics</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
          <p className="text-2xl font-bold mt-2">{summary.winRate.toFixed(1)}%</p>
          <p className="text-sm text-gray-500 mt-1">Overall success rate</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Average Hold Time</h3>
          <p className="text-2xl font-bold mt-2">{summary.avgHoldTime.toFixed(1)} days</p>
          <p className="text-sm text-gray-500 mt-1">Per trade</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total P/L</h3>
          <p className={`text-2xl font-bold mt-2 ${summary.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            ${summary.totalProfitLoss.toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-1">All time</p>
        </Card>
      </div>

      {/* Advanced Metrics */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Advanced Metrics</h2>
        <PerformanceMetrics />
      </div>

      {/* Strategy Analysis */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Strategy Analysis</h2>
        <StrategyDashboard />
      </div>
    </div>
  )
}
