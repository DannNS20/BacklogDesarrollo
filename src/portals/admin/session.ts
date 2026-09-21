import type { AdminProfile } from '../../../shared/contracts';
import { createPortalSession } from '../../auth/portalSession';

export interface AdminCredentials {
  email: string;
  password: string;
}

export const { SessionProvider, useSession, RequireSession } = createPortalSession<AdminProfile, AdminCredentials>({
  portal: 'admin',
  sessionPath: '/admin/session',
  loginPath: '/auth/admin/login',
  logoutPath: '/auth/admin/logout',
});
