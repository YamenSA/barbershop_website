import type {
  Service,
  TeamMember,
  SalonHours,
  SalonClosure,
  Appointment,
  Customer,
  PublicServiceRead,
  PublicTeamMemberRead,
  PublicSalonHoursRead,
  SalonProfile,
  SalonProfileUpdate,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    ...options,
    credentials: options.credentials || 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    let errorDetail = 'An error occurred';
    let errorData: unknown;
    try {
      errorData = await response.json();
      errorDetail = (errorData as { detail?: string }).detail
        ? String((errorData as { detail: string }).detail)
        : errorDetail;
    } catch {
      // Not JSON
    }
    throw new ApiError(response.status, errorDetail, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// --- Services ---

export const getServices = (activeOnly = true) =>
  apiFetch<Service[]>(`/services?active_only=${activeOnly}`);

export const createService = (data: Omit<Service, 'id' | 'created_at' | 'updated_at'>) =>
  apiFetch<Service>('/services', { method: 'POST', body: JSON.stringify(data) });

export const updateService = (id: string, data: Partial<Service>) =>
  apiFetch<Service>(`/services/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deactivateService = (id: string) =>
  apiFetch<void>(`/services/${id}`, { method: 'DELETE' });

// --- Team Members ---

export const getTeamMembers = (activeOnly = true) =>
  apiFetch<TeamMember[]>(`/team-members?active_only=${activeOnly}`);

export const createTeamMember = (data: Omit<TeamMember, 'id' | 'services' | 'created_at' | 'updated_at'>) =>
  apiFetch<TeamMember>('/team-members', { method: 'POST', body: JSON.stringify(data) });

export const updateTeamMember = (id: string, data: Partial<TeamMember>) =>
  apiFetch<TeamMember>(`/team-members/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const assignServices = (memberId: string, serviceIds: string[]) =>
  apiFetch<TeamMember>(`/team-members/${memberId}/services`, {
    method: 'PUT',
    body: JSON.stringify({ service_ids: serviceIds }),
  });

// --- Salon Hours ---

export const getSalonHours = () => apiFetch<SalonHours[]>('/salon-hours');

export const updateSalonHours = (
  dayOfWeek: number,
  data: { is_open?: boolean; open_time?: string | null; close_time?: string | null },
) =>
  apiFetch<SalonHours>(`/salon-hours/${dayOfWeek}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// --- Salon Closures ---

export const getSalonClosures = () => apiFetch<SalonClosure[]>('/salon-closures');

export const createSalonClosure = (data: { date: string; reason?: string; force?: boolean }) =>
  apiFetch<SalonClosure>('/salon-closures', { method: 'POST', body: JSON.stringify(data) });

export const deleteSalonClosure = (id: string) =>
  apiFetch<void>(`/salon-closures/${id}`, { method: 'DELETE' });

// --- Appointments ---

export const getAppointments = (params: {
  team_member_id?: string;
  from_date?: string;
  to_date?: string;
}) => {
  const qs = new URLSearchParams();
  if (params.team_member_id) qs.set('team_member_id', params.team_member_id);
  if (params.from_date) qs.set('from_date', params.from_date);
  if (params.to_date) qs.set('to_date', params.to_date);
  return apiFetch<Appointment[]>(`/appointments?${qs}`);
};

export interface AppointmentCreatePayload {
  team_member_id: string;
  service_id: string;
  customer_id?: string;
  guest_name?: string;
  guest_phone?: string;
  starts_at: string;
  notes?: string;
  admin_override?: boolean;
}

export const createAppointment = (data: AppointmentCreatePayload) =>
  apiFetch<Appointment>('/appointments', { method: 'POST', body: JSON.stringify(data) });

export interface AppointmentUpdatePayload {
  starts_at?: string;
  team_member_id?: string;
  notes?: string;
}

export const patchAppointment = (id: string, data: AppointmentUpdatePayload) =>
  apiFetch<Appointment>(`/appointments/${id}`, { method: 'PATCH', body: JSON.stringify(data) });

export const updateAppointmentStatus = (
  id: string,
  status: Appointment['status'],
) =>
  apiFetch<Appointment>(`/appointments/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// --- Customers ---

export const searchCustomers = (query: string) =>
  apiFetch<Customer[]>(`/customers?search=${encodeURIComponent(query)}`);

// --- Public Read (server-side, unauthenticated, ISR revalidate=60) ---

async function publicFetch<T>(endpoint: string): Promise<T> {
  const url = `${API_BASE_URL}/public${endpoint}`;
  const res = await fetch(url, { next: { revalidate: 60 } } as RequestInit);
  if (!res.ok) {
    throw new Error(`Public API ${endpoint} responded ${res.status}`);
  }
  return res.json();
}

export const getPublicSalonProfile = () =>
  publicFetch<SalonProfile>('/salon-profile');

export const getPublicSalonHours = () =>
  publicFetch<PublicSalonHoursRead[]>('/salon-hours');

export const getPublicServices = () =>
  publicFetch<PublicServiceRead[]>('/services');

export const getPublicTeamMembers = () =>
  publicFetch<PublicTeamMemberRead[]>('/team');

// --- Salon Profile (Admin) ---

export const getAdminSalonProfile = () =>
  apiFetch<SalonProfile>('/salon-profile');

export const updateAdminSalonProfile = (data: SalonProfileUpdate) =>
  apiFetch<SalonProfile>('/salon-profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
