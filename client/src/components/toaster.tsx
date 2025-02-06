import { Box, Card, Flex, IconButton, Text } from '@radix-ui/themes';
import { Cross1Icon, InfoCircledIcon } from '@radix-ui/react-icons';
import { clearToasts, removeToast, useToast, type ToastProps } from '../hooks/use-toast';
import { CSSProperties, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';

function ToastDisplay({ toast }: { toast: ToastProps }) {
  const [open, setOpen] = useState<boolean>(false);
  const timer_ref = useRef<NodeJS.Timeout | undefined>();

  const duration = toast.duration ?? 2500;

  function clearToast() {
    removeToast(toast.id);
    clearTimeout(timer_ref.current);
  }

  useEffect(() => {
    setTimeout(() => setOpen(true), 10);

    timer_ref.current = setTimeout(() => {
      setOpen(false);

      setTimeout(() => {
        clearToast();
      }, 1000);
    }, duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  return (
    <Card
      data-open={open}
      className='fixed w-96 overflow-hidden max-w-[min(30rem,calc(100vw-3rem))] m-6 transition ease-in-out duration-200 bottom-0 right-0 translate-x-[--x] translate-y-[--y] data-[open=false]:translate-x-[150%]'
    >
      {/* Progress bar */}
      <Box
        data-open={open}
        style={{'transitionDuration': `${duration}ms`}}
        className='fixed bottom-0 left-0 bg-[--gray-a4] -col-start-3 w-full h-2 origin-[left_center] ease-linear data-[open=true]:scale-x-0'
      />

      <Flex className='flex-col gap-2 mb-1 text-wrap text-[--focus-11]'>
        {/* Icon & Close button */}
        <Flex className='justify-between gap-2'>
          <Flex className='items-center gap-2 '>
            <InfoCircledIcon />
            <Text className='text-sm'>{toast.title}</Text>
          </Flex>
          <IconButton variant='ghost' onClick={clearToast}>
            <Cross1Icon />
          </IconButton>
        </Flex>

        {toast.description && (
          <Text className='text-xs'>{toast.description}</Text>
        )}
      </Flex>
    </Card>
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
