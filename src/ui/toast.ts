import { createContext, useContext } from 'react';

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastContextValue {
  notify: (message: string, kind?: ToastKind) => void;
}

export const ToastContext = createContext<ToastContextValue>({ notify: () => {} });

export const useToast = () => useContext(ToastContext);
