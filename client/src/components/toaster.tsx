import { InfoCircledIcon } from "@radix-ui/react-icons";
import { Callout, Flex } from "@radix-ui/themes";
import useToast from "../hooks/use-toast";

function Toaster() {
  const { toasts } = useToast();

  return (
    <Flex className='fixed bottom-6 right-6 items-center justify-center flex-wrap gap-y-4 flex-col'>
      {
        toasts.map((toast) => {
          return (
            <Callout.Root 
              key={toast.id}
              data-open={toast.open}
              className='min-w-96 transition ease-in-out duration-200 data-[open=false]:translate-x-[calc(100%+1.5rem)] data-[open=true]:translate-x-0'
            >
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              {toast.title && <Callout.Text>{toast.title}</Callout.Text>}
              {toast.description && <Callout.Text className='text-xs'>{toast.description}</Callout.Text>}
            </Callout.Root>
          );
        })
      }
    </Flex>
  );
}

export default Toaster;
