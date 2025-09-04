'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { formatCurrency } from '@/utils/formatters'
import { useDarkMode } from '@/hooks/useDarkMode'

interface StockSearchResult {
  symbol: string
  totalTrades: number
  totalPnL: number
  winRate: number
  winningTrades: number
  losingTrades: number
  firstTradeDate: string | null
  lastTradeDate: string | null
  tradesByDate: Array<{
    date: string
    trades: any[]
    totalPnL: number
    totalQuantity: number
    avgPrice: number
    tradeCount: number
  }>
  allTrades: any[]
}

interface StockSearchModalProps {
  isOpen: boolean
  onClose: () => void
  searchResult: StockSearchResult | null
  loading: boolean
}

export default function StockSearchModal({ isOpen, onClose, searchResult, loading }: StockSearchModalProps) {
  const isDarkMode = useDarkMode()

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-xl shadow-2xl transition-colors ${
        isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isDarkMode ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {loading ? 'Searching...' : searchResult ? `${searchResult.symbol} Trading History` : 'Stock Search'}
              </h2>
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Complete transaction history and performance metrics
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDarkMode 
                ? 'hover:bg-gray-700 text-gray-400 hover:text-white' 
                : 'hover:bg-gray-100 text-gray-500 hover:text-gray-700'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className={`ml-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Searching trades...
              </span>
            </div>
          ) : searchResult ? (
            <div className="p-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${
                    searchResult.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {searchResult.totalPnL >= 0 ? '+' : ''}{formatCurrency(searchResult.totalPnL)}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total P&L
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {searchResult.totalTrades}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total Trades
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className={`text-2xl font-bold ${
                    searchResult.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {searchResult.winRate.toFixed(1)}%
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Win Rate
                  </div>
                </div>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                  <div className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {searchResult.winningTrades}W / {searchResult.losingTrades}L
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Win/Loss
                  </div>
                </div>
              </div>

              {/* Trading Period */}
              {searchResult.firstTradeDate && searchResult.lastTradeDate && (
                <div className={`p-4 rounded-lg mb-6 ${isDarkMode ? 'bg-blue-900/20 border border-blue-700' : 'bg-blue-50 border border-blue-200'}`}>
                  <div className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                    Trading Period: {format(new Date(searchResult.firstTradeDate), 'MMM d, yyyy')} - {format(new Date(searchResult.lastTradeDate), 'MMM d, yyyy')}
                  </div>
                </div>
              )}

              {/* Daily Breakdown */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Daily Trading History
                </h3>
                
                {searchResult.tradesByDate.length === 0 ? (
                  <div className={`text-center py-8 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    No trades found for this symbol
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResult.tradesByDate.map((dayData, index) => (
                      <div key={index} className={`p-4 rounded-lg border transition-colors ${
                        isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {format(new Date(dayData.date), 'MMM d, yyyy')}
                            </div>
                            <div className={`text-sm px-2 py-1 rounded ${isDarkMode ? 'bg-gray-600 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
                              {dayData.tradeCount} trade{dayData.tradeCount !== 1 ? 's' : ''}
                            </div>
                          </div>
                          <div className={`text-lg font-bold ${
                            dayData.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {dayData.totalPnL >= 0 ? '+' : ''}{formatCurrency(dayData.totalPnL)}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Quantity: </span>
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {dayData.totalQuantity.toLocaleString()}
                            </span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Avg Price: </span>
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {formatCurrency(dayData.avgPrice)}
                            </span>
                          </div>
                          <div>
                            <span className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Day: </span>
                            <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                              {format(new Date(dayData.date), 'EEEE')}
                            </span>
                          </div>
                        </div>

                        {/* Individual Trades */}
                        <div className="mt-3 space-y-2">
                          {dayData.trades.map((trade, tradeIndex) => (
                            <div key={tradeIndex} className={`p-3 rounded border text-sm ${
                              isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-gray-50 border-gray-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    trade.type === 'BUY' 
                                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                                  }`}>
                                    {trade.type}
                                  </span>
                                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
                                    {trade.quantity} shares @ {formatCurrency(trade.price)}
                                  </span>
                                </div>
                                <span className={`font-medium ${
                                  (trade.profitLoss || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {(trade.profitLoss || 0) >= 0 ? '+' : ''}{formatCurrency(trade.profitLoss || 0)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={`text-center py-12 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Enter a stock symbol to search your trading history
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
