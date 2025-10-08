'use client'

import React, { useState, useEffect } from 'react'
import PositionRiskMonitor from '@/components/PositionRiskMonitor'
import { useTradeStore } from '@/utils/store'
import toast from 'react-hot-toast'

export default function PositionMonitorPage() {
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')
  const [accountType, setAccountType] = useState<'LIVE' | 'DEMO'>('DEMO')
  const [isConfigured, setIsConfigured] = useState(false)
  const [showSetup, setShowSetup] = useState(true)

  // Load saved config from localStorage
  useEffect(() => {
    const savedApiKey = localStorage.getItem('trading212_api_key')
    const savedApiSecret = localStorage.getItem('trading212_api_secret')
    const savedAccountType = localStorage.getItem('trading212_account_type') as 'LIVE' | 'DEMO'
    
    if (savedApiKey && savedApiSecret) {
      setApiKey(savedApiKey)
      setApiSecret(savedApiSecret)
      setAccountType(savedAccountType || 'DEMO')
      setIsConfigured(true)
      setShowSetup(false)
    }
  }, [])

  const handleSaveConfig = () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your Trading 212 API key')
      return
    }
    if (!apiSecret.trim()) {
      toast.error('Please enter your Trading 212 API secret')
      return
    }

    // Create Basic Auth token
    const credentials = `${apiKey}:${apiSecret}`
    const encodedCredentials = btoa(credentials)
    const authToken = `Basic ${encodedCredentials}`

    localStorage.setItem('trading212_api_key', apiKey)
    localStorage.setItem('trading212_api_secret', apiSecret)
    localStorage.setItem('trading212_auth_token', authToken)
    localStorage.setItem('trading212_account_type', accountType)
    setIsConfigured(true)
    setShowSetup(false)
    toast.success('Configuration saved!')
  }

  const handleClearConfig = () => {
    localStorage.removeItem('trading212_api_key')
    localStorage.removeItem('trading212_api_secret')
    localStorage.removeItem('trading212_auth_token')
    localStorage.removeItem('trading212_account_type')
    setApiKey('')
    setApiSecret('')
    setAccountType('DEMO')
    setIsConfigured(false)
    setShowSetup(true)
    toast('Configuration cleared', { icon: '🔄' })
  }

  const handleEmergencyAction = (ticker: string) => {
    // Log emergency action for tracking
    console.log(`Emergency stop-loss executed for ${ticker}`)
    toast.success(`Emergency action logged for ${ticker}`)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Position Risk Monitor
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Your automated co-pilot for risk management and emergency stop-loss protection
              </p>
            </div>
            {isConfigured && (
              <button
                onClick={() => setShowSetup(!showSetup)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
              >
                ⚙️ Settings
              </button>
            )}
          </div>
        </div>

        {/* Setup/Configuration */}
        {showSetup && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Trading 212 Configuration
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Trading 212 API key"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  API Secret
                </label>
                <input
                  type="password"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  placeholder="Enter your Trading 212 API secret"
                  className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Get both API key and secret from Trading 212 app → Settings → API
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Account Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="DEMO"
                      checked={accountType === 'DEMO'}
                      onChange={(e) => setAccountType(e.target.value as 'DEMO')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                      Demo Account (Practice)
                    </span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      value="LIVE"
                      checked={accountType === 'LIVE'}
                      onChange={(e) => setAccountType(e.target.value as 'LIVE')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-2 text-gray-700 dark:text-gray-300">
                      Live Account (Real Money)
                    </span>
                  </label>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                  ℹ️ How It Works
                </h3>
                <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                  <li>• Monitors your positions every 30-60 seconds</li>
                  <li>• Calculates real-time risk based on entry price</li>
                  <li>• Sends alerts when approaching stop-loss levels</li>
                  <li>• One-click emergency action to cancel limit + place stop-loss</li>
                  <li>• Works within Trading 212 API rate limits</li>
                </ul>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h3 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                  ⚠️ Important Notes
                </h3>
                <ul className="text-sm text-yellow-800 dark:text-yellow-400 space-y-1">
                  <li>• <strong>Start with DEMO account</strong> to test the system</li>
                  <li>• API key is stored locally in your browser (not on server)</li>
                  <li>• Emergency actions take 3-5 seconds to execute</li>
                  <li>• Price may move during execution - monitor carefully</li>
                  <li>• You stay in control - no automatic trades without confirmation</li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSaveConfig}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Save & Start Monitoring
                </button>
                {isConfigured && (
                  <button
                    onClick={handleClearConfig}
                    className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                  >
                    Clear Config
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Monitor Component */}
        {isConfigured && !showSetup && (
          <PositionRiskMonitor
            apiKey={localStorage.getItem('trading212_auth_token') || ''}
            accountType={accountType}
            onEmergencyAction={handleEmergencyAction}
          />
        )}

        {/* Info Cards */}
        {!isConfigured && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Smart Monitoring
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Continuously tracks your positions and calculates risk levels in real-time
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-4xl mb-3">🔔</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Instant Alerts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Get browser notifications and sound alerts when positions approach danger zones
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="text-4xl mb-3">🚨</div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Emergency Actions
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                One-click to cancel limit orders and place stop-loss protection
              </p>
            </div>
          </div>
        )}

        {/* Risk Thresholds Info */}
        {isConfigured && !showSetup && (
          <div className="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              Risk Level Thresholds
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✅</span>
                  <span className="font-bold text-green-700 dark:text-green-400">SAFE</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-500">
                  0% to -3% from entry
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Position is within acceptable range
                </p>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚡</span>
                  <span className="font-bold text-yellow-700 dark:text-yellow-400">WARNING</span>
                </div>
                <p className="text-sm text-yellow-600 dark:text-yellow-500">
                  -3% to -4% from entry
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Monitor closely, prepare for action
                </p>
              </div>

              <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">⚠️</span>
                  <span className="font-bold text-orange-700 dark:text-orange-400">DANGER</span>
                </div>
                <p className="text-sm text-orange-600 dark:text-orange-500">
                  -4% to -5% from entry
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Approaching stop-loss level
                </p>
              </div>

              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">🚨</span>
                  <span className="font-bold text-red-700 dark:text-red-400">CRITICAL</span>
                </div>
                <p className="text-sm text-red-600 dark:text-red-500">
                  Below -5% from entry
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  Emergency action recommended
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
