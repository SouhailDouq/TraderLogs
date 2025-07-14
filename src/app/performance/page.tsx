import { Card } from '@/components/ui/card'

export default function PerformancePage() {
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Performance Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
          <p className="text-2xl font-bold mt-2">65%</p>
          <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Average Return</h3>
          <p className="text-2xl font-bold mt-2">8.2%</p>
          <p className="text-sm text-gray-500 mt-1">Per trade</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Sharpe Ratio</h3>
          <p className="text-2xl font-bold mt-2">1.8</p>
          <p className="text-sm text-gray-500 mt-1">Risk-adjusted return</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Monthly Returns</h3>
          {/* Add monthly returns chart here */}
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Drawdown Analysis</h3>
          {/* Add drawdown chart here */}
        </Card>

        <Card className="p-4 col-span-2">
          <h3 className="text-lg font-medium mb-4">Trade Distribution</h3>
          {/* Add trade distribution chart here */}
        </Card>
      </div>
    </div>
  )
}
