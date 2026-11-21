// 기능: 백엔드 호출 공통 처리 (사용자 식별 헤더, 응답 envelope 해제, 오류 변환)

import { userId } from '../lib/session';

export const API_MODE: 'mock' | 'real' = import.meta.env.VITE_API_MODE === 'real' ? 'real' : 'mock';
// true 면 X-User-Id 를 보내지 않아 모든 접속자가 백엔드의 데모 사용자 옷장을 함께 씀
export const SHARED_DEMO_USER = import.meta.env.VITE_SHARED_DEMO_USER === 'true';
export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }

  // 아직 구현되지 않은 엔드포인트 여부
  get notReady(): boolean {
    return this.status === 404 || this.status === 405 || this.status === 501;
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  error: string | null;
}

const STATUS_MESSAGE: Record<number, string> = {
  413: '사진 용량이 너무 커요. 10MB 이하로 올려주세요.',
  429: '요청이 많아 잠시 쉬어야 해요. 조금 뒤에 다시 시도해 주세요.',
  503: '외부 서비스가 잠시 응답하지 않아요. 조금 뒤에 다시 시도해 주세요.',
};

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(SHARED_DEMO_USER ? {} : { 'X-User-Id': userId() }),
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError('서버에 연결하지 못했어요. 백엔드가 켜져 있는지 확인해 주세요.', 0);
  }

  let envelope: Envelope<T> | null = null;
  try {
    envelope = (await response.json()) as Envelope<T>;
  } catch {
    // 본문이 없는 오류 응답
  }

  if (!response.ok || !envelope?.success) {
    const message = envelope?.error ?? STATUS_MESSAGE[response.status] ?? '요청을 처리하지 못했어요.';
    throw new ApiError(message, response.status);
  }
  return envelope.data;
}

export function get<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const query = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value));
  });
  const suffix = query.size > 0 ? `?${query}` : '';
  return request<T>(`${path}${suffix}`);
}

export function send<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  return request<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) });
}

export function upload<T>(path: string, fields: Record<string, string | Blob | undefined>): Promise<T> {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined) form.append(key, value);
  });
  return request<T>(path, { method: 'POST', body: form });
}

// 서버가 주는 상대 경로 이미지 주소를 절대 주소로 변환
export function imageSrc(url: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('http')) return url;
  return `${API_BASE_URL}${url}`;
}
