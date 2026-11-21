// 기능: 옷 한 벌 표시. 사진이 있으면 사진, 없으면 그림

import type { Clothing } from '../api/types';
import { photoOf } from '../lib/photos';
import { GarmentArt } from './Garment';

export function ItemFigure({ item, className = '' }: { item: Clothing; className?: string }) {
  const src = photoOf(item);
  if (src) {
    return <img className={`figure figure--photo ${className}`} src={src} alt="" loading="lazy" />;
  }
  return <GarmentArt item={item} className={`figure figure--art figure--${item.category.toLowerCase()} ${className}`} />;
}
