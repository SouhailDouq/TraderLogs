'use client'

import { format } from 'date-fns'
import { Trade } from '@/utils/store'

interface TradeModalProps {
  date: string
  trades: Trade[]
  onClose: () => void
}

export default function TradeModal({ date, trades, onClose }: TradeModalProps) {
  const formattedDate = format(new Date(date), 'MMMM d, yyyy')
  const totalProfit = trades.reduce((sum, trade) => sum + (trade.profit || 0), 0)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{formattedDate}</h2>
              <p
                className={`text-sm font-medium ${
                  totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                }`}
              >
                Net P/L: ${totalProfit.toFixed(2)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {trades.map((trade, index) => {
                  const getDetails = () => {
                    if (trade.action.includes('buy') || trade.action.includes('sell')) {
                      const stockInfo = trade.name ? `${trade.name} (${trade.ticker})` : trade.ticker
                      const priceInfo = trade.action.includes('buy') ?
                        `${trade.shares} shares @ $${trade.buyPrice?.toFixed(2)}` :
                        `${trade.shares} shares @ $${trade.sellPrice?.toFixed(2)}`
                      return `${stockInfo} - ${priceInfo}`
                    }
                    return trade.name || ''
                  }

                  const getAmount = () => {
                    if (trade.profit !== undefined) {
                      const profitDisplay = trade.profit.toFixed(2)
                      return (
                        <span className={trade.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {trade.profit >= 0 ? '+' : ''}{profitDisplay} USD
                        </span>
                      )
                    }
                    return trade.amount ? `${trade.amount.toFixed(2)} ${trade.currency}` : ''
                  }

                  return (
                    <tr key={index}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900 capitalize">
                        {trade.action}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {getDetails()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                        {getAmount()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {trade.notes || ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
