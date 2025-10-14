'use client';

import { useState, useEffect, useRef } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { formatCurrency } from '@/utils/formatters';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  marketValue: number;
}

interface StopLossMonitorProps {
  positions: Position[];
  onAcknowledge?: (positionId: string) => void;
}

interface Alert {
  id: string;
  symbol: string;
  type: 'critical' | 'warning';
  message: string;
  currentPrice: number;
  entryPrice: number;
  lossPercent: number;
  stopLossPrice: number;
  acknowledged: boolean;
  timestamp: Date;
}

export default function StopLossMonitor({ positions, onAcknowledge }: StopLossMonitorProps) {
  const isDarkMode = useDarkMode();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showWarnings, setShowWarnings] = useState(false);
  const [expandedCritical, setExpandedCritical] = useState<{ [key: string]: boolean }>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const previousAlertsRef = useRef<Set<string>>(new Set());

  // Initialize audio context
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  // Play urgent alarm sound
  const playAlarmSound = () => {
    if (!soundEnabled || !audioContextRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      
      // Create a more urgent, attention-grabbing sound
      const playBeep = (frequency: number, duration: number, delay: number) => {
        setTimeout(() => {
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          oscillator.frequency.value = frequency;
          oscillator.type = 'sine';
          
          gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
          
          oscillator.start(audioContext.currentTime);
          oscillator.stop(audioContext.currentTime + duration);
        }, delay);
      };

      // Triple beep pattern for urgency
      playBeep(1000, 0.2, 0);
      playBeep(1000, 0.2, 300);
      playBeep(1000, 0.4, 600);
    } catch (error) {
      console.error('Failed to play alarm:', error);
    }
  };

  // Send browser notification
  const sendBrowserNotification = (alert: Alert) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      const notification = new Notification(`🚨 STOP-LOSS ALERT: ${alert.symbol}`, {
        body: `${alert.message}\nCurrent: ${formatCurrency(alert.currentPrice)}\nAction: SELL NOW on Trading 212`,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: alert.id,
        requireInteraction: true,
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } else if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  // Monitor positions and generate alerts
  useEffect(() => {
    console.log('🔍 StopLossMonitor checking positions:', {
      positionsCount: positions.length,
      positions: positions.map(p => ({
        symbol: p.symbol,
        unrealizedPnLPercent: p.unrealizedPnLPercent,
        price: p.price,
        currentPrice: p.currentPrice
      }))
    });

    const newAlerts: Alert[] = [];
    const currentAlertKeys = new Set<string>();

    positions.forEach(position => {
      const lossPercent = position.unrealizedPnLPercent;
      const stopLossPrice = position.price * 0.92; // -8% from entry
      const alertKey = `${position.symbol}-${Math.floor(lossPercent)}`;

      currentAlertKeys.add(alertKey);

      // Critical alert: -8% or worse
      if (lossPercent <= -8) {
        const alert: Alert = {
          id: `${position.id}-critical`,
          symbol: position.symbol,
          type: 'critical',
          message: `DOWN ${Math.abs(lossPercent).toFixed(1)}%! STOP-LOSS TRIGGERED!`,
          currentPrice: position.currentPrice,
          entryPrice: position.price,
          lossPercent,
          stopLossPrice,
          acknowledged: false,
          timestamp: new Date()
        };

        newAlerts.push(alert);

        // Only play sound and send notification for NEW alerts
        if (!previousAlertsRef.current.has(alertKey)) {
          playAlarmSound();
          sendBrowserNotification(alert);
        }
      }
      // Warning alert: -5% to -7.9%
      else if (lossPercent <= -5) {
        const alert: Alert = {
          id: `${position.id}-warning`,
          symbol: position.symbol,
          type: 'warning',
          message: `Down ${Math.abs(lossPercent).toFixed(1)}% - Approaching stop-loss`,
          currentPrice: position.currentPrice,
          entryPrice: position.price,
          lossPercent,
          stopLossPrice,
          acknowledged: false,
          timestamp: new Date()
        };

        newAlerts.push(alert);
      }
    });

    previousAlertsRef.current = currentAlertKeys;
    setAlerts(newAlerts);
  }, [positions]);

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
    
    if (onAcknowledge) {
      const alert = alerts.find(a => a.id === alertId);
      if (alert) {
        onAcknowledge(alert.id);
      }
    }
  };

  const criticalAlerts = alerts.filter(a => a.type === 'critical' && !a.acknowledged);
  const warningAlerts = alerts.filter(a => a.type === 'warning' && !a.acknowledged);

  if (alerts.length === 0) {
    return (
      <div className={`rounded-2xl shadow-lg border p-6 ${
        isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Stop-Loss Monitor
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              All positions within safe range
            </p>
          </div>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`ml-auto px-3 py-1 rounded-lg text-xs font-medium ${
              soundEnabled
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            {soundEnabled ? '🔔 Sound ON' : '🔕 Sound OFF'}
          </button>
        </div>
        <div className={`p-4 rounded-xl text-center ${
          isDarkMode ? 'bg-green-900/20' : 'bg-green-50'
        }`}>
          <p className={`text-sm font-medium ${isDarkMode ? 'text-green-300' : 'text-green-800'}`}>
            ✅ No stop-loss alerts. All positions are above -5% threshold.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Critical Alerts - Persistent Banner */}
      {criticalAlerts.length > 0 && (
        <div className={`rounded-2xl shadow-2xl border-4 p-6 animate-pulse ${
          isDarkMode ? 'bg-red-900/90 border-red-500' : 'bg-red-50/90 border-red-500'
        }`}>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center animate-bounce">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className={`text-2xl font-black mb-1 ${
                isDarkMode ? 'text-red-100' : 'text-red-900'
              }`}>
                🚨 STOP-LOSS TRIGGERED!
              </h2>
              <p className={`text-base font-semibold ${
                isDarkMode ? 'text-red-200' : 'text-red-700'
              }`}>
                {criticalAlerts.length} position{criticalAlerts.length > 1 ? 's' : ''} hit -8% threshold
              </p>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                soundEnabled
                  ? 'bg-red-700 text-white hover:bg-red-800'
                  : 'bg-slate-600 text-white hover:bg-slate-700'
              }`}
            >
              {soundEnabled ? '🔔 ON' : '🔕 OFF'}
            </button>
          </div>

          <div className="space-y-3">
            {criticalAlerts.map(alert => {
              const isExpanded = expandedCritical[alert.id];
              return (
                <div
                  key={alert.id}
                  className={`p-4 rounded-xl border-2 ${
                    isDarkMode 
                      ? 'bg-red-800/50 border-red-400' 
                      : 'bg-white border-red-400'
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <h3 className={`text-xl font-black ${
                        isDarkMode ? 'text-red-100' : 'text-red-900'
                      }`}>
                        {alert.symbol}
                      </h3>
                      <div className="text-2xl font-black text-red-600">
                        {alert.lossPercent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                        ${alert.currentPrice.toFixed(2)}
                      </span>
                      <button
                        onClick={() => setExpandedCritical(prev => ({ ...prev, [alert.id]: !prev[alert.id] }))}
                        className={`p-1 rounded-lg ${isDarkMode ? 'hover:bg-red-700' : 'hover:bg-red-100'}`}
                      >
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <>
                      <div className={`p-3 rounded-lg mb-3 ${
                        isDarkMode ? 'bg-red-700/50' : 'bg-red-100'
                      }`}>
                        <p className={`text-xs font-bold mb-2 ${
                          isDarkMode ? 'text-red-100' : 'text-red-900'
                        }`}>
                          ⚠️ ACTION: Open Trading 212 → Find {alert.symbol} → SELL → Market Order
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-900/50' : 'bg-red-50'}`}>
                          <span className={isDarkMode ? 'text-red-300' : 'text-red-700'}>Entry: </span>
                          <span className={`font-bold ${isDarkMode ? 'text-red-100' : 'text-red-900'}`}>
                            ${alert.entryPrice.toFixed(2)}
                          </span>
                        </div>
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-red-900/50' : 'bg-red-50'}`}>
                          <span className={isDarkMode ? 'text-red-300' : 'text-red-700'}>Stop: </span>
                          <span className={`font-bold ${isDarkMode ? 'text-red-100' : 'text-red-900'}`}>
                            ${alert.stopLossPrice.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  <button
                    onClick={() => handleAcknowledge(alert.id)}
                    className="w-full py-2 px-4 rounded-lg font-bold text-sm text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200"
                  >
                    ✓ I've Sold
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warning Alerts - Collapsible */}
      {warningAlerts.length > 0 && (
        <div className={`rounded-2xl shadow-lg border-2 p-4 ${
          isDarkMode ? 'bg-orange-900/30 border-orange-500' : 'bg-orange-50 border-orange-500'
        }`}>
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="text-left">
                <h3 className={`text-base font-bold ${
                  isDarkMode ? 'text-orange-200' : 'text-orange-900'
                }`}>
                  ⚠️ {warningAlerts.length} Position{warningAlerts.length > 1 ? 's' : ''} Approaching Stop-Loss (-5% to -8%)
                </h3>
              </div>
            </div>
            {showWarnings ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          {showWarnings && (
            <div className="space-y-2 mt-4">
            {warningAlerts.map(alert => (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border ${
                  isDarkMode 
                    ? 'bg-orange-800/30 border-orange-600' 
                    : 'bg-white border-orange-300'
                }`}
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className={`text-lg font-bold ${
                    isDarkMode ? 'text-orange-200' : 'text-orange-900'
                  }`}>
                    {alert.symbol}
                  </h4>
                  <span className="text-xl font-bold text-orange-600">
                    {alert.lossPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-orange-400' : 'text-orange-700'
                    }`}>
                      Current
                    </p>
                    <p className={`font-bold ${
                      isDarkMode ? 'text-orange-200' : 'text-orange-900'
                    }`}>
                      ${alert.currentPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-orange-400' : 'text-orange-700'
                    }`}>
                      Entry
                    </p>
                    <p className={`font-bold ${
                      isDarkMode ? 'text-orange-200' : 'text-orange-900'
                    }`}>
                      ${alert.entryPrice.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-orange-400' : 'text-orange-700'
                    }`}>
                      Stop-Loss
                    </p>
                    <p className={`font-bold ${
                      isDarkMode ? 'text-orange-200' : 'text-orange-900'
                    }`}>
                      ${alert.stopLossPrice.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className={`mt-3 p-2 rounded-lg text-xs ${
                  isDarkMode ? 'bg-orange-900/50 text-orange-200' : 'bg-orange-100 text-orange-800'
                }`}>
                  💡 Prepare to sell if price drops to ${alert.stopLossPrice.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
          )}
        </div>
      )}
    </div>
  );
}
