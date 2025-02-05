import { InfoCircledIcon } from '@radix-ui/react-icons';
import { Callout, Box } from '@radix-ui/themes';
import { $toasts, useToast, type Toast } from '../hooks/use-toast';
import { CSSProperties, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

function ToastDisplay({ toast }: { toast: Toast }) {
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    setTimeout(() => setOpen(true), 10);

    setTimeout(() => {
      setOpen(false);

      setTimeout(() => {
        $toasts.set($toasts.get().filter((t) => t.id !== toast.id));
      }, 1000);
    }, (toast.timer ?? 2500));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Callout.Root
      highContrast
      data-open={open}
      className='fixed w-96 max-w-[min(30rem,calc(100vw-3rem))] m-6 transition ease-in-out duration-200 bottom-0 right-0 translate-x-[--x] translate-y-[--y] data-[open=false]:translate-x-[150%] backdrop-blur-3xl'
    >
      <Callout.Icon>
        <InfoCircledIcon />
      </Callout.Icon>
      <Callout.Text>{toast.title}</Callout.Text>
      {toast.description && (
        <Callout.Text className='text-xs'>
          {toast.description}
        </Callout.Text>
      )}
    </Callout.Root>
  );
}

function Toaster() {
  const { toasts } = useToast();
  const location = useLocation();

  useEffect(() => {
    $toasts.set([]);
  }, [ location.pathname ]);

  return (
    <Box>
      {toasts.map((toast, index) => (
        <Box key={toast.id} style={{'--x': '0', '--y': `-${index * 110}%`} as CSSProperties}>
          <ToastDisplay toast={toast} />
        </Box>
      ))}
    </Box>
  );
}

export default Toaster;
