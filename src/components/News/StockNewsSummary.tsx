'use client';

import React from 'react';
import { EODHDNewsItem, summarizeNewsImpact, getSentimentLabel, getSentimentColor } from '@/utils/eodhd';

interface StockNewsSummaryProps {
  news: EODHDNewsItem[];
  symbol?: string;
}

export default function StockNewsSummary({ news, symbol }: StockNewsSummaryProps) {
  const { overallSentiment, highImpactCount, recentNewsCount, topCatalysts } = summarizeNewsImpact(news);
  const sentimentLabel = getSentimentLabel(overallSentiment);
  const sentimentColor = getSentimentColor(overallSentiment);

  if (news.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-2xl mb-2">📰</div>
          <p>No recent news available{symbol ? ` for ${symbol}` : ''}</p>
        </div>
      </div>
    );
  }

  const getImpactColor = (count: number) => {
    if (count >= 3) return 'text-red-600 dark:text-red-400';
    if (count >= 1) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getRecentColor = (count: number) => {
    if (count >= 3) return 'text-blue-600 dark:text-blue-400';
    if (count >= 1) return 'text-gray-600 dark:text-gray-400';
    return 'text-gray-500 dark:text-gray-500';
  };

  return (
    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-lg border border-blue-200 dark:border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          News Summary{symbol ? ` - ${symbol}` : ''}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {news.length} articles
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-2xl font-bold ${sentimentColor}`}>
            {sentimentLabel}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Overall Sentiment
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            {overallSentiment > 0 ? '+' : ''}{(overallSentiment * 100).toFixed(0)}%
          </div>
        </div>

        <div className="text-center">
          <div className={`text-2xl font-bold ${getImpactColor(highImpactCount)}`}>
            {highImpactCount}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            High Impact
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Catalysts
          </div>
        </div>

        <div className="text-center">
          <div className={`text-2xl font-bold ${getRecentColor(recentNewsCount)}`}>
            {recentNewsCount}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Recent News
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Last 24h
          </div>
        </div>

        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {topCatalysts.length}
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Categories
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-500">
            Active
          </div>
        </div>
      </div>

      {topCatalysts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Top Catalysts:
          </h4>
          <div className="flex flex-wrap gap-2">
            {topCatalysts.map((catalyst, index) => (
              <span
                key={index}
                className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full"
              >
                {catalyst}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Trading Insight */}
      <div className="mt-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">💡</span>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Trading Insight
          </span>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {highImpactCount > 0 && overallSentiment > 0.3 
            ? "Strong bullish catalysts detected. Consider momentum entry if technical setup aligns."
            : highImpactCount > 0 && overallSentiment < -0.3
            ? "Negative catalysts present. Exercise caution and consider risk management."
            : recentNewsCount > 2
            ? "High news activity. Monitor for volatility and volume spikes."
            : "Limited news activity. Focus on technical analysis for entry signals."
          }
        </p>
      </div>
    </div>
  );
}
