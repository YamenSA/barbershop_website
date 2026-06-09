export type UUID = string;

export interface Service {
  id: UUID;
  name: string;
  duration_minutes: number;
  price_cents: number;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: UUID;
  name: string;
  bio?: string;
  photo_url?: string;
  is_active: boolean;
  services?: Service[];
  created_at: string;
  updated_at: string;
}

export interface SalonHours {
  id: UUID;
  day_of_week: number;
  is_open: boolean;
  open_time?: string;
  close_time?: string;
}

export interface SalonClosure {
  id: UUID;
  date: string;
  reason?: string;
  created_at: string;
  updated_at: string;
}

export interface WorkingHours {
  id: UUID;
  team_member_id: UUID;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export interface DayOverride {
  id: UUID;
  team_member_id: UUID;
  date: string;
  override_type: 'day_off' | 'extra_hours';
  custom_start_time?: string;
  custom_end_time?: string;
  reason?: string;
  created_at: string;
}

export interface Appointment {
  id: UUID;
  team_member_id: UUID;
  service_id: UUID;
  customer_id?: UUID;
  guest_name?: string;
  guest_phone?: string;
  starts_at: string;
  ends_at: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: UUID;
  name: string;
  email: string;
  phone?: string;
  last_active_at: string;
  anonymized_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AdminOut {
  username: string;
}

export interface TokenResponse {
  username: string;
}

export interface AppointmentSummary {
  id: UUID;
  team_member_id: UUID;
  service_id: UUID;
  customer_id?: UUID;
  guest_name?: string;
  guest_phone?: string;
  starts_at: string;
  ends_at: string;
  status: Appointment['status'];
}

export interface WorkingMemberSummary {
  team_member_id: UUID;
  name: string;
  start_time: string;
  end_time: string;
}

export interface DashboardResponse {
  date: string;
  appointments: AppointmentSummary[];
  working_today: WorkingMemberSummary[];
}
