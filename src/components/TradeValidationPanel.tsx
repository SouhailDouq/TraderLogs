'use client'

import { useState, useEffect } from 'react'

interface TradeValidationPanelProps {
  selectedStock: any | null;
  onTradeDecision: (decision: any) => void;
  onStockDeselect?: () => void;
  analysisReasoning?: string[];
}

export default function TradeValidationPanel({ selectedStock, onTradeDecision, onStockDeselect, analysisReasoning = [] }: TradeValidationPanelProps) {
  const [validation, setValidation] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [riskParams, setRiskParams] = useState({
    maxPositionSize: 2000, // €2000 max per trade
    maxDailyRisk: 500, // €500 max loss per day
    stopLossPercent: 5, // 5% default stop loss
    profitTargets: [3, 8, 15], // 3%, 8%, 15% profit targets
    maxVolatility: 25 // 25% max volatility
  })

  useEffect(() => {
    if (selectedStock) {
      validateTrade()
    }
  }, [selectedStock]) // validateTrade is recreated on every render, so we intentionally exclude it

  const validateTrade = async () => {
    if (!selectedStock) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/trade-validation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedStock.symbol,
          score: selectedStock.score,
          currentPrice: selectedStock.price,
          stockData: {
            relativeVolume: selectedStock.relativeVolume || 1,
            changePercent: selectedStock.changePercent || 0,
            volume: selectedStock.volume || 0,
            gapAnalysis: selectedStock.gapAnalysis,
            momentumCriteria: selectedStock.momentumCriteria
          },
          riskParams: riskParams
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setValidation(data.validation)
        onTradeDecision(data.validation)
        
        if (data.error) {
          console.warn('Trade validation warning:', data.error)
        }
      } else {
        throw new Error(data.error || 'Validation failed')
      }
    } catch (error) {
      console.error('Trade validation error:', error)
      
      // Show a fallback validation result
      const fallbackValidation = {
        shouldTrade: false,
        confidence: 'LOW',
        positionSize: 0,
        stopLoss: 0,
        profitTargets: [],
        warnings: ['Analysis temporarily unavailable'],
        reasoning: ['Please verify trade manually', 'Technical analysis service is down'],
        technicalAnalysis: null,
        newsAnalysis: null,
        volatility: 10,
        riskRewardRatio: 0
      }
      
      setValidation(fallbackValidation)
      onTradeDecision(fallbackValidation)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedStock) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
        <div className="text-center">
          <div className="text-gray-400 mb-2">🎯</div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Automated Trading Assistant
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select a stock from the scanner to get automated trading recommendations
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🤖 Trading Decision: {selectedStock.symbol}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automated analysis and recommendations
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              €{selectedStock.price?.toFixed(2)}
            </div>
            <div className={`text-sm ${selectedStock.changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {selectedStock.changePercent >= 0 ? '+' : ''}{selectedStock.changePercent?.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="px-6 py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Analyzing trade opportunity...</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
            Fetching technical indicators, news sentiment, and volatility data...
          </p>
        </div>
      )}

      {/* Validation Results */}
      {validation && !loading && (
        <div className="p-6 space-y-6">
          {/* Main Decision */}
          <div className={`p-4 rounded-lg border-2 ${
            validation.shouldTrade 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">
                    {validation.shouldTrade ? '✅' : '❌'}
                  </span>
                  <span className={`text-xl font-bold ${
                    validation.shouldTrade ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
                  }`}>
                    {validation.shouldTrade ? 'TRADE RECOMMENDED' : 'DO NOT TRADE'}
                  </span>
                </div>
                <div className={`text-sm mt-1 ${
                  validation.confidence === 'HIGH' ? 'text-green-600' :
                  validation.confidence === 'MEDIUM' ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {validation.confidence} Confidence
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  Score: {selectedStock.score}/100
                </div>
              </div>
            </div>
          </div>

          {/* Position Details */}
          {validation.shouldTrade && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Position Size */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  💰 Recommended Position
                </h4>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  €{validation.positionSize.toFixed(0)}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">
                  ≈ {Math.floor(validation.positionSize / selectedStock.price)} shares
                </div>
              </div>

              {/* Risk Management */}
              <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg">
                <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                  🛡️ Risk Management
                </h4>
                <div className="text-lg font-bold text-red-700 dark:text-red-300">
                  Stop Loss: €{validation.stopLoss.toFixed(2)}
                </div>
                <div className="text-sm text-red-600 dark:text-red-400">
                  Risk: €{(selectedStock.price - validation.stopLoss).toFixed(2)} 
                  ({(((selectedStock.price - validation.stopLoss) / selectedStock.price) * 100).toFixed(1)}%)
                </div>
              </div>
            </div>
          )}

          {/* Profit Targets */}
          {validation.shouldTrade && validation.profitTargets.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-3">
                🎯 Profit Targets
              </h4>
              <div className="grid grid-cols-3 gap-4">
                {validation.profitTargets.map((target: number, index: number) => (
                  <div key={index} className="text-center">
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      €{target.toFixed(2)}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      +{(((target - selectedStock.price) / selectedStock.price) * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-500">
                      Target {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className={`p-4 rounded-lg ${
              validation.warnings.some((w: string) => w.includes('temporarily unavailable') || w.includes('service is down'))
                ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20'
            }`}>
              <h4 className={`font-semibold mb-2 ${
                validation.warnings.some((w: string) => w.includes('temporarily unavailable') || w.includes('service is down'))
                  ? 'text-red-900 dark:text-red-300'
                  : 'text-yellow-900 dark:text-yellow-300'
              }`}>
                {validation.warnings.some((w: string) => w.includes('temporarily unavailable') || w.includes('service is down'))
                  ? '🚨 System Alert'
                  : '⚠️ Warnings'
                }
              </h4>
              <ul className="space-y-1">
                {validation.warnings.map((warning: string, index: number) => (
                  <li key={index} className={`text-sm flex items-center ${
                    validation.warnings.some((w: string) => w.includes('temporarily unavailable') || w.includes('service is down'))
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-yellow-700 dark:text-yellow-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      validation.warnings.some((w: string) => w.includes('temporarily unavailable') || w.includes('service is down'))
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}></span>
                    {warning}
                  </li>
                ))}
              </ul>
              
              {validation.warnings.some((w: string) => w.includes('temporarily unavailable') || w.includes('service is down')) && (
                <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/30 rounded text-xs text-red-800 dark:text-red-200">
                  <strong>Manual Verification Required:</strong> Please check charts and news manually before trading.
                </div>
              )}
            </div>
          )}

          {/* Reasoning */}
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
              🧠 Analysis Reasoning
            </h4>
            <ul className="space-y-2">
              {analysisReasoning && analysisReasoning.length > 0 ? (
                analysisReasoning.map((reason: string, index: number) => (
                  <li key={index} className="text-sm flex items-center">
                    <span className={`mr-2 font-bold ${reason.startsWith('✅') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {reason.startsWith('✅') ? '✓' : '✗'}
                    </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {reason.substring(2)}
                    </span>
                  </li>
                ))
              ) : (
                validation.reasoning.map((reason: string, index: number) => (
                  <li key={index} className="text-sm text-gray-900 dark:text-gray-100 flex items-start">
                    <span className="w-2 h-2 bg-blue-500 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                    {reason}
                  </li>
                ))
              )}
              
              {/* Enhanced Technical Analysis Display */}
              {validation.technicalAnalysis && (
                <li className="text-sm text-gray-700 dark:text-gray-300 border-t pt-2 mt-2">
                  <div className="font-medium mb-1">📊 Technical Analysis:</div>
                  <div className="ml-4 space-y-1 text-xs">
                    <div>RSI: {validation.technicalAnalysis.rsi?.toFixed(1) || 'N/A'} {validation.technicalAnalysis.rsi > 70 ? '(Overbought)' : validation.technicalAnalysis.rsi > 50 ? '(Bullish)' : '(Bearish)'}</div>
                    <div>Above SMAs: {validation.technicalAnalysis.sma20 > 0 ? `SMA20(${validation.technicalAnalysis.sma20.toFixed(2)})` : ''} {validation.technicalAnalysis.sma50 > 0 ? `SMA50(${validation.technicalAnalysis.sma50.toFixed(2)})` : ''}</div>
                    <div>52W High Proximity: {validation.technicalAnalysis.proximityToHigh?.toFixed(1) || 'N/A'}%</div>
                  </div>
                </li>
              )}
              
              {/* Enhanced News Analysis Display */}
              {validation.newsAnalysis && validation.newsAnalysis.recentCount > 0 && (
                <li className="text-sm text-gray-700 dark:text-gray-300 border-t pt-2">
                  <div className="font-medium mb-1">📰 News Analysis:</div>
                  <div className="ml-4 space-y-1 text-xs">
                    <div>Recent News: {validation.newsAnalysis.recentCount} articles ({validation.newsAnalysis.freshness})</div>
                    <div>Sentiment: {validation.newsAnalysis.sentiment > 0 ? '📈 Positive' : validation.newsAnalysis.sentiment < 0 ? '📉 Negative' : '➡️ Neutral'} ({validation.newsAnalysis.sentiment.toFixed(2)})</div>
                    <div>Catalyst: {validation.newsAnalysis.catalystType.replace(/_/g, ' ')}</div>
                  </div>
                </li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {validation.shouldTrade ? (
              <>
                {/* Trading 212 Integration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      const symbol = selectedStock.symbol
                      const shares = Math.floor(validation.positionSize / selectedStock.price)
                      const stopLoss = validation.stopLoss.toFixed(2)
                      const target1 = validation.profitTargets[0]?.toFixed(2)
                      
                      // Copy trade details to clipboard
                      const tradeDetails = `Trading 212 Order:
Symbol: ${symbol}
Action: BUY
Shares: ${shares}
Price: €${selectedStock.price.toFixed(2)}
Stop Loss: €${stopLoss}
Take Profit 1: €${target1}
Total Investment: €${validation.positionSize.toFixed(0)}
Max Risk: €${(selectedStock.price - validation.stopLoss).toFixed(2)}`
                      
                      navigator.clipboard.writeText(tradeDetails)
                      alert('Trade details copied to clipboard! Paste into Trading 212.')
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    📋 Copy to Trading 212
                  </button>
                  
                  <button 
                    onClick={() => {
                      const symbol = selectedStock.symbol
                      // Open TradingView chart in new tab
                      window.open(`https://www.tradingview.com/chart/?symbol=${symbol}`, '_blank')
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    📊 View Chart
                  </button>
                </div>
                
                {/* Quick Links */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      // Open Trading 212 web app
                      window.open('https://www.trading212.com/', '_blank')
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    🏦 Open Trading 212
                  </button>
                  
                  <button 
                    onClick={() => {
                      const symbol = selectedStock.symbol
                      // Open Yahoo Finance for fundamental analysis
                      window.open(`https://finance.yahoo.com/quote/${symbol}`, '_blank')
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    📈 Yahoo Finance
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={() => onStockDeselect?.()}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                ⏭️ Skip This Stock
              </button>
            )}
            
            <button 
              onClick={validateTrade}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              🔄 Re-analyze
            </button>
          </div>
        </div>
      )}

      {/* Risk Parameters Settings */}
      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            ⚙️ Risk Parameters (Click to adjust)
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Position Size (€)
              </label>
              <input
                type="number"
                value={riskParams.maxPositionSize}
                onChange={(e) => setRiskParams({...riskParams, maxPositionSize: Number(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Max Daily Risk (€)
              </label>
              <input
                type="number"
                value={riskParams.maxDailyRisk}
                onChange={(e) => setRiskParams({...riskParams, maxDailyRisk: Number(e.target.value)})}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </details>
      </div>
    </div>
  )
}
