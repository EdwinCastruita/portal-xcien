// Contrato de `wispi_attendance/controllers/api.py` (ver README del módulo).

export type GeofenceState =
  | "inside"
  | "outside"
  | "no_gps"
  | "recorded"
  | "no_center"
  | "not_applicable";

export type Employee = {
  id: number;
  name: string;
  job_title: string;
  department: string;
  manager: string;
  work_location: string;
  work_email: string;
  login: string;
  user_type: "internal" | "portal";
  company_id: number;
  company_name: string;
  image: string | null;
  tz: string;
};

/** break_start / break_end: salida temporal (comida, tienda, …) y regreso, sin selfie. */
export type PunchAction =
  | "check_in"
  | "check_out"
  | "break_start"
  | "break_end";

export type AttendanceState = "checked_in" | "on_break" | "checked_out";

/** Motivos de salida temporal que ofrece Odoo ("lunch" es el botón de comida). */
export type OutReason = { value: string; label: string };

export type Status = {
  employee: Employee;
  attendance_state: AttendanceState;
  next_action: PunchAction;
  /** Opcionales: un estado guardado en caché por una versión anterior no los trae. */
  allowed_actions?: PunchAction[];
  check_in: string | null;
  last_check_out: string | null;
  /** Salida temporal en curso (solo en `on_break`). */
  break_since?: string | null;
  break_reason?: string | null;
  break_reason_label?: string | null;
  out_reasons?: OutReason[];
  /** Registros del empleado que RH tiene por revisar (p. ej. cierre automático). */
  pending_review?: number;
  today: {
    first_check_in: string | null;
    last_check_out: string | null;
    records: number;
  };
  worked_hours_today: number;
  require_selfie: boolean;
  gps_required: boolean;
  geofence_mode: "home" | "field" | "none";
  server_time: string;
  offline_max_hours: number;
};

export type Feedback = {
  type: "success" | "warning" | "danger";
  title: string;
  message: string;
} | null;

export type PunchResponse = Status & {
  success: true;
  duplicate: boolean;
  offline: boolean;
  action_done: PunchAction;
  attendance_id: number;
  time: string;
  geofence_state: GeofenceState | false;
  distance_m: number;
  feedback: Feedback;
};

export type HistoryRecord = {
  id: number;
  check_in: string;
  check_out: string | null;
  worked_hours: number;
  in_geofence_state: GeofenceState | null;
  out_geofence_state: GeofenceState | null;
  in_selfie: boolean;
  out_selfie: boolean;
  mode: string;
  in_offline: boolean;
  out_offline: boolean;
  out_mode?: string | null;
  out_reason?: string | null;
  out_reason_label?: string | null;
  out_reason_note?: string | null;
  in_break_return?: boolean;
  auto_closed?: boolean;
  review_state?: "to_review" | "reviewed" | null;
};

export type HistoryResponse = {
  success: true;
  days: number;
  records: HistoryRecord[];
};
