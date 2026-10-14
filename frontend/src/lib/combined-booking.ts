import { apiFetch } from "./api";
import type { AvailabilityResponse } from "./types";

export function getCombinedAvailability({ serviceIds, memberId, date }: { serviceIds: string[]; memberId: string | null; date: string }): Promise<AvailabilityResponse> {
  const query = new URLSearchParams({ date });
  serviceIds.forEach(id => query.append("service_ids", id));
  if (memberId) query.set("team_member_id", memberId);
  return apiFetch<AvailabilityResponse>(`/public/booking/availability?${query}`, { credentials: "omit" });
}

export function getBookingDays(fromDate: string, toDate: string) {
  const query = new URLSearchParams({ from_date: fromDate, to_date: toDate });
  return apiFetch<{ date: string; is_open: boolean }[]>(`/public/booking/days?${query}`, { credentials: "omit" });
}
