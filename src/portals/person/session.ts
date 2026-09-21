import type { PersonSession } from '../../../shared/contracts';
import { createPortalSession } from '../../auth/portalSession';

export interface PersonCredentials {
  identifier: string;
  password: string;
}

export const { SessionProvider, useSession, RequireSession } = createPortalSession<PersonSession, PersonCredentials>({
  portal: 'person',
  sessionPath: '/person/session',
  loginPath: '/auth/person/login',
  logoutPath: '/auth/person/logout',
});
