'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';

interface EntryQualityGateProps {
  openPositionsCount: number;
  maxPositions?: number;
}

interface QualityCriteria {
  id: string;
  label: string;
  description: string;
  required: boolean;
  met: boolean | null;
  value?: string;
}

export default function EntryQualityGate({ openPositionsCount, maxPositions = 5 }: EntryQualityGateProps) {
  const isDarkMode = useDarkMode();
  const [symbol, setSymbol] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [macd, setMacd] = useState<'bullish' | 'bearish' | 'neutral' | null>(null);
  const [relativeVolume, setRelativeVolume] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPremarketWindow = () => {
    const estTime = new Date(currentTime.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = estTime.getHours();
    const minutes = estTime.getMinutes();
    const currentMinutes = hour * 60 + minutes;
    
    // 4:00-5:00 AM ET = 240-300 minutes
    return currentMinutes >= 240 && currentMinutes < 300;
  };

  const criteria: QualityCriteria[] = [
    {
      id: 'positions',
      label: 'Position Limit',
      description: `You have ${openPositionsCount}/${maxPositions} open positions`,
      required: true,
      met: openPositionsCount < maxPositions,
      value: `${openPositionsCount}/${maxPositions}`
    },
    {
      id: 'time',
      label: 'Time Window',
      description: 'Must trade during 4:00-5:00 AM ET (10:00-11:00 France time)',
      required: true,
      met: isPremarketWindow(),
      value: isPremarketWindow() ? '✓ In window' : '✗ Outside window'
    },
    {
      id: 'score',
      label: 'Score ≥75',
      description: 'Stock must have momentum score of 75 or higher',
      required: true,
      met: score !== null ? score >= 75 : null,
      value: score !== null ? `${score}/100` : 'Not checked'
    },
    {
      id: 'macd',
      label: 'MACD Bullish',
      description: 'MACD must show bullish momentum (not bearish divergence)',
      required: true,
      met: macd === 'bullish',
      value: macd || 'Not checked'
    },
    {
      id: 'volume',
      label: 'Relative Volume >2.5x',
      description: 'Must have strong volume confirmation',
      required: true,
      met: relativeVolume !== null ? relativeVolume > 2.5 : null,
      value: relativeVolume !== null ? `${relativeVolume.toFixed(1)}x` : 'Not checked'
    }
  ];

  const allCriteriaMet = criteria.every(c => c.met === true);
  const criticalFailures = criteria.filter(c => c.required && c.met === false);

  const handleAnalyze = async () => {
    if (!symbol) return;

    setAnalyzing(true);
    
    try {
      // Fetch stock data from trade analyzer API
      const response = await fetch(`/api/stock-data?symbol=${symbol.toUpperCase()}`);
      
      if (!response.ok) {
        console.error('API request failed:', response.status, response.statusText);
        setAnalyzing(false);
        return;
      }
      
      const data = await response.json();

      // Check if we got valid data (score exists means success)
      if (data.score !== undefined) {
        setScore(data.score || 0);
        setMacd(data.macdAnalysis?.signal || 'neutral');
        setRelativeVolume(data.relativeVolume || 0);
      } else if (data.error) {
        console.error('Failed to fetch stock data:', data.error);
      }
    } catch (error) {
      console.error('Error analyzing stock:', error);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleReset = () => {
    setSymbol('');
    setScore(null);
    setMacd(null);
    setRelativeVolume(null);
  };

  return (
    <div className={`rounded-2xl shadow-lg border p-6 ${
      isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'
    }`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Entry Quality Gate
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Verify all criteria before entering a trade
          </p>
        </div>
      </div>

      {/* Stock Input */}
      <div className="mb-6">
        <label className={`block text-sm font-medium mb-2 ${
          isDarkMode ? 'text-slate-300' : 'text-slate-700'
        }`}>
          Stock Symbol
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Enter symbol (e.g., AAPL)"
            className={`flex-1 px-4 py-3 rounded-xl border font-medium ${
              isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
            }`}
            onKeyPress={(e) => e.key === 'Enter' && handleAnalyze()}
          />
          <button
            onClick={handleAnalyze}
            disabled={!symbol || analyzing}
            className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${
              !symbol || analyzing
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg'
            }`}
          >
            {analyzing ? 'Analyzing...' : 'Check'}
          </button>
          {(score !== null || macd !== null || relativeVolume !== null) && (
            <button
              onClick={handleReset}
              className={`px-4 py-3 rounded-xl font-medium ${
                isDarkMode
                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Criteria Checklist */}
      <div className="space-y-3 mb-6">
        {criteria.map((criterion) => (
          <div
            key={criterion.id}
            className={`p-4 rounded-xl border-2 transition-all ${
              criterion.met === true
                ? isDarkMode
                  ? 'bg-green-900/20 border-green-500'
                  : 'bg-green-50 border-green-500'
                : criterion.met === false
                ? isDarkMode
                  ? 'bg-red-900/20 border-red-500'
                  : 'bg-red-50 border-red-500'
                : isDarkMode
                ? 'bg-slate-700/50 border-slate-600'
                : 'bg-slate-50 border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  criterion.met === true
                    ? 'bg-green-500'
                    : criterion.met === false
                    ? 'bg-red-500'
                    : isDarkMode
                    ? 'bg-slate-600'
                    : 'bg-slate-300'
                }`}>
                  {criterion.met === true ? (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : criterion.met === false ? (
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span className="text-white text-xs">?</span>
                  )}
                </div>
                <div>
                  <h4 className={`font-bold mb-1 ${
                    criterion.met === true
                      ? 'text-green-700 dark:text-green-300'
                      : criterion.met === false
                      ? 'text-red-700 dark:text-red-300'
                      : isDarkMode
                      ? 'text-slate-300'
                      : 'text-slate-700'
                  }`}>
                    {criterion.label}
                    {criterion.required && (
                      <span className="ml-2 text-xs font-normal text-red-600 dark:text-red-400">
                        (Required)
                      </span>
                    )}
                  </h4>
                  <p className={`text-sm ${
                    criterion.met === true
                      ? 'text-green-600 dark:text-green-400'
                      : criterion.met === false
                      ? 'text-red-600 dark:text-red-400'
                      : isDarkMode
                      ? 'text-slate-400'
                      : 'text-slate-600'
                  }`}>
                    {criterion.description}
                  </p>
                </div>
              </div>
              <div className={`text-sm font-bold ${
                criterion.met === true
                  ? 'text-green-700 dark:text-green-300'
                  : criterion.met === false
                  ? 'text-red-700 dark:text-red-300'
                  : isDarkMode
                  ? 'text-slate-400'
                  : 'text-slate-600'
              }`}>
                {criterion.value}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Decision Panel */}
      <div className={`p-6 rounded-xl border-2 ${
        allCriteriaMet
          ? isDarkMode
            ? 'bg-green-900/30 border-green-500'
            : 'bg-green-50 border-green-500'
          : criticalFailures.length > 0
          ? isDarkMode
            ? 'bg-red-900/30 border-red-500'
            : 'bg-red-50 border-red-500'
          : isDarkMode
          ? 'bg-slate-700/50 border-slate-600'
          : 'bg-slate-100 border-slate-300'
      }`}>
        {allCriteriaMet ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${
                  isDarkMode ? 'text-green-300' : 'text-green-900'
                }`}>
                  ✅ ALL CRITERIA MET
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-green-400' : 'text-green-700'
                }`}>
                  This trade meets all quality requirements
                </p>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-green-800/50' : 'bg-green-100'
            }`}>
              <p className={`text-sm font-semibold mb-2 ${
                isDarkMode ? 'text-green-200' : 'text-green-900'
              }`}>
                ✓ You may proceed with this trade
              </p>
              <p className={`text-xs ${
                isDarkMode ? 'text-green-300' : 'text-green-800'
              }`}>
                Remember: Set profit-taking limit orders immediately after entry (8%, 15%, 25%)
              </p>
            </div>
          </div>
        ) : criticalFailures.length > 0 ? (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className={`text-xl font-bold ${
                  isDarkMode ? 'text-red-300' : 'text-red-900'
                }`}>
                  ❌ DO NOT TRADE
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-red-400' : 'text-red-700'
                }`}>
                  {criticalFailures.length} required criteria not met
                </p>
              </div>
            </div>
            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
            }`}>
              <p className={`text-sm font-semibold mb-2 ${
                isDarkMode ? 'text-red-200' : 'text-red-900'
              }`}>
                ⚠️ This trade does not meet quality standards
              </p>
              <ul className={`text-xs space-y-1 ${
                isDarkMode ? 'text-red-300' : 'text-red-800'
              }`}>
                {criticalFailures.map(failure => (
                  <li key={failure.id}>• {failure.label}: {failure.description}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <p className={`text-sm ${
              isDarkMode ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Enter a stock symbol and click "Check" to verify trade quality
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
