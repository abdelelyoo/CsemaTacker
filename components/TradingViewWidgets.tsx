import React, { useEffect, useRef } from 'react';

interface TickerTapeProps {
  symbols: { proName: string; title: string }[];
  colorTheme?: 'light' | 'dark';
  displayMode?: 'regular' | 'compact' | 'adaptive';
}

export const TickerTape: React.FC<TickerTapeProps> = ({ symbols, colorTheme = 'light', displayMode = 'compact' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Clear any existing content to prevent duplicates on re-render
    containerRef.current.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'tradingview-widget-container__widget';
    containerRef.current.appendChild(wrapper);

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbols: symbols,
      showSymbolLogo: true,
      colorTheme: colorTheme,
      isTransparent: false,
      displayMode: displayMode,
      locale: "en"
    });
    
    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbols, colorTheme, displayMode]);

  return (
    <div className="tradingview-widget-container" ref={containerRef}></div>
  );
};

interface MarketOverviewProps {
  tabs: { title: string; symbols: { s: string; d?: string }[] }[];
  colorTheme?: 'light' | 'dark';
  height?: number | string;
  width?: number | string;
  showFloatingTooltip?: boolean;
}

export const MarketOverview: React.FC<MarketOverviewProps> = ({ tabs, colorTheme = 'light', height = 500, width = "100%", showFloatingTooltip = true }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        
        containerRef.current.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'tradingview-widget-container__widget';
        containerRef.current.appendChild(wrapper);

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-market-overview.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            colorTheme,
            dateRange: "12M",
            showChart: true,
            locale: "en",
            largeChartUrl: "",
            isTransparent: false,
            showSymbolLogo: true,
            showFloatingTooltip,
            width: "100%",
            height: height,
            tabs: tabs
        });

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [tabs, colorTheme, height, width, showFloatingTooltip]);

    return (
        <div className="tradingview-widget-container" ref={containerRef} style={{ height, width }}></div>
    );
};

interface TechnicalAnalysisProps {
  symbol: string;
  colorTheme?: 'light' | 'dark';
  height?: number | string;
  width?: number | string;
}

export const TechnicalAnalysis: React.FC<TechnicalAnalysisProps> = ({ symbol, colorTheme = 'light', height = 400, width = "100%" }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        
        containerRef.current.innerHTML = '';

        const wrapper = document.createElement('div');
        wrapper.className = 'tradingview-widget-container__widget';
        containerRef.current.appendChild(wrapper);

        const script = document.createElement('script');
        script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-technical-analysis.js';
        script.async = true;
        script.innerHTML = JSON.stringify({
            interval: "1D",
            width: width,
            isTransparent: false,
            height: height,
            symbol: symbol,
            showIntervalTabs: true,
            displayMode: "single",
            locale: "en",
            colorTheme: colorTheme
        });

        containerRef.current.appendChild(script);

        return () => {
            if (containerRef.current) {
                containerRef.current.innerHTML = '';
            }
        };
    }, [symbol, colorTheme, height, width]);

    return (
        <div className="tradingview-widget-container" ref={containerRef} style={{ height, width }}></div>
    );
};