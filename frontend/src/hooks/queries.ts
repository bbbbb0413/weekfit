// 기능: 서버 상태 조회 & 변경 훅

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api';
import type { ClothingCreateRequest, EventInput, ItemStatus, WearLogRequest } from '../api/types';

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

export function useWeekPlan(start: string) {
  return useQuery({ queryKey: keys.weekPlan(start), queryFn: () => api.weekPlan(start) });
}

// 보드에 올린 옷이 바뀔 때마다 다시 평가. 새 점수가 올 때까지 이전 점수 유지
export function useEvaluation(itemIds: string[], date: string, eventId: string | undefined, enabled: boolean) {
  const ids = [...itemIds].sort();
  return useQuery({
    queryKey: ['evaluation', date, eventId ?? null, ids],
    queryFn: () => api.evaluate({ itemIds: ids, date, eventId }),
    enabled,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

// 옷이나 일정이 바뀌면 주간 계획도 다시 계산
function useRefresh() {
  const client = useQueryClient();
  return () => {
    client.invalidateQueries({ queryKey: keys.clothes });
    client.invalidateQueries({ queryKey: ['events'] });
    client.invalidateQueries({ queryKey: ['weekPlan'] });
    client.invalidateQueries({ queryKey: ['evaluation'] });
  };
}

export function useCreateClothing() {
  const refresh = useRefresh();
  return useMutation({ mutationFn: (body: ClothingCreateRequest) => api.createClothing(body), onSuccess: refresh });
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
