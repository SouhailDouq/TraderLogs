'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import UnusualFlowStats from '@/components/UnusualFlowStats';

interface UnusualActivity {
  id: string;
  symbol: string;
  timestamp: string;
  volumeRatio: number;
  priceChange: number;
  currentPrice: number;
  currentVolume: number;
  largeTradeCount: number;
  totalLargeTradeValue: number;
  buyPressure: number;
  sellPressure: number;
  accelerating: boolean;
  momentumScore: number;
  priceChangeRate: number;
  newsCount: number;
  technicalSetup: string;
  unusualScore: number;
  alertLevel: string;
  reasons: string[];
  isAboveSMAs: boolean;
  rsi?: number;
  viewed: boolean;
  traded: boolean;
  tradeOutcome?: string;
  tradeProfit?: number;
}

export default function UnusualFlowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activities, setActivities] = useState<UnusualActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [monitoring, setMonitoring] = useState(false);
  const [filter, setFilter] = useState<'all' | 'extreme' | 'high' | 'moderate'>('all');
  const [unviewedOnly, setUnviewedOnly] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Load activities
  const loadActivities = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('alertLevel', filter);
      if (unviewedOnly) params.append('unviewedOnly', 'true');
      params.append('limit', '100');

      const response = await fetch(`/api/unusual-flow?${params}`);
      const data = await response.json();

      if (data.success) {
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (status === 'authenticated') {
      loadActivities();
    }
  }, [status, filter, unviewedOnly]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh || status !== 'authenticated') return;

    const interval = setInterval(() => {
      loadActivities();
    }, 10000);

    return () => clearInterval(interval);
  }, [autoRefresh, status, filter, unviewedOnly]);

  // Start monitoring
  const startMonitoring = async () => {
    try {
      setMonitoring(true);
      
      console.log('🔍 Discovering active market symbols...');
      
      let symbols: string[] = [];
      let source = 'unknown';
      
      // Strategy 1: Use market-wide discovery API (EODHD screener - FAST)
      // Skip premarket scanner as it's too slow (30+ seconds with technical analysis)
      
      try {
        console.log('🌐 Using fast market-wide discovery API...');
        const discoveryResponse = await fetch('/api/market-discovery?limit=100');
        
        if (discoveryResponse.ok) {
          const discoveryData = await discoveryResponse.json();
          
          if (discoveryData.success && discoveryData.symbols && discoveryData.symbols.length > 0) {
            symbols = discoveryData.symbols;
            source = 'market_discovery';
            console.log(`✅ Discovered ${symbols.length} symbols from EODHD screener`);
          }
        }
      } catch (discoveryError) {
        console.log('⚠️ Market discovery API error:', discoveryError);
      }
      
      // Strategy 2: Fallback to curated active stocks list (last resort)
      if (symbols.length === 0) {
        console.log('⚠️ All discovery methods failed, using minimal fallback...');
        symbols = [
          // Major indices & ETFs
          'SPY', 'QQQ', 'IWM', 'DIA',
          // Mega caps
          'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA',
          // High volume movers
          'AMD', 'NFLX', 'PLTR', 'SOFI', 'COIN', 'HOOD', 'RIOT', 'MARA',
          // Volatile momentum stocks
          'NIO', 'RIVN', 'LCID', 'PLUG', 'SNAP', 'UBER', 'LYFT',
          // Meme stocks
          'GME', 'AMC', 'BBBY', 'CLOV',
          // Crypto-related
          'BITF', 'CLSK', 'CIFR',
          // EV & Clean Energy
          'XPEV', 'FCEL', 'ENPH',
          // Biotech/Pharma movers
          'RXRX', 'BBAI', 'SOUN'
        ];
        source = 'fallback';
      }

      console.log(`📡 Starting monitoring for ${symbols.length} symbols (source: ${source})...`);

      const response = await fetch('/api/unusual-flow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbols })
      });

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Started monitoring ${symbols.length} symbols for unusual flow`);
        console.log(`📊 Source: ${source}`);
        console.log(`📊 Symbols: ${symbols.slice(0, 10).join(', ')}...`);
        // Reload activities after a short delay
        setTimeout(loadActivities, 2000);
      } else {
        throw new Error(data.error || 'Failed to start monitoring');
      }
    } catch (error) {
      console.error('❌ Failed to start monitoring:', error);
      alert('Failed to start monitoring. Check console for details.');
      setMonitoring(false);
    }
  };

  // Mark as viewed
  const markAsViewed = async (id: string) => {
    try {
      await fetch('/api/unusual-flow', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, viewed: true })
      });

      setActivities(prev =>
        prev.map(a => a.id === id ? { ...a, viewed: true } : a)
      );
    } catch (error) {
      console.error('Failed to mark as viewed:', error);
    }
  };

  // Play alert sound
  const playAlertSound = (alertLevel: string) => {
    if (audioRef.current) {
      audioRef.current.play().catch(err => console.log('Audio play failed:', err));
    }
  };

  // Get alert color
  const getAlertColor = (level: string) => {
    switch (level) {
      case 'extreme': return 'text-red-500 bg-red-500/10 border-red-500/30';
      case 'high': return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
      case 'moderate': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
      default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30';
    }
  };

  // Get alert icon
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'extreme': return '🚨';
      case 'high': return '⚠️';
      case 'moderate': return '📊';
      default: return '📈';
    }
  };

  // Format time ago
  const timeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      {/* Audio element for alerts */}
      <audio ref={audioRef} src="/sounds/alert.mp3" preload="auto" />

      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">🔴 Unusual Stock Flow</h1>
            <p className="text-gray-400">Real-time institutional money moves & volume spikes</p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            ← Back to Dashboard
          </Link>
        </div>

        {/* Monitoring Status Banner */}
        {monitoring && (
          <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="animate-pulse">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-blue-300">
                  🔴 LIVE: Monitoring 43 symbols for unusual activity
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  ⏰ Note: During afterhours/premarket, WebSocket activity may be limited. Alerts will appear when unusual volume is detected during market hours.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-center bg-gray-800/50 p-4 rounded-lg border border-gray-700">
          {/* Start Monitoring */}
          <button
            onClick={startMonitoring}
            disabled={monitoring}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              monitoring
                ? 'bg-green-600 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {monitoring ? '✅ Monitoring Active' : '▶️ Start Monitoring'}
          </button>

          {/* Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Alerts</option>
            <option value="extreme">🚨 Extreme Only</option>
            <option value="high">⚠️ High Only</option>
            <option value="moderate">📊 Moderate Only</option>
          </select>

          {/* Unviewed Only */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={unviewedOnly}
              onChange={(e) => setUnviewedOnly(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Unviewed Only</span>
          </label>

          {/* Auto Refresh */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Auto Refresh (10s)</span>
          </label>

          {/* Refresh Button */}
          <button
            onClick={loadActivities}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="max-w-7xl mx-auto mb-8">
        <UnusualFlowStats />
      </div>

      {/* Activities List */}
      <div className="max-w-7xl mx-auto space-y-4">
        {activities.length === 0 ? (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-2xl font-semibold mb-2">No Unusual Activity Yet</h3>
            <p className="text-gray-400 mb-6">
              {monitoring
                ? 'Monitoring for unusual stock activity... Alerts will appear here.'
                : 'Click "Start Monitoring" to begin detecting unusual flow.'}
            </p>
            {!monitoring && (
              <button
                onClick={startMonitoring}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                ▶️ Start Monitoring
              </button>
            )}
          </div>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className={`bg-gray-800/50 border rounded-lg p-6 transition-all hover:bg-gray-800/70 ${
                !activity.viewed ? 'border-blue-500/50 shadow-lg shadow-blue-500/20' : 'border-gray-700'
              }`}
              onClick={() => !activity.viewed && markAsViewed(activity.id)}
            >
              <div className="flex items-start justify-between mb-4">
                {/* Symbol & Alert Level */}
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-lg border ${getAlertColor(activity.alertLevel)}`}>
                    <span className="text-2xl mr-2">{getAlertIcon(activity.alertLevel)}</span>
                    <span className="font-bold text-2xl">{activity.symbol}</span>
                  </div>
                  <div className="text-left">
                    <div className="text-3xl font-bold">
                      ${activity.currentPrice.toFixed(2)}
                      <span className={`ml-2 text-xl ${activity.priceChange >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {activity.priceChange >= 0 ? '↑' : '↓'} {Math.abs(activity.priceChange).toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-sm text-gray-400">{timeAgo(activity.timestamp)}</div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-400">{activity.unusualScore.toFixed(0)}</div>
                  <div className="text-sm text-gray-400">Unusual Score</div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-900/50 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Volume Ratio</div>
                  <div className="text-xl font-bold text-purple-400">{activity.volumeRatio.toFixed(1)}x</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Large Trades</div>
                  <div className="text-xl font-bold text-orange-400">
                    🐋 {activity.largeTradeCount}
                    <span className="text-sm ml-1">(${(activity.totalLargeTradeValue / 1000).toFixed(0)}k)</span>
                  </div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Buy Pressure</div>
                  <div className="text-xl font-bold text-green-400">{activity.buyPressure.toFixed(0)}%</div>
                </div>
                <div className="bg-gray-900/50 p-3 rounded-lg">
                  <div className="text-sm text-gray-400">Momentum</div>
                  <div className="text-xl font-bold text-blue-400">
                    {activity.momentumScore.toFixed(0)}
                    {activity.accelerating && <span className="ml-1">⚡</span>}
                  </div>
                </div>
              </div>

              {/* Reasons */}
              <div className="space-y-2 mb-4">
                {activity.reasons.map((reason, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm">
                    <span className="text-blue-400">•</span>
                    <span>{reason}</span>
                  </div>
                ))}
              </div>

              {/* Technical Setup */}
              <div className="flex items-center gap-4 text-sm">
                <span className="px-3 py-1 bg-gray-700 rounded-full">
                  Setup: {activity.technicalSetup}
                </span>
                {activity.isAboveSMAs && (
                  <span className="px-3 py-1 bg-green-600/20 text-green-400 rounded-full">
                    ✓ Above SMAs
                  </span>
                )}
                {activity.rsi && (
                  <span className="px-3 py-1 bg-gray-700 rounded-full">
                    RSI: {activity.rsi.toFixed(0)}
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <Link
                  href={`/trade-analyzer?symbol=${activity.symbol}`}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-sm font-semibold"
                >
                  📊 Analyze
                </Link>
                <Link
                  href={`/trade-entry?symbol=${activity.symbol}&price=${activity.currentPrice}`}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm font-semibold"
                >
                  💰 Trade
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
