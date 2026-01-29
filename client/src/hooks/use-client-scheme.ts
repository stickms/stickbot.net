import { useState, useEffect } from 'react';
import { clientScheme } from '../lib/client-scheme';

export function useClientScheme() {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    clientScheme.loadScheme().then(() => {
      setIsLoaded(true);
    });
  }, []);

  return {
    isLoaded,
    manager: clientScheme
  };
}
