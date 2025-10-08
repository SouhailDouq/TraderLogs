'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { 
  createPositionRiskMonitor, 
  PositionRisk, 
  MonitoringStats, 
  RiskLevel,
  DEFAULT_RISK_THRESHOLDS 
} from '@/utils/positionRiskMonitor'
import toast from 'react-hot-toast'

interface PositionRiskMonitorProps {
  apiKey: string
  accountType: 'LIVE' | 'DEMO'
  onEmergencyAction?: (ticker: string) => void
}

export default function PositionRiskMonitor({
  apiKey,
  accountType,
  onEmergencyAction
}: PositionRiskMonitorProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [checkInterval, setCheckInterval] = useState(30)
  const [positions, setPositions] = useState<PositionRisk[]>([])
  const [stats, setStats] = useState<MonitoringStats | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(false)
  const [showEmergencyModal, setShowEmergencyModal] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<PositionRisk | null>(null)
  const [isExecutingEmergency, setIsExecutingEmergency] = useState(false)
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'SAFE' | 'AT_RISK'>('ALL')
  const [monitor] = useState(() => 
    createPositionRiskMonitor({
      apiKey,
      accountType,
      checkIntervalSeconds: 30,
      enableNotifications: false,
      enableSoundAlerts: false
    })
  )

  // Handle position risk updates
  useEffect(() => {
    const handleUpdate = (event: CustomEvent) => {
      const { risks, stats } = event.detail
      setPositions(risks)
      setStats(stats)
    }

    const handleAlert = (event: CustomEvent) => {
      const risk: PositionRisk = event.detail
      toast.error(
        `${risk.riskLevel}: ${risk.position.ticker} - ${risk.alerts[0]}`,
        { duration: 5000 }
      )
    }

    window.addEventListener('positionRiskUpdate', handleUpdate as EventListener)
    window.addEventListener('positionRiskAlert', handleAlert as EventListener)

    return () => {
      window.removeEventListener('positionRiskUpdate', handleUpdate as EventListener)
      window.removeEventListener('positionRiskAlert', handleAlert as EventListener)
    }
  }, [])

  // Request notification permission
  useEffect(() => {
    if (notificationsEnabled && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            toast.success('Browser notifications enabled!')
          } else if (permission === 'denied') {
            toast.error('Browser notifications blocked. Enable in browser settings.')
            setNotificationsEnabled(false)
          }
        })
      } else if (Notification.permission === 'denied') {
        toast.error('Browser notifications are blocked. Enable in browser settings.')
        setNotificationsEnabled(false)
      }
    }
  }, [notificationsEnabled])

  const startMonitoring = useCallback(() => {
    monitor.startMonitoring()
    setIsMonitoring(true)
    toast.success('Position monitoring started')
  }, [monitor])

  const stopMonitoring = useCallback(() => {
    monitor.stopMonitoring()
    setIsMonitoring(false)
    toast('Position monitoring stopped', { icon: '⏸️' })
  }, [monitor])

  const handleEmergencyAction = useCallback(async (position: PositionRisk) => {
    setSelectedPosition(position)
    setShowEmergencyModal(true)
  }, [])

  const executeEmergencyStopLoss = useCallback(async () => {
    if (!selectedPosition) return

    setIsExecutingEmergency(true)
    const startTime = Date.now()

    try {
      const limitOrder = selectedPosition.pendingOrders.find(o => o.type === 'LIMIT')
      
      const response = await fetch('/api/trading212/emergency-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedPosition.position.ticker,
          orderId: limitOrder?.id,
          stopPrice: selectedPosition.stopLossPrice,
          quantity: selectedPosition.position.quantity,
          apiKey,
          accountType
        })
      })

      const result = await response.json()
      const executionTime = ((Date.now() - startTime) / 1000).toFixed(2)

      if (result.success) {
        toast.success(
          `✅ Emergency stop-loss activated in ${executionTime}s\n` +
          `Order ID: ${result.orderId}`,
          { duration: 5000 }
        )
        onEmergencyAction?.(selectedPosition.position.ticker)
      } else {
        toast.error(
          `⚠️ Partial success (${executionTime}s)\n` +
          `Cancel: ${result.cancelSuccess ? '✅' : '❌'}\n` +
          `Stop-loss: ${result.stopLossSuccess ? '✅' : '❌'}`,
          { duration: 7000 }
        )
      }
    } catch (error) {
      toast.error(
        `Failed to execute emergency action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { duration: 5000 }
      )
    } finally {
      setIsExecutingEmergency(false)
      setShowEmergencyModal(false)
      setSelectedPosition(null)
    }
  }, [selectedPosition, apiKey, accountType, onEmergencyAction])

  const getRiskColor = (level: RiskLevel): string => {
    switch (level) {
      case 'SAFE': return 'text-green-600 dark:text-green-400'
      case 'WARNING': return 'text-yellow-600 dark:text-yellow-400'
      case 'DANGER': return 'text-orange-600 dark:text-orange-400'
      case 'CRITICAL': return 'text-red-600 dark:text-red-400'
    }
  }

  const getRiskBgColor = (level: RiskLevel): string => {
    switch (level) {
      case 'SAFE': return 'bg-green-100 dark:bg-green-900/20'
      case 'WARNING': return 'bg-yellow-100 dark:bg-yellow-900/20'
      case 'DANGER': return 'bg-orange-100 dark:bg-orange-900/20'
      case 'CRITICAL': return 'bg-red-100 dark:bg-red-900/20'
    }
  }

  const getRiskIcon = (level: RiskLevel): string => {
    switch (level) {
      case 'SAFE': return '✅'
      case 'WARNING': return '⚡'
      case 'DANGER': return '⚠️'
      case 'CRITICAL': return '🚨'
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Position Risk Monitor
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Real-time monitoring with emergency stop-loss protection
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isMonitoring 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {isMonitoring ? '🟢 Active' : '⚫ Inactive'}
            </div>
            <button
              onClick={isMonitoring ? stopMonitoring : startMonitoring}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isMonitoring
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isMonitoring ? 'Stop Monitoring' : 'Start Monitoring'}
            </button>
          </div>
        </div>

        {/* Settings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Check Interval
            </label>
            <select
              value={checkInterval}
              onChange={(e) => {
                const interval = parseInt(e.target.value)
                setCheckInterval(interval)
                monitor.updateConfig({ checkIntervalSeconds: interval })
              }}
              className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              disabled={isMonitoring}
            >
              <option value={15}>Every 15 seconds (Aggressive)</option>
              <option value={30}>Every 30 seconds (Balanced)</option>
              <option value={60}>Every 60 seconds (Conservative)</option>
              <option value={120}>Every 2 minutes (Relaxed)</option>
            </select>
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={notificationsEnabled}
                onChange={(e) => {
                  setNotificationsEnabled(e.target.checked)
                  monitor.updateConfig({ enableNotifications: e.target.checked })
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                🔔 Browser Notifications
              </span>
            </label>
          </div>

          <div className="flex items-center">
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={soundEnabled}
                onChange={(e) => {
                  setSoundEnabled(e.target.checked)
                  monitor.updateConfig({ enableSoundAlerts: e.target.checked })
                }}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                🔊 Sound Alerts
              </span>
            </label>
          </div>
        </div>

        {/* Risk Filter */}
        <div className="mt-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Risk:
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setRiskFilter('ALL')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                riskFilter === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              All Positions
            </button>
            <button
              onClick={() => setRiskFilter('SAFE')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                riskFilter === 'SAFE'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              ✅ Safe Only
            </button>
            <button
              onClick={() => setRiskFilter('AT_RISK')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                riskFilter === 'AT_RISK'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              ⚠️ At Risk (Warning/Danger/Critical)
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.positionsMonitored}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Positions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.totalChecks}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Checks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.alertsTriggered}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">Alerts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.apiCallsUsed}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">API Calls</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-600 dark:text-gray-400">Last Check</div>
              <div className="text-sm font-medium text-gray-900 dark:text-white">
                {new Date(stats.lastCheckTime).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Positions List */}
      <div className="space-y-4">
        {(() => {
          const filteredPositions = positions.filter(risk => {
            if (riskFilter === 'SAFE') return risk.riskLevel === 'SAFE'
            if (riskFilter === 'AT_RISK') return risk.riskLevel !== 'SAFE'
            return true
          })

          if (positions.length === 0) {
            return (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 dark:text-gray-600 text-lg">
                  {isMonitoring ? '🔍 Scanning for positions...' : '⏸️ Start monitoring to see positions'}
                </div>
              </div>
            )
          }

          if (filteredPositions.length === 0) {
            return (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                <div className="text-gray-400 dark:text-gray-600 text-lg">
                  {riskFilter === 'SAFE' ? '✅ No safe positions found' : '⚠️ No at-risk positions found'}
                </div>
                <button
                  onClick={() => setRiskFilter('ALL')}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Show All Positions
                </button>
              </div>
            )
          }

          return filteredPositions.map((risk) => (
            <div
              key={risk.position.ticker}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden border-l-4 ${
                risk.riskLevel === 'CRITICAL' ? 'border-red-500' :
                risk.riskLevel === 'DANGER' ? 'border-orange-500' :
                risk.riskLevel === 'WARNING' ? 'border-yellow-500' :
                'border-green-500'
              }`}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {risk.position.ticker}
                      </h3>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold ${getRiskBgColor(risk.riskLevel)} ${getRiskColor(risk.riskLevel)}`}>
                        {getRiskIcon(risk.riskLevel)} {risk.riskLevel}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {risk.position.quantity} shares @ ${risk.position.averagePrice.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      risk.unrealizedPLPercent >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {risk.unrealizedPLPercent >= 0 ? '+' : ''}{risk.unrealizedPLPercent.toFixed(2)}%
                    </div>
                    <div className={`text-sm ${
                      risk.unrealizedPL >= 0 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}>
                      {risk.unrealizedPL >= 0 ? '+' : ''}${risk.unrealizedPL.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Price Info */}
                <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Current Price</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${risk.position.currentPrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Entry Price</div>
                    <div className="text-lg font-bold text-gray-900 dark:text-white">
                      ${risk.position.averagePrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Stop-Loss</div>
                    <div className="text-lg font-bold text-red-600 dark:text-red-400">
                      ${risk.stopLossPrice.toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Alerts */}
                {risk.alerts.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {risk.alerts.map((alert, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg text-sm ${getRiskBgColor(risk.riskLevel)}`}
                      >
                        {alert}
                      </div>
                    ))}
                  </div>
                )}

                {/* Recommendations */}
                {risk.recommendations.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {risk.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-300"
                      >
                        {rec}
                      </div>
                    ))}
                  </div>
                )}

                {/* Pending Orders */}
                {risk.pendingOrders.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Pending Orders:
                    </div>
                    <div className="space-y-2">
                      {risk.pendingOrders.map((order) => (
                        <div
                          key={order.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-sm"
                        >
                          <div>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {order.type}
                            </span>
                            {order.limitPrice && (
                              <span className="ml-2 text-gray-600 dark:text-gray-400">
                                @ ${order.limitPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            {order.quantity} shares
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emergency Action Button */}
                {(risk.riskLevel === 'DANGER' || risk.riskLevel === 'CRITICAL') && (
                  <button
                    onClick={() => handleEmergencyAction(risk)}
                    className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    🚨 EMERGENCY STOP-LOSS
                  </button>
                )}
              </div>
            </div>
          ))
        })()}
      </div>

      {/* Emergency Modal */}
      {showEmergencyModal && selectedPosition && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-red-600 dark:text-red-400 mb-4">
              ⚠️ Confirm Emergency Action
            </h3>
            
            <div className="space-y-3 mb-6">
              <p className="text-gray-700 dark:text-gray-300">
                You are about to execute an emergency stop-loss for:
              </p>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Stock:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedPosition.position.ticker}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Quantity:</span>
                  <span className="font-bold text-gray-900 dark:text-white">
                    {selectedPosition.position.quantity} shares
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Stop Price:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    ${selectedPosition.stopLossPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Est. Loss:</span>
                  <span className="font-bold text-red-600 dark:text-red-400">
                    ${Math.abs(selectedPosition.stopLossAmount).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-sm text-yellow-800 dark:text-yellow-300">
                <strong>This action will:</strong>
                <ol className="list-decimal ml-4 mt-2 space-y-1">
                  <li>Cancel your existing limit order (if any)</li>
                  <li>Place a stop-loss order at ${selectedPosition.stopLossPrice.toFixed(2)}</li>
                  <li>Execute in approximately 3-5 seconds</li>
                </ol>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-800 dark:text-red-300">
                ⚠️ <strong>Warning:</strong> Price may move during execution. This action cannot be undone.
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEmergencyModal(false)
                  setSelectedPosition(null)
                }}
                disabled={isExecutingEmergency}
                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={executeEmergencyStopLoss}
                disabled={isExecutingEmergency}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isExecutingEmergency ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                    Executing...
                  </>
                ) : (
                  <>🚨 Execute Now</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
