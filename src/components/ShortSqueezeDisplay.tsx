'use client'

import { useDarkMode } from '@/hooks/useDarkMode'

interface ShortSqueezeData {
  shortFloat: number
  shortRatio: number
  sharesShort: number
  sharesFloat: number
  squeezeTier: 'extreme' | 'high' | 'moderate' | 'low' | 'none'
  squeezeScore: number
  isSqueezing: boolean
  targetGain: number
  squeezeSignals: string[]
  warnings: string[]
  riskLevel: 'high' | 'moderate' | 'low'
}

interface ShortSqueezeDisplayProps {
  data: ShortSqueezeData
  symbol: string
  price: number
}

export default function ShortSqueezeDisplay({ data, symbol, price }: ShortSqueezeDisplayProps) {
  const isDarkMode = useDarkMode()

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'extreme':
        return {
          bg: isDarkMode ? 'bg-red-900/30' : 'bg-red-50',
          border: 'border-red-500',
          text: isDarkMode ? 'text-red-400' : 'text-red-700',
          badge: 'bg-red-500'
        }
      case 'high':
        return {
          bg: isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50',
          border: 'border-orange-500',
          text: isDarkMode ? 'text-orange-400' : 'text-orange-700',
          badge: 'bg-orange-500'
        }
      case 'moderate':
        return {
          bg: isDarkMode ? 'bg-yellow-900/30' : 'bg-yellow-50',
          border: 'border-yellow-500',
          text: isDarkMode ? 'text-yellow-400' : 'text-yellow-700',
          badge: 'bg-yellow-500'
        }
      case 'low':
        return {
          bg: isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50',
          border: 'border-blue-500',
          text: isDarkMode ? 'text-blue-400' : 'text-blue-700',
          badge: 'bg-blue-500'
        }
      default:
        return {
          bg: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
          border: 'border-gray-500',
          text: isDarkMode ? 'text-gray-400' : 'text-gray-700',
          badge: 'bg-gray-500'
        }
    }
  }

  const getTierEmoji = (tier: string) => {
    switch (tier) {
      case 'extreme': return '🔥🚀'
      case 'high': return '🚀'
      case 'moderate': return '📈'
      case 'low': return '📊'
      default: return '➖'
    }
  }

  const colors = getTierColor(data.squeezeTier)
  const emoji = getTierEmoji(data.squeezeTier)

  return (
    <div className={`rounded-xl border-2 p-6 ${colors.bg} ${colors.border}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{emoji}</span>
            <h3 className={`text-2xl font-bold ${colors.text}`}>
              {data.squeezeTier.toUpperCase()} Squeeze Potential
            </h3>
          </div>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {symbol} @ ${price.toFixed(2)}
          </p>
        </div>
        <div className="text-right">
          <div className={`text-4xl font-bold ${colors.text}`}>
            {data.squeezeScore}
            <span className="text-2xl">/100</span>
          </div>
          {data.isSqueezing && (
            <div className="mt-2 px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
              🚀 SQUEEZING NOW!
            </div>
          )}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'}`}>
          <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Short Float
          </div>
          <div className={`text-2xl font-bold ${colors.text}`}>
            {data.shortFloat.toFixed(1)}%
          </div>
          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            of float shorted
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'}`}>
          <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Days to Cover
          </div>
          <div className={`text-2xl font-bold ${colors.text}`}>
            {data.shortRatio.toFixed(1)}
          </div>
          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            days to cover
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'}`}>
          <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Float Size
          </div>
          <div className={`text-2xl font-bold ${colors.text}`}>
            {(data.sharesFloat / 1_000_000).toFixed(1)}M
          </div>
          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            shares available
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'}`}>
          <div className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Target Gain
          </div>
          <div className={`text-2xl font-bold text-green-500`}>
            {data.targetGain}%
          </div>
          <div className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            potential upside
          </div>
        </div>
      </div>

      {/* Squeeze Signals */}
      {data.squeezeSignals.length > 0 && (
        <div className="mb-6">
          <h4 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            🎯 Squeeze Signals
          </h4>
          <div className="space-y-2">
            {data.squeezeSignals.map((signal, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
              >
                <div className={`text-sm ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>
                  {signal}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="mb-6">
          <h4 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-700'}`}>
            ⚠️ Risk Warnings
          </h4>
          <div className="space-y-2">
            {data.warnings.map((warning, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${isDarkMode ? 'bg-yellow-900/20' : 'bg-yellow-50'} border ${isDarkMode ? 'border-yellow-700' : 'border-yellow-200'}`}
              >
                <div className={`text-sm ${isDarkMode ? 'text-yellow-300' : 'text-yellow-800'}`}>
                  {warning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trading Recommendations */}
      <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/50'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h4 className={`text-sm font-bold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          💡 Trading Recommendations
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className={`font-semibold mb-1 ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>
              Entry Strategy
            </div>
            <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {data.isSqueezing 
                ? 'Enter NOW - squeeze is active'
                : data.squeezeTier === 'extreme' || data.squeezeTier === 'high'
                ? 'Wait for volume spike + price breakout'
                : 'Watch list - wait for better setup'}
            </div>
          </div>
          <div>
            <div className={`font-semibold mb-1 ${isDarkMode ? 'text-blue-400' : 'text-blue-700'}`}>
              Position Size
            </div>
            <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              {data.squeezeTier === 'extreme' ? '€600-800 (larger)' :
               data.squeezeTier === 'high' ? '€400-600 (standard)' :
               data.squeezeTier === 'moderate' ? '€200-400 (smaller)' :
               '€100-200 (speculative)'}
            </div>
          </div>
          <div>
            <div className={`font-semibold mb-1 ${isDarkMode ? 'text-red-400' : 'text-red-700'}`}>
              Stop Loss
            </div>
            <div className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              -10% hard stop or volume dies
            </div>
          </div>
        </div>
      </div>

      {/* Famous Examples */}
      {(data.squeezeTier === 'extreme' || data.squeezeTier === 'high') && (
        <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-50'} border ${isDarkMode ? 'border-blue-700' : 'border-blue-200'}`}>
          <div className={`text-xs ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
            <strong>💎 Historical Context:</strong> Similar setups led to GME (+1,500%), AMC (+2,000%), and TSLA (multiple squeezes). 
            Remember: Set stops and take profits on the way up!
          </div>
        </div>
      )}
    </div>
  )
}
