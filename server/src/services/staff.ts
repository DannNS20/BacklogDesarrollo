import type { StaffProfile, StaffRole } from '../../../shared/contracts.ts';

export interface StaffRow {
  id: string;
  email: string;
  full_name: string;
  area: string;
  role: StaffRole;
  password_hash: string;
  active: number;
  created_at: string;
  last_login_at: string | null;
}

export const toStaffProfile = (row: StaffRow): StaffProfile => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  area: row.area,
  role: row.role,
  active: row.active === 1,
  createdAt: row.created_at,
  lastLoginAt: row.last_login_at,
});
