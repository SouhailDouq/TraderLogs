'use client';

import { useState, useEffect } from 'react';

interface UnusualFlowStats {
  totalAlerts: number;
  tradedAlerts: number;
  winningTrades: number;
  losingTrades: number;
  winRate: string;
  totalProfit: number;
  alertsByLevel: {
    extreme?: number;
    high?: number;
    moderate?: number;
  };
}

export default function UnusualFlowStats() {
  const [stats, setStats] = useState<UnusualFlowStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await fetch('/api/unusual-flow/stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        📊 Performance Stats
      </h2>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Total Alerts</div>
          <div className="text-3xl font-bold text-blue-400">{stats.totalAlerts}</div>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Traded</div>
          <div className="text-3xl font-bold text-purple-400">{stats.tradedAlerts}</div>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Win Rate</div>
          <div className="text-3xl font-bold text-green-400">{stats.winRate}%</div>
        </div>

        <div className="bg-gray-900/50 p-4 rounded-lg">
          <div className="text-sm text-gray-400 mb-1">Total Profit</div>
          <div className={`text-3xl font-bold ${stats.totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            €{stats.totalProfit.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Alert Level Breakdown */}
      <div className="bg-gray-900/50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-3">Alerts by Level</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl mb-1">🚨</div>
            <div className="text-sm text-gray-400">Extreme</div>
            <div className="text-xl font-bold text-red-400">{stats.alertsByLevel.extreme || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">⚠️</div>
            <div className="text-sm text-gray-400">High</div>
            <div className="text-xl font-bold text-orange-400">{stats.alertsByLevel.high || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-2xl mb-1">📊</div>
            <div className="text-sm text-gray-400">Moderate</div>
            <div className="text-xl font-bold text-yellow-400">{stats.alertsByLevel.moderate || 0}</div>
          </div>
        </div>
      </div>

      {/* Trade Outcomes */}
      {stats.tradedAlerts > 0 && (
        <div className="mt-4 bg-gray-900/50 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-3">Trade Outcomes</h3>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Wins</span>
                <span className="text-green-400 font-semibold">{stats.winningTrades}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(stats.winningTrades / stats.tradedAlerts) * 100}%` }}
                ></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">Losses</span>
                <span className="text-red-400 font-semibold">{stats.losingTrades}</span>
              </div>
              <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500"
                  style={{ width: `${(stats.losingTrades / stats.tradedAlerts) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
