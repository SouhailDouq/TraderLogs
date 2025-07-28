'use client'

import { Trading212API } from '@/utils/trading212'
import { Card } from '@/components/ui/card'
import { useDarkMode } from '@/hooks/useDarkMode'

export default function PortfolioPage() {
  const isDarkMode = useDarkMode()
  
  return (
    <div className={`p-6 space-y-6 min-h-screen transition-colors ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <h1 className={`text-2xl font-bold ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>Portfolio Overview</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
          <p className="text-2xl font-bold mt-2">$10,245.50</p>
          <p className="text-sm text-green-500 mt-1">+2.5% today</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total P/L</h3>
          <p className="text-2xl font-bold mt-2 text-green-500">+$1,245.32</p>
          <p className="text-sm text-gray-500 mt-1">+12.5% all time</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Dividend Income</h3>
          <p className="text-2xl font-bold mt-2">$324.15</p>
          <p className="text-sm text-gray-500 mt-1">This year</p>
        </Card>

        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Open Positions</h3>
          <p className="text-2xl font-bold mt-2">15</p>
          <p className="text-sm text-gray-500 mt-1">Across 12 stocks</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Holdings</h3>
          <div className="space-y-4">
            {/* Add holdings table here */}
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-medium mb-4">Asset Allocation</h3>
          {/* Add pie chart here */}
        </Card>
      </div>
    </div>
  )
}
