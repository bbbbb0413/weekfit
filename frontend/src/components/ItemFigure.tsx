// 기능: 옷 한 벌 표시. 사진이 없으면 색 견본으로 대신

import type { Clothing } from '../api/types';
import { COLOR_HEX } from '../lib/labels';
import { photoOf } from '../lib/photos';

export function ItemFigure({ item, className = '' }: { item: Clothing; className?: string }) {
  const src = photoOf(item);
  if (src) {
    return <img className={`figure figure--photo ${className}`} src={src} alt="" loading="lazy" />;
  }
  const color = item.colors[0];
  return <span className={`figure figure--swatch ${className}`} style={{ background: color ? COLOR_HEX[color] : undefined }} aria-hidden="true" />;
}
