import React, { useEffect, useState } from 'react';
import { QualityScoreService, QualityScore } from '../services/qualityScoreService';
import { Award, AlertTriangle, CheckCircle2, TrendingUp, BarChart3 } from 'lucide-react';

export const QualityDashboard: React.FC = () => {
    const [scores, setScores] = useState<QualityScore[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedSector, setSelectedSector] = useState<string>('All');
    const [sectors, setSectors] = useState<string[]>(['All']);

    useEffect(() => {
        loadScores();
    }, []);

    const loadScores = async () => {
        setLoading(true);
        setError(null);
        try {
            // Get all scores for all companies from database
            const db = await import('../db').then(m => m.db);
            const companies = await db.companies.toArray();
            const allCompanyScores = await QualityScoreService.getMultipleScores(
                companies.map(c => c.ticker)
            );

            setScores(allCompanyScores);

            // Extract unique sectors
            const uniqueSectors = ['All', ...new Set(allCompanyScores.map(s => s.sector))].sort();
            setSectors(uniqueSectors);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load quality scores');
        } finally {
            setLoading(false);
        }
    };

    const filteredScores = selectedSector === 'All'
        ? scores
        : scores.filter(s => s.sector === selectedSector);

    const getGradeColor = (grade?: string): string => {
        switch (grade) {
            case 'A':
                return 'bg-emerald-100 text-emerald-800';
            case 'B':
                return 'bg-blue-100 text-blue-800';
            case 'C':
                return 'bg-amber-100 text-amber-800';
            case 'D':
                return 'bg-orange-100 text-orange-800';
            case 'F':
                return 'bg-rose-100 text-rose-800';
            default:
                return 'bg-slate-100 text-slate-800';
        }
    };

    const getTrendIcon = (trend?: string): string => {
        switch (trend) {
            case 'improving':
                return '??';
            case 'declining':
                return '??';
            default:
                return '??';
        }
    };

    const formatScore = (score: number): string => score.toFixed(0);

    // Top quality stocks
    const topQuality = [...filteredScores]
        .sort((a, b) => b.overallQuality - a.overallQuality)
        .slice(0, 3);

    // Stocks with red flags
    const withRedFlags = filteredScores.filter(s => s.redFlags.length > 0)
        .sort((a, b) => b.redFlags.length - a.redFlags.length);

    if (loading) {
        return (
            <div className="bg-white p-8 rounded-xl border border-slate-200 animate-pulse">
                <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6 rounded-xl text-white shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                    <Award size={28} />
                    <div>
                        <h2 className="text-2xl font-bold">Portfolio Quality Scoring</h2>
                        <p className="text-sm text-purple-100">Financial health, dividend quality, and valuation assessment</p>
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Sector Filter */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-3">Filter by Sector</label>
                <div className="flex flex-wrap gap-2">
                    {sectors.map(sector => (
                        <button
                            key={sector}
                            onClick={() => setSelectedSector(sector)}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                selectedSector === sector
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                        >
                            {sector}
                        </button>
                    ))}
                </div>
            </div>

            {/* Top Quality Stocks */}
            {topQuality.length > 0 && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="bg-emerald-50 border-b border-emerald-200 p-4">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 size={20} className="text-emerald-600" />
                            <h3 className="text-lg font-bold text-emerald-800">Top Quality Stocks</h3>
                        </div>
                    </div>
                    <div className="p-4 space-y-3">
                        {topQuality.map(score => (
                            <div key={score.ticker} className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-lg text-slate-800">{score.ticker}</p>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full font-bold text-sm ${getGradeColor(score.qualityRating)}`}
                                            >
                                                Grade {score.qualityRating}
                                            </span>
                                            <span className="text-lg">{getTrendIcon(score.qualityTrend)}</span>
                                        </div>
                                        <p className="text-sm text-slate-600">{score.companyName}</p>
                                    </div>
                                    <p className="text-3xl font-bold text-emerald-600">
                                        {formatScore(score.overallQuality)}
                                    </p>
                                </div>

                                <div className="grid grid-cols-3 gap-3 mb-3">
                                    <div className="bg-white rounded p-2">
                                        <p className="text-xs text-slate-600">Financial Health</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            {formatScore(score.financialHealthScore)}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded p-2">
                                        <p className="text-xs text-slate-600">Dividend Quality</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            {formatScore(score.dividendQualityScore)}
                                        </p>
                                    </div>
                                    <div className="bg-white rounded p-2">
                                        <p className="text-xs text-slate-600">Valuation</p>
                                        <p className="text-lg font-bold text-slate-800">
                                            {formatScore(score.valuationAttractiveness)}
                                        </p>
                                    </div>
                                </div>

                                {score.greenFlags.length > 0 && (
                                    <div className="text-sm text-emerald-700">
                                        <p className="font-semibold mb-1">? Strengths:</p>
                                        <ul className="list-disc list-inside space-y-0.5">
                                            {score.greenFlags.slice(0, 2).map((flag, idx) => (
                                                <li key={idx}>{flag}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Quality Score Grid */}
            <div>
                <div className="mb-4 flex items-center gap-2">
                    <BarChart3 size={20} className="text-slate-600" />
                    <h3 className="text-lg font-bold text-slate-800">
                        All Stocks ({filteredScores.length})
                    </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredScores.length === 0 ? (
                        <div className="col-span-full text-center py-8 text-slate-500">
                            No scores available for this sector
                        </div>
                    ) : (
                        filteredScores.map(score => (
                            <div
                                key={score.ticker}
                                className="bg-white border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <div>
                                        <p className="font-bold text-slate-800">{score.ticker}</p>
                                        <p className="text-xs text-slate-500">{score.companyName}</p>
                                    </div>
                                    <span
                                        className={`px-2.5 py-0.5 rounded-full font-bold text-sm ${getGradeColor(score.qualityRating)}`}
                                    >
                                        {score.qualityRating}
                                    </span>
                                </div>

                                {/* Overall Score */}
                                <div className="mb-3 p-3 bg-slate-50 rounded">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-xs font-semibold text-slate-600">Overall Quality</span>
                                        <span className="text-lg font-bold text-slate-800">
                                            {formatScore(score.overallQuality)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-200 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full transition-all ${
                                                score.overallQuality >= 80
                                                    ? 'bg-emerald-500'
                                                    : score.overallQuality >= 60
                                                        ? 'bg-blue-500'
                                                        : 'bg-rose-500'
                                            }`}
                                            style={{ width: `${Math.min(score.overallQuality, 100)}%` }}
                                        ></div>
                                    </div>
                                </div>

                                {/* Sub-scores */}
                                <div className="space-y-2 mb-3 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Financial Health</span>
                                        <span className="font-bold text-slate-800">
                                            {formatScore(score.financialHealthScore)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Dividend Quality</span>
                                        <span className="font-bold text-slate-800">
                                            {formatScore(score.dividendQualityScore)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-600">Valuation</span>
                                        <span className="font-bold text-slate-800">
                                            {formatScore(score.valuationAttractiveness)}
                                        </span>
                                    </div>
                                </div>

                                {/* Trend */}
                                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                                    <span>{getTrendIcon(score.qualityTrend)}</span>
                                    <span className="text-xs text-slate-600 capitalize">
                                        Trend: {score.qualityTrend}
                                    </span>
                                </div>

                                {/* Red Flags */}
                                {score.redFlags.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-rose-200">
                                        <div className="flex items-start gap-1">
                                            <AlertTriangle size={14} className="text-rose-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs text-rose-700">
                                                <p className="font-semibold mb-1">{score.redFlags.length} Red Flag(s):</p>
                                                <ul className="space-y-0.5">
                                                    {score.redFlags.slice(0, 2).map((flag, idx) => (
                                                        <li key={idx} className="list-disc list-inside">
                                                            {flag}
                                                        </li>
                                                    ))}
                                                    {score.redFlags.length > 2 && (
                                                        <li className="text-rose-600 italic">
                                                            +{score.redFlags.length - 2} more
                                                        </li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Green Flags */}
                                {score.greenFlags.length > 0 && (
                                    <div className="mt-2">
                                        <div className="flex items-start gap-1">
                                            <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0 mt-0.5" />
                                            <div className="text-xs text-emerald-700">
                                                <p className="font-semibold mb-1">{score.greenFlags[0]}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
