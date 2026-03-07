import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '1rem',
  borderRadius = '0.5rem',
  className = '',
  animation = 'pulse'
}) => {
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer',
    none: ''
  };

  return (
    <div
      className={`bg-slate-200 ${animationClasses[animation]} ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: typeof borderRadius === 'number' ? `${borderRadius}px` : borderRadius
      }}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
    <Skeleton width="40%" height="1.5rem" className="mb-4" />
    <Skeleton width="60%" height="1rem" />
    <div className="mt-4 space-y-3">
      <Skeleton width="100%" height="3rem" />
      <Skeleton width="100%" height="3rem" />
      <Skeleton width="100%" height="3rem" />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
    <div className="p-6 border-b border-slate-100">
      <Skeleton width="30%" height="1.5rem" />
    </div>
    <div className="p-4">
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton width="3rem" height="3rem" borderRadius="0.5rem" />
            <div className="flex-1 space-y-2">
              <Skeleton width="30%" height="1rem" />
              <Skeleton width="50%" height="0.75rem" />
            </div>
            <Skeleton width="15%" height="1rem" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 min-h-[400px]">
    <div className="flex justify-between items-center mb-6">
      <div>
        <Skeleton width="40%" height="1.5rem" className="mb-2" />
        <Skeleton width="60%" height="0.75rem" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} width="2.5rem" height="1.5rem" borderRadius="0.5rem" />
        ))}
      </div>
    </div>
    <div className="flex-1 flex items-end justify-around gap-2 pb-8">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton
          key={i}
          width="8%"
          height={`${30 + Math.random() * 60}%`}
          borderRadius="4px 4px 0 0"
        />
      ))}
    </div>
  </div>
);