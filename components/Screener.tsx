import React, { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';

export const Screener: React.FC = () => {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current) {
        container.current.innerHTML = '';
        
        const widgetContainer = document.createElement('div');
        widgetContainer.className = 'tradingview-widget-container__widget h-full w-full';
        container.current.appendChild(widgetContainer);

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
        script.type = "text/javascript";
        script.async = true;
        script.innerHTML = JSON.stringify({
          "width": "100%",
          "height": "100%",
          "defaultColumn": "overview",
          "defaultScreen": "general",
          "market": "morocco",
          "showToolbar": true,
          "colorTheme": "light",
          "locale": "en",
          "isTransparent": false
        });
        container.current.appendChild(script);
    }
  }, []);

  return (
    <div className="space-y-4 pb-20 md:pb-0 h-[calc(100vh-140px)] min-h-[600px] flex flex-col">
       <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800">Casablanca Stock Exchange (CSEMA)</span>
              <span className="text-sm text-slate-500">Real-time market screener provided by TradingView.</span>
            </div>
            <a 
              href="https://www.tradingview.com/screener/R6imwOHx/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-slate-900 hover:bg-slate-800 text-white transition-colors px-4 py-2 rounded-lg flex items-center space-x-2 text-sm font-medium"
            >
              <span>Open Custom Screener</span>
              <ExternalLink size={16} />
            </a>
       </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-1">
         <div className="tradingview-widget-container h-full w-full" ref={container}></div>
      </div>
    </div>
  );
};