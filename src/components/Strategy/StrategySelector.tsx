'use client'

import { useDarkMode } from '@/hooks/useDarkMode'

export type TradingStrategy = 'momentum' | 'mean-reversion'

interface StrategySelectorProps {
  selectedStrategy: TradingStrategy
  onStrategyChange: (strategy: TradingStrategy) => void
}

export function StrategySelector({ selectedStrategy, onStrategyChange }: StrategySelectorProps) {
  const isDarkMode = useDarkMode()

  const strategies = [
    {
      id: 'momentum' as TradingStrategy,
      name: 'Momentum Breakout',
      icon: '🚀',
      description: 'Buy strength in trending markets',
      criteria: 'New highs • Low float <50M • Low institutional <30% • <$20 price',
      color: 'green',
      marketCondition: 'Best in bullish/trending markets'
    },
    {
      id: 'mean-reversion' as TradingStrategy,
      name: 'Mean Reversion',
      icon: '🔄',
      description: 'Buy weakness in ranging markets',
      criteria: 'Oversold -3% to -20% • High institutional >50% • Mid/Large cap',
      color: 'purple',
      marketCondition: 'Best in choppy/sideways markets'
    }
  ]

  return (
    <div className={`p-6 rounded-lg border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Trading Strategy</h3>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Choose your preferred momentum scanning approach
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((strategy) => (
          <button
            key={strategy.id}
            onClick={() => onStrategyChange(strategy.id)}
            className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
              selectedStrategy === strategy.id
                ? strategy.color === 'green'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20 dark:border-green-400'
                  : 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-400'
                : isDarkMode
                ? 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-650'
                : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{strategy.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`font-semibold ${
                    selectedStrategy === strategy.id
                      ? strategy.color === 'green'
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-purple-700 dark:text-purple-300'
                      : isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {strategy.name}
                  </h4>
                  {selectedStrategy === strategy.id && (
                    <div className={`w-2 h-2 rounded-full ${
                      strategy.color === 'green' ? 'bg-green-500' : 'bg-purple-500'
                    }`}></div>
                  )}
                </div>
                <p className={`text-sm mb-2 ${
                  selectedStrategy === strategy.id
                    ? strategy.color === 'green'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-purple-600 dark:text-purple-400'
                    : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {strategy.description}
                </p>
                <div className={`text-xs px-2 py-1 rounded mb-2 ${
                  selectedStrategy === strategy.id
                    ? strategy.color === 'green'
                      ? 'bg-green-100 text-green-800 dark:bg-green-800/30 dark:text-green-200'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-200'
                    : isDarkMode 
                    ? 'bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {strategy.criteria}
                </div>
                <div className={`text-xs italic ${
                  selectedStrategy === strategy.id
                    ? strategy.color === 'green'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-purple-600 dark:text-purple-400'
                    : isDarkMode ? 'text-gray-500' : 'text-gray-500'
                }`}>
                  {strategy.marketCondition}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Strategy Comparison */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className={`p-4 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-lg">💡</span>
            <div>
              <div className={`font-semibold mb-1 ${
                isDarkMode ? 'text-yellow-400' : 'text-yellow-800'
              }`}>
                Negatively Correlated Strategies
              </div>
              <div className={`text-xs ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                These strategies profit in opposite market conditions. When momentum fails (choppy market), 
                mean reversion works. When mean reversion fails (strong trend), momentum works. 
                This ensures you're always making money in any market condition!
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
