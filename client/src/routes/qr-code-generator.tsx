import {
  Card,
  Flex,
  Select,
  Skeleton,
  Text,
  TextField,
  Box,
  Slider,
  Tooltip
} from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';
import {
  QRCodeDataURLType,
  QRCodeErrorCorrectionLevel,
  toDataURL
} from 'qrcode';
import { TypeAnimation } from 'react-type-animation';

function QrCode({ data }: { data?: string }) {
  const imageRef = useRef<HTMLImageElement>(null);

  const [loading, setLoading] = useState<boolean>(true);

  const [type, setType] = useState<string>('image/png');
  const [size, setSize] = useState<number>(512);
  const [margin, setMargin] = useState<number>(1);
  const [level, setLevel] = useState<string>('M');
  const [fgColor, setFgColor] = useState<string>('#000000ff');
  const [bgColor, setBgColor] = useState<string>('#ffffffff');

  useEffect(() => {
    if (!imageRef.current || !data) {
      setLoading(true);
      return;
    }

    const opts = {
      margin: margin,
      width: size,
      type: type as QRCodeDataURLType,
      rendererOpts: {
        quality: 1
      },
      color: {
        dark: fgColor,
        light: bgColor
      },
      errorCorrectionLevel: level as QRCodeErrorCorrectionLevel
    };

    toDataURL(data, opts)
      .then((value) => {
        imageRef.current!.src = value;
        setLoading(false);
      })
      .catch(() => setLoading(true));
  }, [data, type, size, level, margin, bgColor, fgColor]);

  return (
    <Card className='flex p-4 items-stretch justify-center gap-4 max-w-[80vw] flex-wrap'>
      <Skeleton className='size-72' loading={loading} />

      <img
        ref={imageRef}
        data-hide={loading}
        className='size-72 object-fill data-[hide=true]:hidden'
      />

      <Flex className='flex-col justify-between items-stretch w-72 gap-4'>
        <Tooltip
          content={`${size} px`}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <Flex className='items-center justify-between gap-4'>
            <Text>Size</Text>
            <Slider
              className='max-w-44'
              value={[size]}
              min={128}
              max={1024}
              step={32}
              onValueChange={(e) => setSize(e[0])}
            />
          </Flex>
        </Tooltip>

        <Tooltip
          content={`${margin} px`}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <Flex className='items-center justify-between gap-4'>
            <Text>Margin</Text>
            <Slider
              className='max-w-44'
              value={[margin]}
              min={0}
              max={8}
              onValueChange={(e) => setMargin(e[0])}
            />
          </Flex>
        </Tooltip>

        <Flex className='items-center justify-between gap-4'>
          <Text>Error Correction</Text>
          <Select.Root onValueChange={setLevel} defaultValue={level}>
            <Select.Trigger className='w-28' />
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
          <Box
            style={{ backgroundColor: bgColor }}
            className={`rounded-lg h-8 w-28`}
          >
            <input
              type='color'
              className='opacity-0 cursor-pointer size-full'
              onChange={(e) => setBgColor(e.target.value)}
            />
          </Box>
        </Flex>

        <Flex className='items-center justify-between gap-4'>
          <Text>Dark Color</Text>
          <Box
            style={{ backgroundColor: fgColor }}
            className={`rounded-lg h-8 w-28`}
          >
            <input
              type='color'
              className='opacity-0 cursor-pointer size-full'
              onChange={(e) => setFgColor(e.target.value)}
            />
          </Box>
        </Flex>

        <Flex className='items-center justify-between gap-4'>
          <Text>File Type</Text>
          <Select.Root onValueChange={setType} defaultValue={type}>
            <Select.Trigger className='w-28' />
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
    <Flex className='flex-col items-center pt-40 pb-16 gap-16'>
      <Text className='text-3xl text-center font-[Bipolar] h-8'>
        <TypeAnimation sequence={[100, 'QR CODE GENERATOR']} cursor={false} />
      </Text>

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
