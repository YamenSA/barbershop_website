export type UUID = string;
export type TargetGroup = 'HERREN' | 'DAMEN' | 'KINDER';
export type ServiceKind = 'SCHNITT' | 'BART' | 'FARBE' | 'STYLING' | 'SONSTIGES';

export interface Service {
  id: UUID;
  name: string;
  duration_minutes: number;
  price_cents: number;
  /** True => price_cents is a starting price ("ab X €"). */
  price_is_from: boolean;
  description?: string;
  is_active: boolean;
  target_group: TargetGroup;
  service_kind: ServiceKind;
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

// --- Public Read Types (unauthenticated endpoints) ---

export interface PublicServiceRead {
  id: UUID;
  name: string;
  duration_minutes: number;
  price_cents: number;
  /** True => price_cents is a starting price ("ab X €"). */
  price_is_from: boolean;
  description?: string;
  target_group: TargetGroup;
  service_kind: ServiceKind;
}

export interface PublicTeamMemberRead {
  id: UUID;
  name: string;
  bio?: string;
  photo_url?: string | null;
  services: Array<{ id: UUID; name: string }>;
}

export interface PublicSalonHoursRead {
  day_of_week: number;
  is_open: boolean;
  open_time?: string | null;
  close_time?: string | null;
}

export interface SalonProfile {
  name: string;
  street: string;
  postal_code: string;
  city: string;
  country: string;
  phone: string;
  email?: string | null;
}

export interface SalonProfileUpdate {
  name?: string;
  street?: string;
  postal_code?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string | null;
}

// --- Public Booking Types ---

export interface PublicCustomerCreate {
  name: string;
  email: string;
  phone?: string;
}

export interface PublicAppointmentCreate {
  service_id: UUID;
  team_member_id: UUID | null;
  starts_at: string;
  customer: PublicCustomerCreate;
  privacy_acknowledged: boolean;
}

export interface PublicSlot {
  starts_at: string;
  ends_at: string;
  team_member_id: UUID;
  team_member_name: string;
}

export interface AvailabilityResponse {
  date: string;
  slots: PublicSlot[];
}

export interface PublicAppointmentRead {
  id: UUID;
  service_id: UUID;
  team_member_id: UUID;
  starts_at: string;
  ends_at: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  cancellation_token: string;
  payment_note: string;
}

export interface CancellationView {
  id: UUID;
  service_name: string;
  team_member_name: string;
  starts_at: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  cancellable: boolean;
  cancellation_deadline?: string;
}

// --- Customer Account Types (Phase 5) ---

export interface MeOut {
  id: UUID;
  name: string;
  email: string;
  phone?: string | null;
}

export interface AccountAppointmentRead {
  id: UUID;
  service_name: string;
  team_member_name: string;
  starts_at: string;
  ends_at: string;
  status: string;
  cancellable: boolean;
  reschedulable: boolean;
}

export interface AppointmentListOut {
  upcoming: AccountAppointmentRead[];
  past: AccountAppointmentRead[];
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface RescheduleRequest {
  starts_at: string;
  team_member_id?: UUID | null;
}

export interface ProfileUpdate {
  name?: string | null;
  phone?: string | null;
}

// --- Marketing: Promotions (Phase 6 / US3) ---

export type PromotionStatus = 'visible' | 'scheduled' | 'expired' | 'hidden';

export interface Promotion {
  id: UUID;
  title: string;
  description: string;
  starts_on: string;
  ends_on: string;
  is_active: boolean;
  effective_status: PromotionStatus;
  created_at: string;
  updated_at: string;
}

export interface PromotionCreate {
  title: string;
  description: string;
  starts_on: string;
  ends_on: string;
  is_active?: boolean;
}

export interface PromotionUpdate {
  title?: string;
  description?: string;
  starts_on?: string;
  ends_on?: string;
  is_active?: boolean;
}

export interface PublicPromotion {
  id: UUID;
  title: string;
  description: string;
  starts_on: string;
  ends_on: string;
}

// --- Gallery (Phase 6 / US4) ---

export interface GalleryItem {
  id: string;
  beforeSrc: string;
  afterSrc: string;
  alt: string;
  /** Non-empty = consent documented; empty/missing = must NOT be published (SC-005 / FR-016) */
  consentProofId: string;
  publishedAt?: string;
}

// --- Reviews Snapshot (Phase 7 / US5) ---
// G3: First-party text only; no live aggregate rating; no Google widget/script.

export interface Review {
  id: string;
  author: string;
  text: string;
  /** ISO date string (YYYY-MM-DD) */
  date: string;
}

export interface ReviewsSnapshot {
  profileUrl: string;
  writeReviewUrl: string;
  notice: string;
  reviews: Review[];
}
