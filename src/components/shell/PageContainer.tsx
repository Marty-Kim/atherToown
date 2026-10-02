import * as React from 'react';
import { cn } from '@/lib/utils';

export function PageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div id="main-content" className="h-full overflow-y-auto at-scroll-thin">
      <div className={cn('mx-auto w-full max-w-[1400px] px-3 py-4 sm:px-5 sm:py-6', className)}>
        {children}
      </div>
    </div>
  );
}

export function PageIntro({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight">{title}</h2>
        <p className="text-meta mt-1 max-w-2xl">{description}</p>
      </div>
      {action}
    </div>
  );
}
