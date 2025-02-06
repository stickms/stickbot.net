import { useStore } from '@nanostores/react';
import { atom } from 'nanostores';

// Credits: https://github.com/radix-ui/primitives/issues/2804#issuecomment-216182370

const MAX_TOASTS = 5;

type UserToastProps = {
  title: string;
  description?: string;
  color?: string;
  duration?: number;
};

export type ToastProps = UserToastProps & { id: number };

const $toasts = atom<ToastProps[]>([]);
let toast_id = 0;

export function removeToast(id: number) {
  $toasts.set($toasts.get().filter((toast) => toast.id !== id));
}

export function clearToasts() {
  $toasts.set([]);
}

export function useToast() {
  const toasts = useStore($toasts);

  const toast = (toast: UserToastProps) => {
    const id = toast_id++;
    const timer = 2_500;

    const max_toasts = window.innerWidth < 768 ? 1 : MAX_TOASTS;
    $toasts.set(
      [{ id, timer, ...toast }, ...$toasts.get()].slice(0, max_toasts)
    );
  };

  return {
    toasts,
    toast
  };
}
