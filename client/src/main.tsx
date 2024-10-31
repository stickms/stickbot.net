import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';

import Root from './routes/root.tsx';
import ErrorPage from './error-page.tsx';
import ProfileLookup from './routes/profile-lookup.tsx';

import '@radix-ui/themes/styles.css';
import './index.css';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Root />,
    errorElement: <ErrorPage />
  },
  {
    path: '/profile',
    element: <ProfileLookup />,
    errorElement: <ErrorPage />
  }
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme
      accentColor='crimson'
      appearance='dark'
      grayColor='sand'
      radius='large'
    >
      <RouterProvider router={router} />
    </Theme>
  </StrictMode>
);
