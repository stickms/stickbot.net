import { useEffect, useState } from 'react';

// Inspired by chadcn/ui use-toast (thanks)

const TOAST_LIMIT = 1;
export const TOAST_HIDE_TIME = 2500;
const TOAST_REMOVE_TIME = 1000;

type ToastProps = {
  title?: string;
  description?: string;
};

type ToasterToast = ToastProps & {
  id: string;
  open: boolean;
};

type ToasterState = {
  toasts: ToasterToast[];
};

let toast_count = 0;

const listeners: Array<(state: ToasterState) => void> = [];
let memory_state: ToasterState = { toasts: [] };

function useToast() {
  const [state, setState] = useState<ToasterState>(memory_state);

  useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, [state]);

  function genId() {
    toast_count = (toast_count + 1) % Number.MAX_SAFE_INTEGER;
    return toast_count.toString();
  }

  function setToasts(toasts: ToasterToast[]) {
    memory_state = { toasts };
    listeners.forEach((listener) => {
      listener(memory_state);
    });
  }

  function showToast(id: string) {
    setToasts(
      memory_state.toasts.map((t) => {
        return t.id == id ? { ...t, open: true } : t;
      })
    );
  }

  function hideToast(id: string) {
    setToasts(
      memory_state.toasts.map((t) => {
        return t.id == id ? { ...t, open: false } : t;
      })
    );

    setTimeout(() => {
      removeToast(id);
    }, TOAST_REMOVE_TIME);
  }

  function removeToast(id: string) {
    setToasts(memory_state.toasts.filter((t) => t.id != id));
  }

  function toast({ ...props }: ToastProps) {
    const new_toast: ToasterToast = {
      ...props,
      id: genId(),
      open: false
    };

    setToasts([new_toast, ...memory_state.toasts].slice(0, TOAST_LIMIT));

    setTimeout(() => {
      showToast(new_toast.id);
    }, 10);

    setTimeout(() => {
      hideToast(new_toast.id);
    }, TOAST_HIDE_TIME);
  }

  return {
    ...state,
    toast
  };
}

export default useToast;
