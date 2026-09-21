import type {
  AdminDashboard,
  AdminInput,
  AdminListItem,
  AdminMeta,
  AdminProfile,
  AppNotification,
  AttendanceRow,
  GeneratedPassword,
  MailResult,
  ManualRecordInput,
  NotificationSummary,
  RecordInput,
  RecordStatus,
  StudentDetail,
  StudentInput,
  StudentSummary,
} from '../../../shared/contracts';
import { api } from '../../api/http';

export type AttendanceStatusFilter = 'all' | 'open' | 'valid' | 'rejected' | 'late';

export interface AttendanceFilter {
  from?: string;
  to?: string;
  studentId?: string;
  status?: AttendanceStatusFilter;
}

const query = (params: object) => {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== '');
  return entries.length ? `?${new URLSearchParams(entries as [string, string][])}` : '';
};

export const adminApi = {
  dashboard: () => api<AdminDashboard>('/admin/dashboard'),
  meta: () => api<AdminMeta>('/admin/meta'),

  summary: () => api<NotificationSummary>('/admin/notifications/summary'),
  notifications: (filter: 'all' | 'unread') => api<AppNotification[]>(`/admin/notifications${query({ filter })}`),
  markRead: (id: string) => api<null>(`/admin/notifications/${id}/read`, { method: 'POST' }),
  markAllRead: () => api<null>('/admin/notifications/read-all', { method: 'POST' }),
  dismissResetRequest: (id: string) => api<null>(`/admin/password-requests/${id}/dismiss`, { method: 'POST' }),

  students: () => api<StudentSummary[]>('/admin/students'),
  student: (id: string) => api<StudentDetail>(`/admin/students/${id}`),
  createStudent: (input: StudentInput) => api<{ student: StudentDetail } & GeneratedPassword>('/admin/students', { body: input }),
  updateStudent: (id: string, input: StudentInput) => api<StudentDetail>(`/admin/students/${id}`, { method: 'PUT', body: input }),
  setStudentActive: (id: string, active: boolean) => api<StudentDetail>(`/admin/students/${id}/status`, { method: 'PATCH', body: { active } }),
  resetStudentPassword: (id: string) => api<GeneratedPassword>(`/admin/students/${id}/password`, { method: 'POST' }),
  emailStudent: (id: string, subject: string, body: string) => api<MailResult>(`/admin/students/${id}/email`, { body: { subject, body } }),
  removeStudentBiometrics: (id: string) => api<StudentDetail>(`/admin/students/${id}/biometrics`, { method: 'DELETE' }),

  attendance: (filter: AttendanceFilter) => api<AttendanceRow[]>(`/admin/attendance${query(filter)}`),
  createRecord: (input: ManualRecordInput) => api<AttendanceRow>('/admin/attendance', { body: input }),
  updateRecord: (id: string, input: RecordInput) => api<AttendanceRow>(`/admin/attendance/${id}`, { method: 'PUT', body: input }),
  reviewRecord: (id: string, status: RecordStatus, note: string) =>
    api<AttendanceRow>(`/admin/attendance/${id}/review`, { method: 'PATCH', body: { status, note } }),
  deleteRecord: (id: string) => api<null>(`/admin/attendance/${id}`, { method: 'DELETE' }),
  evidenceUrl: (id: string, kind: 'in' | 'out') => `/api/admin/attendance/${id}/evidence/${kind}`,

  admins: () => api<AdminListItem[]>('/admin/admins'),
  createAdmin: (input: AdminInput) => api<{ admin: AdminProfile } & GeneratedPassword>('/admin/admins', { body: input }),
  updateAdmin: (id: string, input: AdminInput) => api<AdminProfile>(`/admin/admins/${id}`, { method: 'PUT', body: input }),
  setAdminActive: (id: string, active: boolean) => api<AdminProfile>(`/admin/admins/${id}/status`, { method: 'PATCH', body: { active } }),
  resetAdminPassword: (id: string) => api<GeneratedPassword>(`/admin/admins/${id}/password`, { method: 'POST' }),
  emailAdmin: (id: string, subject: string, body: string) => api<MailResult>(`/admin/admins/${id}/email`, { body: { subject, body } }),
};
