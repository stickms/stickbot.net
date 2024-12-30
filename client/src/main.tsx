import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';

import Header from './components/header.tsx';
import Root from './routes/root.tsx';
import ErrorPage from './error-page.tsx';
import ProfileLookup from './routes/profile-lookup.tsx';
import OpenProfile from './routes/open-profile.tsx';

import '@radix-ui/themes/styles.css';
import './index.css';
import Toaster from './components/toaster.tsx';
import ApiReference from './routes/api-reference.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme
      accentColor='iris'
      appearance='dark'
      grayColor='sand'
      radius='large'
    >
      <Router>
        <Header />
        <Routes>
          <Route index element={<Root />} />
          <Route path='/profile' element={<ProfileLookup />} />
          <Route path='/api-reference' element={<ApiReference />} />
          <Route path='/openprofile/:id' element={<OpenProfile />} />
          <Route path='*' element={<ErrorPage />} />
        </Routes>
        <Toaster />
      </Router>
    </Theme>
  </StrictMode>
);
