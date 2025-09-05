'use client';

import { useState, useEffect } from 'react';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useTradeStore } from '@/utils/store';
import { formatCurrency } from '@/utils/formatters';

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
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold transition-colors ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            ⚡ Trade Entry
          </h1>
          <p className={`mt-2 text-sm sm:text-base transition-colors ${
            isDarkMode ? 'text-gray-300' : 'text-gray-600'
          }`}>
            Enter your trade details and manage your position
          </p>
        </div>

        {submitMessage && (
          <div className={`mb-6 p-4 rounded-lg ${
            submitMessage.includes('Error') 
              ? 'bg-red-100 text-red-700 border border-red-200' 
              : 'bg-green-100 text-green-700 border border-green-200'
          }`}>
            {submitMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Trade Entry Form */}
          <div className="lg:col-span-2">
            <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <div className="flex justify-between items-center mb-4 sm:mb-6">
                <h2 className={`text-lg sm:text-xl font-semibold transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  🚀 Trade Entry
                </h2>
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  marketStatus === 'premarket' ? 'bg-orange-100 text-orange-800' :
                  marketStatus === 'open' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {marketStatus === 'premarket' ? '🌅 Premarket' :
                   marketStatus === 'open' ? '🔔 Market Open' : '🌙 Market Closed'}
                </div>
              </div>

              {/* Quick Fill from Scanner */}
              {marketStatus === 'premarket' && (
                <div className={`mb-6 p-4 rounded-lg border-2 border-dashed ${
                  isDarkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'
                }`}>
                  <h4 className={`text-sm font-medium mb-2 ${
                    isDarkMode ? 'text-gray-200' : 'text-gray-700'
                  }`}>
                    💡 Quick Fill from Scanner
                  </h4>
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
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
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
            <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                💰 Position Summary
              </h3>

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
              <div className={`rounded-lg shadow-sm border p-4 sm:p-6 transition-colors ${
                isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <h3 className={`text-lg font-semibold mb-4 transition-colors ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  📈 Price Targets
                </h3>
                
                <div className="space-y-3">
                  {[
                    { percent: 3, label: 'Conservative', color: 'green', profit: parseFloat(formData.entryPrice) * 0.03 * parseFloat(formData.quantity || '0') },
                    { percent: 8, label: 'Moderate', color: 'blue', profit: parseFloat(formData.entryPrice) * 0.08 * parseFloat(formData.quantity || '0') },
                    { percent: 15, label: 'Aggressive', color: 'purple', profit: parseFloat(formData.entryPrice) * 0.15 * parseFloat(formData.quantity || '0') }
                  ].map((target) => {
                    const targetPrice = parseFloat(formData.entryPrice) * (1 + target.percent / 100);
                    return (
                      <div key={target.percent} className={`flex justify-between items-center p-2 rounded ${
                        target.color === 'green' ? 'bg-green-50' :
                        target.color === 'blue' ? 'bg-blue-50' : 'bg-purple-50'
                      }`}>
                        <div>
                          <span className={`text-sm font-medium ${
                            target.color === 'green' ? 'text-green-700' :
                            target.color === 'blue' ? 'text-blue-700' : 'text-purple-700'
                          }`}>
                            {target.label} ({target.percent}%)
                          </span>
                          <div className={`text-xs ${
                            target.color === 'green' ? 'text-green-600' :
                            target.color === 'blue' ? 'text-blue-600' : 'text-purple-600'
                          }`}>
                            ${targetPrice.toFixed(2)}
                          </div>
                        </div>
                        <div className={`text-sm font-medium ${
                          target.color === 'green' ? 'text-green-700' :
                          target.color === 'blue' ? 'text-blue-700' : 'text-purple-700'
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
            <div className={`rounded-lg shadow-sm border p-4 transition-colors ${
              isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
            }`}>
              <h4 className={`text-sm font-semibold mb-2 transition-colors ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                🏦 Trading 212 Workflow
              </h4>
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
    </div>
  );
}
