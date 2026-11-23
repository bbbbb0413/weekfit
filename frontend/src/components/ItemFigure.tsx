// 기능: 옷 한 벌 표시. 사진이 없거나 못 불러오면 기본 사진, 그것도 없으면 색 견본으로 대신

import { useState } from 'react';
import type { Clothing } from '../api/types';
import { COLOR_HEX } from '../lib/labels';
import { defaultPhotoOf, photoOf } from '../lib/photos';

export function ItemFigure({ item, className = '' }: { item: Clothing; className?: string }) {
  // 못 불러온 주소를 모아 두고 다음 후보로 넘어감
  const [failed, setFailed] = useState<string[]>([]);
  const src = [photoOf(item), defaultPhotoOf(item.name)].find((u): u is string => Boolean(u) && !failed.includes(u as string));
  if (src) {
    return <img className={`figure figure--photo ${className}`} src={src} alt="" loading="lazy" onError={() => setFailed((f) => [...f, src])} />;
  }
  const color = item.colors[0];
  return <span className={`figure figure--swatch ${className}`} style={{ background: color ? COLOR_HEX[color] : undefined }} aria-hidden="true" />;
}
