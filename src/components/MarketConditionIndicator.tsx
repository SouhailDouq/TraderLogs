'use client'

import { useState, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { 
  MarketAnalysis, 
  analyzeMarketCondition, 
  getMarketStatusText, 
  getStrategyRecommendationText 
} from '@/utils/marketCondition'

interface MarketConditionIndicatorProps {
  onStrategyRecommendation?: (strategy: 'momentum' | 'mean-reversion') => void
}

export default function MarketConditionIndicator({ onStrategyRecommendation }: MarketConditionIndicatorProps) {
  const isDarkMode = useDarkMode()
  const [analysis, setAnalysis] = useState<MarketAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    loadMarketAnalysis()
    // Refresh every 5 minutes
    const interval = setInterval(loadMarketAnalysis, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadMarketAnalysis = async () => {
    setIsLoading(true)
    try {
      const result = await analyzeMarketCondition()
      setAnalysis(result)
    } catch (error) {
      console.error('Failed to load market analysis:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading || !analysis) {
    return (
      <div className={`p-4 rounded-lg border ${
        isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            Analyzing market conditions...
          </span>
        </div>
      </div>
    )
  }

  const getConditionColor = () => {
    switch (analysis.condition) {
      case 'trending':
        return isDarkMode ? 'bg-green-900/20 border-green-600' : 'bg-green-50 border-green-300'
      case 'ranging':
        return isDarkMode ? 'bg-purple-900/20 border-purple-600' : 'bg-purple-50 border-purple-300'
      case 'volatile':
        return isDarkMode ? 'bg-red-900/20 border-red-600' : 'bg-red-50 border-red-300'
      default:
        return isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-300'
    }
  }

  const getStrategyColor = () => {
    switch (analysis.recommendedStrategy) {
      case 'momentum':
        return isDarkMode ? 'text-green-400' : 'text-green-600'
      case 'mean-reversion':
        return isDarkMode ? 'text-purple-400' : 'text-purple-600'
      case 'caution':
        return isDarkMode ? 'text-red-400' : 'text-red-600'
      default:
        return isDarkMode ? 'text-gray-400' : 'text-gray-600'
    }
  }

  const getConfidenceBadge = () => {
    const colors = {
      high: isDarkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-700',
      medium: isDarkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
      low: isDarkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-600'
    }

    return (
      <span className={`text-xs px-2 py-1 rounded ${colors[analysis.confidence]}`}>
        {analysis.confidence.toUpperCase()} CONFIDENCE
      </span>
    )
  }

  return (
    <div className={`p-4 rounded-lg border ${getConditionColor()}`}>
      {/* Header - Always Visible */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg">
                {getMarketStatusText(analysis)} Market
              </h3>
              {getConfidenceBadge()}
            </div>
            <div className={`font-bold text-xl ${getStrategyColor()}`}>
              {getStrategyRecommendationText(analysis.recommendedStrategy)}
            </div>
          </div>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          {isExpanded ? '▼ Hide Details' : '▶ Show Details'}
        </button>
      </div>

      {/* Quick Stats - Always Visible */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'}`}>
          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            SPY
          </div>
          <div className={`font-semibold ${
            analysis.indicators.spyChange > 0 
              ? 'text-green-500' 
              : analysis.indicators.spyChange < 0 
              ? 'text-red-500' 
              : isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            ${analysis.indicators.spyPrice.toFixed(2)} ({analysis.indicators.spyChange > 0 ? '+' : ''}{analysis.indicators.spyChange.toFixed(2)}%)
          </div>
        </div>

        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'}`}>
          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            VIX (Fear)
          </div>
          <div className={`font-semibold ${
            analysis.indicators.vix > 25 
              ? 'text-red-500' 
              : analysis.indicators.vix < 15 
              ? 'text-green-500' 
              : isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {analysis.indicators.vix.toFixed(1)} {
              analysis.indicators.vixTrend === 'rising' ? '↑' : 
              analysis.indicators.vixTrend === 'falling' ? '↓' : '→'
            }
          </div>
        </div>

        <div className={`p-2 rounded ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/50'}`}>
          <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Trend
          </div>
          <div className={`font-semibold ${
            analysis.indicators.spyTrend === 'bullish' 
              ? 'text-green-500' 
              : analysis.indicators.spyTrend === 'bearish' 
              ? 'text-red-500' 
              : isDarkMode ? 'text-gray-300' : 'text-gray-700'
          }`}>
            {analysis.indicators.spyTrend === 'bullish' ? '📈 Bullish' : 
             analysis.indicators.spyTrend === 'bearish' ? '📉 Bearish' : 
             '➡️ Neutral'}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="space-y-3 pt-3 border-t border-gray-300 dark:border-gray-600">
          {/* Reasoning */}
          <div>
            <h4 className={`text-sm font-semibold mb-2 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Analysis:
            </h4>
            <ul className="space-y-1">
              {analysis.reasoning.map((reason, index) => (
                <li 
                  key={index}
                  className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}
                >
                  {reason}
                </li>
              ))}
            </ul>
          </div>

          {/* Strategy Buttons */}
          {onStrategyRecommendation && analysis.recommendedStrategy !== 'caution' && (
            <div className="flex gap-2">
              {(analysis.recommendedStrategy === 'momentum' || analysis.recommendedStrategy === 'both') && (
                <button
                  onClick={() => onStrategyRecommendation('momentum')}
                  className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                    analysis.recommendedStrategy === 'momentum'
                      ? 'bg-green-500 hover:bg-green-600 text-white'
                      : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  🚀 Use Momentum
                </button>
              )}
              {(analysis.recommendedStrategy === 'mean-reversion' || analysis.recommendedStrategy === 'both') && (
                <button
                  onClick={() => onStrategyRecommendation('mean-reversion')}
                  className={`flex-1 px-4 py-2 rounded font-medium transition-colors ${
                    analysis.recommendedStrategy === 'mean-reversion'
                      ? 'bg-purple-500 hover:bg-purple-600 text-white'
                      : isDarkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  🔄 Use Mean Reversion
                </button>
              )}
            </div>
          )}

          {/* Refresh Button */}
          <button
            onClick={loadMarketAnalysis}
            className={`w-full px-3 py-2 rounded text-sm font-medium transition-colors ${
              isDarkMode 
                ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
            }`}
          >
            🔄 Refresh Analysis
          </button>

          {/* Last Updated */}
          <div className={`text-xs text-center ${
            isDarkMode ? 'text-gray-500' : 'text-gray-500'
          }`}>
            Last updated: {new Date(analysis.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  )
}
