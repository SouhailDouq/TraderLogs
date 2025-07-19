'use client'

import { format } from 'date-fns'
import { Trade, useTradeStore } from '@/utils/store'
import TradeAnalysis from './TradeAnalysis'
import TradeJournal from './TradeJournal'
import { formatCurrency } from '@/utils/formatters'

interface TradeModalProps {
  isOpen: boolean
  date: string
  trades: Trade[]
  onClose: () => void
}

export default function TradeModal({ isOpen, date, trades, onClose }: TradeModalProps) {
  const formattedDate = format(new Date(date), 'MMMM d, yyyy')
  
  // Separate open and closed trades
  const closedTrades = trades.filter(trade => !trade.isOpen)
  const openTrades = trades.filter(trade => trade.isOpen)
  const totalRealizedProfit = closedTrades.reduce((sum, trade) => sum + (trade.profitLoss ?? 0), 0)

  if (!isOpen) return null

  const setTrades = useTradeStore(state => state.setTrades)
  const allTrades = useTradeStore(state => state.trades)

  const handleJournalSave = (tradeId: string, journalData: {
    notes: string
    tags: string[]
    emotion: 'positive' | 'neutral' | 'negative'
    rating?: 1 | 2 | 3 | 4 | 5
  }) => {
    const updatedTrades = allTrades.map(t => {
      if (t.id === tradeId) {
        return {
          ...t,
          journal: {
            ...t.journal,
            ...journalData,
            rating: journalData.rating ?? t.journal?.rating ?? 3,
            createdAt: t.journal?.createdAt ?? new Date().toISOString()
          }
        }
      }
      return t
    })
    setTrades(updatedTrades)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{formattedDate}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ×
          </button>
        </div>
        {/* Show summary with differentiation */}
        <div className="space-y-2 mb-4">
          {closedTrades.length > 0 && (
            <p className={`text-lg font-semibold ${(totalRealizedProfit ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Realized P/L: 
              {totalRealizedProfit >= 0 ? '+' : ''}
              {formatCurrency(totalRealizedProfit)}
            </p>
          )}
          
          <div className="flex gap-4 text-sm text-gray-600">
            {closedTrades.length > 0 && (
              <span className="bg-gray-100 px-2 py-1 rounded">
                {closedTrades.length} closed position{closedTrades.length !== 1 ? 's' : ''}
              </span>
            )}
            {openTrades.length > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                {openTrades.length} open position{openTrades.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
        <div className="space-y-6">
          {trades.map((trade, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 ${
                trade.isOpen 
                  ? 'bg-blue-50 border-blue-200' 
                  : (trade.profitLoss ?? 0) > 0 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
              }`}
            >
              <div className="w-full space-y-4">
                <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold text-gray-900">{trade.symbol}</div>
                      {trade.isOpen && (
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
                          OPEN
                        </span>
                      )}
                      {!trade.isOpen && trade.profitLoss !== 0 && (
                        <span className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full font-medium">
                          CLOSED
                        </span>
                      )}
                    </div>
                    <div className="text-base text-gray-700">{new Date(trade.date).toLocaleDateString()}</div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${trade.type.toLowerCase().includes('buy') ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'} font-medium`}>
                    {trade.type.toLowerCase().includes('buy') ? 'Buy Order' : 'Sell Order'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-gray-500 uppercase">Price Per Share</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(trade.price)}</div>
                  </div>
                  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-gray-500 uppercase">Quantity</div>
                    <div className="text-2xl font-bold text-gray-900 mt-1">{trade.quantity}<span className="text-base font-medium text-gray-500 ml-1">shares</span></div>
                  </div>
                </div>

                <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-500 uppercase">Total Amount</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(trade.price * trade.quantity)}
                      </div>
                    </div>
                    {(trade.profitLoss ?? 0) !== 0 && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-500 uppercase">Net P/L</div>
                        <div className={`text-2xl font-bold mt-1 ${(trade.profitLoss ?? 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {(trade.profitLoss ?? 0) > 0 ? '+' : ''}
                          {formatCurrency(trade.profitLoss ?? 0)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {trade.type === 'BUY' && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Trade Analysis</h3>
                  <TradeAnalysis
                    symbol={trade.symbol}
                    buyDate={trade.date}
                    sellDate={trades.find(t => 
                      t.type === 'SELL' && 
                      t.symbol === trade.symbol && 
                      new Date(t.date) > new Date(trade.date)
                    )?.date || ''}
                    buyPrice={trade.price}
                    sellPrice={trades.find(t => 
                      t.type === 'SELL' && 
                      t.symbol === trade.symbol && 
                      new Date(t.date) > new Date(trade.date)
                    )?.price || trade.price}
                    quantity={trade.quantity}
                    profitLoss={trade.profitLoss ?? 0}
                  />
                </div>
              )}

              <div className="mt-4 border-t pt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Trade Journal</h3>
                <TradeJournal
                  tradeId={trade.id || ''}
                  initialNotes={trade.journal?.notes}
                  initialTags={trade.journal?.tags}
                  initialEmotion={trade.journal?.emotion as any}
                  onSave={(data) => handleJournalSave(trade.id || '', data)}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
