import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Risk Management - TraderLogs',
  description: 'Risk management tools for momentum trading',
}

export default function RiskManagementPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
        Risk Management
      </h1>
      
      <div className="space-y-8">
        {/* Position Sizing Calculator */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            📊 Position Sizing Calculator
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Calculate optimal position size based on your risk tolerance and account balance.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Account Balance (€)
              </label>
              <input
                type="number"
                placeholder="10000"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Risk Per Trade (%)
              </label>
              <input
                type="number"
                placeholder="2"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Entry Price ($)
              </label>
              <input
                type="number"
                placeholder="10.00"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Stop Loss (%)
              </label>
              <input
                type="number"
                placeholder="5"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <strong>Recommended Position Size:</strong> Calculate based on your inputs
            </div>
          </div>
        </div>

        {/* Risk Guidelines */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🛡️ Risk Management Guidelines
          </h2>
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-300 mb-2">
                ✅ Position Sizing
              </h3>
              <ul className="text-sm text-green-800 dark:text-green-400 space-y-1">
                <li>• Risk 1-2% of account per trade</li>
                <li>• Max position size: €2000 for momentum trades</li>
                <li>• Never go all-in on a single stock</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <h3 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                ⚡ Stop-Loss Strategy
              </h3>
              <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1">
                <li>• Set stop-loss at -5% from entry</li>
                <li>• Use Position Risk Monitor for alerts</li>
                <li>• Never "hold until green" without stop-loss</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                🎯 Profit Targets
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                <li>• Primary target: +15% (momentum strategy)</li>
                <li>• Partial exit at +8% (secure some profit)</li>
                <li>• Trail stop-loss after +10%</li>
              </ul>
            </div>

            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h3 className="font-medium text-red-900 dark:text-red-300 mb-2">
                🚨 Risk Limits
              </h3>
              <ul className="text-sm text-red-800 dark:text-red-400 space-y-1">
                <li>• Max 3 open positions at once</li>
                <li>• Max daily loss: -6% of account</li>
                <li>• Stop trading after 3 consecutive losses</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🔗 Risk Management Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/position-monitor"
              className="p-4 border-2 border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <div className="text-2xl mb-2">🚨</div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Position Risk Monitor
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Real-time monitoring with emergency stop-loss
              </p>
            </a>

            <a
              href="/portfolio"
              className="p-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="text-2xl mb-2">👁️</div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                Portfolio Monitor
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Track all open positions and performance
              </p>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
