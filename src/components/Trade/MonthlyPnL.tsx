'use client'

import { useTradeStore } from '@/utils/store'
import { formatCurrency } from '@/utils/formatters'
import { useDarkMode } from '@/hooks/useDarkMode'

interface MonthlyPnLProps {
  selectedMonth: Date
}

export default function MonthlyPnL({ selectedMonth }: MonthlyPnLProps) {
  const isDarkMode = useDarkMode()
  const getMonthlyPnL = useTradeStore(state => state.getMonthlyPnL)
  const monthlyData = getMonthlyPnL(selectedMonth.getMonth(), selectedMonth.getFullYear())

  const isProfitable = monthlyData.totalPnL >= 0

  return (
    <div className={`rounded-lg shadow-lg p-6 transition-colors ${
      isDarkMode ? 'bg-gray-800' : 'bg-white'
    }`}>
      <h2 className={`text-xl font-semibold mb-4 ${
        isDarkMode ? 'text-white' : 'text-gray-800'
      }`}>
        Monthly P&L - {monthlyData.month} {monthlyData.year}
      </h2>
      
      <div className="grid grid-cols-2 gap-4">
        {/* Total P&L - Featured Card */}
        <div className={`col-span-2 p-6 rounded-lg ${isProfitable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Total P&L</p>
              <p className={`text-3xl font-bold ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(monthlyData.totalPnL)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${isProfitable ? 'bg-green-100' : 'bg-red-100'}`}>
              {isProfitable ? (
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Total Trades */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 bg-blue-100 rounded-full">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className={`text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>Total Trades</p>
            <p className="text-2xl font-bold text-blue-600">{monthlyData.totalTrades}</p>
          </div>
        </div>

        {/* Win Rate */}
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="text-center">
            <div className="flex justify-center mb-2">
              <div className="p-2 bg-purple-100 rounded-full">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <p className={`text-sm font-medium mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>Win Rate</p>
            <p className="text-2xl font-bold text-purple-600">{monthlyData.winRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Win/Loss Breakdown */}
        <div className={`col-span-2 p-4 rounded-lg border ${
          isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-6">
              <div className="text-center">
                <p className={`text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Winning Trades</p>
                <p className="text-xl font-bold text-green-600">{monthlyData.profitableTrades}</p>
              </div>
              <div className={`h-8 w-px ${
              isDarkMode ? 'bg-gray-500' : 'bg-gray-300'
            }`}></div>
              <div className="text-center">
                <p className={`text-sm font-medium mb-1 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Losing Trades</p>
                <p className="text-xl font-bold text-red-600">{monthlyData.losingTrades}</p>
              </div>
            </div>
            <div className={`p-2 rounded-full ${
              isDarkMode ? 'bg-gray-600' : 'bg-gray-100'
            }`}>
              <svg className={`w-6 h-6 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Info */}
      {monthlyData.totalTrades === 0 && (
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <p className={`${
              isDarkMode ? 'text-yellow-200' : 'text-yellow-800'
            }`}>No trades recorded for this month yet.</p>
          </div>
        </div>
      )}
    </div>
  )
}
