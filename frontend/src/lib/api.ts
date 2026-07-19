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
  PublicAppointmentCreate,
  PublicAppointmentRead,
  AvailabilityResponse,
  CancellationView,
  MeOut,
  AppointmentListOut,
  AccountAppointmentRead,
  RegisterRequest,
  LoginRequest,
  RescheduleRequest,
  ProfileUpdate,
  Promotion,
  PromotionCreate,
  PromotionUpdate,
  PublicPromotion,
} from './types';

const PUBLIC_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * API-Basis-URL, kontextabhängig aufgelöst:
 * - Browser: relativer Pfad (z. B. /api/v1) — läuft same-origin über den
 *   Next.js-Rewrite-Proxy (next.config.ts) zum Backend.
 * - Server (RSC/SSR): Node-fetch kann relative URLs nicht auflösen, und der
 *   Rewrite greift nur für eingehende HTTP-Requests, nicht für fetch() im
 *   selben Prozess. Daher wird hier BACKEND_INTERNAL_URL (Runtime-Env,
 *   z. B. http://backend:8000) vorangestellt.
 */
function apiBase(): string {
  if (typeof window !== 'undefined') return PUBLIC_API_BASE;
  if (/^https?:\/\//.test(PUBLIC_API_BASE)) return PUBLIC_API_BASE;
  const origin = (process.env.BACKEND_INTERNAL_URL || 'http://backend:8000').replace(/\/+$/, '');
  return `${origin}${PUBLIC_API_BASE}`;
}

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
  const url = `${apiBase()}${endpoint}`;

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
    let errorDetail = 'Ein Fehler ist aufgetreten';
    let errorData: unknown;
    try {
      errorData = await response.json();
      if (errorData && typeof (errorData as any).detail === 'string') {
        errorDetail = (errorData as any).detail;
      } else if (errorData && Array.isArray((errorData as any).detail)) {
        errorDetail = (errorData as any).detail.map((d: any) => d.msg).join(', ') || errorDetail;
      }
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
  customer_id?: string;
  from_date?: string;
  to_date?: string;
}) => {
  const qs = new URLSearchParams();
  if (params.team_member_id) qs.set('team_member_id', params.team_member_id);
  if (params.customer_id) qs.set('customer_id', params.customer_id);
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

export interface CustomerListOut {
  items: Customer[];
  total: number;
}

export const getCustomers = (params: { search?: string; limit?: number; offset?: number; include_anonymized?: boolean }) => {
  const qs = new URLSearchParams();
  if (params.search) qs.set('search', params.search);
  if (params.limit !== undefined) qs.set('limit', params.limit.toString());
  if (params.offset !== undefined) qs.set('offset', params.offset.toString());
  if (params.include_anonymized) qs.set('include_anonymized', 'true');
  return apiFetch<CustomerListOut>(`/customers?${qs}`);
};

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  const res = await getCustomers({ search: query, limit: 10 });
  return res.items;
};

// --- Public Read (server-side, unauthenticated, fetch-cache revalidate=60) ---

async function publicFetch<T>(endpoint: string): Promise<T> {
  const url = `${apiBase()}/public${endpoint}`;
  // Timeout: Ein hängendes Backend darf das SSR-Rendering nicht blockieren —
  // die Aufrufer fangen den Fehler und rendern mit leeren Daten weiter.
  const res = await fetch(url, {
    next: { revalidate: 60 },
    signal: AbortSignal.timeout(5000),
  } as RequestInit);
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

// --- Public Booking ---

export const getPublicAvailability = (params: {
  service_id: string;
  team_member_id?: string | null;
  date: string;
}): Promise<AvailabilityResponse> => {
  const qs = new URLSearchParams();
  qs.set('service_id', params.service_id);
  if (params.team_member_id) qs.set('team_member_id', params.team_member_id);
  qs.set('date', params.date);
  return apiFetch<AvailabilityResponse>(`/public/booking/availability?${qs}`, {
    credentials: 'omit',
  });
};

export const createPublicAppointment = (data: PublicAppointmentCreate): Promise<PublicAppointmentRead> =>
  apiFetch<PublicAppointmentRead>('/public/booking/appointments', {
    method: 'POST',
    body: JSON.stringify(data),
    credentials: 'omit',
  });

export const getCancellation = (token: string): Promise<CancellationView> =>
  apiFetch<CancellationView>(`/public/booking/cancel/${token}`, { credentials: 'omit' });

export const cancelAppointment = (token: string): Promise<CancellationView> =>
  apiFetch<CancellationView>(`/public/booking/cancel/${token}`, {
    method: 'POST',
    credentials: 'omit',
  });

// --- Salon Profile (Admin) ---

export const getAdminSalonProfile = () =>
  apiFetch<SalonProfile>('/salon-profile');

export const updateAdminSalonProfile = (data: SalonProfileUpdate) =>
  apiFetch<SalonProfile>('/salon-profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });

// --- Customer Account (Phase 5) ---

export const accountRegister = (data: RegisterRequest): Promise<{ message: string }> =>
  apiFetch('/account/register', { method: 'POST', body: JSON.stringify(data) });

export const accountVerify = (token: string): Promise<{ verified: boolean }> =>
  apiFetch(`/account/verify/${token}`, { method: 'POST' });

export const accountLogin = (data: LoginRequest): Promise<MeOut> =>
  apiFetch('/account/login', { method: 'POST', body: JSON.stringify(data) });

export const accountLogout = (): Promise<{ message: string }> =>
  apiFetch('/account/logout', { method: 'POST' });

export const accountMe = (): Promise<MeOut> =>
  apiFetch('/account/me');

export const accountForgotPassword = (email: string): Promise<{ message: string }> =>
  apiFetch('/account/password/forgot', { method: 'POST', body: JSON.stringify({ email }) });

export const accountResetPassword = (token: string, password: string): Promise<{ reset: boolean }> =>
  apiFetch(`/account/password/reset/${token}`, { method: 'POST', body: JSON.stringify({ password }) });

export const accountListAppointments = (): Promise<AppointmentListOut> =>
  apiFetch('/account/appointments');

export const accountCancelAppointment = (id: string): Promise<AccountAppointmentRead> =>
  apiFetch(`/account/appointments/${id}/cancel`, { method: 'POST' });

export const accountRescheduleAppointment = (
  id: string,
  data: RescheduleRequest,
): Promise<AccountAppointmentRead> =>
  apiFetch(`/account/appointments/${id}/reschedule`, { method: 'POST', body: JSON.stringify(data) });

export const accountUpdateProfile = (data: ProfileUpdate): Promise<MeOut> =>
  apiFetch('/account/profile', { method: 'PATCH', body: JSON.stringify(data) });

export const accountExportData = async (): Promise<void> => {
  const resp = await fetch(`${apiBase()}/account/export`, { credentials: 'include' });
  if (!resp.ok) throw new Error('Export failed');
  const blob = await resp.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'meine-daten.json';
  a.click();
  URL.revokeObjectURL(url);
};

export const accountDeleteAccount = (): Promise<unknown> =>
  apiFetch('/account/', { method: 'DELETE' });

// --- Marketing: Promotions (Admin) ---

export const getPromotions = () =>
  apiFetch<Promotion[]>('/promotions');

export const createPromotion = (data: PromotionCreate) =>
  apiFetch<Promotion>('/promotions', { method: 'POST', body: JSON.stringify(data) });

export const updatePromotion = (id: string, data: PromotionUpdate) =>
  apiFetch<Promotion>(`/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const deletePromotion = (id: string) =>
  apiFetch<void>(`/promotions/${id}`, { method: 'DELETE' });

// --- Marketing: Promotions (Public) ---

export const getPublicPromotions = () =>
  publicFetch<PublicPromotion[]>('/promotions');
