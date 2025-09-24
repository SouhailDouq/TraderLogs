'use client'

export default function TradingInstructions() {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-4">
        <div className="text-3xl">🤖</div>
        <div>
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-300 mb-2">
            Automated Trading Assistant
          </h3>
          <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
            <p className="font-medium">How to use your "Money Printing Machine":</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li><strong>Scan</strong> for momentum stocks using the button below</li>
              <li><strong>Click</strong> on any stock in the results table</li>
              <li><strong>Review</strong> the automated analysis and trade recommendation</li>
              <li><strong>Follow</strong> the position size, stop loss, and profit targets</li>
              <li><strong>Execute</strong> only when you see "✅ TRADE RECOMMENDED"</li>
            </ol>
            <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <p className="font-medium text-blue-900 dark:text-blue-300">
                🎯 The system analyzes: Score, Chart Patterns, News Sentiment, Volume Profile, Risk Management
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
