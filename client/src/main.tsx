import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';

import Header from './components/header.tsx';
import Toaster from './components/toaster.tsx';
import ApiReference from './routes/api-reference.tsx';

import Root from './routes/root.tsx';
import ErrorPage from './routes/error-page.tsx';
import ProfileLookup from './routes/profile-lookup.tsx';
import AdminPortal from './routes/admin-portal.tsx';
import OpenProfile from './routes/open-profile.tsx';
import SoundcloudDl from './routes/soundcloud-dl.tsx';
import QrCodeGenerator from './routes/qr-code-generator.tsx';
import UrlShortener from './routes/url-shortener.tsx';
import OpenUrl from './routes/open-url.tsx';
import WatchTogether from './routes/watch-together.tsx';
import SyncRoom from './routes/sync-room.tsx';

import '@radix-ui/themes/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme accentColor='iris' appearance='dark' grayColor='sand' radius='large'>
      <Router>
        <Header />
        <Routes>
          <Route index element={<Root />} />
          <Route path='/lookup' element={<ProfileLookup />} />
          <Route path='/api-reference' element={<ApiReference />} />
          <Route path='/url-shortener' element={<UrlShortener />} />
          <Route path='/qr-code-generator' element={<QrCodeGenerator />} />
          <Route path='/soundcloud-dl' element={<SoundcloudDl />} />
          <Route path='/watch-together' element={<WatchTogether />} />
          <Route path='/sync/room/:roomid' element={<SyncRoom />} />
          <Route path='/admin-portal' element={<AdminPortal />} />
          <Route path='/openprofile/:id' element={<OpenProfile />} />
          <Route path='/l/:id' element={<OpenUrl />} />
          <Route path='*' element={<ErrorPage />} />
        </Routes>
        <Toaster />
      </Router>
    </Theme>
  </StrictMode>
);
