// 기능: 서버 상태 조회 & 변경 훅

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { ClothingCreateRequest, ClothingSpec, EventInput, ItemStatus, Tpo, WearLogRequest } from '../api/types';

export const keys = {
  clothes: ['clothes'] as const,
  weather: ['weather'] as const,
  events: (from: string, to: string) => ['events', from, to] as const,
  weekPlan: (start: string) => ['weekPlan', start] as const,
};

export function useClothes() {
  return useQuery({ queryKey: keys.clothes, queryFn: api.listClothes });
}

export function useWeather() {
  return useQuery({ queryKey: keys.weather, queryFn: api.weather, staleTime: 30 * 60_000, retry: 1 });
}

export function useEvents(from: string, to: string) {
  return useQuery({ queryKey: keys.events(from, to), queryFn: () => api.listEvents(from, to) });
}

// 서버가 AI 설명을 아직 만드는 중이면(explanationPending) 코디는 먼저 보여 주고 설명이 채워질 때까지 다시 물어봄
const EXPLANATION_POLL_MS = 5_000;

export function useWeekPlan(start: string) {
  return useQuery({
    queryKey: keys.weekPlan(start),
    queryFn: () => api.weekPlan(start),
    refetchInterval: (query) => (query.state.data?.explanationPending ? EXPLANATION_POLL_MS : false),
  });
}

// 보드에 올린 옷이 바뀔 때마다 다시 평가. 새 점수가 올 때까지 이전 점수 유지
// tpo 를 주면 일정 대신 그 옷차림 기준으로 평가
export function useEvaluation(itemIds: string[], date: string, eventId: string | undefined, enabled: boolean, tpo?: Tpo) {
  const ids = [...itemIds].sort();
  return useQuery({
    queryKey: ['evaluation', date, tpo ?? eventId ?? null, ids],
    queryFn: () => api.evaluate(tpo ? { itemIds: ids, date, tpo } : { itemIds: ids, date, eventId }),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useWearLogs(date: string) {
  return useQuery({ queryKey: ['wearLogs', date], queryFn: () => api.listWearLogs(date, date) });
}

// 옷이나 일정이 바뀌면 주간 계획도 다시 계산
function useRefresh() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: keys.clothes });
    client.invalidateQueries({ queryKey: ['events'] });
    client.invalidateQueries({ queryKey: ['weekPlan'] });
    client.invalidateQueries({ queryKey: ['evaluation'] });
    client.invalidateQueries({ queryKey: ['wearLogs'] });
  };
}

export function useCreateClothing() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: ClothingCreateRequest) => api.createClothing(body), onSuccess: refresh });
}

export function useUpdateClothing() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: ({ id, body }: { id: string; body: ClothingSpec }) => api.updateClothing(id, body), onSuccess: refresh });
}

export function useSyncEvents() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ from, to, events }: { from: string; to: string; events: EventInput[] }) => api.syncEvents(from, to, events),
    onSuccess: refresh,
  });
}

export function useDeleteClothing() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.deleteClothing(id), onSuccess: refresh });
}

export function useChangeStatus() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Exclude<ItemStatus, 'DRYING'> }) => api.changeStatus(id, status),
    onSuccess: refresh,
  });
}

export function useStartLaundry() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (itemIds: string[]) => api.startLaundry(itemIds), onSuccess: refresh });
}

export function useRecordWear() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: WearLogRequest) => api.recordWear(body), onSuccess: refresh });
}

export function useCreateEvent() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: EventInput) => api.createEvent(body), onSuccess: refresh });
}

export function useDeleteEvent() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (id: string) => api.deleteEvent(id), onSuccess: refresh });
}
