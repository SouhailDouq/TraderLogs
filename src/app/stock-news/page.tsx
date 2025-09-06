'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useDarkMode } from '@/hooks/useDarkMode';
import StockNewsCard from '@/components/News/StockNewsCard';
import StockNewsSummary from '@/components/News/StockNewsSummary';
import { EODHDNewsItem } from '@/utils/eodhd';

export default function StockNewsPage() {
  const isDarkMode = useDarkMode();
  const searchParams = useSearchParams();
  const symbol = searchParams.get('symbol');
  
  const [news, setNews] = useState<EODHDNewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (symbol) {
      fetchNews();
    }
  }, [symbol]);

  const fetchNews = async () => {
    if (!symbol) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stock-news?symbol=${symbol}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch news');
      
      const data = await response.json();
      setNews(data.news || []);
    } catch (error) {
      console.error('Error fetching news:', error);
      setError('Failed to load news articles');
    } finally {
      setIsLoading(false);
    }
  };

  if (!symbol) {
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Stock News</h1>
            <p className="text-gray-500">No symbol specified</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">
                📰 News for {symbol.toUpperCase()}
              </h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Latest news articles and market catalysts
              </p>
            </div>
            <button
              onClick={() => window.history.back()}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
              }`}
            >
              ← Back
            </button>
          </div>
        </div>

        {/* News Summary */}
        <div className="mb-8">
          <StockNewsSummary news={news} symbol={symbol} />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3 text-lg">Loading news...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className={`p-6 rounded-lg border ${
            isDarkMode ? 'bg-red-900/20 border-red-700 text-red-200' : 'bg-red-50 border-red-300 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <h4 className="font-bold text-lg">Error Loading News</h4>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
            <button
              onClick={fetchNews}
              className={`mt-4 px-4 py-2 rounded-lg font-medium transition-colors ${
                isDarkMode 
                  ? 'bg-red-700 hover:bg-red-600 text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* News Articles */}
        {!isLoading && !error && news.length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold mb-4">Recent Articles</h2>
            {news.map((article, index) => (
              <StockNewsCard key={index} newsItem={article} />
            ))}
          </div>
        )}

        {/* No News State */}
        {!isLoading && !error && news.length === 0 && (
          <div className={`p-8 rounded-lg border text-center ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="text-6xl mb-4">📰</div>
            <h3 className="text-xl font-bold mb-2">No News Available</h3>
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              No recent news articles found for {symbol.toUpperCase()}
            </p>
            <button
              onClick={fetchNews}
              className="mt-4 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              🔄 Refresh
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
