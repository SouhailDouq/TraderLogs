'use client'

import { useTradeStore } from '@/utils/store'
import { TradeStore } from '@/utils/store'
import { formatCurrency } from '@/utils/formatters'

const selectSummary = (state: TradeStore) => state.stats

export default function TradeSummary() {
  const { stats } = useTradeStore()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Trade Summary</h2>
          <p className="text-sm text-gray-400">Overall trading performance metrics</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Stats */}
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 border border-indigo-500/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-gray-400">Total Trades</p>
              <p className="text-2xl font-bold text-white">{stats.totalTrades}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>

          <div className="flex items-center p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-gray-400">Win Rate</p>
              <p className="text-2xl font-bold text-green-400">{stats.winRate.toFixed(1)}%</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
          </div>

          <div className={`flex items-center p-4 border rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
            stats.netProfit >= 0 
              ? 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/30'
              : 'bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/30'
          }`}>
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-gray-400">Net Profit/Loss</p>
              <p className={`text-xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(stats.netProfit)}
              </p>
            </div>
            <div className={`flex items-center justify-center w-12 h-12 rounded-xl shadow-lg flex-shrink-0 ${
              stats.netProfit >= 0 
                ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' 
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Advanced Stats */}
        <div className="space-y-4">
          <div className="flex items-center p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-gray-400">Profit Factor</p>
              <p className="text-2xl font-bold text-white">
                {stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center p-4 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border border-emerald-500/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-gray-400">Average Win</p>
              <p className="text-xl font-bold text-emerald-400">{formatCurrency(stats.averageWin)}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>

          <div className="flex items-center p-4 bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
            <div className="flex-1 min-w-0 pr-3">
              <p className="text-sm font-semibold text-gray-400">Average Loss</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(stats.averageLoss)}</p>
            </div>
            <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats */}
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-700 pt-6">
        <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-gray-600/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
          <p className="text-sm font-semibold text-gray-400 mb-1">Winning Trades</p>
          <p className="text-xl font-bold text-green-400">{stats.profitableTrades}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-gray-600/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
          <p className="text-sm font-semibold text-gray-400 mb-1">Losing Trades</p>
          <p className="text-xl font-bold text-red-400">{stats.losingTrades}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-gray-600/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
          <p className="text-sm font-semibold text-gray-400 mb-1">Largest Win</p>
          <p className="text-xl font-bold text-green-400">{formatCurrency(stats.largestWin)}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-gray-800/50 to-gray-700/30 border border-gray-600/30 rounded-2xl transition-all duration-300 hover:scale-[1.02]">
          <p className="text-sm font-semibold text-gray-400 mb-1">Largest Loss</p>
          <p className="text-xl font-bold text-red-400">{formatCurrency(stats.largestLoss)}</p>
        </div>
      </div>
    </div>
  )
}
