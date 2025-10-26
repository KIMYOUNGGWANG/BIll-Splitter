import React from 'react';

const SkeletonLine: React.FC<{ width: string; height?: string }> = ({ width, height = 'h-4' }) => (
  <div className={`bg-gray-200 dark:bg-gray-700 rounded-md ${width} ${height}`}></div>
);

const ReceiptSkeleton: React.FC = () => {
  return (
    <div className="bg-surface dark:bg-surface-dark rounded-lg shadow-md border border-border dark:border-border-dark h-full flex flex-col animate-pulse">
      {/* Header */}
      <div className="p-4 border-b border-border dark:border-border-dark space-y-3">
        <div className="flex justify-between items-center">
          <SkeletonLine width="w-1/2" height="h-8" />
          <SkeletonLine width="w-1/4" height="h-6" />
        </div>
        <SkeletonLine width="w-full" height="h-10" />
      </div>

      {/* Item List */}
      <div className="flex-grow min-h-0 overflow-y-auto">
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 bg-background dark:bg-background-dark rounded-md">
              <div className="flex justify-between items-center">
                <SkeletonLine width="w-3/5" />
                <SkeletonLine width="w-1/5" />
              </div>
              <div className="mt-3">
                <SkeletonLine width="w-2/5" height="h-3" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Totals Section */}
      <div className="p-4 border-t border-border dark:border-border-dark bg-background/50 dark:bg-background-dark/50 rounded-b-lg mt-auto flex-shrink-0">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <SkeletonLine width="w-1/4" height="h-3" />
            <SkeletonLine width="w-1/3" height="h-3" />
          </div>
          <div className="flex justify-between">
            <SkeletonLine width="w-1/6" height="h-3" />
            <SkeletonLine width="w-1/4" height="h-3" />
          </div>
           <div className="flex justify-between">
            <SkeletonLine width="w-1/5" height="h-3" />
            <SkeletonLine width="w-1/4" height="h-3" />
          </div>
          <div className="pt-2 border-t border-border dark:border-border-dark mt-2">
             <div className="flex justify-between font-bold text-base mt-2">
                <SkeletonLine width="w-1/4" height="h-5" />
                <SkeletonLine width="w-1/3" height="h-5" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSkeleton;
