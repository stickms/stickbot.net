import { useTheme } from 'next-themes';

function Background() {
  const { theme } = useTheme();

  const bgImage = theme === 'dark' ? 'url(/bg-dark.jpg)' : 'url(/bg-light.png)';

  return (
    <div
      className='fixed top-0 left-0 size-full bg-no-repeat bg-center bg-cover -z-50'
      style={{ backgroundImage: bgImage }}
    />
  );
}

export default Background;
