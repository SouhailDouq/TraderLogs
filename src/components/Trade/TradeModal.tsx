'use client'

import { format } from 'date-fns'
import { Trade, useTradeStore } from '@/utils/store'
import TradeAnalysis from './TradeAnalysis'
import TradeJournal from './TradeJournal'
import PositionTracker from './PositionTracker'
import { formatCurrency } from '@/utils/formatters'
import { toast } from 'react-hot-toast'
import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

interface TradeModalProps {
  isOpen: boolean
  date: string
  trades: Trade[]
  onClose: () => void
}

export default function TradeModal({ isOpen, date, trades, onClose }: TradeModalProps) {
  const [mounted, setMounted] = useState(false)
  const setTrades = useTradeStore(state => state.setTrades)
  const allTrades = useTradeStore(state => state.trades)
  
  const formattedDate = format(new Date(date), 'MMMM d, yyyy')
  
  // Separate open and closed trades
  const closedTrades = trades.filter(trade => !trade.isOpen)
  const openTrades = trades.filter(trade => trade.isOpen)
  const totalRealizedProfit = closedTrades.reduce((sum, trade) => sum + (trade.profitLoss ?? 0), 0)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !mounted) return null

  const handlePositionTrackerSave = async (tradeId: string, positionData: {
    positionOpenedAt: string
    exitDeadline?: string
    exitReason?: string
  }) => {
    try {
      console.log('💾 Saving position tracking:', { tradeId, positionData })
      
      // Save to database
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          positionOpenedAt: positionData.positionOpenedAt,
          exitDeadline: positionData.exitDeadline,
          exitReason: positionData.exitReason
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ API Error response:', errorText)
        throw new Error(`Failed to save position tracking: ${response.status} ${errorText}`)
      }

      const savedTrade = await response.json()
      console.log('✅ Position tracking saved to DB:', savedTrade)

      // Fetch fresh data from API to ensure we have the latest
      const refreshResponse = await fetch('/api/trades')
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json()
        setTrades(refreshData.trades || [])
        console.log('🔄 Refreshed all trades from database')
      }

      toast.success('Position tracking saved!')
    } catch (error) {
      console.error('❌ Error saving position tracking:', error)
      toast.error('Failed to save position tracking')
    }
  }

  const handleJournalSave = async (tradeId: string, journalData: {
    notes: string
    tags: string[]
    emotion: 'positive' | 'neutral' | 'negative'
    rating?: 1 | 2 | 3 | 4 | 5
  }) => {
    try {
      // Find the trade to update
      const tradeToUpdate = allTrades.find(t => t.id === tradeId)
      if (!tradeToUpdate) {
        toast.error('Trade not found')
        return
      }

      // Update local state first
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

      // Save to database
      const response = await fetch(`/api/trades/${tradeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          journal: {
            ...tradeToUpdate.journal,
            ...journalData,
            rating: journalData.rating ?? tradeToUpdate.journal?.rating ?? 3,
            createdAt: tradeToUpdate.journal?.createdAt ?? new Date().toISOString()
          }
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error response:', errorText)
        throw new Error(`Failed to save journal entry: ${response.status} ${errorText}`)
      }

      toast.success('Journal entry saved!')
    } catch (error) {
      console.error('Error saving journal:', error)
      toast.error('Failed to save journal entry')
    }
  }

  const modalContent = (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 z-[9999]"
      onClick={onClose}
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div 
          className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-600 relative"
          onClick={(e) => e.stopPropagation()}
        >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">{formattedDate}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        {/* Show summary with differentiation */}
        <div className="space-y-2 mb-4">
          {closedTrades.length > 0 && (
            <p className={`text-lg font-semibold ${(totalRealizedProfit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Realized P/L: 
              {totalRealizedProfit >= 0 ? '+' : ''}
              {formatCurrency(totalRealizedProfit)}
            </p>
          )}
          
          <div className="flex gap-4 text-sm text-gray-400">
            {closedTrades.length > 0 && (
              <span className="bg-gray-700 text-gray-200 px-2 py-1 rounded">
                {closedTrades.length} closed position{closedTrades.length !== 1 ? 's' : ''}
              </span>
            )}
            {openTrades.length > 0 && (
              <span className="bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
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
                  ? 'bg-blue-900/20 border-blue-500/30' 
                  : (trade.profitLoss ?? 0) > 0 
                    ? 'bg-green-900/20 border-green-500/30' 
                    : 'bg-red-900/20 border-red-500/30'
              }`}
            >
              <div className="w-full space-y-4">
                <div className="flex justify-between items-center border-b border-gray-600 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-2xl font-bold text-white">{trade.symbol}</div>
                      {trade.isOpen && (
                        <span className="bg-blue-900/50 text-blue-300 text-xs px-2 py-1 rounded-full font-medium">
                          OPEN
                        </span>
                      )}
                      {!trade.isOpen && trade.profitLoss !== 0 && (
                        <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full font-medium">
                          CLOSED
                        </span>
                      )}
                      {trade.broker && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          trade.broker === 'Trading212' 
                            ? 'bg-purple-900/50 text-purple-300' 
                            : trade.broker === 'InteractiveBrokers'
                              ? 'bg-indigo-900/50 text-indigo-300'
                              : 'bg-gray-700 text-gray-300'
                        }`}>
                          {trade.broker === 'Trading212' ? 'Trading 212' : trade.broker === 'InteractiveBrokers' ? 'Interactive Brokers' : trade.broker}
                        </span>
                      )}
                    </div>
                    <div className="text-base text-gray-300">{new Date(trade.date).toLocaleDateString()}</div>
                  </div>
                  <div className={`px-4 py-2 rounded-lg ${trade.type.toLowerCase().includes('buy') ? 'bg-blue-900/50 text-blue-300' : 'bg-purple-900/50 text-purple-300'} font-medium`}>
                    {trade.type.toLowerCase().includes('buy') ? 'Buy Order' : 'Sell Order'}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-gray-400 uppercase">Price Per Share</div>
                    <div className="text-2xl font-bold text-white mt-1">{formatCurrency(trade.price)}</div>
                  </div>
                  <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg shadow-sm">
                    <div className="text-sm font-medium text-gray-400 uppercase">Quantity</div>
                    <div className="text-2xl font-bold text-white mt-1">{trade.quantity}<span className="text-base font-medium text-gray-400 ml-1">shares</span></div>
                  </div>
                </div>

                <div className="p-4 bg-gray-700/50 border border-gray-600 rounded-lg shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-sm font-medium text-gray-400 uppercase">Total Amount</div>
                      <div className="text-2xl font-bold text-white mt-1">
                        {formatCurrency(trade.price * trade.quantity)}
                      </div>
                    </div>
                    {(trade.profitLoss ?? 0) !== 0 && (
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-400 uppercase">Net P/L</div>
                        <div className={`text-2xl font-bold mt-1 ${(trade.profitLoss ?? 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {(trade.profitLoss ?? 0) > 0 ? '+' : ''}
                          {formatCurrency(trade.profitLoss ?? 0)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {trade.isOpen && (
                <div className="mt-4 border-t border-gray-600 pt-4">
                  <PositionTracker
                    tradeId={trade.id || ''}
                    symbol={trade.symbol}
                    openDate={trade.date}
                    positionOpenedAt={trade.positionOpenedAt}
                    exitDeadline={trade.exitDeadline}
                    exitReason={trade.exitReason}
                    onSave={(data) => handlePositionTrackerSave(trade.id || '', data)}
                  />
                </div>
              )}

              {trade.type === 'BUY' && (
                <div className="mt-4 border-t pt-4">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Trade Analysis</h3>
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
                <h3 className="text-sm font-medium text-gray-300 mb-2">Trade Journal</h3>
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
    </div>
  )

  return createPortal(modalContent, document.body)
}
