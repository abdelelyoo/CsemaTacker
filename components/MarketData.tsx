import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcw, Save, X, Globe, Eye } from 'lucide-react';
import { fetchLatestPrices } from '../services/geminiService';

interface MarketDataProps {
  holdings: string[];
  currentPrices: Record<string, number>;
  onUpdatePrices: (prices: Record<string, number>) => void;
  onClose: () => void;
}

const TradingViewQuote = ({ ticker }: { ticker: string }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear previous content
    containerRef.current.innerHTML = '';
    
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(widgetDiv);

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-single-quote.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      "symbol": `CSEMA:${ticker}`,
      "width": "100%",
      "colorTheme": "light",
      "isTransparent": true,
      "locale": "en"
    });
    
    containerRef.current.appendChild(script);
  }, [ticker]);

  return (
    <div className="tradingview-widget-container rounded-lg overflow-hidden border border-slate-200 bg-white" ref={containerRef}></div>
  );
};

export const MarketData: React.FC<MarketDataProps> = ({ holdings, currentPrices, onUpdatePrices, onClose }) => {
  const [prices, setPrices] = useState<Record<string, number>>(currentPrices);
  const [loading, setLoading] = useState(false);
  const [searchStatus, setSearchStatus] = useState<string>("");
  // Select the first holding by default for the widget
  const [activeTicker, setActiveTicker] = useState<string>(holdings[0] || "");

  const handlePriceChange = (ticker: string, value: string) => {
    setPrices(prev => ({
      ...prev,
      [ticker]: parseFloat(value) || 0
    }));
  };

  const handleAutoFetch = async () => {
    setLoading(true);
    setSearchStatus("Searching market data...");
    
    try {
      const fetchedPrices = await fetchLatestPrices(holdings);
      setPrices(prev => ({ ...prev, ...fetchedPrices }));
      setSearchStatus(`Updated ${Object.keys(fetchedPrices).length} prices.`);
    } catch (e) {
      setSearchStatus("Failed to fetch data.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onUpdatePrices(prices);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
             <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
               <Globe size={20} className="text-blue-500"/>
               Market Data Manager
             </h2>
             <p className="text-sm text-slate-500">Update valuations with live market data</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Left Panel: Inputs */}
          <div className="flex-1 p-6 overflow-y-auto border-r border-slate-100">
            <div className="flex justify-between items-center mb-6 bg-blue-50 p-4 rounded-lg border border-blue-100">
              <div>
                <h3 className="font-semibold text-blue-900 text-sm">AI Auto-Fetch</h3>
                <p className="text-xs text-blue-700 mt-1">
                  Uses Google Search to find latest CSE quotes.
                </p>
              </div>
              <button
                onClick={handleAutoFetch}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg flex items-center space-x-2 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCcw size={14} className={loading ? 'animate-spin' : ''} />
                <span>{loading ? 'Fetching...' : 'Fetch All'}</span>
              </button>
            </div>
            
            {searchStatus && (
              <div className="mb-4 text-xs text-center font-medium text-slate-600 bg-slate-100 py-1 rounded">
                {searchStatus}
              </div>
            )}

            <div className="space-y-3">
              {holdings.map(ticker => (
                <div 
                  key={ticker} 
                  className={`flex items-center justify-between p-3 border rounded-lg transition-all cursor-pointer ${
                    activeTicker === ticker 
                      ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500' 
                      : 'border-slate-200 hover:border-emerald-300'
                  }`}
                  onClick={() => setActiveTicker(ticker)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                       activeTicker === ticker ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {ticker.substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 text-sm">{ticker}</span>
                      <span className="text-[10px] text-slate-400">CSEMA:{ticker}</span>
                    </div>
                  </div>
                  <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={prices[ticker] || ''}
                        onChange={(e) => handlePriceChange(ticker, e.target.value)}
                        className="w-28 text-right px-2 py-1.5 bg-white border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                        placeholder="0.00"
                        onClick={(e) => e.stopPropagation()} // Prevent parent click
                        onFocus={() => setActiveTicker(ticker)}
                      />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Panel: Live Widget */}
          <div className="w-full md:w-[400px] bg-slate-50 p-6 flex flex-col border-t md:border-t-0 border-l border-slate-200">
             <div className="sticky top-0">
               <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                 <Eye size={16} className="text-emerald-500"/>
                 Live Quote Verification
               </h3>
               
               {activeTicker ? (
                 <div className="space-y-4">
                   <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-200">
                      <TradingViewQuote ticker={activeTicker} />
                   </div>
                   <div className="text-xs text-slate-500 text-center leading-relaxed">
                     <p>Verify the price above matches your input.</p>
                     <p className="mt-2 text-slate-400 italic">Data provided by TradingView for {activeTicker} on Casablanca Stock Exchange.</p>
                   </div>
                 </div>
               ) : (
                 <div className="h-40 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                   Select a ticker to view live data
                 </div>
               )}
             </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white flex justify-end space-x-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors text-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2 text-sm"
          >
            <Save size={16} />
            Save & Update Portfolio
          </button>
        </div>
      </div>
    </div>
  );
};