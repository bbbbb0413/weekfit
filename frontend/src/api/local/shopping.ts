// 기능: 쇼핑몰 검색 링크 생성. 백엔드 ShoppingLinks & ShoppingMall 과 같은 규칙

import type { Category, MallLink, ShoppingMall, SortOrder } from '../types';

const SORT_LABEL: Record<SortOrder, string> = {
  PRICE_ASC: '낮은 가격순',
  POPULAR: '인기순',
};

const MALLS: Array<{ mall: ShoppingMall; mallName: string; sort: SortOrder; template: string }> = [
  { mall: 'MUSINSA', mallName: '무신사', sort: 'PRICE_ASC', template: 'https://www.musinsa.com/search/goods?keyword={q}&gf=A&sortCode=LOW_PRICE' },
  { mall: 'ZIGZAG', mallName: '지그재그', sort: 'PRICE_ASC', template: 'https://zigzag.kr/search?keyword={q}&order=PRICE_ASC' },
  { mall: 'CM29', mallName: '29CM', sort: 'PRICE_ASC', template: 'https://www.29cm.co.kr/store/search?keyword={q}&sort=LOWEST_PRICE&page=1' },
  { mall: 'WCONCEPT', mallName: 'W컨셉', sort: 'PRICE_ASC', template: 'https://display.wconcept.co.kr/search?keyword={q}&sort=LOWPRICE' },
  {
    mall: 'ELEVENST',
    mallName: '11번가',
    sort: 'POPULAR',
    template: 'https://search.11st.co.kr/pc/total-search?kwd={q}&tabId=TOTAL_SEARCH&sortCd=NP&pageNo=1',
  },
];

// 무신사는 종류를 지정해야 낮은 가격순 상위에 다른 종류가 섞이지 않음
const MUSINSA_CATEGORY: Partial<Record<Category, string>> = {
  TOP: '001',
  OUTER: '002',
  BOTTOM: '003',
  DRESS: '100',
  SHOES: '103',
};

export const MAX_QUERY = 50;

// 특수문자 제거 & 공백 정리 & 길이 제한
export function sanitizeQuery(raw: string): string {
  const cleaned = raw
    .replace(/[^\p{L}\p{N} -]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.length > MAX_QUERY ? cleaned.slice(0, MAX_QUERY).trim() : cleaned;
}

export function buildMallLinks(query: string, category?: Category | null): MallLink[] {
  const encoded = encodeURIComponent(query);
  return MALLS.map(({ mall, mallName, sort, template }) => {
    let url = template.replace('{q}', encoded);
    const code = category ? MUSINSA_CATEGORY[category] : undefined;
    if (mall === 'MUSINSA' && code) url += `&category=${code}`;
    return { mall, mallName, sort, sortLabel: SORT_LABEL[sort], url };
  });
}
