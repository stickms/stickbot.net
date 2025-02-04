import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Provider } from '@/components/ui/provider.tsx'
import { Helmet } from 'react-helmet';
import { Toaster } from '@/components/ui/toaster.tsx';

import Header from './components/header.tsx';

import Root from './routes/root.tsx';
import ErrorPage from './routes/error-page.tsx';
import ApiReference from './routes/api-reference.tsx';
import ProfileLookup from './routes/profile-lookup.tsx';
import AdminPortal from './routes/admin-portal.tsx';
import OpenProfile from './routes/open-profile.tsx';
// import YoutubeDl from './routes/youtube-dl.tsx';
// import SoundcloudDl from './routes/soundcloud-dl.tsx';
import QrCodeGenerator from './routes/qr-code-generator.tsx';
import UrlShortener from './routes/url-shortener.tsx';
import OpenUrl from './routes/open-url.tsx';
// import WatchTogether from './routes/watch-together.tsx';
// import SyncRoom from './routes/sync-room.tsx';

import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Helmet>
      <meta property='og:title' content='Stickbot.net' />
      <meta property='og:type' content='website' />
      <meta property='og:url' content='https://stickbot.net' />
      <meta property='og:image:url' content={`${window.location.origin}/stick.png`} />
      <meta property='og:image:secure_url' content={`${window.location.origin}/stick.png`} />
      <meta property='og:description' content='' />
    </Helmet>
    <Provider>
      <Router>
        <Header />
        <Routes>
          <Route index element={<Root />} />
          <Route path='*' element={<ErrorPage />} />
          <Route path='/lookup' element={<ProfileLookup />} />
          <Route path='/api-reference' element={<ApiReference />} />
          <Route path='/url-shortener' element={<UrlShortener />} />
          <Route path='/qr-code-generator' element={<QrCodeGenerator />} />
          <Route path='/admin-portal' element={<AdminPortal />} />
          <Route path='/openprofile/:id' element={<OpenProfile />} />
          <Route path='/l/:id' element={<OpenUrl />} />

          {/* 
          <Route path='/youtube-dl' element={<YoutubeDl />} />
          <Route path='/soundcloud-dl' element={<SoundcloudDl />} />
          <Route path='/watch-together' element={<WatchTogether />} />
          <Route path='/sync/room/:roomid' element={<SyncRoom />} />
          <Route path='*' element={<ErrorPage />} /> */}
        </Routes>
        <Toaster />
      </Router>
    </Provider>
  </StrictMode>
);
