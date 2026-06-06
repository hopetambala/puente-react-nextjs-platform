import React from 'react';

import styles from './skeleton.module.css';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
  className?: string;
}

export default function Skeleton({ width, height, style, className }: SkeletonProps) {
  return (
    <span
      className={`${styles.skeleton}${className ? ` ${className}` : ''}`}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}
