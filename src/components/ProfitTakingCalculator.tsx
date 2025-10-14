'use client';

import { useState } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { formatCurrency } from '@/utils/formatters';

interface ProfitTakingCalculatorProps {
  className?: string;
}

interface LadderLevel {
  percent: number;
  label: string;
  sharePercent: number;
  color: string;
}

export default function ProfitTakingCalculator({ className = '' }: ProfitTakingCalculatorProps) {
  const isDarkMode = useDarkMode();
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [positionSize, setPositionSize] = useState<string>('1500');

  const ladderLevels: LadderLevel[] = [
    { percent: 8, label: 'Conservative', sharePercent: 33, color: 'green' },
    { percent: 15, label: 'Moderate', sharePercent: 33, color: 'blue' },
    { percent: 25, label: 'Aggressive', sharePercent: 34, color: 'purple' }
  ];

  const calculateLadder = () => {
    const price = parseFloat(entryPrice);
    const shareCount = parseInt(shares);
    const size = parseFloat(positionSize);

    if (!price || price <= 0) return null;

    // Calculate shares if not provided
    const calculatedShares = shareCount || Math.floor(size / price);

    return ladderLevels.map(level => {
      const targetPrice = price * (1 + level.percent / 100);
      const sharesToSell = Math.floor(calculatedShares * (level.sharePercent / 100));
      const profit = (targetPrice - price) * sharesToSell;
      const totalValue = targetPrice * sharesToSell;

      return {
        ...level,
        targetPrice,
        sharesToSell,
        profit,
        totalValue
      };
    });
  };

  const ladder = calculateLadder();
  const totalProfit = ladder?.reduce((sum, level) => sum + level.profit, 0) || 0;

  return (
    <div className={`rounded-2xl shadow-lg border p-6 ${
      isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'
    } ${className}`}>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
        </div>
        <div>
          <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            Profit-Taking Calculator
          </h2>
          <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
            Calculate exact limit order prices for Trading 212
          </p>
        </div>
      </div>

      {/* Input Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Entry Price ($)
          </label>
          <input
            type="number"
            step="0.01"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            placeholder="10.00"
            className={`w-full px-4 py-3 rounded-xl border font-medium ${
              isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
            }`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Number of Shares
          </label>
          <input
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="Auto-calculate"
            className={`w-full px-4 py-3 rounded-xl border font-medium ${
              isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
            }`}
          />
        </div>
        <div>
          <label className={`block text-sm font-medium mb-2 ${
            isDarkMode ? 'text-slate-300' : 'text-slate-700'
          }`}>
            Position Size (€)
          </label>
          <input
            type="number"
            step="100"
            value={positionSize}
            onChange={(e) => setPositionSize(e.target.value)}
            placeholder="1500"
            className={`w-full px-4 py-3 rounded-xl border font-medium ${
              isDarkMode 
                ? 'bg-slate-700 border-slate-600 text-white placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-500'
            }`}
          />
        </div>
      </div>

      {ladder ? (
        <>
          {/* Ladder Levels */}
          <div className="space-y-4 mb-6">
            {ladder.map((level, index) => (
              <div
                key={index}
                className={`p-5 rounded-xl border-2 ${
                  level.color === 'green'
                    ? isDarkMode
                      ? 'bg-green-900/20 border-green-500'
                      : 'bg-green-50 border-green-500'
                    : level.color === 'blue'
                    ? isDarkMode
                      ? 'bg-blue-900/20 border-blue-500'
                      : 'bg-blue-50 border-blue-500'
                    : isDarkMode
                    ? 'bg-purple-900/20 border-purple-500'
                    : 'bg-purple-50 border-purple-500'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      level.color === 'green'
                        ? 'bg-green-500'
                        : level.color === 'blue'
                        ? 'bg-blue-500'
                        : 'bg-purple-500'
                    }`}>
                      <span className="text-white font-bold text-lg">{index + 1}</span>
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${
                        level.color === 'green'
                          ? 'text-green-700 dark:text-green-300'
                          : level.color === 'blue'
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-purple-700 dark:text-purple-300'
                      }`}>
                        {level.label} Target: +{level.percent}%
                      </h3>
                      <p className={`text-sm ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        Sell {level.sharePercent}% of position
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-black ${
                      level.color === 'green'
                        ? 'text-green-600 dark:text-green-400'
                        : level.color === 'blue'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      ${level.targetPrice.toFixed(2)}
                    </div>
                    <div className={`text-xs ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Target Price
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-slate-700/50' : 'bg-white'
                  }`}>
                    <p className={`text-xs mb-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Shares to Sell
                    </p>
                    <p className={`text-lg font-bold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {level.sharesToSell}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-slate-700/50' : 'bg-white'
                  }`}>
                    <p className={`text-xs mb-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Profit
                    </p>
                    <p className={`text-lg font-bold ${
                      level.color === 'green'
                        ? 'text-green-600 dark:text-green-400'
                        : level.color === 'blue'
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-purple-600 dark:text-purple-400'
                    }`}>
                      {formatCurrency(level.profit)}
                    </p>
                  </div>
                  <div className={`p-3 rounded-lg ${
                    isDarkMode ? 'bg-slate-700/50' : 'bg-white'
                  }`}>
                    <p className={`text-xs mb-1 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                    }`}>
                      Total Value
                    </p>
                    <p className={`text-lg font-bold ${
                      isDarkMode ? 'text-white' : 'text-slate-900'
                    }`}>
                      {formatCurrency(level.totalValue)}
                    </p>
                  </div>
                </div>

                {/* Trading 212 Instructions */}
                <div className={`mt-4 p-4 rounded-lg ${
                  level.color === 'green'
                    ? isDarkMode
                      ? 'bg-green-800/50'
                      : 'bg-green-100'
                    : level.color === 'blue'
                    ? isDarkMode
                      ? 'bg-blue-800/50'
                      : 'bg-blue-100'
                    : isDarkMode
                    ? 'bg-purple-800/50'
                    : 'bg-purple-100'
                }`}>
                  <p className={`text-sm font-bold mb-2 ${
                    level.color === 'green'
                      ? isDarkMode ? 'text-green-200' : 'text-green-900'
                      : level.color === 'blue'
                      ? isDarkMode ? 'text-blue-200' : 'text-blue-900'
                      : isDarkMode ? 'text-purple-200' : 'text-purple-900'
                  }`}>
                    📱 Trading 212 Order:
                  </p>
                  <ol className={`text-xs space-y-1 ${
                    level.color === 'green'
                      ? isDarkMode ? 'text-green-300' : 'text-green-800'
                      : level.color === 'blue'
                      ? isDarkMode ? 'text-blue-300' : 'text-blue-800'
                      : isDarkMode ? 'text-purple-300' : 'text-purple-800'
                  }`}>
                    <li>1. Open position → Sell</li>
                    <li>2. Select "Limit Order"</li>
                    <li>3. Quantity: <strong>{level.sharesToSell} shares</strong></li>
                    <li>4. Limit Price: <strong>${level.targetPrice.toFixed(2)}</strong></li>
                    <li>5. Good Till Cancelled (GTC)</li>
                    <li>6. Confirm order</li>
                  </ol>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className={`p-6 rounded-xl border-2 ${
            isDarkMode ? 'bg-emerald-900/30 border-emerald-500' : 'bg-emerald-50 border-emerald-500'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className={`text-xl font-bold ${
                  isDarkMode ? 'text-emerald-300' : 'text-emerald-900'
                }`}>
                  Total Expected Profit
                </h3>
                <p className={`text-sm ${
                  isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  If all three targets are hit
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(totalProfit)}
                </div>
                <div className={`text-sm ${
                  isDarkMode ? 'text-emerald-400' : 'text-emerald-700'
                }`}>
                  {((totalProfit / parseFloat(positionSize)) * 100).toFixed(1)}% return
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${
              isDarkMode ? 'bg-emerald-800/50' : 'bg-emerald-100'
            }`}>
              <p className={`text-sm font-semibold ${
                isDarkMode ? 'text-emerald-200' : 'text-emerald-900'
              }`}>
                💡 <strong>Key Strategy:</strong> Set all three limit orders IMMEDIATELY after buying.
                This removes emotion and guarantees profits even if the stock reverses.
              </p>
            </div>
          </div>

          {/* Quick Copy Section */}
          <div className={`mt-6 p-4 rounded-xl ${
            isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'
          }`}>
            <h4 className={`text-sm font-bold mb-3 ${
              isDarkMode ? 'text-slate-300' : 'text-slate-700'
            }`}>
              📋 Quick Reference (Copy to Trading 212)
            </h4>
            <div className="space-y-2 font-mono text-xs">
              {ladder.map((level, index) => (
                <div
                  key={index}
                  className={`p-2 rounded ${
                    isDarkMode ? 'bg-slate-800' : 'bg-white'
                  }`}
                >
                  <span className={isDarkMode ? 'text-slate-300' : 'text-slate-700'}>
                    Order {index + 1}: SELL {level.sharesToSell} @ ${level.targetPrice.toFixed(2)} (Limit, GTC)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className={`p-8 text-center rounded-xl ${
          isDarkMode ? 'bg-slate-700/50' : 'bg-slate-100'
        }`}>
          <p className={`text-sm ${
            isDarkMode ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Enter entry price and position size to calculate profit-taking levels
          </p>
        </div>
      )}
    </div>
  );
}
