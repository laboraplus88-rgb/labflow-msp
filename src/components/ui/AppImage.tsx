'use client';

import React, { useState, useCallback, ImgHTMLAttributes } from 'react';

interface AppImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  unoptimized?: boolean;
  fallback?: string;
}

export default function AppImage({
  src,
  alt,
  width,
  height,
  priority = false,
  unoptimized = false,
  fallback = '/assets/images/no_image.png',
  className = '',
  onError,
  ...rest
}: AppImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [errored, setErrored] = useState(false);

  const handleError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
      if (!errored && fallback && currentSrc !== fallback) {
        setCurrentSrc(fallback);
        setErrored(true);
      }
      onError?.(e);
    },
    [errored, fallback, currentSrc, onError]
  );

  // SVG logo placeholder when no real asset
  if (src.includes('app_logo') || src.endsWith('.svg')) {
    return (
      <div
        className={`flex items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold ${className}`}
        style={{ width: width || 40, height: height || 40, fontSize: (width || 40) * 0.35 }}
        aria-label={alt}
      >
        LF
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      width={width}
      height={height}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleError}
      className={className}
      {...rest}
    />
  );
}
