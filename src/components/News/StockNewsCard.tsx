'use client';

import React from 'react';
import { EODHDNewsItem, getSentimentLabel, getSentimentColor, categorizeNewsByTags, getNewsFreshness } from '@/utils/eodhd';

interface StockNewsCardProps {
  newsItem: EODHDNewsItem;
  compact?: boolean;
}

export default function StockNewsCard({ newsItem, compact = false }: StockNewsCardProps) {
  const { category, priority, icon } = categorizeNewsByTags(newsItem.tags);
  const { label: freshnessLabel, color: freshnessColor } = getNewsFreshness(newsItem.date);
  const sentimentLabel = getSentimentLabel(newsItem.sentiment.polarity);
  const sentimentColor = getSentimentColor(newsItem.sentiment.polarity);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const truncateContent = (content: string, maxLength: number) => {
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'High': return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'Medium': return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      default: return 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800';
    }
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border-l-4 ${getPriorityColor(priority)} mb-2`}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{icon}</span>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {category}
              </span>
              <span className={`text-xs font-medium ${freshnessColor}`}>
                {freshnessLabel}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-white line-clamp-2">
              {newsItem.title}
            </h4>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {formatDate(newsItem.date)}
              </span>
              <span className={`text-xs font-medium ${sentimentColor}`}>
                {sentimentLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-lg border ${getPriorityColor(priority)} mb-4`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {category}
            </span>
            <span className={`ml-2 text-sm font-medium ${freshnessColor}`}>
              {freshnessLabel}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-sm font-medium ${sentimentColor}`}>
            {sentimentLabel}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {formatDate(newsItem.date)}
          </div>
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        {newsItem.title}
      </h3>

      <p className="text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
        {truncateContent(newsItem.content, 200)}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {newsItem.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded"
            >
              {tag.toLowerCase()}
            </span>
          ))}
          {newsItem.tags.length > 3 && (
            <span className="px-2 py-1 text-xs text-gray-500 dark:text-gray-400">
              +{newsItem.tags.length - 3} more
            </span>
          )}
        </div>
        
        <a
          href={newsItem.link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
        >
          Read Full Article →
        </a>
      </div>
    </div>
  );
}
