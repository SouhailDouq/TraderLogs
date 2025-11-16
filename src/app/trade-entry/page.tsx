'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTradeStore } from '@/utils/store';
import { formatCurrency } from '@/utils/formatters';
import GamePlanModal, { GamePlan } from '@/components/GamePlanModal';
import GamePlanDisplay from '@/components/GamePlanDisplay';

export default function TradeEntryPage() {
  const isDarkMode = useDarkMode();
  const { addTrade } = useTradeStore();
  
  const [formData, setFormData] = useState({
    symbol: '',
    side: 'long' as 'long' | 'short',
    quantity: '',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    strategy: 'Momentum Breakout',
    notes: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    orderType: 'take-profit' as 'take-profit' | 'stop-loss' | 'manual'
  });

  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [marketStatus, setMarketStatus] = useState<'premarket' | 'open' | 'closed'>('closed');
  const [quickFillData, setQuickFillData] = useState<any>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [showGamePlan, setShowGamePlan] = useState(false);
  const [gamePlan, setGamePlan] = useState<GamePlan | null>(null);

  // Check market status on component mount
  useEffect(() => {
    const checkMarketStatus = () => {
      const now = new Date();
      const estTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      const hour = estTime.getHours();
      const minutes = estTime.getMinutes();
      const currentTime = hour * 60 + minutes;
      
      if (currentTime >= 240 && currentTime < 570) { // 4:00 AM - 9:30 AM EST
        setMarketStatus('premarket');
      } else if (currentTime >= 570 && currentTime < 960) { // 9:30 AM - 4:00 PM EST
        setMarketStatus('open');
      } else {
        setMarketStatus('closed');
      }
    };
    
    checkMarketStatus();
    const interval = setInterval(checkMarketStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch live price when symbol changes
  useEffect(() => {
    if (formData.symbol && formData.symbol.length >= 2) {
      fetchLivePrice(formData.symbol);
    }
  }, [formData.symbol]);

  const fetchLivePrice = async (symbol: string) => {
    setPriceLoading(true);
    try {
      const response = await fetch(`/api/stock-data?symbol=${symbol}`);
      const data = await response.json();
      if (data.price) {
        setLivePrice(data.price);
        // Auto-fill entry price if empty
        if (!formData.entryPrice) {
          setFormData(prev => ({ ...prev, entryPrice: data.price.toString() }));
        }
      }
    } catch (error) {
      console.error('Error fetching live price:', error);
    }
    setPriceLoading(false);
  };

  const calculateMomentumTargets = () => {
    const entry = parseFloat(formData.entryPrice);
    if (!entry) return { target15: 0, target8: 0, target3: 0 };
    
    return {
      target15: entry * 1.15, // 15% target
      target8: entry * 1.08,   // 8% target
      target3: entry * 1.03    // 3% target
    };
  };

  const quickFillMomentumData = () => {
    if (!quickFillData) return;
    
    const { target15 } = calculateMomentumTargets();
    setFormData(prev => ({
      ...prev,
      symbol: quickFillData.symbol,
      entryPrice: quickFillData.price.toString(),
      takeProfit: target15.toString(),
      strategy: 'Momentum Breakout',
      notes: `Premarket momentum play - Volume: ${quickFillData.volume?.toLocaleString() || 'N/A'}, Rel Vol: ${quickFillData.relativeVolume || 'N/A'}x`
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculatePositionSize = () => {
    const price = parseFloat(formData.entryPrice);
    const stop = parseFloat(formData.stopLoss);
    const qty = parseFloat(formData.quantity);
    
    if (price && stop && qty) {
      const risk = Math.abs(price - stop) * qty;
      const positionValue = price * qty;
      return { risk, positionValue };
    }
    return { risk: 0, positionValue: 0 };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const trade = {
        id: Date.now().toString(),
        symbol: formData.symbol.toUpperCase(),
        type: 'BUY', // Required by Trade interface
        price: parseFloat(formData.entryPrice), // Required by Trade interface
        side: formData.side,
        quantity: parseFloat(formData.quantity),
        entryPrice: parseFloat(formData.entryPrice),
        stopLoss: parseFloat(formData.stopLoss),
        takeProfit: parseFloat(formData.takeProfit),
        strategy: formData.strategy,
        notes: formData.notes,
        date: formData.date,
        time: formData.time,
        isOpen: true,
        profitLoss: 0,
        gamePlan: gamePlan || undefined,
        createdAt: new Date().toISOString()
      };

      addTrade(trade);
      setSubmitMessage('Trade entered successfully!');
      
      // Reset form
      setFormData({
        symbol: '',
        side: 'long',
        quantity: '',
        entryPrice: '',
        stopLoss: '',
        takeProfit: '',
        strategy: 'Momentum Breakout',
        notes: '',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        orderType: 'take-profit'
      });
      setGamePlan(null);
      
      setTimeout(() => setSubmitMessage(''), 3000);
    } catch (error) {
      setSubmitMessage('Error entering trade. Please try again.');
      setTimeout(() => setSubmitMessage(''), 3000);
    }
    
    setIsSubmitting(false);
  };

  const { risk, positionValue } = calculatePositionSize();

  return (
    <div className={`min-h-screen transition-colors ${
      isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h1 className={`text-3xl font-bold transition-colors ${
                isDarkMode ? 'text-slate-100' : 'text-slate-900'
              }`}>
                Trade Entry
              </h1>
              <p className={`text-base transition-colors ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>
                Execute your momentum trading strategy
              </p>
            </div>
          </div>
        </div>

        {submitMessage && (
          <div className={`mb-6 p-4 rounded-2xl border transition-all duration-300 ${
            submitMessage.includes('Error') 
              ? 'bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-500/10 dark:to-red-600/5 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30' 
              : 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-500/10 dark:to-green-600/5 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30'
          }`}>
            <div className="flex items-center gap-2">
              {submitMessage.includes('Error') ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className="font-medium">{submitMessage}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Trade Entry Form */}
          <div className="lg:col-span-2">
            <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
            }`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className={`text-xl font-bold transition-colors ${
            isDarkMode ? 'text-slate-100' : 'text-slate-900'
          }`}>
                    Enter Trade
                  </h2>
                </div>
                <div className={`px-4 py-2 rounded-2xl text-sm font-semibold shadow-lg transition-all duration-300 ${
                  marketStatus === 'premarket' ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' :
                  marketStatus === 'open' ? 'bg-gradient-to-br from-green-500 to-green-600 text-white' :
                  'bg-gradient-to-br from-gray-500 to-gray-600 text-white'
                }`}>
                  {marketStatus === 'premarket' ? '🌅 Premarket' :
                   marketStatus === 'open' ? '🔔 Market Open' : '🌙 Market Closed'}
                </div>
              </div>

              {/* Quick Fill from Scanner */}
              {marketStatus === 'premarket' && (
                <div className={`mb-6 p-4 rounded-2xl border-2 border-dashed transition-all duration-300 ${
                  isDarkMode ? 'border-gray-600/50 bg-gradient-to-br from-gray-700/50 to-gray-800/30' : 'border-gray-300/50 bg-gradient-to-br from-gray-50/50 to-gray-100/30'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <h4 className={`text-sm font-semibold ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Quick Fill from Scanner
                    </h4>
                  </div>
                  <p className={`text-xs mb-3 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Paste candidate data to auto-fill form
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Symbol (e.g., PLTR)"
                      className={`flex-1 px-2 py-1 text-sm border rounded ${
                        isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white'
                      }`}
                      onChange={(e) => setQuickFillData((prev: any) => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    />
                    <input
                      type="number"
                      placeholder="Price"
                      step="0.01"
                      className={`w-20 px-2 py-1 text-sm border rounded ${
                        isDarkMode ? 'border-gray-600 bg-gray-800 text-white' : 'border-gray-300 bg-white'
                      }`}
                      onChange={(e) => setQuickFillData((prev: any) => ({ ...prev, price: parseFloat(e.target.value) }))}
                    />
                    <button
                      type="button"
                      onClick={quickFillMomentumData}
                      disabled={!quickFillData?.symbol || !quickFillData?.price}
                      className="px-4 py-2 text-xs font-semibold bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl hover:scale-105 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 disabled:scale-100 shadow-lg"
                    >
                      Fill
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Symbol and Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Symbol *
                      {livePrice && (
                        <span className={`ml-2 text-xs font-normal ${
                          isDarkMode ? 'text-green-400' : 'text-green-600'
                        }`}>
                          Live: ${livePrice.toFixed(2)}
                        </span>
                      )}
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        name="symbol"
                        value={formData.symbol}
                        onChange={handleInputChange}
                        placeholder="e.g., PLTR, SOFI"
                        required
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                          isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                        }`}
                      />
                      {priceLoading && (
                        <div className="absolute right-3 top-2.5">
                          <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Side *
                    </label>
                    <select
                      name="side"
                      value={formData.side}
                      onChange={handleInputChange}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    >
                      <option value="long">Long</option>
                      <option value="short">Short</option>
                    </select>
                  </div>
                </div>

                {/* Quantity and Entry Price */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Quantity *
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      placeholder="100"
                      required
                      min="1"
                      step="1"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Entry Price *
                    </label>
                    <input
                      type="number"
                      name="entryPrice"
                      value={formData.entryPrice}
                      onChange={handleInputChange}
                      placeholder="150.00"
                      required
                      min="0"
                      step="0.01"
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                          : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Trading 212 Order Type Selection */}
                <div className="mb-4">
                  <label className={`block text-sm font-medium mb-2 transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Order Type *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'take-profit', label: 'Take Profit Only', icon: '🎯' },
                      { value: 'stop-loss', label: 'Stop Loss Only', icon: '🛡️' },
                      { value: 'manual', label: 'Manual Exit', icon: '👁️' }
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, orderType: option.value as any }))}
                        className={`p-3 text-xs font-medium rounded-lg border-2 transition-all ${
                          formData.orderType === option.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : isDarkMode
                              ? 'border-gray-600 bg-gray-700 text-gray-300 hover:border-gray-500'
                              : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-center">
                          <div className="text-lg mb-1">{option.icon}</div>
                          <div>{option.label}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className={`text-xs mt-2 ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    ⚠️ Platform limitation: Cannot set both take-profit AND stop-loss simultaneously
                  </p>
                </div>

                {/* Momentum Target Buttons */}
                {formData.entryPrice && (
                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      🎯 Quick Targets
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {[
                        { percent: 3, label: '3%', color: 'green' },
                        { percent: 8, label: '8%', color: 'blue' },
                        { percent: 15, label: '15%', color: 'purple' }
                      ].map((target) => {
                        const targetPrice = parseFloat(formData.entryPrice) * (1 + target.percent / 100);
                        return (
                          <button
                            key={target.percent}
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, takeProfit: targetPrice.toFixed(2) }))}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                              target.color === 'green' ? 'bg-green-100 text-green-700 hover:bg-green-200' :
                              target.color === 'blue' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                              'bg-purple-100 text-purple-700 hover:bg-purple-200'
                            }`}
                          >
                            {target.label} (${targetPrice.toFixed(2)})
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Stop Loss and Take Profit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Stop Loss
                      {formData.orderType === 'take-profit' && (
                        <span className={`ml-2 text-xs ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          (Manual monitoring)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="stopLoss"
                      value={formData.stopLoss}
                      onChange={handleInputChange}
                      placeholder="Manual exit level"
                      min="0"
                      step="0.01"
                      disabled={formData.orderType === 'take-profit'}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        formData.orderType === 'take-profit'
                          ? isDarkMode ? 'border-gray-600 bg-gray-600 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-500'
                          : isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Take Profit
                      {formData.orderType === 'stop-loss' && (
                        <span className={`ml-2 text-xs ${
                          isDarkMode ? 'text-blue-400' : 'text-blue-600'
                        }`}>
                          (Manual monitoring)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      name="takeProfit"
                      value={formData.takeProfit}
                      onChange={handleInputChange}
                      placeholder="Target exit price"
                      min="0"
                      step="0.01"
                      disabled={formData.orderType === 'stop-loss'}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        formData.orderType === 'stop-loss'
                          ? isDarkMode ? 'border-gray-600 bg-gray-600 text-gray-400' : 'border-gray-200 bg-gray-100 text-gray-500'
                          : isDarkMode
                            ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                            : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                      }`}
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Date *
                    </label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-2 transition-colors ${
                      isDarkMode ? 'text-gray-200' : 'text-gray-700'
                    }`}>
                      Time *
                    </label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                        isDarkMode
                          ? 'border-gray-600 bg-gray-700 text-white'
                          : 'border-gray-300 bg-white text-gray-900'
                      }`}
                    />
                  </div>
                </div>

                {/* Strategy with Presets */}
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Strategy
                  </label>
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {['Momentum Breakout', 'Premarket Gap', 'Volume Spike', 'News Catalyst'].map((strategy) => (
                      <button
                        key={strategy}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, strategy }))}
                        className={`px-2 py-1 text-xs rounded-lg transition-colors ${
                          formData.strategy === strategy
                            ? 'bg-blue-600 text-white'
                            : isDarkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {strategy}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    name="strategy"
                    value={formData.strategy}
                    onChange={handleInputChange}
                    placeholder="Custom strategy or select preset above"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className={`block text-sm font-medium mb-2 transition-colors ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Trade rationale, market conditions, etc."
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors ${
                      isDarkMode
                        ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                        : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>

                {/* Game Plan Section */}
                <div className={`p-4 rounded-xl border-2 ${
                  gamePlan 
                    ? isDarkMode ? 'border-green-500/30 bg-green-500/10' : 'border-green-200 bg-green-50'
                    : isDarkMode ? 'border-blue-500/30 bg-blue-500/10' : 'border-blue-200 bg-blue-50'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">📋</span>
                      <div>
                        <h4 className={`font-semibold ${
                          isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          Game Plan
                        </h4>
                        <p className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {gamePlan ? 'Plan ready' : 'Define your trading strategy'}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowGamePlan(true)}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${
                        gamePlan
                          ? isDarkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          : 'bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:scale-105 shadow-lg'
                      }`}
                    >
                      {gamePlan ? 'Edit Plan' : 'Create Plan'}
                    </button>
                  </div>
                  {gamePlan && (
                    <GamePlanDisplay gamePlan={gamePlan} compact />
                  )}
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full px-4 py-3 text-white font-medium rounded-lg transition-colors ${
                    isSubmitting
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  {isSubmitting ? 'Entering Trade...' : 'Execute Trade'}
                </button>
              </form>
            </div>
          </div>

          {/* Position Summary & Momentum Analysis */}
          <div className="lg:col-span-1 space-y-6">
            {/* Position Summary */}
            <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
            }`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className={`text-lg font-bold transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Position Summary
                </h3>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`text-sm transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Position Value:
                  </span>
                  <span className={`font-medium transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formatCurrency(positionValue)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className={`text-sm transition-colors ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}>
                    Risk Amount:
                  </span>
                  <span className={`font-medium ${
                    risk > 0 ? 'text-red-600' : isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {formatCurrency(risk)}
                  </span>
                </div>

                {positionValue > 0 && risk > 0 && (
                  <div className="flex justify-between items-center">
                    <span className={`text-sm transition-colors ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      Risk %:
                    </span>
                    <span className={`font-medium ${
                      (risk / positionValue) * 100 > 2 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {((risk / positionValue) * 100).toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>

              {risk > 0 && positionValue > 0 && (
                <div className={`mt-4 p-3 rounded-lg ${
                  (risk / positionValue) * 100 > 2
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-green-50 border border-green-200'
                }`}>
                  <p className={`text-sm ${
                    (risk / positionValue) * 100 > 2 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    {(risk / positionValue) * 100 > 2
                      ? '⚠️ High risk position (>2%)'
                      : '✅ Risk within acceptable range'}
                  </p>
                </div>
              )}
            </div>

            {/* Momentum Analysis */}
            {formData.entryPrice && (
              <div className={`rounded-2xl shadow-lg border p-6 transition-all duration-300 backdrop-blur-sm ${
                isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
              }`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h3 className={`text-lg font-bold transition-colors ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    Price Targets
                  </h3>
                </div>
                
                <div className="space-y-3">
                  {[
                    { percent: 3, label: 'Conservative', color: 'green', profit: parseFloat(formData.entryPrice) * 0.03 * parseFloat(formData.quantity || '0') },
                    { percent: 8, label: 'Moderate', color: 'blue', profit: parseFloat(formData.entryPrice) * 0.08 * parseFloat(formData.quantity || '0') },
                    { percent: 15, label: 'Aggressive', color: 'purple', profit: parseFloat(formData.entryPrice) * 0.15 * parseFloat(formData.quantity || '0') }
                  ].map((target) => {
                    const targetPrice = parseFloat(formData.entryPrice) * (1 + target.percent / 100);
                    return (
                      <div key={target.percent} className={`flex justify-between items-center p-3 rounded-2xl transition-all duration-300 hover:scale-[1.02] ${
                        target.color === 'green' ? 'bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-500/10 dark:to-green-600/5 border border-green-200 dark:border-green-500/30' :
                        target.color === 'blue' ? 'bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-500/10 dark:to-blue-600/5 border border-blue-200 dark:border-blue-500/30' : 
                        'bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-500/10 dark:to-purple-600/5 border border-purple-200 dark:border-purple-500/30'
                      }`}>
                        <div>
                          <span className={`text-sm font-semibold ${
                            target.color === 'green' ? 'text-green-700 dark:text-green-400' :
                            target.color === 'blue' ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'
                          }`}>
                            {target.label} ({target.percent}%)
                          </span>
                          <div className={`text-xs font-medium ${
                            target.color === 'green' ? 'text-green-600 dark:text-green-500' :
                            target.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                          }`}>
                            ${targetPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className={`text-sm font-bold ${
                          target.color === 'green' ? 'text-green-700 dark:text-green-400' :
                          target.color === 'blue' ? 'text-blue-700 dark:text-blue-400' : 'text-purple-700 dark:text-purple-400'
                        }`}>
                          +{formatCurrency(target.profit)}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {marketStatus === 'premarket' && (
                  <div className={`mt-4 p-3 rounded-lg ${
                    isDarkMode ? 'bg-orange-900/20 border border-orange-700' : 'bg-orange-50 border border-orange-200'
                  }`}>
                    <p className={`text-xs ${
                      isDarkMode ? 'text-orange-300' : 'text-orange-700'
                    }`}>
                      🌅 <strong>Premarket Strategy:</strong> Target 15% gains by market open (9:30 AM EST). Best entry window: 9-11 AM France time.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Trading 212 Reminder */}
            <div className={`rounded-2xl shadow-lg border p-4 transition-all duration-300 backdrop-blur-sm ${
              isDarkMode ? 'bg-gray-800/90 border-gray-700/50' : 'bg-white/90 border-gray-200/50'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h4 className={`text-sm font-bold transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  Trading 212 Workflow
                </h4>
              </div>
              <div className="space-y-2 text-xs">
                <div className={`flex items-center gap-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <span className="text-green-500">✓</span>
                  <span>Place {formData.orderType === 'take-profit' ? 'take-profit' : formData.orderType === 'stop-loss' ? 'stop-loss' : 'market'} order</span>
                </div>
                <div className={`flex items-center gap-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <span className="text-yellow-500">⚠️</span>
                  <span>Monitor {formData.orderType === 'take-profit' ? 'stop-loss' : 'take-profit'} manually</span>
                </div>
                <div className={`flex items-center gap-2 ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-600'
                }`}>
                  <span className="text-blue-500">💡</span>
                  <span>Hold until green strategy (no stop-loss orders)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Game Plan Modal */}
      <GamePlanModal
        isOpen={showGamePlan}
        onClose={() => setShowGamePlan(false)}
        onSave={(plan) => setGamePlan(plan)}
        initialData={gamePlan || undefined}
        stockSymbol={formData.symbol}
        stockPrice={livePrice || parseFloat(formData.entryPrice) || undefined}
      />
    </div>
  );
}
