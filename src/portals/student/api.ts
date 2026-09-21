import type { startAuthentication, startRegistration } from '@simplewebauthn/browser';
import type { AttendanceRecord, BiometricCredential, CheckPayload, CheckResult, StudentOverview } from '../../../shared/contracts';
import { api } from '../../api/http';

type RegistrationOptions = Parameters<typeof startRegistration>[0]['optionsJSON'];
type AuthenticationOptions = Parameters<typeof startAuthentication>[0]['optionsJSON'];

export const studentApi = {
  overview: () => api<StudentOverview>('/student/overview'),
  attendance: () => api<AttendanceRecord[]>('/student/attendance'),
  check: (payload: CheckPayload) => api<CheckResult>('/student/attendance', { body: payload }),
  evidenceUrl: (recordId: string, kind: 'in' | 'out') => `/api/student/attendance/${recordId}/evidence/${kind}`,

  biometrics: () => api<BiometricCredential[]>('/student/biometrics'),
  registrationOptions: () => api<RegistrationOptions>('/student/biometrics/register-options', { method: 'POST' }),
  registerBiometric: (response: unknown, label: string) => api<BiometricCredential[]>('/student/biometrics', { body: { response, label } }),
  removeBiometric: (id: string) => api<BiometricCredential[]>(`/student/biometrics/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  authenticationOptions: () => api<AuthenticationOptions>('/student/biometrics/auth-options', { method: 'POST' }),

  requestPasswordReset: (body: { code: string; email: string; message: string }) =>
    api<{ ok: boolean }>('/auth/student/password-reset', { body }),
};
