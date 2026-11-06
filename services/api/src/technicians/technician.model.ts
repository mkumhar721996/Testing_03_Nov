export interface WorkingDay {
  /** 0 (Sunday) to 6 (Saturday). */
  weekday: number;
  /** HH:MM, 24-hour. */
  start: string;
  end: string;
}

export interface ProfileInput {
  name?: string;
  loginEmail?: string;
  phone?: string | null;
  serviceArea?: string | null;
  notes?: string | null;
}

export interface NewTechnician {
  name: string;
  loginEmail: string;
  phone?: string;
  serviceArea?: string;
  notes?: string;
}

export interface Technician {
  id: string;
  name: string;
  loginEmail: string;
  phone: string | null;
  serviceArea: string | null;
  notes: string | null;
  active: boolean;
}

export interface TechnicianSummary extends Technician {
  workingDays: number[];
  openJobCount: number;
  nextDayOff: string | null;
}

export interface TechnicianProfile extends Technician {
  workingHours: WorkingDay[];
  /** YYYY-MM-DD, ascending. */
  daysOff: string[];
}

export interface Job {
  id: string;
  title: string;
  customer: string;
  /** YYYY-MM-DD */
  scheduledDate: string;
  scheduledTime: string | null;
  technicianId: string | null;
  status: string;
}

export const CLOSED_JOB_STATUSES = ['completed', 'cancelled'];
