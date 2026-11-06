import type {
  Job,
  NewTechnician,
  ProfileInput,
  Technician,
  TechnicianProfile,
  TechnicianSummary,
  WorkingDay,
} from './technician.model';

export const TECHNICIAN_REPOSITORY = Symbol('TECHNICIAN_REPOSITORY');

export class DuplicateEmailError extends Error {}

export interface TechnicianRepository {
  /** Throws DuplicateEmailError when the login email is already used (case-insensitive). */
  create(t: NewTechnician): Promise<Technician>;
  list(filter?: { active?: boolean }): Promise<TechnicianSummary[]>;
  get(id: string): Promise<TechnicianProfile | null>;
  updateProfile(id: string, p: ProfileInput): Promise<Technician | null>;
  /** Replaces the whole schedule in one transaction. */
  replaceWeeklyHours(id: string, days: WorkingDay[]): Promise<void>;
  /** Idempotent. */
  addDayOff(id: string, day: string): Promise<void>;
  removeDayOff(id: string, day: string): Promise<void>;
  /** Changes only the technician's own flag; never touches the jobs they hold. */
  setActive(id: string, active: boolean): Promise<Technician | null>;
  listAssignable(): Promise<Technician[]>;
  /** Jobs held by the technician in any status, optionally only those scheduled on `onDate`. */
  jobsHeldBy(id: string, onDate?: string): Promise<Job[]>;
  /** Returns null when the job does not exist. */
  reassignJob(jobId: string, technicianId: string): Promise<Job | null>;
}
