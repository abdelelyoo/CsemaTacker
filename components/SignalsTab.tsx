import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, CheckCircle, Clock, BarChart3, ArrowUp, ArrowDown, RefreshCw, Info, Filter, Activity, AlertTriangle, Zap, Volume2, ChevronUp, ChevronDown } from 'lucide-react';

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'localhost' 
  ? 'http://localhost:3001' 
  : '';

interface Signal {
  type: 'bullish' | 'bearish' | 'neutral';
  message: string;
  strength: number;
  indicator: string;
}

interface StockSignal {
  ticker: string;
  name: string;
  price: number;
  change: number;
  signals: Signal[];
  rsi_14?: number;
  sma_50?: number;
  sma_200?: number;
  bull_score?: number;
  bear_score?: number;
  conviction?: string;
  perfect_entry?: string | null;
  quality_score?: number;
  quality_grade?: string;
  is_liquid?: boolean;
  rvol?: number;
  bb_position?: number;
  relative_rsi?: number;
  is_squeeze?: boolean;
  isLivePrice?: boolean;
  tech_rating?: number;
}

type SignalType = 'all' | 'rsi' | 'sma_cross' | 'macd' | 'bollinger' | 'volume' | 'tech_rating' | 'pullback';
type SortField = 'ticker' | 'price' | 'change' | 'rsi' | 'signals' | 'tech_rating';

export const SignalsTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [signals, setSignals] = useState<StockSignal[]>([]);
  const [regime, setRegime] = useState('mixed');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [signalType, setSignalType] = useState<SignalType>('all');
  const [filterSignal, setFilterSignal] = useState<'all' | 'bullish' | 'bearish'>('all');
  const [sortField, setSortField] = useState<SortField>('signals');
  const [sortAsc, setSortAsc] = useState(false);

  const fetchSignals = useCallback(async (isManual = false) => {
    if (isManual) setInitializing(true);
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/signals`);
      const data = await response.json();

      if (response.ok && data && data.success && data.signals && data.signals.length > 0) {
        const mappedSignals: StockSignal[] = data.signals.map((s: any) => ({
          ticker: s.ticker,
          name: s.name,
          price: s.price,
          change: s.change_percent,
          signals: (s.flags || []).map((f: string) => ({
            type: f.toLowerCase().includes('bear') || f.toLowerCase().includes('sell') ? 'bearish' : 'bullish',
            indicator: f,
            message: f,
            strength: 70
          })),
          rsi_14: s.technical?.rsi,
          sma_50: undefined,
          sma_200: undefined,
          bull_score: s.signal === 'STRONG_BUY' || s.signal === 'BUY' ? s.conviction : 0,
          bear_score: s.signal === 'STRONG_SELL' || s.signal === 'SELL' ? s.conviction : 0,
          conviction: s.signal,
          perfect_entry: s.technical?.trend === 'UPTREND' ? 'bullish trend' : null,
          quality_score: s.quality_score,
          quality_grade: s.quality_grade,
          is_liquid: true,
          rvol: undefined,
          bb_position: undefined,
          relative_rsi: undefined,
          is_squeeze: undefined,
          isLivePrice: true,
          tech_rating: s.quality_score
        }));
        setSignals(mappedSignals);
        setRegime(data.summary?.strong_buy_count > data.summary?.strong_sell_count ? 'bullish' : 'mixed');
        setLastUpdated(new Date(data.last_updated).toLocaleTimeString());
      } else {
        setError(data.error || 'Failed to load signals');
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Connection error. Is the server running?');
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  }, []);

  const triggerUpdate = useCallback(async () => {
    setInitializing(true);
    setError(null);
    try {
      // On Vercel, signals are generated on-demand, no trigger needed
      // On local, try to trigger if endpoint exists
      if (API_BASE) {
        try {
          await fetch(`${API_BASE}/api/trigger-signals`, { method: 'POST' });
        } catch (e) {
          // Ignore trigger errors on Vercel
        }
      }
      await fetchSignals();
    } catch (err) {
      setError('Failed to refresh signals.');
    } finally {
      setInitializing(false);
    }
  }, [fetchSignals]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const filteredAndSorted = useMemo(() => {
    let data = signals.filter(stock => {
      if (filterSignal === 'all') return true;
      if (filterSignal === 'bullish') return (stock.bull_score || 0) >= (stock.bear_score || 0);
      return (stock.bear_score || 0) > (stock.bull_score || 0);
    });

    if (signalType !== 'all') {
      data = data.filter(stock => {
        if (signalType === 'pullback') return !!stock.perfect_entry;
        return stock.signals.some(s => {
          const lower = s.indicator.toLowerCase();
          switch (signalType) {
            case 'rsi': return lower.includes('rsi');
            case 'sma_cross': return lower.includes('sma');
            case 'macd': return lower.includes('macd');
            case 'bollinger': return lower.includes('bb');
            case 'volume': return lower.includes('volume');
            case 'tech_rating': return lower.includes('tv rating');
            default: return true;
          }
        });
      });
    }

    data.sort((a, b) => {
      let aVal: number, bVal: number;
      switch (sortField) {
        case 'ticker': return sortAsc ? a.ticker.localeCompare(b.ticker) : b.ticker.localeCompare(a.ticker);
        case 'price': aVal = a.price || 0; bVal = b.price || 0; break;
        case 'change': aVal = a.change || 0; bVal = b.change || 0; break;
        case 'rsi': aVal = a.rsi_14 || 50; bVal = b.rsi_14 || 50; break;
        case 'signals': aVal = (a.bull_score || 0) + (a.bear_score || 0); bVal = (b.bull_score || 0) + (b.bear_score || 0); break;
        case 'tech_rating': aVal = a.quality_score || 0; bVal = b.quality_score || 0; break;
        default: aVal = 0; bVal = 0;
      }
      return sortAsc ? aVal - bVal : bVal - aVal;
    });

    return data;
  }, [signals, filterSignal, signalType, sortField, sortAsc]);

  const bullishCount = signals.filter(s => (s.bull_score || 0) >= 7).length;
  const bearishCount = signals.filter(s => (s.bear_score || 0) >= 7).length;
  const perfectEntries = signals.filter(s => s.perfect_entry).length;
  const illiquidCount = signals.filter(s => !s.is_liquid).length;

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const SortIcon: React.FC<{ field: SortField }> = ({ field }) => {
    if (sortField !== field) return null;
    return sortAsc ? <ChevronUp size={12} className="inline ml-0.5" /> : <ChevronDown size={12} className="inline ml-0.5" />;
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-rose-500" />
              Moroccan Market Scanner
            </h2>
            <div className="flex items-center gap-3 mt-1">
              {lastUpdated && (
                <span className="text-xs text-slate-500">
                  Last Sync: {lastUpdated}
                </span>
              )}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${regime === 'bullish' ? 'bg-emerald-100 text-emerald-700' :
                regime === 'bearish' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                }`}>
                Market: {regime}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={triggerUpdate}
              disabled={initializing || loading}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 transition-colors shadow-sm"
            >
              <RefreshCw className={`size-4 ${initializing ? 'animate-spin' : ''}`} />
              {initializing ? 'Recalculating...' : 'Refresh Signals'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={20} className="text-amber-600" />
              <div>
                <p className="font-bold">Initialization Required</p>
                <p>{error}</p>
              </div>
            </div>
            {!loading && !initializing && (
              <button
                onClick={triggerUpdate}
                className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-xs font-bold"
              >
                TRY NOW
              </button>
            )}
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
            <div className="flex items-center gap-2 mb-1 text-emerald-700 font-semibold text-sm">
              <TrendingUp size={16} /> Bullish
            </div>
            <div className="text-2xl font-bold text-emerald-900">{bullishCount}</div>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100">
            <div className="flex items-center gap-2 mb-1 text-rose-700 font-semibold text-sm">
              <TrendingDown size={16} /> Bearish
            </div>
            <div className="text-2xl font-bold text-rose-900">{bearishCount}</div>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-1 text-amber-700 font-semibold text-sm">
              <Zap size={16} /> Perfect Entries
            </div>
            <div className="text-2xl font-bold text-amber-900">{perfectEntries}</div>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
            <div className="flex items-center gap-2 mb-1 text-slate-700 font-semibold text-sm">
              <AlertTriangle size={16} /> Illiquid
            </div>
            <div className="text-2xl font-bold text-slate-900">{illiquidCount}</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center pt-4 border-t border-slate-100">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            {(['all', 'bullish', 'bearish'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterSignal(f)}
                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${filterSignal === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
              >
                {f.toUpperCase()}
              </button>
            ))}
          </div>

          <select
            value={signalType}
            onChange={(e) => setSignalType(e.target.value as SignalType)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none"
          >
            <option value="all">All Indicators</option>
            <option value="rsi">RSI Only</option>
            <option value="sma_cross">SMA Cross</option>
            <option value="macd">MACD Signals</option>
            <option value="bollinger">Volatility/BB</option>
            <option value="volume">Volume Spikes</option>
            <option value="pullback">Perfect Entry Setup</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading && !signals.length ? (
        <div className="bg-white rounded-xl border border-slate-200 p-20 text-center shadow-sm">
          <RefreshCw className="animate-spin mx-auto text-rose-500 mb-4" size={32} />
          <p className="text-slate-500 font-medium italic">Scanning Moroccan BVC Market...</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b border-slate-200">
                <tr>
                  <th className="px-4 py-4 text-left cursor-pointer" onClick={() => handleSort('ticker')}>Ticker <SortIcon field="ticker" /></th>
                  <th className="px-4 py-4 text-right cursor-pointer" onClick={() => handleSort('price')}>Price <SortIcon field="price" /></th>
                  <th className="px-4 py-4 text-right cursor-pointer" onClick={() => handleSort('change')}>Chg % <SortIcon field="change" /></th>
                  <th className="px-4 py-4 text-right cursor-pointer" onClick={() => handleSort('rsi')}>RSI <SortIcon field="rsi" /></th>
                  <th className="px-4 py-4 text-center">Quality</th>
                  <th className="px-4 py-4 text-left">Signal Conviction</th>
                  <th className="px-4 py-4 text-left">Triggers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAndSorted.map(stock => (
                  <tr key={stock.ticker} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4">
                      <div className="font-bold text-slate-800">{stock.ticker}</div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{stock.name}</div>
                    </td>
                    <td className="px-4 py-4 text-right font-medium text-slate-700">
                      {stock.price?.toLocaleString()} <span className="text-[10px] text-slate-400">MAD</span>
                    </td>
                    <td className={`px-4 py-4 text-right font-bold ${(stock.change ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {(stock.change ?? 0) >= 0 ? '+' : ''}{stock.change?.toFixed(2) || '0.00'}%
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${(stock.rsi_14 || 50) < 35 ? 'bg-emerald-100 text-emerald-700' :
                        (stock.rsi_14 || 50) > 65 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {stock.rsi_14?.toFixed(1) || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      {stock.quality_grade ? (
                        <div className="flex flex-col items-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black ${stock.quality_grade === 'A' ? 'bg-emerald-600 text-white' :
                            stock.quality_grade === 'F' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-700'
                            }`}>
                            GRAD {stock.quality_grade}
                          </span>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {stock.conviction && (
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase text-center ${stock.conviction.includes('HIGH')
                            ? stock.conviction.includes('BUY') ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                            : 'bg-slate-100 text-slate-600'
                            }`}>
                            {stock.conviction}
                          </span>
                        )}
                        {stock.perfect_entry && (
                          <span className="text-amber-600 font-black text-[10px] flex items-center gap-1 italic">
                            <Zap size={10} className="fill-amber-500" /> {stock.perfect_entry}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {stock.signals.slice(0, 3).map((s, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold border border-slate-200">
                            {s.message}
                          </span>
                        ))}
                        {stock.signals.length > 3 && (
                          <span className="text-[9px] text-slate-400">+{stock.signals.length - 3} more</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bottom Info: Scanner Alpha Logic */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <Zap size={24} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight uppercase">Scanner Alpha Logic v2.0</h3>
              <p className="text-slate-400 text-xs font-medium">Quant-based confluence scoring for the Moroccan BVC</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Tactical Patterns */}
            <div className="lg:col-span-2 space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Tactical Execution Patterns</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2 bg-emerald-400 rounded-full animate-pulse" />
                    <span className="font-black text-emerald-400 text-xs uppercase italic">Golden Pullback</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Buying the "macro dip". Occurs in uptrends (<span className="text-white">SMA50 {'>'} 200</span>).
                    Triggers when price retracts below SMA50 while <span className="text-white">RSI {'<'} 45</span> and volume is drying up (<span className="text-white">RVOL {'<'} 0.8</span>).
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="size-2 bg-rose-400 rounded-full" />
                    <span className="font-black text-rose-400 text-xs uppercase italic">Exhaustion Peak</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Fading the "overextension". Occurs in downtrends (<span className="text-white">SMA50 {'<'} 200</span>).
                    Triggers when a corrective rally pushes <span className="text-white">RSI {'>'} 55</span> and hits the Upper Bollinger Band despite the bearish macro trend.
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors group md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={14} className="text-amber-400 fill-amber-400" />
                    <span className="font-black text-amber-400 text-xs uppercase italic">Volatility Squeeze Breakout</span>
                  </div>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    Explosive expansion. Detects periods where Bollinger Bands represent the <span className="text-white">bottom 15%</span> of historical width.
                    Confirms a move when price breaks a band with high-velocity volume (<span className="text-white">RVOL {'>'} 1.5</span>).
                  </p>
                </div>
              </div>
            </div>

            {/* System Guards */}
            <div className="space-y-4">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">System Safeguards</h4>
              <div className="bg-slate-800/50 rounded-xl p-5 border border-slate-700 space-y-4">
                <div className="flex gap-3">
                  <div className="p-1.5 bg-indigo-500/20 rounded h-fit">
                    <BarChart3 size={14} className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold mb-1">Market Regime Gate</p>
                    <p className="text-slate-400 text-[10px] leading-normal">
                      Uses MASI Index trend. In Bear markets, it <span className="text-rose-400">auto-suppresses</span> Buy signals.
                      In Mixed markets, it only allows High Conviction entries.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="p-1.5 bg-teal-500/20 rounded h-fit">
                    <Volume2 size={14} className="text-teal-400" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold mb-1">Liquidity Guard</p>
                    <p className="text-slate-400 text-[10px] leading-normal">
                      Protects against slippage. Blocks signals for stocks with <span className="text-white">{'<'} 5,000 units</span>
                      daily average volume, regardless of technical setup.
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-700 flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-bold uppercase">Weighting Engine</span>
                  <span className="text-amber-400 text-[10px] font-black italic">Score 7+ = HIGH CONV</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full translate-y-1/2 -translate-x-1/4 pointer-events-none"></div>
      </div>
    </div>
  );
};
