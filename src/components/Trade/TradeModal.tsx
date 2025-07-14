'use client'

import { format } from 'date-fns'
import { Trade } from '@/utils/store'

interface TradeModalProps {
  isOpen: boolean
  date: string
  trades: Trade[]
  onClose: () => void
}

export default function TradeModal({ isOpen, date, trades, onClose }: TradeModalProps) {
  const formattedDate = format(new Date(date), 'MMMM d, yyyy')
  const totalProfit = trades.reduce((sum, trade) => sum + (trade.profitLoss ?? 0), 0)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-800">{formattedDate}</h2>
              <p className={`text-lg font-semibold ${(totalProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                Net P/L: 
                {totalProfit >= 0 ? '+' : ''}
                ${Math.abs(totalProfit).toFixed(2)}
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
                    if (trade.type === 'BUY' || trade.type === 'SELL') {
                      const stockInfo = trade.symbol
                      const priceInfo = `${trade.quantity} shares @ $${trade.price.toFixed(2)}`
                      return `${stockInfo} - ${priceInfo}`
                    }
                    return trade.notes || ''
                  }

                  const getAmount = () => {
                    const isProfit = (trade.profitLoss ?? 0) > 0
                    const profitClass = isProfit ? 'text-green-600' : 'text-red-600'
                    const sign = isProfit ? '+' : ''
                    const profit = trade.profitLoss ?? 0
                    const formattedProfit = `${sign}$${Math.abs(profit).toFixed(2)}`
                    return (
                      <span className={profitClass}>
                        {formattedProfit} USD
                      </span>
                    )
                  }

                  return (
                    <tr key={index}>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${(trade.profitLoss ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.type}
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
