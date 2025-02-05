import { useStore } from '@nanostores/react';
import { atom } from 'nanostores';

// Credits: https://github.com/radix-ui/primitives/issues/2804#issuecomment-216182370

const MAX_TOASTS = 5;

type ToastProps = {
  title: string;
  description?: string;
  color?: string;
  timer?: number;
}

export type Toast = ToastProps & {
  id?: number;
  open?: boolean;
};

export const $toasts = atom<Toast[]>([]);
let toast_id = 0;

export function useToast() {
  const toasts = useStore($toasts);

  const toast = (toast: ToastProps) => {
    const id = toast_id++;
    const timer = 2_500;
    $toasts.set([ { id, timer, ...toast }, ...$toasts.get() ].slice(0, MAX_TOASTS));
  };

  return {
    toasts,
    toast
  };
}
