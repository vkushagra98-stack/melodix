import React from 'react';
import type { AudioSourceType } from '../../types/music';

interface SourceBadgeProps {
  source?: AudioSourceType;
  quality?: string;
  size?: 'sm' | 'md';
}

export const SourceBadge: React.FC<SourceBadgeProps> = () => {
  return null;
};
