import type { StudentSession } from '../../../shared/contracts';
import { createPortalSession } from '../../auth/portalSession';

export interface StudentCredentials {
  identifier: string;
  password: string;
}

export const { SessionProvider, useSession, RequireSession } = createPortalSession<StudentSession, StudentCredentials>({
  portal: 'student',
  sessionPath: '/student/session',
  loginPath: '/auth/student/login',
  logoutPath: '/auth/student/logout',
});
