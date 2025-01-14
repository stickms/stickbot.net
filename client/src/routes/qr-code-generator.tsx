import { Card, Flex, Select, Skeleton, Text, TextField, Box } from "@radix-ui/themes";
import { useEffect, useRef, useState } from "react";
import { QRCodeToDataURLOptions, toDataURL } from 'qrcode';
import useToast from "../hooks/use-toast";

function QrCode({ data }: { data?: string }) {
  const { toast } = useToast();

  const imageRef = useRef<HTMLImageElement>(null);

  const [ generated, setGenerated ] = useState<boolean>(false);
  const [ type, setType ] = useState<string>('image/png');
  const [ width, setWidth ] = useState<number>(256);
  const [ margin, setMargin ] = useState<number>(1);
  const [ errorCorrection, setErrorCorrection ] = useState<string>('M');
  const [ lightColor, setLightColor ] = useState<string>('#ffffffff');
  const [ darkColor, setDarkColor ] = useState<string>('#000000ff');

  useEffect(() => {
    if (!imageRef.current || !data) {
      setGenerated(false);
      return;
    }

    if (width > 2048 || width < 32) {
      toast({
        title: 'Invalid QR Code Specs',
        description: 'Width must be >= 32px and <= 2048px'
      });
      return;
    }

    if (margin > 16 || margin < 0) {
      toast({
        title: 'Invalid QR Code Specs',
        description: 'Margin must be >= 0px and <= 16px'
      });
      return;
    }

    const opts = {
      margin: margin,
      width: width,
      type: type,
      rendererOpts: {
        quality: 1
      },
      color: {
        light: lightColor,
        dark: darkColor
      },
      errorCorrectionLevel: errorCorrection
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    toDataURL(data, opts as any as QRCodeToDataURLOptions)
      .then((value) => {
        imageRef.current!.src = value;
      })
      .catch((e) => {
        console.log(e);
        toast({
          title: 'Could not generate QR code',
          description: 'Please try again later'
        });
      })
      .finally(() => setGenerated(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, errorCorrection, margin, type, width, lightColor, darkColor]);


  return (
    <Card className='flex p-4 items-stretch justify-center gap-4 max-w-[80vw] flex-wrap mb-8'>
      {!generated && <Skeleton className='w-72 h-72' />}

      <img
        ref={imageRef}      
        data-open={generated}
        className='data-[open=false]:hidden data-[open=true]:block w-72 h-72 object-fill'
      />

      <Flex className='flex-col justify-between items-stretch gap-4'>
        <Flex className='items-center justify-between gap-4'>
          <Text>Size (px)</Text>
          <TextField.Root
            className='w-24'
            value={width}
            onChange={(e) => {
              if (e && !isNaN(+e.target.value)) {
                setWidth(+e.target.value);
              }
            }}
          />
        </Flex>

        <Flex className='items-center justify-between gap-4'>
          <Text>Margin (px)</Text>
          <TextField.Root
            className='w-24'
            value={margin}
            onChange={(e) => {
              if (e && !isNaN(+e.target.value)) {
                setMargin(+e.target.value);
              }
            }}
          />
        </Flex>

        <Flex className='items-center justify-between gap-4'>
          <Text>Error Correction</Text>
          <Select.Root
            onValueChange={setErrorCorrection}
            defaultValue={errorCorrection}
          >
            <Select.Trigger />
            <Select.Content>
              <Select.Group>
                <Select.Label>Error Correction</Select.Label>
                <Select.Item value='L'>Low</Select.Item>
                <Select.Item value='M'>Medium</Select.Item>
                <Select.Item value='Q'>Quartile</Select.Item>
                <Select.Item value='H'>High</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>

        <Flex className='items-center justify-between gap-4'>
          <Text>Light Color</Text>
          <Box style={{backgroundColor: lightColor}} className={`rounded-lg h-8 w-16`}>
            <input
              type='color'
              className='opacity-0 cursor-pointer size-full'
              onChange={(e) => setLightColor(e.target.value)}
            />
          </Box>
        </Flex>

        <Flex className='items-center justify-between gap-4'>
          <Text>Dark Color</Text>
          <Box style={{backgroundColor: darkColor}} className={`rounded-lg h-8 w-16`}>
            <input
              type='color'
              className='opacity-0 cursor-pointer size-full'
              onChange={(e) => setDarkColor(e.target.value)}
            />
          </Box>
        </Flex>

        <Flex className='items-center justify-between gap-4'>
          <Text>File Type</Text>
          <Select.Root
            onValueChange={setType}
            defaultValue={type}
          >
            <Select.Trigger />
            <Select.Content>
              <Select.Group>
                <Select.Label>File Type</Select.Label>
                <Select.Item value='image/png'>PNG</Select.Item>
                <Select.Item value='image/jpeg'>JPG</Select.Item>
                <Select.Item value='image/webp'>WEBP</Select.Item>
              </Select.Group>
            </Select.Content>
          </Select.Root>
        </Flex>
      </Flex>
    </Card>
  );
}

function QrCodeGenerator() {
  const [data, setData] = useState<string>();

  return (
    <Flex className='items-center justify-center flex-col gap-y-16'>
      <Text className='mt-[20vh] text-3xl text-center'>QR Code Generator</Text>

      <Flex className='items-center justify-center gap-4'>
        <TextField.Root 
          className='w-96 max-w-[80vw]'
          placeholder='Enter text or url...'
          maxLength={128}
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </Flex>

      <QrCode data={data} />
    </Flex>
  );
}

export default QrCodeGenerator;
