import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';

import Root from './routes/root.tsx';
import ErrorPage from './error-page.tsx';
import SteamProfile from './routes/steam-profile.tsx';

import '@radix-ui/themes/styles.css';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />
  },
  {
    path: '/profile/:steamid',
    element: <SteamProfile />,
    errorElement: <ErrorPage />
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme accentColor='crimson' grayColor='sand' radius='large' scaling='95%'>
      <RouterProvider router={router} />
    </Theme>
  </StrictMode>
);
