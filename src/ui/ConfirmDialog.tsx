import { useState, type ReactNode } from 'react';
import { errorMessage } from '../api/http';
import { Button, type ButtonVariant } from './Button';
import { Modal, ModalBody, ModalFooter } from './Modal';
import { useToast } from './toast';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  variant?: ButtonVariant;
  onCancel: () => void;
  onConfirm: () => Promise<void>;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmar', variant = 'danger', onCancel, onConfirm }: ConfirmDialogProps) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } catch (error) {
      toast.notify(errorMessage(error), 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <ModalBody className="text-sm leading-relaxed text-stone-600">{message}</ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant={variant} loading={busy} onClick={run}>
          {confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
