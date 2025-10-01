import { Metadata } from 'next'
import BacktestRunner from '@/components/BacktestRunner'

export const metadata: Metadata = {
  title: 'Risk Management - TraderLogs',
  description: 'Automated trading validation and risk management tools',
}

export default function RiskManagementPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Risk Management & Trading Validation
      </h1>
      
      <div className="space-y-8">
        {/* Backtesting Section */}
        <BacktestRunner />
        
        {/* Future Risk Management Tools */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Additional Risk Management Tools
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Position sizing calculators, stop-loss optimization, and portfolio risk analysis tools will be added here.
          </p>
        </div>
      </div>
    </div>
  )
}
