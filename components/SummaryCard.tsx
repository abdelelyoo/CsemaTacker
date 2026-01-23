import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SummaryCardProps {
    label: string;
    value: string | number;
    subtitle: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    colorClass: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ label, value, subtitle, icon: Icon, colorClass }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 transition-all hover:-translate-y-1 hover:shadow-md">
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg bg-opacity-10 ${colorClass.replace('text-', 'bg-')}`}>
                    <Icon className={`w-6 h-6 ${colorClass}`} />
                </div>
            </div>
            <h3 className="text-sm font-medium text-slate-500 mb-1">{label}</h3>
            <div className="text-2xl font-bold text-slate-800">{value}</div>
            <p className="text-xs text-slate-400 mt-2">{subtitle}</p>
        </div>
    );
};