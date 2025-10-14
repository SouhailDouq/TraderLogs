'use client';

import { useMemo } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { formatCurrency } from '@/utils/formatters';

interface Position {
  id: string;
  symbol: string;
  quantity: number;
  price: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  marketValue: number;
  costBasis: number;
  date: string;
}

interface PortfolioTriageProps {
  positions: Position[];
}

interface TriageCategory {
  action: 'cut' | 'monitor' | 'hold';
  title: string;
  description: string;
  positions: Position[];
  totalValue: number;
  totalLoss: number;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

export default function PortfolioTriage({ positions }: PortfolioTriageProps) {
  const isDarkMode = useDarkMode();

  const triageAnalysis = useMemo(() => {
    const cutNow: Position[] = [];
    const monitorClosely: Position[] = [];
    const holdForNow: Position[] = [];

    positions.forEach(position => {
      const lossPercent = position.unrealizedPnLPercent;
      
      // Cut immediately: Down >40% OR down >25% with no momentum
      if (lossPercent <= -40) {
        cutNow.push(position);
      }
      // Monitor closely: Down 10-40%
      else if (lossPercent <= -10) {
        monitorClosely.push(position);
      }
      // Hold: Down <10% or profitable
      else {
        holdForNow.push(position);
      }
    });

    const categories: TriageCategory[] = [
      {
        action: 'cut',
        title: '🔴 Cut Immediately',
        description: 'Accept the loss and free up capital for new opportunities',
        positions: cutNow,
        totalValue: cutNow.reduce((sum, p) => sum + p.marketValue, 0),
        totalLoss: cutNow.reduce((sum, p) => sum + p.unrealizedPnL, 0),
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        borderColor: 'border-red-500',
        icon: '✂️'
      },
      {
        action: 'monitor',
        title: '⚠️ Monitor Closely',
        description: 'Set hard exit at -8% more decline from current price',
        positions: monitorClosely,
        totalValue: monitorClosely.reduce((sum, p) => sum + p.marketValue, 0),
        totalLoss: monitorClosely.reduce((sum, p) => sum + p.unrealizedPnL, 0),
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        borderColor: 'border-orange-500',
        icon: '👁️'
      },
      {
        action: 'hold',
        title: '✅ Hold & Track',
        description: 'Within acceptable risk levels',
        positions: holdForNow,
        totalValue: holdForNow.reduce((sum, p) => sum + p.marketValue, 0),
        totalLoss: holdForNow.reduce((sum, p) => sum + p.unrealizedPnL, 0),
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        borderColor: 'border-green-500',
        icon: '✓'
      }
    ];

    return categories;
  }, [positions]);

  const opportunityCost = useMemo(() => {
    const cutPositions = triageAnalysis.find(c => c.action === 'cut');
    if (!cutPositions || cutPositions.positions.length === 0) return null;

    const capitalToFree = cutPositions.totalValue;
    const potentialTrades = Math.floor(capitalToFree / 1500); // €1,500 per trade
    const expectedProfitPerTrade = 1500 * 0.15; // 15% target
    const totalPotentialProfit = potentialTrades * expectedProfitPerTrade;
    const netGain = totalPotentialProfit + cutPositions.totalLoss; // Loss is negative

    return {
      capitalToFree,
      potentialTrades,
      expectedProfitPerTrade,
      totalPotentialProfit,
      netGain,
      timeframe: 'next 2-4 weeks'
    };
  }, [triageAnalysis]);

  const recoveryProbability = (lossPercent: number): { percent: number; label: string; color: string } => {
    if (lossPercent <= -60) return { percent: 2, label: 'Nearly Impossible', color: 'text-red-700 dark:text-red-400' };
    if (lossPercent <= -50) return { percent: 5, label: 'Very Unlikely', color: 'text-red-600 dark:text-red-400' };
    if (lossPercent <= -40) return { percent: 10, label: 'Unlikely', color: 'text-orange-600 dark:text-orange-400' };
    if (lossPercent <= -30) return { percent: 20, label: 'Low Chance', color: 'text-orange-500 dark:text-orange-400' };
    if (lossPercent <= -20) return { percent: 35, label: 'Possible', color: 'text-yellow-600 dark:text-yellow-400' };
    return { percent: 50, label: 'Moderate', color: 'text-blue-600 dark:text-blue-400' };
  };

  const breakEvenRequired = (lossPercent: number): number => {
    return Math.abs((100 / (100 + lossPercent)) * 100 - 100);
  };

  if (positions.length === 0) {
    return (
      <div className={`rounded-2xl shadow-lg border p-8 text-center ${
        isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="text-4xl mb-3">✅</div>
        <h3 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-800'}`}>
          No Open Positions
        </h3>
        <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
          You're starting fresh with no trapped capital!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className={`rounded-2xl shadow-lg border p-6 ${
        isDarkMode ? 'bg-slate-800/90 border-slate-700' : 'bg-white/90 border-slate-200'
      }`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Portfolio Triage Analysis
            </h2>
            <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
              Systematic position review with action recommendations
            </p>
          </div>
        </div>

        {opportunityCost && (
          <div className={`mt-6 p-6 rounded-xl border-2 ${
            isDarkMode ? 'bg-purple-900/20 border-purple-500' : 'bg-purple-50 border-purple-500'
          }`}>
            <h3 className={`text-lg font-bold mb-3 ${isDarkMode ? 'text-purple-300' : 'text-purple-900'}`}>
              💡 Opportunity Cost Analysis
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className={`text-sm mb-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                  Capital to Free Up:
                </p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-200' : 'text-purple-900'}`}>
                  {formatCurrency(opportunityCost.capitalToFree)}
                </p>
              </div>
              <div>
                <p className={`text-sm mb-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                  Potential New Trades:
                </p>
                <p className={`text-2xl font-bold ${isDarkMode ? 'text-purple-200' : 'text-purple-900'}`}>
                  {opportunityCost.potentialTrades} trades @ €1,500 each
                </p>
              </div>
              <div>
                <p className={`text-sm mb-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                  Expected Profit (15% per trade):
                </p>
                <p className={`text-2xl font-bold text-green-600 dark:text-green-400`}>
                  +{formatCurrency(opportunityCost.totalPotentialProfit)}
                </p>
              </div>
              <div>
                <p className={`text-sm mb-1 ${isDarkMode ? 'text-purple-400' : 'text-purple-700'}`}>
                  Net Gain vs Holding:
                </p>
                <p className={`text-2xl font-bold ${
                  opportunityCost.netGain > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {opportunityCost.netGain > 0 ? '+' : ''}{formatCurrency(opportunityCost.netGain)}
                </p>
              </div>
            </div>
            <div className={`mt-4 p-4 rounded-lg ${
              isDarkMode ? 'bg-purple-800/30' : 'bg-purple-100'
            }`}>
              <p className={`text-sm font-semibold ${isDarkMode ? 'text-purple-200' : 'text-purple-900'}`}>
                ⚡ By cutting losers today and redeploying capital into {opportunityCost.potentialTrades} new momentum trades,
                you could potentially gain {formatCurrency(Math.abs(opportunityCost.netGain))} more than holding and hoping for recovery.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Triage Categories */}
      {triageAnalysis.map((category) => (
        <div
          key={category.action}
          className={`rounded-2xl shadow-lg border-2 p-6 ${
            isDarkMode ? 'bg-slate-800/90' : 'bg-white/90'
          } ${category.borderColor}`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{category.icon}</span>
              <div>
                <h3 className={`text-xl font-bold ${category.color}`}>
                  {category.title}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                  {category.description}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                {category.positions.length} position{category.positions.length !== 1 ? 's' : ''}
              </p>
              <p className={`text-lg font-bold ${category.color}`}>
                {formatCurrency(category.totalLoss)}
              </p>
            </div>
          </div>

          {category.positions.length > 0 ? (
            <div className="space-y-3">
              {category.positions.map((position) => {
                const recovery = recoveryProbability(position.unrealizedPnLPercent);
                const breakEven = breakEvenRequired(position.unrealizedPnLPercent);
                const exitPrice = position.currentPrice * 0.92; // -8% from current

                return (
                  <div
                    key={position.id}
                    className={`p-4 rounded-xl border ${
                      isDarkMode ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {position.symbol}
                        </h4>
                        <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          {position.quantity} shares @ {formatCurrency(position.price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`text-2xl font-bold ${
                          position.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {position.unrealizedPnLPercent.toFixed(1)}%
                        </p>
                        <p className={`text-sm ${
                          position.unrealizedPnLPercent >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(position.unrealizedPnL)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-white'}`}>
                        <p className={`text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Current Price
                        </p>
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(position.currentPrice)}
                        </p>
                      </div>
                      <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-slate-800/50' : 'bg-white'}`}>
                        <p className={`text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Market Value
                        </p>
                        <p className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          {formatCurrency(position.marketValue)}
                        </p>
                      </div>
                    </div>

                    {category.action === 'cut' && (
                      <div className={`p-4 rounded-lg mb-3 ${
                        isDarkMode ? 'bg-red-900/30' : 'bg-red-50'
                      }`}>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
                              Recovery Probability:
                            </span>
                            <span className={`text-sm font-bold ${recovery.color}`}>
                              {recovery.percent}% - {recovery.label}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>
                              Needs to Gain:
                            </span>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-red-200' : 'text-red-900'}`}>
                              +{breakEven.toFixed(0)}% to break even
                            </span>
                          </div>
                          <div className={`mt-3 p-3 rounded-lg ${
                            isDarkMode ? 'bg-red-800/50' : 'bg-red-100'
                          }`}>
                            <p className={`text-xs font-bold ${isDarkMode ? 'text-red-200' : 'text-red-900'}`}>
                              ⚠️ RECOMMENDATION: Sell today and redeploy capital into next momentum trade
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {category.action === 'monitor' && (
                      <div className={`p-4 rounded-lg mb-3 ${
                        isDarkMode ? 'bg-orange-900/30' : 'bg-orange-50'
                      }`}>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className={`text-sm font-semibold ${isDarkMode ? 'text-orange-300' : 'text-orange-800'}`}>
                              Hard Exit Price (-8% more):
                            </span>
                            <span className={`text-sm font-bold ${isDarkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                              {formatCurrency(exitPrice)}
                            </span>
                          </div>
                          <div className={`mt-3 p-3 rounded-lg ${
                            isDarkMode ? 'bg-orange-800/50' : 'bg-orange-100'
                          }`}>
                            <p className={`text-xs font-bold ${isDarkMode ? 'text-orange-200' : 'text-orange-900'}`}>
                              ⚠️ RULE: If price drops to {formatCurrency(exitPrice)}, sell immediately within 5 minutes
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {category.action === 'hold' && position.unrealizedPnLPercent < 0 && (
                      <div className={`p-4 rounded-lg mb-3 ${
                        isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                      }`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-semibold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                            Stop-Loss Alert Price:
                          </span>
                          <span className={`text-sm font-bold ${isDarkMode ? 'text-blue-200' : 'text-blue-900'}`}>
                            {formatCurrency(position.price * 0.92)} (-8% from entry)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`p-6 text-center rounded-xl ${category.bgColor}`}>
              <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                No positions in this category
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
