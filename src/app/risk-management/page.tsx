'use client'

import { useState } from 'react'
import { formatCurrency } from '@/utils/formatters'

interface RiskCalculation {
  positionSize: number
  sharesQuantity: number
  riskAmount: number
  potentialProfit: number
  riskRewardRatio: number
  stopLossPrice: number
  takeProfitPrice: number
}

export default function RiskManagement() {
  const [accountSize, setAccountSize] = useState<number>(10000)
  const [accountCurrency, setAccountCurrency] = useState<'USD' | 'EUR'>('EUR')
  const [riskPercentage, setRiskPercentage] = useState<number>(2)
  const [entryPrice, setEntryPrice] = useState<number>(0)
  const [stopLossPrice, setStopLossPrice] = useState<number>(0)
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(0)
  const [symbol, setSymbol] = useState<string>('')

  // Currency formatter function
  const formatAccountCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: accountCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const calculateRisk = (): RiskCalculation => {
    const riskAmount = (accountSize * riskPercentage) / 100
    const riskPerShare = Math.abs(entryPrice - stopLossPrice)
    const sharesQuantity = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0
    const positionSize = sharesQuantity * entryPrice
    const potentialProfit = sharesQuantity * Math.abs(takeProfitPrice - entryPrice)
    const riskRewardRatio = riskAmount > 0 ? potentialProfit / riskAmount : 0

    return {
      positionSize,
      sharesQuantity,
      riskAmount,
      potentialProfit,
      riskRewardRatio,
      stopLossPrice,
      takeProfitPrice
    }
  }

  const calculation = calculateRisk()
  const isValidCalculation = entryPrice > 0 && stopLossPrice > 0 && takeProfitPrice > 0

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <a 
              href="/"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </a>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Management Simulator</h1>
          <p className="mt-2 text-gray-600">
            Calculate position sizing, risk/reward ratios, and optimize your trading strategy
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Trade Parameters</h2>
            
            <div className="space-y-6">
              {/* Account Settings */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-medium text-gray-700 mb-4">Account Settings</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Size
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                          {accountCurrency === 'EUR' ? '€' : '$'}
                        </span>
                        <input
                          type="number"
                          value={accountSize}
                          onChange={(e) => setAccountSize(Number(e.target.value))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="10000"
                        />
                      </div>
                      <select
                        value={accountCurrency}
                        onChange={(e) => setAccountCurrency(e.target.value as 'USD' | 'EUR')}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      >
                        <option value="EUR">EUR</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Per Trade (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={riskPercentage}
                        onChange={(e) => setRiskPercentage(Number(e.target.value))}
                        className="w-full pr-8 pl-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                        placeholder="2"
                        min="0.1"
                        max="10"
                        step="0.1"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trade Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-700 mb-4">Trade Details</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Symbol
                    </label>
                    <input
                      type="text"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="AAPL"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Entry Price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={entryPrice || ''}
                          onChange={(e) => setEntryPrice(Number(e.target.value))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="150.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Stop Loss
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={stopLossPrice || ''}
                          onChange={(e) => setStopLossPrice(Number(e.target.value))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900"
                          placeholder="145.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Take Profit
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
                        <input
                          type="number"
                          value={takeProfitPrice || ''}
                          onChange={(e) => setTakeProfitPrice(Number(e.target.value))}
                          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-900"
                          placeholder="160.00"
                          step="0.01"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Results Section */}
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">Risk Analysis</h2>
            
            {isValidCalculation ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-blue-600 mb-1">Position Size</p>
                    <p className="text-2xl font-bold text-blue-800">{formatAccountCurrency(calculation.positionSize)}</p>
                    <p className="text-sm text-blue-600">{calculation.sharesQuantity} shares</p>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-red-600 mb-1">Risk Amount</p>
                    <p className="text-2xl font-bold text-red-800">{formatAccountCurrency(calculation.riskAmount)}</p>
                    <p className="text-sm text-red-600">{riskPercentage}% of account</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-600 mb-1">Potential Profit</p>
                    <p className="text-2xl font-bold text-green-800">{formatAccountCurrency(calculation.potentialProfit)}</p>
                    <p className="text-sm text-green-600">If target hit</p>
                  </div>
                  <div className={`border rounded-lg p-4 ${
                    calculation.riskRewardRatio >= 2 
                      ? 'bg-green-50 border-green-200' 
                      : calculation.riskRewardRatio >= 1 
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-sm font-medium mb-1 ${
                      calculation.riskRewardRatio >= 2 
                        ? 'text-green-600' 
                        : calculation.riskRewardRatio >= 1 
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}>
                      Risk/Reward Ratio
                    </p>
                    <p className={`text-2xl font-bold ${
                      calculation.riskRewardRatio >= 2 
                        ? 'text-green-800' 
                        : calculation.riskRewardRatio >= 1 
                          ? 'text-yellow-800'
                          : 'text-red-800'
                    }`}>
                      {calculation.riskRewardRatio.toFixed(2)}:1
                    </p>
                    <p className={`text-sm ${
                      calculation.riskRewardRatio >= 2 
                        ? 'text-green-600' 
                        : calculation.riskRewardRatio >= 1 
                          ? 'text-yellow-600'
                          : 'text-red-600'
                    }`}>
                      {calculation.riskRewardRatio >= 2 ? 'Excellent' : calculation.riskRewardRatio >= 1 ? 'Good' : 'Poor'}
                    </p>
                  </div>
                </div>

                {/* Trade Summary */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">Trade Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Symbol:</span>
                      <span className="font-medium">{symbol || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Entry Price:</span>
                      <span className="font-medium">{formatCurrency(entryPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Stop Loss:</span>
                      <span className="font-medium text-red-600">{formatCurrency(stopLossPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Take Profit:</span>
                      <span className="font-medium text-green-600">{formatCurrency(takeProfitPrice)}</span>
                    </div>
                    <div className="border-t border-gray-300 pt-2 mt-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Recommended Shares:</span>
                        <span className="font-bold">{calculation.sharesQuantity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Investment:</span>
                        <span className="font-bold">{formatAccountCurrency(calculation.positionSize)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Risk Guidelines */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">Risk Guidelines</h3>
                  <div className="space-y-3">
                    <div className={`flex items-center space-x-2 ${
                      calculation.riskRewardRatio >= 2 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {calculation.riskRewardRatio >= 2 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="text-sm">
                        Risk/Reward ratio should be at least 2:1 for good trades
                      </span>
                    </div>
                    <div className={`flex items-center space-x-2 ${
                      riskPercentage <= 2 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {riskPercentage <= 2 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="text-sm">
                        Risk per trade should not exceed 2% of account
                      </span>
                    </div>
                    <div className={`flex items-center space-x-2 ${
                      calculation.positionSize <= accountSize * 0.1 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {calculation.positionSize <= accountSize * 0.1 ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      )}
                      <span className="text-sm">
                        Position size: {((calculation.positionSize / accountSize) * 100).toFixed(1)}% of account
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <p className="text-gray-500">Enter trade parameters to see risk analysis</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
