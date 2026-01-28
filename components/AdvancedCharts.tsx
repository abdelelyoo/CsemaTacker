import React from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line, Bar, Scatter, Bubble } from 'react-chartjs-2';
import { formatCurrency } from '../utils';

// Register ChartJS components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

// Enterprise Chart Defaults
ChartJS.defaults.font.family = "'Inter', system-ui, -apple-system, sans-serif";
ChartJS.defaults.color = '#64748b';
ChartJS.defaults.plugins.tooltip.backgroundColor = 'rgba(255, 255, 255, 0.9)';
ChartJS.defaults.plugins.tooltip.titleColor = '#1e293b';
ChartJS.defaults.plugins.tooltip.bodyColor = '#475569';
ChartJS.defaults.plugins.tooltip.borderColor = '#e2e8f0';
ChartJS.defaults.plugins.tooltip.borderWidth = 1;
ChartJS.defaults.plugins.tooltip.padding = 12;
ChartJS.defaults.plugins.tooltip.cornerRadius = 12;

export const PortfolioPerformanceChart = ({
    portfolioData,
    benchmarkData,
    title = 'Portfolio Performance Tracking'
}) => {
    const chartData = {
        labels: portfolioData.map(d => d.date),
        datasets: [
            {
                label: 'Portfolio Value',
                data: portfolioData.map(d => d.value),
                borderColor: '#6366f1',
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.1)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');
                    return gradient;
                },
                tension: 0.4, // Cubic interpolation for smooth curve
                fill: true,
                pointRadius: 0, // Cleaner look without points
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#6366f1',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                borderWidth: 3
            },
            {
                label: 'MASI Index',
                data: benchmarkData.map(d => d.value),
                borderColor: '#94a3b8',
                tension: 0.4,
                borderDash: [6, 6],
                pointRadius: 0,
                borderWidth: 2,
                fill: false
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'end' as const,
                labels: {
                    usePointStyle: true,
                    pointStyle: 'circle',
                    font: { size: 11, weight: 'bold' as const }
                }
            },
            title: {
                display: false
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        return ` ${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
                    },
                    afterBody: (context: any) => {
                        if (context.length === 2) {
                            const diff = context[0].parsed.y - context[1].parsed.y;
                            const pctDiff = (diff / context[1].parsed.y) * 100;
                            return [``, `Alpha: ${pctDiff.toFixed(2)}%`].filter(Boolean);
                        }
                        return [];
                    }
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { font: { size: 10, weight: 'bold' as const } }
            },
            y: {
                grid: { color: '#f1f5f9' },
                border: { display: false },
                ticks: {
                    font: { size: 10 },
                    callback: function (value: any) {
                        return formatCurrency(value);
                    }
                }
            }
        }
    };

    return <Line data={chartData} options={options} />;
};

export const RiskAnalysisChart = ({ positions, analystTargets = [], title = 'Risk Contribution Analysis' }: { positions: any[], analystTargets?: any[], title?: string }) => {
    // Merge target data if available for tickers in view
    const targetsMap = React.useMemo(() => {
        const map: Record<string, number> = {};
        analystTargets.forEach(t => map[t.ticker] = t.targetPrice);
        return map;
    }, [analystTargets]);

    const chartData = {
        labels: positions.map(p => p.ticker),
        datasets: [
            {
                label: 'Risk Contribution',
                data: positions.map(p => p.riskContribution || 0),
                backgroundColor: (context: any) => {
                    const p = positions[context.dataIndex];
                    return p.riskPercentage > 25 ? '#ef4444' : p.riskPercentage > 15 ? '#f59e0b' : '#10b981';
                },
                borderRadius: 8,
                barThickness: 24
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const position = positions[context.dataIndex];
                        return ` Contribution: ${formatCurrency(context.parsed.y)} (${position.riskPercentage?.toFixed(1)}%)`;
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { weight: 'bold' as const } } },
            y: {
                grid: { color: '#f1f5f9' },
                border: { display: false },
                ticks: { callback: (value: any) => formatCurrency(value) }
            },
            yTarget: {
                display: false,
                position: 'right' as const,
                grid: { display: false }
            }
        }
    };

    return (
        <div style={{ position: 'relative', height: '100%' }}>
            <Bar data={chartData} options={options} />
            {/* Legend for Targets */}
            {analystTargets.length > 0 && (
                <div className="absolute top-0 right-0 flex items-center gap-2 bg-white/80 p-1 rounded text-[10px] font-bold text-slate-500">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    BKGR Target
                </div>
            )}
        </div>
    );
};

export const CorrelationHeatmap = ({ correlationMatrix, title = 'Asset Correlation Matrix' }: { correlationMatrix: Record<string, Record<string, number>>, title?: string }) => {
    const tickers = Object.keys(correlationMatrix);

    const chartData = {
        labels: tickers,
        datasets: tickers.map((ticker, index) => ({
            label: ticker,
            data: Object.values(correlationMatrix[ticker]),
            backgroundColor: Object.values(correlationMatrix[ticker]).map((value: number) => {
                const alpha = Math.abs(value);
                const color = value > 0 ? 'rgba(99, 102, 241, ' : 'rgba(239, 68, 68, ';
                return color + alpha + ')';
            }),
            borderColor: 'rgba(255, 255, 255, 0.5)',
            borderWidth: 1
        }))
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: title,
                font: {
                    size: 16
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        const ticker1 = tickers[context.datasetIndex];
                        const ticker2 = tickers[context.dataIndex];
                        const correlation = correlationMatrix[ticker1][ticker2];
                        return [`${ticker1} vs ${ticker2}: ${correlation.toFixed(3)}`];
                    }
                }
            }
        },
        scales: {
            x: {
                min: -1,
                max: 1,
                ticks: {
                    stepSize: 0.5
                }
            },
            y: {
                stacked: true
            }
        }
    };

    return <Bar data={chartData} options={options} />;
};

export const MonteCarloSimulationChart = ({ simulationResults, initialValue, title = 'Monte Carlo Simulation Results' }: { simulationResults: any, initialValue: number, title?: string }) => {
    const sortedResults = [...simulationResults.data].sort((a, b) => a - b);

    const chartData = {
        labels: ['Min', '10%', '25%', 'Median', '75%', '90%', 'Max'],
        datasets: [
            {
                label: 'Simulated Portfolio Value',
                data: [
                    simulationResults.min,
                    sortedResults[Math.floor(sortedResults.length * 0.1)],
                    sortedResults[Math.floor(sortedResults.length * 0.25)],
                    simulationResults.median,
                    sortedResults[Math.floor(sortedResults.length * 0.75)],
                    sortedResults[Math.floor(sortedResults.length * 0.9)],
                    simulationResults.max
                ],
                backgroundColor: (context: any) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
                    gradient.addColorStop(0, 'rgba(99, 102, 241, 0.4)');
                    gradient.addColorStop(1, 'rgba(99, 102, 241, 0.05)');
                    return gradient;
                },
                borderColor: '#6366f1',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 6,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointBorderWidth: 2
            },
            {
                label: 'Current Principal',
                data: Array(7).fill(initialValue),
                borderColor: '#ef4444',
                borderWidth: 2,
                borderDash: [8, 4],
                pointRadius: 0,
                fill: false
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top' as const,
                align: 'end' as const,
                labels: { boxWidth: 12, font: { weight: 'bold' as const } }
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        const val = context.parsed.y;
                        const chg = ((val - initialValue) / initialValue) * 100;
                        return ` ${formatCurrency(val)} (${chg > 0 ? '+' : ''}${chg.toFixed(1)}%)`;
                    }
                }
            }
        },
        scales: {
            x: { grid: { display: false }, ticks: { font: { weight: 'bold' as const } } },
            y: {
                grid: { color: '#f1f5f9' },
                border: { display: false },
                ticks: { callback: (value: any) => formatCurrency(value) }
            }
        }
    };

    return <Line data={chartData} options={options} />;
};

export const TradingActivityHeatmap = ({ trades, title = 'Trading Activity by Time' }) => {
    // Group trades by day of week and hour
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);

    const heatmapData = hours.map(hour =>
        days.map(day => {
            return trades.filter(t => {
                const date = new Date(t.date);
                return date.getDay() === days.indexOf(day) && date.getHours() === hour;
            }).length;
        })
    );

    const chartData = {
        labels: days,
        datasets: hours.map((hour, index) => ({
            label: `${hour}:00`,
            data: heatmapData[index],
            backgroundColor: heatmapData[index].map(count => {
                const alpha = Math.min(count / 5, 0.8); // Cap at 5 trades for full opacity
                return `rgba(255, 99, 132, ${alpha})`;
            }),
            borderColor: 'rgba(255, 255, 255, 0.2)',
            borderWidth: 1
        }))
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y' as const,
        plugins: {
            legend: {
                display: false
            },
            title: {
                display: true,
                text: title,
                font: {
                    size: 16
                }
            },
            tooltip: {
                callbacks: {
                    label: (context) => {
                        return `Trades: ${context.parsed.x}`;
                    }
                }
            }
        },
        scales: {
            x: {
                stacked: true,
                title: {
                    display: true,
                    text: 'Day of Week'
                }
            },
            y: {
                stacked: true,
                reverse: true,
                title: {
                    display: true,
                    text: 'Hour of Day'
                },
                ticks: {
                    callback: (value) => `${value}:00`
                }
            }
        }
    };

    return <Bar data={chartData} options={options} />;
};