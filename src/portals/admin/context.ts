import { useOutletContext } from 'react-router-dom';
import type { AdminMeta, AdminProfile, NotificationSummary } from '../../../shared/contracts';

export interface AdminOutletContext {
  admin: AdminProfile;
  meta: AdminMeta | undefined;
  summary: NotificationSummary | undefined;
  refreshSummary: () => void;
}

export const useAdminContext = () => useOutletContext<AdminOutletContext>();
