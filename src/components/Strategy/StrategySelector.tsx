'use client'

import { useDarkMode } from '@/hooks/useDarkMode'

export type TradingStrategy = 'technical-momentum' | 'news-momentum'

interface StrategySelectorProps {
  selectedStrategy: TradingStrategy
  onStrategyChange: (strategy: TradingStrategy) => void
}

export function StrategySelector({ selectedStrategy, onStrategyChange }: StrategySelectorProps) {
  const isDarkMode = useDarkMode()

  const strategies = [
    {
      id: 'technical-momentum' as TradingStrategy,
      name: 'Technical Momentum',
      icon: '📊',
      description: 'Breakout patterns with volume confirmation',
      criteria: 'Price <$10 • Volume >1M • RelVol >1.5x',
      color: 'blue'
    },
    {
      id: 'news-momentum' as TradingStrategy,
      name: 'News-Based Momentum',
      icon: '📰',
      description: 'Catalyst-driven plays with low float',
      criteria: '$2-20 • 5x Volume • 10%+ Premarket • <10M Float',
      color: 'purple'
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
                ? strategy.color === 'blue'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
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
                      ? strategy.color === 'blue'
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-purple-700 dark:text-purple-300'
                      : isDarkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {strategy.name}
                  </h4>
                  {selectedStrategy === strategy.id && (
                    <div className={`w-2 h-2 rounded-full ${
                      strategy.color === 'blue' ? 'bg-blue-500' : 'bg-purple-500'
                    }`}></div>
                  )}
                </div>
                <p className={`text-sm mb-2 ${
                  selectedStrategy === strategy.id
                    ? strategy.color === 'blue'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-purple-600 dark:text-purple-400'
                    : isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {strategy.description}
                </p>
                <div className={`text-xs px-2 py-1 rounded ${
                  selectedStrategy === strategy.id
                    ? strategy.color === 'blue'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-800/30 dark:text-blue-200'
                      : 'bg-purple-100 text-purple-800 dark:bg-purple-800/30 dark:text-purple-200'
                    : isDarkMode 
                    ? 'bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 text-gray-700'
                }`}>
                  {strategy.criteria}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* Strategy Comparison */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className={`p-3 rounded ${
            selectedStrategy === 'technical-momentum'
              ? 'bg-blue-50 border border-blue-200 dark:bg-blue-900/20 dark:border-blue-700'
              : isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <div className={`font-medium mb-1 ${
              selectedStrategy === 'technical-momentum'
                ? 'text-blue-700 dark:text-blue-300'
                : isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              📊 Technical Focus
            </div>
            <div className={`${
              selectedStrategy === 'technical-momentum'
                ? 'text-blue-600 dark:text-blue-400'
                : isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              Chart patterns, volume spikes, breakouts
            </div>
          </div>
          
          <div className={`p-3 rounded ${
            selectedStrategy === 'news-momentum'
              ? 'bg-purple-50 border border-purple-200 dark:bg-purple-900/20 dark:border-purple-700'
              : isDarkMode ? 'bg-gray-700' : 'bg-gray-100'
          }`}>
            <div className={`font-medium mb-1 ${
              selectedStrategy === 'news-momentum'
                ? 'text-purple-700 dark:text-purple-300'
                : isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              📰 Catalyst Focus
            </div>
            <div className={`${
              selectedStrategy === 'news-momentum'
                ? 'text-purple-600 dark:text-purple-400'
                : isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              News events, earnings, FDA approvals
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
