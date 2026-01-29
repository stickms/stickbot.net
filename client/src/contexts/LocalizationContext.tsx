import React, { createContext, useContext, useEffect, useState } from 'react';
import { parseKeyValuesWithLineNumbers, KVMap } from '../lib/keyvalues';

type LocalizationContextType = {
  localize: (text: string) => string;
  isLoaded: boolean;
};

const LocalizationContext = createContext<LocalizationContextType>({
  localize: (text) => text,
  isLoaded: false,
});

export const useLocalization = () => useContext(LocalizationContext);

export const LocalizationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const fetchLocalization = async () => {
      try {
        const files = ['tf_english.txt', 'gameui_english.txt'];
        let mergedTokens: Record<string, string> = {};

        for (const file of files) {
            try {
                const response = await fetch(`/default_hud/resource/${file}`);
                if (!response.ok) continue;
                
                const buffer = await response.arrayBuffer();
                let text = '';
                
                // Detect encoding
                const view = new DataView(buffer);
                console.log(`[Localization] Loading ${file}, size: ${buffer.byteLength}`);
                
                if (buffer.byteLength >= 2 && view.getUint16(0, true) === 0xFEFF) {
                    // UTF-16LE BOM
                    console.log(`[Localization] ${file}: Detected UTF-16LE BOM`);
                    const decoder = new TextDecoder('utf-16le');
                    text = decoder.decode(buffer);
                } else if (buffer.byteLength >= 3 && view.getUint8(0) === 0xEF && view.getUint8(1) === 0xBB && view.getUint8(2) === 0xBF) {
                    // UTF-8 BOM
                    console.log(`[Localization] ${file}: Detected UTF-8 BOM`);
                    const decoder = new TextDecoder('utf-8');
                    text = decoder.decode(buffer);
                } else {
                    // No BOM. Heuristic
                    let nullCount = 0;
                    const checkLen = Math.min(buffer.byteLength, 100);
                    for (let i = 0; i < checkLen; i++) {
                        if (view.getUint8(i) === 0) nullCount++;
                    }
                    
                    if (nullCount > 0) {
                        console.log(`[Localization] ${file}: Heuristic detected UTF-16LE`);
                        const decoder = new TextDecoder('utf-16le');
                        text = decoder.decode(buffer);
                    } else {
                        console.log(`[Localization] ${file}: Heuristic detected UTF-8`);
                        const decoder = new TextDecoder('utf-8');
                        text = decoder.decode(buffer);
                    }
                }

                // Parse the KeyValues
                const kv = parseKeyValuesWithLineNumbers(text);
                console.log(`[Localization] ${file}: Parsed KV root keys:`, Object.keys(kv));
                
                // Helper to find "Tokens" block recursively
                const findTokens = (map: KVMap): KVMap | null => {
                    // Helper to get value (KVMap) from a key case-insensitive
                    const getMap = (m: KVMap, key: string): KVMap | null => {
                        const foundKey = Object.keys(m).find(k => k.toLowerCase() === key.toLowerCase());
                        if (!foundKey) return null;
                        const defs = m[foundKey].definitions;
                        if (!defs.length) return null;
                        // Use the last definition (override behavior)
                        const val = defs[defs.length - 1].value;
                        return typeof val === 'object' ? val : null;
                    };

                    const tokens = getMap(map, 'tokens');
                    if (tokens) return tokens;

                    const lang = getMap(map, 'lang');
                    if (lang) {
                        const langTokens = getMap(lang, 'tokens');
                        if (langTokens) return langTokens;
                    }
                    return null;
                };

                const tokensMap = findTokens(kv);

                if (tokensMap) {
                    const count = Object.keys(tokensMap).length;
                    console.log(`[Localization] ${file}: Found ${count} tokens`);
                    
                    // Flatten to string map
                    Object.entries(tokensMap).forEach(([key, node]) => {
                        const defs = node.definitions;
                        if (defs.length) {
                            // Use last definition
                            const val = defs[defs.length - 1].value;
                            if (typeof val === 'string') {
                                mergedTokens[key.toLowerCase()] = val;
                            }
                        }
                    });
                    
                    // Debug specific key
                    if (mergedTokens['gameui_parsebaseline']) {
                        console.log(`[Localization] ${file}: Found gameui_parsebaseline = "${mergedTokens['gameui_parsebaseline']}"`);
                    }
                } else {
                    console.warn(`[Localization] ${file}: Could not find Tokens block`);
                }
            } catch (err) {
                console.warn(`Failed to load localization file: ${file}`, err);
            }
        }

        setTokens(mergedTokens);
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to load localization files:', error);
        setIsLoaded(true);
      }
    };

    fetchLocalization();
  }, []);

  const localize = (text: string): string => {
    if (!text) return text;
    
    if (text.startsWith('#')) {
      const key = text.substring(1).toLowerCase();
      
      // Debug specific key
      if (key.includes('gameui_parsebaseline')) {
          console.log(`[Localize] Input: "${text}", Key: "${key}", Found: ${!!tokens[key] ? 'YES' : 'NO'}, Value: "${tokens[key]}"`);
      }

      if (tokens[key]) {
        return tokens[key];
      }
    }
    
    return text;
  };

  return (
    <LocalizationContext.Provider value={{ localize, isLoaded }}>
      {children}
    </LocalizationContext.Provider>
  );
};
