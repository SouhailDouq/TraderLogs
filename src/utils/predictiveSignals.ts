// Predictive setup signals for near-term breakouts (1-5 days)
// Uses only daily historical data + simple technicals to avoid heavy intraday load

import { alpaca } from '@/utils/alpaca'

// Simple in-memory cache for SPY historical data to reduce API calls (15-minute TTL)
let spyCache: { data: any[]; fetchedAt: number; from: string; to: string } | null = null;
const SPY_TTL_MS = 15 * 60 * 1000;

async function getSpyHistorical(from: string, to: string): Promise<any[]> {
  const now = Date.now();
  if (
    spyCache &&
    now - spyCache.fetchedAt < SPY_TTL_MS &&
    spyCache.from <= from &&
    spyCache.to >= to &&
    Array.isArray(spyCache.data) &&
    spyCache.data.length > 0
  ) {
    console.log('🔁 Using cached SPY historical data (TTL 15m)');
    return spyCache.data;
  }
  console.log('📦 Fetching fresh SPY historical data from Alpaca...');
  const bars = await alpaca.getHistoricalBars('SPY', '1Day', from, to, 200);
  // Convert Alpaca format to expected format
  const data = bars.map(bar => ({
    date: new Date(bar.t).toISOString().split('T')[0],
    close: bar.c,
    high: bar.h,
    low: bar.l,
    open: bar.o,
    volume: bar.v
  }));
  spyCache = { data: Array.isArray(data) ? data : [], fetchedAt: now, from, to };
  return spyCache.data;
}

export interface PredictiveSetup {
  setupScore: number; // 0-25
  components: {
    baseTightness: number;      // 0-6
    rsTrend: number;            // 0-6
    proximityToHigh: number;    // 0-6 (20-day high proximity)
    volumeDryUp: number;        // 0-4 (5d avg vs 30d avg)
    atrContraction: number;     // 0-3 (ATR14 vs ATR30)
  };
  notes: string[];
  flags: {
    tightBase: boolean;
    rsUptrend: boolean;
    nearPivot: boolean;
    dryUpVolume: boolean;
    atrContracting: boolean;
  };
}

function pct(a: number, b: number): number {
  if (!a || !b) return 0;
  return (a / b) * 100;
}

function stddev(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const variance = values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
}

function atrPercent(series: Array<{ high: number; low: number; close: number }>, period: number): number {
  if (series.length < period + 1) return 0;
  let sum = 0;
  for (let i = 1; i < Math.min(series.length, period + 1); i++) {
    const cur = series[i];
    const prev = series[i - 1];
    const tr1 = cur.high - cur.low;
    const tr2 = Math.abs(cur.high - prev.close);
    const tr3 = Math.abs(cur.low - prev.close);
    const tr = Math.max(tr1, tr2, tr3);
    sum += cur.close > 0 ? (tr / cur.close) * 100 : 0;
  }
  return sum / period;
}

export async function computePredictiveSignals(symbol: string): Promise<PredictiveSetup> {
  try {
    const to = new Date().toISOString().split('T')[0];
    const from = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Fetch symbol and SPY daily data (SPY fetched via cached helper)
    const [histBars, spy] = await Promise.all([
      alpaca.getHistoricalBars(symbol, '1Day', from, to, 200),
      getSpyHistorical(from, to)
    ]);
    
    // Convert Alpaca format to expected format
    const hist = histBars.map(bar => ({
      date: new Date(bar.t).toISOString().split('T')[0],
      close: bar.c,
      high: bar.h,
      low: bar.l,
      open: bar.o,
      volume: bar.v
    }));

    if (!hist || hist.length < 40) {
      return {
        setupScore: 0,
        components: { baseTightness: 0, rsTrend: 0, proximityToHigh: 0, volumeDryUp: 0, atrContraction: 0 },
        notes: ['Insufficient historical data'],
        flags: { tightBase: false, rsUptrend: false, nearPivot: false, dryUpVolume: false, atrContracting: false }
      };
    }

    // Order: assume API returns newest first or last? eodhd often returns newest first for technicals, but EOD endpoint typically returns sorted desc? We'll sort by date asc to be safe.
    const byDateAsc = [...hist].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const closes = byDateAsc.map((d: any) => d.close);

    const last = byDateAsc[byDateAsc.length - 1];
    const currentClose = last.close;

    // 20-day high proximity
    const window20 = byDateAsc.slice(-20);
    const high20 = Math.max(...window20.map((d: any) => d.high));
    const proximityToHighPct = high20 > 0 ? pct(currentClose, high20) : 0;

    let proximityScore = 0;
    if (proximityToHighPct >= 98) proximityScore = 6;
    else if (proximityToHighPct >= 95) proximityScore = 5;
    else if (proximityToHighPct >= 92) proximityScore = 4;
    else if (proximityToHighPct >= 88) proximityScore = 3;
    else if (proximityToHighPct >= 85) proximityScore = 2;
    else if (proximityToHighPct >= 80) proximityScore = 1;

    // Base tightness: 5-day percentage range and realized vol
    const window5 = byDateAsc.slice(-5);
    const high5 = Math.max(...window5.map((d: any) => d.high));
    const low5 = Math.min(...window5.map((d: any) => d.low));
    const range5Pct = currentClose > 0 ? ((high5 - low5) / currentClose) * 100 : 0;

    const dailyRet = byDateAsc.slice(-15).map((d: any, i, arr) => (i === 0 ? 0 : ((d.close - arr[i - 1].close) / arr[i - 1].close) * 100)).slice(1);
    const realizedVol = stddev(dailyRet); // in %

    let baseTightness = 0;
    if (range5Pct <= 4 && realizedVol <= 2.5) baseTightness = 6;
    else if (range5Pct <= 6 && realizedVol <= 3.5) baseTightness = 4;
    else if (range5Pct <= 8 && realizedVol <= 4.5) baseTightness = 2;

    // RS vs SPY slope over last 10 days
    let rsScore = 0;
    if (spy && spy.length >= 15) {
      const spyAsc = [...spy].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const tail = Math.min(byDateAsc.length, spyAsc.length);
      const symTail = byDateAsc.slice(-tail);
      const spyTail = spyAsc.slice(-tail);

      const rsSeries: number[] = [];
      for (let i = 0; i < Math.min(20, tail); i++) {
        const s = symTail[tail - 1 - i].close;
        const m = spyTail[tail - 1 - i].close;
        if (s > 0 && m > 0) rsSeries.unshift(s / m);
      }

      if (rsSeries.length >= 10) {
        const first = rsSeries[0];
        const lastRS = rsSeries[rsSeries.length - 1];
        const slope = lastRS - first;
        if (slope > 0.05 * first) rsScore = 6; // >5% RS improvement
        else if (slope > 0.02 * first) rsScore = 4;
        else if (slope > 0) rsScore = 2;
      }
    }

    // Volume dry-up: 5d avg vs 30d avg
    const avgVol30 = byDateAsc.slice(-30).reduce((s: number, d: any) => s + (d.volume || 0), 0) / Math.min(30, byDateAsc.length);
    const avgVol5 = byDateAsc.slice(-5).reduce((s: number, d: any) => s + (d.volume || 0), 0) / Math.min(5, byDateAsc.length);
    const volRatio = avgVol5 > 0 ? avgVol5 / (avgVol30 || 1) : 1;
    let volumeDryUp = 0;
    if (volRatio <= 0.6) volumeDryUp = 4;
    else if (volRatio <= 0.8) volumeDryUp = 2;

    // ATR contraction: ATR14 vs ATR30
    const ohlc = byDateAsc.map((d: any) => ({ high: d.high, low: d.low, close: d.close }));
    const atr14 = atrPercent(ohlc.slice(-15), 14);
    const atr30 = atrPercent(ohlc.slice(-31), 30) || atr14 || 0;
    const atrRatio = atr30 > 0 ? atr14 / atr30 : 1;
    let atrContraction = 0;
    if (atrRatio > 0 && atrRatio <= 0.7) atrContraction = 3;
    else if (atrRatio <= 0.85) atrContraction = 2;

    const setupScore = Math.min(25, baseTightness + rsScore + proximityScore + volumeDryUp + atrContraction);

    const notes: string[] = [];
    if (baseTightness >= 4) notes.push(`Tight base (${range5Pct.toFixed(1)}% / ${realizedVol.toFixed(1)}% RV)`);
    if (rsScore >= 4) notes.push('RS vs SPY rising');
    if (proximityScore >= 4) notes.push(`Near 20D high (${proximityToHighPct.toFixed(1)}%)`);
    if (volumeDryUp >= 2) notes.push(`Volume dry-up (5d/${30}d = ${(volRatio * 100).toFixed(0)}%)`);
    if (atrContraction >= 2) notes.push(`ATR contracting (${(atrRatio * 100).toFixed(0)}%)`);

    return {
      setupScore,
      components: {
        baseTightness,
        rsTrend: rsScore,
        proximityToHigh: proximityScore,
        volumeDryUp,
        atrContraction
      },
      notes,
      flags: {
        tightBase: baseTightness >= 4,
        rsUptrend: rsScore >= 4,
        nearPivot: proximityScore >= 4,
        dryUpVolume: volumeDryUp >= 2,
        atrContracting: atrContraction >= 2
      }
    };
  } catch (error) {
    console.error('Predictive signals failed:', error);
    return {
      setupScore: 0,
      components: { baseTightness: 0, rsTrend: 0, proximityToHigh: 0, volumeDryUp: 0, atrContraction: 0 },
      notes: ['Predictive analysis failed'],
      flags: { tightBase: false, rsUptrend: false, nearPivot: false, dryUpVolume: false, atrContracting: false }
    };
  }
}
