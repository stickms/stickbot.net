import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Callout, Box } from '@radix-ui/themes';
import { clearToasts, removeToast, useToast, type ToastProps } from '../hooks/use-toast';
import { ComponentProps, CSSProperties, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function ToastDisplay({ toast }: { toast: ToastProps }) {
  const [open, setOpen] = useState<boolean>(false);

  const duration = toast.duration ?? 2500;

  useEffect(() => {
    setTimeout(() => setOpen(true), 10);

    setTimeout(() => {
      setOpen(false);

      setTimeout(() => {
        removeToast(toast.id);
      }, 1000);
    }, duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Callout.Root
      highContrast
      data-open={open}
      color={toast.color as ComponentProps<typeof Callout.Root>['color']}
      className='fixed w-96 overflow-hidden max-w-[min(30rem,calc(100vw-3rem))] m-6 transition ease-in-out duration-200 bottom-0 right-0 translate-x-[--x] translate-y-[--y] data-[open=false]:translate-x-[150%] backdrop-blur-3xl'
    >
      <Box
        data-open={open}
        style={{'transitionDuration': `${duration}ms`}}
        className='fixed bottom-0 left-0 bg-[--gray-a4] -col-start-3 w-full h-2 origin-[left_center] ease-linear data-[open=true]:scale-x-0'
      />
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>{toast.title}</Callout.Text>
      {toast.description && (
        <Callout.Text className='text-xs'>{toast.description}</Callout.Text>
      )}
    </Callout.Root>
  );
}

function Toaster() {
  const { toasts } = useToast();
  const location = useLocation();

  useEffect(() => {
    clearToasts();
  }, [location.pathname]);

  return (
    <Box>
      {toasts.map((toast, index) => (
        <Box
          key={toast.id}
          style={{ '--x': '0', '--y': `-${index * 110}%` } as CSSProperties}
        >
          <ToastDisplay toast={toast} />
        </Box>
      ))}
    </Box>
  );
}

export default Toaster;
