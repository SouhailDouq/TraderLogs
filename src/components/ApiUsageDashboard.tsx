'use client'

import { useState, useEffect } from 'react'
import { useDarkMode } from '@/hooks/useDarkMode'
import { rateLimiter } from '@/utils/rateLimiter'
import { apiCache } from '@/utils/apiCache'

export default function ApiUsageDashboard() {
  const isDarkMode = useDarkMode()
  const [stats, setStats] = useState({
    dailyCalls: 0,
    dailyLimit: 3000 as number | undefined,
    recentCalls: 0,
    maxCalls: 10,
    remainingDaily: 3000 as number | null,
    canMakeCall: true
  })
  const [cacheStats, setCacheStats] = useState({ size: 0, keys: [] as string[] })

  useEffect(() => {
    const updateStats = () => {
      const rateLimitStats = rateLimiter.getStats()
      const cacheInfo = apiCache.getStats()
      setStats(rateLimitStats)
      setCacheStats(cacheInfo)
    }

    updateStats()
    const interval = setInterval(updateStats, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [])

  const dailyUsagePercent = (stats.dailyCalls / (stats.dailyLimit || 1)) * 100
  const monthlyProjection = stats.dailyCalls * 30

  const getUsageColor = (percent: number) => {
    if (percent < 50) return 'text-green-600'
    if (percent < 80) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getUsageBgColor = (percent: number) => {
    if (percent < 50) return 'bg-green-500'
    if (percent < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={`p-4 rounded-xl border shadow-lg ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span>📊</span>
          API Usage Monitor
        </h3>
        <button
          onClick={async () => {
            try {
              const response = await fetch('/api/clear-cache', { method: 'POST' });
              if (response.ok) {
                // Force refresh of stats
                const rateLimitStats = rateLimiter.getStats()
                const cacheInfo = apiCache.getStats()
                setStats(rateLimitStats)
                setCacheStats(cacheInfo)
              }
            } catch (error) {
              console.error('Failed to clear cache:', error);
            }
          }}
          className={`px-3 py-1 text-sm rounded-lg transition-colors ${
            isDarkMode 
              ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
              : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
          }`}
        >
          Clear Cache
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Daily Usage */}
        <div className={`p-3 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="text-sm font-medium mb-1">Daily Usage</div>
          <div className={`text-2xl font-bold ${getUsageColor(dailyUsagePercent)}`}>
            {stats.dailyCalls}
          </div>
          <div className="text-xs text-gray-500">
            of {stats.dailyLimit || 0} ({dailyUsagePercent.toFixed(1)}%)
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getUsageBgColor(dailyUsagePercent)}`}
              style={{ width: `${Math.min(dailyUsagePercent, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* Recent Calls */}
        <div className={`p-3 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="text-sm font-medium mb-1">Last Minute</div>
          <div className={`text-2xl font-bold ${
            stats.recentCalls >= stats.maxCalls ? 'text-red-600' : 'text-blue-600'
          }`}>
            {stats.recentCalls}
          </div>
          <div className="text-xs text-gray-500">
            of {stats.maxCalls} calls
          </div>
        </div>

        {/* Monthly Projection */}
        <div className={`p-3 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="text-sm font-medium mb-1">Monthly Projection</div>
          <div className={`text-2xl font-bold ${
            monthlyProjection > 100000 ? 'text-red-600' : 'text-green-600'
          }`}>
            {monthlyProjection.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            of 100,000 limit
          </div>
        </div>

        {/* Cache Status */}
        <div className={`p-3 rounded-lg ${
          isDarkMode ? 'bg-gray-700' : 'bg-gray-50'
        }`}>
          <div className="text-sm font-medium mb-1">Cache Entries</div>
          <div className="text-2xl font-bold text-purple-600">
            {cacheStats.size}
          </div>
          <div className="text-xs text-gray-500">
            cached responses
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          stats.canMakeCall 
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {stats.canMakeCall ? '✅ API Available' : '🚫 Rate Limited'}
        </div>
        
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          dailyUsagePercent < 80
            ? 'bg-blue-100 text-blue-800 border border-blue-200'
            : 'bg-orange-100 text-orange-800 border border-orange-200'
        }`}>
          {stats.remainingDaily} calls remaining today
        </div>

        {monthlyProjection > 100000 && (
          <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 border border-red-200">
            ⚠️ Monthly limit exceeded at current rate
          </div>
        )}
      </div>

      {/* Optimization Tips */}
      <div className={`p-3 rounded-lg border ${
        isDarkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="text-sm font-medium mb-2">💡 Optimization Tips</div>
        <ul className="text-xs space-y-1">
          <li>• Premarket scans cached for 30 seconds (very fresh for momentum)</li>
          <li>• Stock data cached for 3 minutes, news for 2 minutes</li>
          <li>• Rate limited to 10 calls/minute, 3000 calls/day</li>
          <li>• Market status refreshes every 15 seconds</li>
          <li>• Clear cache only if you need immediate fresh data</li>
        </ul>
      </div>
    </div>
  )
}
