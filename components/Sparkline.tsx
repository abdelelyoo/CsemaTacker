import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

interface SparklineProps {
    data: number[];
    color?: string;
}

export const Sparkline: React.FC<SparklineProps> = ({ data, color = '#10b981' }) => {
    const chartData = data.map((val, idx) => ({ idx, val }));

    return (
        <div className="h-10 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.4} />
                            <stop offset="100%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="val"
                        stroke={color}
                        strokeWidth={1.5}
                        fill={`url(#gradient-${color})`}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};
