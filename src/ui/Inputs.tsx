import { Eye, EyeOff, Lock, type LucideIcon } from 'lucide-react';
import { useState, type InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function IconInput({ icon: Icon, className = '', ...props }: InputProps & { icon: LucideIcon }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
      <input {...props} className={`input pl-9 ${className}`} />
    </div>
  );
}

export function PasswordInput({ className = '', ...props }: Omit<InputProps, 'type'>) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
      <input {...props} type={visible ? 'text' : 'password'} className={`input px-9 ${className}`} />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 rounded-md p-1.5 text-stone-400 transition hover:text-stone-700"
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
