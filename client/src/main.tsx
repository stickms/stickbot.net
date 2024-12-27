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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Theme
      accentColor='crimson'
      appearance='dark'
      grayColor='sand'
      radius='large'
    >
      <Router>
        <Header />
        <Routes>
          <Route path='*' element={<ErrorPage />} />

          <Route index element={<Root />} />
          <Route path='profile' element={<ProfileLookup />} />
          <Route path='openprofile/:id' element={<OpenProfile />} />
        </Routes>
      </Router>
    </Theme>
  </StrictMode>
);
