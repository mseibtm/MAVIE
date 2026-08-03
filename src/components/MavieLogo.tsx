import React from 'react';

interface MavieLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  layout?: 'horizontal' | 'vertical';
}

export const MavieLogo: React.FC<MavieLogoProps> = ({
  className = '',
  size = 'md',
  showSubtitle = true,
  layout = 'horizontal',
}) => {
  const sizeMap = {
    sm: { title: 'text-lg', sub: 'text-[9px]', gap: 'gap-0.5' },
    md: { title: 'text-2xl', sub: 'text-[11px]', gap: 'gap-1' },
    lg: { title: 'text-4xl', sub: 'text-xs', gap: 'gap-1.5' },
    xl: { title: 'text-5xl sm:text-6xl', sub: 'text-sm sm:text-base', gap: 'gap-2' },
  };

  const currentSize = sizeMap[size];

  return (
    <div
      className={`inline-flex flex-col ${
        layout === 'vertical' ? 'items-center text-center' : 'items-start text-left'
      } ${currentSize.gap} ${className}`}
    >
      <span
        className={`font-thin tracking-[0.25em] text-amber-400 font-sans leading-none uppercase ${currentSize.title}`}
      >
        Mavie
      </span>
      {showSubtitle && (
        <span
          className={`font-semibold tracking-[0.35em] text-amber-400/90 font-mono uppercase flex items-center ${
            layout === 'vertical' ? 'justify-center' : 'justify-start'
          } ${currentSize.sub}`}
        >
          SOLUTION
        </span>
      )}
    </div>
  );
};

