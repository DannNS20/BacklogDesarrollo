import Threads from '../components/reactbits/Threads/Threads';

/** Fondo institucional animado para portada y pantallas de acceso */
export function BrandBackdrop({ variant = 'student' }: { variant?: 'student' | 'admin' }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className={`absolute inset-0 ${variant === 'admin' ? 'brand-hero-admin' : 'brand-hero'}`} />
      <div className="absolute inset-x-0 bottom-0 h-[85%] opacity-45 mix-blend-soft-light">
        <Threads color={[1, 1, 1]} amplitude={1.2} distance={0.15} />
      </div>
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_55%,rgb(0_0_0/0.18))]" />
    </div>
  );
}
