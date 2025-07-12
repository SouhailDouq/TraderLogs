'use client'

import { useTradeStore } from '@/utils/store'

export default function TradeSummary() {
  const { summary } = useTradeStore()

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Trade Summary</h2>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Total Trades</p>
            <p className="text-2xl font-bold">{summary.totalTrades}</p>
          </div>
          <div className="bg-indigo-100 p-3 rounded-full">
            <svg
              className="w-6 h-6 text-indigo-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
              />
            </svg>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Profitable Trades</p>
            <p className="text-2xl font-bold text-green-500">
              {summary.profitableTrades}
            </p>
          </div>
          <div className="bg-green-100 p-3 rounded-full">
            <svg
              className="w-6 h-6 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Losing Trades</p>
            <p className="text-2xl font-bold text-red-500">
              {summary.losingTrades}
            </p>
          </div>
          <div className="bg-red-100 p-3 rounded-full">
            <svg
              className="w-6 h-6 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 17h8m0 0v-8m0 8l-8-8-4 4-6-6"
              />
            </svg>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-500">Net Profit/Loss</p>
            <p
              className={`text-2xl font-bold ${
                summary.netProfit >= 0 ? 'text-green-500' : 'text-red-500'
              }`}
            >
              ${summary.netProfit.toFixed(2)}
            </p>
          </div>
          <div className="bg-blue-100 p-3 rounded-full">
            <svg
              className="w-6 h-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
