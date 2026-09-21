import type { StaffProfile } from '../../../shared/contracts';
import { createPortalSession } from '../../auth/portalSession';

export interface StaffCredentials {
  email: string;
  password: string;
}

export const { SessionProvider, useSession, RequireSession } = createPortalSession<StaffProfile, StaffCredentials>({
  portal: 'staff',
  sessionPath: '/staff/session',
  loginPath: '/auth/staff/login',
  logoutPath: '/auth/staff/logout',
});
