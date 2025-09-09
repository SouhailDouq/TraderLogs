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
    <div className={`rounded-2xl shadow-xl border backdrop-blur-sm p-8 transition-all duration-300 ${
      isDarkMode 
        ? 'bg-gray-800/80 border-gray-700/50 shadow-gray-900/20' 
        : 'bg-white/80 border-gray-200/50 shadow-gray-200/20'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className={`text-xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Monthly Performance
          </h2>
          <p className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {monthlyData.month} {monthlyData.year}
          </p>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6">
        {/* Total P&L - Featured Card */}
        <div className={`col-span-2 p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
          isProfitable 
            ? isDarkMode
              ? 'bg-gradient-to-br from-green-500/10 to-emerald-600/5 border-green-500/30 hover:border-green-400/50'
              : 'bg-gradient-to-br from-green-50 to-emerald-100/50 border-green-200 hover:border-green-300'
            : isDarkMode
              ? 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30 hover:border-red-400/50'
              : 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200 hover:border-red-300'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-semibold mb-2 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-600'
              }`}>Total P&L</p>
              <p className={`text-3xl font-bold ${isProfitable ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(monthlyData.totalPnL)}
              </p>
            </div>
            <div className={`p-4 rounded-2xl shadow-lg ${
              isProfitable 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600' 
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}>
              {isProfitable ? (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              )}
            </div>
          </div>
        </div>

        {/* Total Trades */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
          isDarkMode
            ? 'bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/30 hover:border-blue-400/50'
            : 'bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200 hover:border-blue-300'
        }`}>
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <p className={`text-sm font-semibold mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>Total Trades</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{monthlyData.totalTrades}</p>
          </div>
        </div>

        {/* Win Rate */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] ${
          isDarkMode
            ? 'bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/30 hover:border-purple-400/50'
            : 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200 hover:border-purple-300'
        }`}>
          <div className="text-center">
            <div className="flex justify-center mb-3">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
            </div>
            <p className={`text-sm font-semibold mb-1 ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>Win Rate</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{monthlyData.winRate.toFixed(1)}%</p>
          </div>
        </div>

        {/* Win/Loss Breakdown */}
        <div className={`col-span-2 p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-700/50 to-gray-800/30 border-gray-600/30 hover:border-gray-500/50' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200 hover:border-gray-300'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <div className="text-center">
                <p className={`text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Winning Trades</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{monthlyData.profitableTrades}</p>
              </div>
              <div className={`h-12 w-px rounded-full ${
                isDarkMode ? 'bg-gradient-to-b from-gray-500 to-gray-600' : 'bg-gradient-to-b from-gray-300 to-gray-400'
              }`}></div>
              <div className="text-center">
                <p className={`text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>Losing Trades</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">{monthlyData.losingTrades}</p>
              </div>
            </div>
            <div className={`p-3 rounded-2xl shadow-lg ${
              isDarkMode ? 'bg-gradient-to-br from-gray-600 to-gray-700' : 'bg-gradient-to-br from-gray-100 to-gray-200'
            }`}>
              <svg className={`w-7 h-7 ${
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
        <div className={`mt-6 p-6 rounded-2xl border transition-all duration-300 ${
          isDarkMode 
            ? 'bg-gradient-to-br from-gray-700/30 to-gray-800/20 border-gray-600/30' 
            : 'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200'
        }`}>
          <div className="flex items-center justify-center">
            <div className={`p-3 rounded-2xl mr-4 ${
              isDarkMode ? 'bg-gray-600/50' : 'bg-gray-200/50'
            }`}>
              <svg className={`w-6 h-6 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className={`font-medium ${
              isDarkMode ? 'text-gray-300' : 'text-gray-600'
            }`}>No trades recorded for this month.</p>
          </div>
        </div>
      )}
    </div>
  )
}
