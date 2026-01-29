import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadModTextures, ModTexturesData, ModTextureDefinition } from '../lib/mod-textures';

interface ModTexturesContextType {
  icons: ModTexturesData;
  loading: boolean;
  getIcon: (name: string) => ModTextureDefinition | undefined;
}

const ModTexturesContext = createContext<ModTexturesContextType>({
  icons: {},
  loading: false,
  getIcon: () => undefined,
});

export const useModTextures = () => useContext(ModTexturesContext);

export function ModTexturesProvider({ 
  children, 
  baseUrl 
}: { 
  children: React.ReactNode;
  baseUrl: string;
}) {
  const [icons, setIcons] = useState<ModTexturesData>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    
    loadModTextures(baseUrl).then(data => {
      if (mounted) {
        setIcons(data);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [baseUrl]);

  const getIcon = (name: string) => {
    return icons[name];
  };

  return (
    <ModTexturesContext.Provider value={{ icons, loading, getIcon }}>
      {children}
    </ModTexturesContext.Provider>
  );
}
