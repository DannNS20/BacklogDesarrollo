import type { ReactNode } from 'react';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}

export function Field({ label, hint, error, required, className = '', children }: FieldProps) {
  return (
    <label className={`block ${className}`}>
      <span className="label">
        {label}
        {required && <span className="ml-0.5 text-terracota-600">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs font-medium text-red-600">{error}</span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-stone-500">{hint}</span>
      )}
    </label>
  );
}

export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}
