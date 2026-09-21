import { useOutletContext } from 'react-router-dom';
import type { AdminMeta, AlertSummary, StaffProfile } from '../../../shared/contracts';

export interface StaffOutletContext {
  staff: StaffProfile;
  meta: AdminMeta | undefined;
  alerts: AlertSummary | undefined;
  refreshAlerts: () => void;
  reloadMeta: () => void;
}

export const useStaffContext = () => useOutletContext<StaffOutletContext>();
