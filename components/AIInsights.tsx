import React, { useState, useEffect } from 'react';
import { PortfolioSummary } from '../types';
import { analyzePortfolio } from '../services/geminiService';
import { Sparkles, RefreshCcw, AlertTriangle, Info, Lightbulb } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

import { usePortfolioContext } from '../context/PortfolioContext';

export const AIInsights: React.FC = () => {
  const { portfolio } = usePortfolioContext();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisDate, setAnalysisDate] = useState<Date | null>(null);

  const runAnalysis = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await analyzePortfolio(portfolio);
      setAnalysis(result.markdown);
      setAnalysisDate(new Date());
    } catch (err) {
      console.error('AI Analysis error:', err);
      setError('Failed to generate analysis. Please check your API key and try again.');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-run only if empty, but let user refresh manually
  useEffect(() => {
    if (!analysis && !loading && !error) {
      runAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 md:pb-0">
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-32 bg-emerald-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob"></div>
        <div className="absolute -bottom-8 -left-8 p-32 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-blob animation-delay-2000"></div>

        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <Sparkles className="text-emerald-400" size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">AI Portfolio Analyst</h2>
                <div className="flex items-center space-x-2">
                  <p className="text-slate-300 text-sm">Powered by Gemini 3 Flash</p>
                  {analysisDate && (
                    <div className="group relative">
                      <span className="text-xs text-slate-400">
                        Updated {analysisDate.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-10">
                        Analysis generated at {analysisDate.toLocaleString('fr-MA')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="group relative">
                <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm cursor-help">
                  <Info size={18} className="text-slate-300" />
                </div>
                <div className="absolute bottom-full right-0 mb-2 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg hidden group-hover:block z-10">
                  <p className="font-medium mb-1">AI Analysis Features:</p>
                  <ul className="space-y-1 text-slate-300">
                    <li>• Sector concentration analysis</li>
                    <li>• Fee drag calculation</li>
                    <li>• Execution quality scoring</li>
                    <li>• Risk assessment</li>
                    <li>• Strategic recommendations</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={runAnalysis}
                disabled={loading}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                <span>{loading ? 'Analyzing...' : 'Refresh Analysis'}</span>
              </button>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md rounded-xl p-6 border border-white/10 min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-full space-y-4 py-12">
                <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <div className="flex flex-col items-center space-y-2">
                  <p className="text-slate-300 animate-pulse">Analyzing sector exposure and risk metrics...</p>
                  <div className="flex items-center space-x-4 text-sm text-slate-400">
                    <div className="flex items-center space-x-1">
                      <Lightbulb size={14} className="text-yellow-400" />
                      <span>Calculating HHI Score</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Lightbulb size={14} className="text-yellow-400" />
                      <span>Evaluating Fee Drag</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Lightbulb size={14} className="text-yellow-400" />
                      <span>Assessing Execution Quality</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <AlertTriangle size={32} className="mb-2 text-rose-400" />
                <p className="mb-2">{error}</p>
                <button
                  onClick={runAnalysis}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : analysis ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-12 text-slate-400">
                <AlertTriangle size={32} className="mb-2 opacity-50" />
                <p>No analysis available. Click refresh to generate.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="font-semibold text-slate-800 mb-2">Disclaimer</h3>
        <p className="text-sm text-slate-500 leading-relaxed">
          The insights provided above are generated by Artificial Intelligence based on the data uploaded.
          This information is for educational purposes only and does not constitute financial advice.
          Stock market investments carry risks. Please consult with a certified financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  );
};
