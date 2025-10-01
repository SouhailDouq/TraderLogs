'use client'

import { useState } from 'react'

interface BacktestResult {
  totalTrades: number;
  winRate: number;
  avgReturn: number;
  maxDrawdown: number;
  profitFactor: number;
}

interface BacktestResults {
  [strategyName: string]: BacktestResult;
}

interface BacktestSummary {
  bestStrategy: string;
  bestReturn: number;
  avgWinRate: number;
  avgReturn: number;
}

export default function BacktestRunner() {
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<BacktestResults | null>(null)
  const [summary, setSummary] = useState<BacktestSummary | null>(null)
  const [recommendations, setRecommendations] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const [config, setConfig] = useState({
    startDate: '2024-01-01',
    endDate: '2024-06-30',
    initialCapital: 10000,
    positionSize: 2000,
    profitTarget: 15,
    stopLoss: 5,
    maxHoldingDays: 5
  })

  const runBacktest = async () => {
    setIsRunning(true)
    setError(null)
    setResults(null)
    setSummary(null)
    setRecommendations([])

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Backtest failed')
      }

      const data = await response.json()
      setResults(data.results)
      setSummary(data.summary)
      setRecommendations(data.recommendations)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred')
      console.error('Backtest error:', err)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-6">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          🔬 Strategy Backtesting
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Validate momentum criteria with historical data to prove which strategies actually work
        </p>
      </div>

      {/* Configuration */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={config.startDate}
            onChange={(e) => setConfig({...config, startDate: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={config.endDate}
            onChange={(e) => setConfig({...config, endDate: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Position Size (€)
          </label>
          <input
            type="number"
            value={config.positionSize}
            onChange={(e) => setConfig({...config, positionSize: Number(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* Run Button */}
      <div className="mb-6">
        <button
          onClick={runBacktest}
          disabled={isRunning}
          className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
            isRunning
              ? 'bg-gray-400 cursor-not-allowed text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isRunning ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
              Running Backtest...
            </>
          ) : (
            '🚀 Run Historical Validation'
          )}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <span className="text-red-600 dark:text-red-400 font-semibold">❌ Error:</span>
            <span className="ml-2 text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {summary && (
        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-3">
            📊 Backtest Summary
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                {summary.bestStrategy.replace('_', ' ')}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Best Strategy</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {summary.bestReturn.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Best Avg Return</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                {summary.avgWinRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Win Rate</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {summary.avgReturn.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Overall Avg Return</div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <h3 className="text-lg font-semibold text-green-900 dark:text-green-300 mb-3">
            💡 Recommendations
          </h3>
          <ul className="space-y-2">
            {recommendations.map((rec, index) => (
              <li key={index} className="text-sm text-green-800 dark:text-green-200 flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detailed Results */}
      {results && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            📈 Strategy Performance Comparison
          </h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Strategy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Trades
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Win Rate
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Avg Return
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Max Drawdown
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Profit Factor
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                {Object.entries(results)
                  .sort(([,a], [,b]) => b.avgReturn - a.avgReturn)
                  .map(([strategyName, result]) => (
                  <tr key={strategyName} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {strategyName.replace('_', ' ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {result.totalTrades}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        result.winRate >= 60 ? 'text-green-600' : 
                        result.winRate >= 40 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.winRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        result.avgReturn > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {result.avgReturn > 0 ? '+' : ''}{result.avgReturn.toFixed(2)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${
                        result.maxDrawdown > 20 ? 'text-red-600' : 
                        result.maxDrawdown > 10 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {result.maxDrawdown.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm ${
                        result.profitFactor > 1.5 ? 'text-green-600' : 
                        result.profitFactor > 1.0 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {result.profitFactor.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
          📚 How to Interpret Results
        </h4>
        <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li><strong>Win Rate:</strong> Percentage of profitable trades (60%+ is good)</li>
          <li><strong>Avg Return:</strong> Average return per trade (positive is profitable)</li>
          <li><strong>Max Drawdown:</strong> Largest peak-to-trough decline (&lt;20% preferred)</li>
          <li><strong>Profit Factor:</strong> Gross profit ÷ gross loss (&gt;1.5 is strong)</li>
        </ul>
      </div>
    </div>
  )
}
