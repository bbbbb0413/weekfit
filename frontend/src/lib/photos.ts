// 기능: 옷 사진 주소. 서버 사진이 없으면 데모 옷장 이름에 맞는 기본 사진 사용

import { imageSrc } from '../api/client';
import type { Clothing } from '../api/types';

const files = import.meta.glob<string>('../assets/closet/*.webp', { eager: true, query: '?url', import: 'default' });

const BY_NAME: Record<string, string> = {
  '화이트 옥스포드 셔츠': 'white-oxford-shirt',
  '네이비 셔츠': 'navy-shirt',
  '그레이 맨투맨': 'gray-sweatshirt',
  '블랙 라운드 니트': 'black-knit',
  '베이지 반팔 티셔츠': 'beige-tshirt',
  '스트라이프 긴팔 티셔츠': 'stripe-longsleeve',
  '블랙 슬랙스': 'black-slacks',
  '연청 청바지': 'light-jeans',
  '베이지 치노 팬츠': 'beige-chinos',
  '그레이 트레이닝 팬츠': 'gray-joggers',
  '네이비 울 코트': 'navy-wool-coat',
  '카키 바람막이': 'khaki-windbreaker',
  '그레이 가디건': 'gray-cardigan',
  '블랙 숏패딩': 'black-padding',
  '화이트 스니커즈': 'white-sneakers',
  '블랙 더비 슈즈': 'black-derby',
  '트레킹화': 'trekking-shoes',
};

export function photoOf(item: Pick<Clothing, 'imageUrl' | 'name'>): string | null {
  const uploaded = imageSrc(item.imageUrl);
  if (uploaded) return uploaded;
  const slug = item.name ? BY_NAME[item.name] : undefined;
  return slug ? (files[`../assets/closet/${slug}.webp`] ?? null) : null;
}
