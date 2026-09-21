// Basado en Stepper de React Bits, adaptado a la identidad CUTlaquepaque:
// colores institucionales, etiquetas por paso y validación antes de avanzar.
import React, { Children, useLayoutEffect, useRef, useState, type HTMLAttributes, type ReactNode } from 'react';
import { AnimatePresence, motion, type Variants } from 'motion/react';

interface StepperProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  stepLabels?: string[];
  /** Se llama antes de avanzar; si devuelve false, el paso no cambia */
  canProceed?: (step: number) => boolean;
  backButtonText?: string;
  nextButtonText?: string;
  completeButtonText?: string;
  completing?: boolean;
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepLabels = [],
  canProceed = () => true,
  backButtonText = 'Atrás',
  nextButtonText = 'Continuar',
  completeButtonText = 'Finalizar',
  completing = false,
  className = '',
  ...rest
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState<number>(initialStep);
  const [direction, setDirection] = useState<number>(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isLastStep = currentStep === totalSteps;

  const goTo = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
    onStepChange(step);
  };

  const handleNext = () => {
    if (!canProceed(currentStep)) return;
    if (isLastStep) onFinalStepCompleted();
    else goTo(currentStep + 1);
  };

  return (
    <div className={`rounded-xl border border-stone-200 bg-white shadow-[0_1px_2px_rgba(28,25,23,0.05)] ${className}`} {...rest}>
      <div className="flex w-full items-start px-6 pt-6 pb-1 sm:px-8">
        {stepsArray.map((_, index) => {
          const stepNumber = index + 1;
          return (
            <React.Fragment key={stepNumber}>
              <StepIndicator
                step={stepNumber}
                label={stepLabels[index]}
                currentStep={currentStep}
                onClickStep={clicked => {
                  if (clicked < currentStep) goTo(clicked);
                  else if (clicked === currentStep + 1 && canProceed(currentStep)) goTo(clicked);
                }}
              />
              {index < totalSteps - 1 && <StepConnector isComplete={currentStep > stepNumber} />}
            </React.Fragment>
          );
        })}
      </div>

      <StepContentWrapper currentStep={currentStep} direction={direction}>
        {stepsArray[currentStep - 1]}
      </StepContentWrapper>

      <div className={`flex items-center border-t border-stone-100 px-6 py-4 sm:px-8 ${currentStep !== 1 ? 'justify-between' : 'justify-end'}`}>
        {currentStep !== 1 && (
          <button
            type="button"
            onClick={() => goTo(currentStep - 1)}
            disabled={completing}
            className="h-10 rounded-lg px-3 text-sm font-medium text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 disabled:opacity-50"
          >
            {backButtonText}
          </button>
        )}
        <button
          type="button"
          onClick={handleNext}
          disabled={completing}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-verde-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-verde-700 active:scale-[.98] disabled:opacity-60"
        >
          {completing && <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {isLastStep ? completeButtonText : nextButtonText}
        </button>
      </div>
    </div>
  );
}

function StepContentWrapper({ currentStep, direction, children }: { currentStep: number; direction: number; children: ReactNode }) {
  const [parentHeight, setParentHeight] = useState<number>(0);

  return (
    <motion.div style={{ position: 'relative', overflow: 'hidden' }} animate={{ height: parentHeight }} transition={{ type: 'spring', duration: 0.4 }}>
      <AnimatePresence initial={false} mode="sync" custom={direction}>
        <SlideTransition key={currentStep} direction={direction} onHeightReady={height => setParentHeight(height)}>
          {children}
        </SlideTransition>
      </AnimatePresence>
    </motion.div>
  );
}

function SlideTransition({ children, direction, onHeightReady }: { children: ReactNode; direction: number; onHeightReady: (height: number) => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    onHeightReady(element.offsetHeight);
    // El contenido puede crecer (p. ej. al agregar días al horario)
    const observer = new ResizeObserver(() => onHeightReady(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, [onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4 }}
      style={{ position: 'absolute', left: 0, right: 0, top: 0 }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants: Variants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? '50%' : '-50%', opacity: 0 }),
};

export function Step({ children }: { children: ReactNode }) {
  return <div className="px-6 py-6 sm:px-8">{children}</div>;
}

function StepIndicator({ step, label, currentStep, onClickStep }: { step: number; label?: string; currentStep: number; onClickStep: (clicked: number) => void }) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  return (
    <button type="button" onClick={() => step !== currentStep && onClickStep(step)} className="flex shrink-0 flex-col items-center gap-2 outline-none">
      <motion.div
        animate={status}
        initial={false}
        variants={{
          inactive: { backgroundColor: '#e7e5e4', color: '#78716c' },
          active: { backgroundColor: '#1e6b3a', color: '#ffffff' },
          complete: { backgroundColor: '#1e6b3a', color: '#ffffff' },
        }}
        transition={{ duration: 0.3 }}
        className={`flex size-9 items-center justify-center rounded-full font-display text-sm font-bold ring-4 ${status === 'active' ? 'ring-verde-100' : 'ring-white'}`}
      >
        {status === 'complete' ? <CheckIcon className="size-4" /> : <span>{step}</span>}
      </motion.div>
      {label && (
        <span className={`hidden max-w-28 text-center text-xs font-semibold sm:block ${status === 'inactive' ? 'text-stone-400' : 'text-stone-800'}`}>
          {label}
        </span>
      )}
    </button>
  );
}

function StepConnector({ isComplete }: { isComplete: boolean }) {
  const lineVariants: Variants = {
    incomplete: { width: 0, backgroundColor: 'transparent' },
    complete: { width: '100%', backgroundColor: '#1e6b3a' },
  };

  return (
    <div className="relative mx-2 mt-[17px] h-0.5 flex-1 overflow-hidden rounded bg-stone-200">
      <motion.div className="absolute top-0 left-0 h-full" variants={lineVariants} initial={false} animate={isComplete ? 'complete' : 'incomplete'} transition={{ duration: 0.4 }} />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
