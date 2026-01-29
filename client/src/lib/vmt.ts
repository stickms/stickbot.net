import { parseKeyValuesWithLineNumbers } from './keyvalues';

export interface VmtDefinition {
  baseTexture?: string;
  detail?: string;
  color?: string;
  color2?: string;
  
  // SDF Parameters
  distancealphafromdetail?: boolean;
  
  // Soft Edges
  softedges?: boolean;
  edgesoftnessstart?: number;
  edgesoftnessend?: number;
  scaleedgesoftnessbasedonscreenres?: boolean;

  // Outline
  outline?: boolean;
  outlinecolor?: string; // "[r g b]"
  outlinestart0?: number;
  outlinestart1?: number;
  outlineend0?: number;
  outlineend1?: number;
  scaleoutlinesoftnessbasedonscreenres?: boolean;

  // Glow
  glow?: boolean;
  glowcolor?: string;
  glowalpha?: number;
  glowstart?: number;
  glowend?: number;
  glowx?: number;
  glowy?: number;

  [key: string]: any;
}

export type VmtResult = {
  definition: VmtDefinition | null;
  error?: string;
};

export async function parseVmt(url: string): Promise<VmtResult> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
        return { definition: null, error: `Fetch failed with status ${res.status}` };
    }

    const text = await res.text();
    // Check if it looks like a VMT (starts with " or { or comments)
    // If it's HTML (SPA fallback), it usually starts with <
    if (text.trim().startsWith('<')) {
        return { definition: null, error: 'Received HTML content (likely 404)' };
    }

    const data = parseKeyValuesWithLineNumbers(text);
    
    // Find root key (e.g. "UnlitGeneric")
    const rootKey = Object.keys(data)[0];
    if (!rootKey || !data[rootKey].definitions) {
        return { definition: null, error: 'Invalid VMT structure: missing root key or definitions' };
    }

    const rootDef = data[rootKey].definitions.find(d => typeof d.value === 'object');
    if (!rootDef || typeof rootDef.value !== 'object') {
        return { definition: null, error: 'Invalid VMT structure: root definition is not an object' };
    }

    const innerMap = rootDef.value as any;
    const result: VmtDefinition = {};

    // Extract common properties
    // Find $basetexture case-insensitively
    const baseTextureKey = Object.keys(innerMap).find(
        k => {
            const lower = k.toLowerCase();
            return lower === '$basetexture' || lower === 'basetexture';
        }
    );

    if (baseTextureKey) {
        const textureNode = innerMap[baseTextureKey];
        if (textureNode && textureNode.definitions && textureNode.definitions.length > 0) {
            const val = textureNode.definitions[0].value;
            if (typeof val === 'string') {
                result.baseTexture = val.replace(/\\/g, '/').toLowerCase();
            }
        }
    }

    // Find $detail case-insensitively
    const detailKey = Object.keys(innerMap).find(
        k => {
            const lower = k.toLowerCase();
            return lower === '$detail' || lower === 'detail';
        }
    );

    if (detailKey) {
        const detailNode = innerMap[detailKey];
        if (detailNode && detailNode.definitions && detailNode.definitions.length > 0) {
            const val = detailNode.definitions[0].value;
            if (typeof val === 'string') {
                result.detail = val.replace(/\\/g, '/').toLowerCase();
            }
        }
    }

    // Helper to extract boolean
    const getBool = (key: string): boolean | undefined => {
        const foundKey = Object.keys(innerMap).find(k => k.toLowerCase() === key.toLowerCase());
        if (foundKey) {
            const node = innerMap[foundKey];
            if (node && node.definitions && node.definitions.length > 0) {
                const val = node.definitions[0].value;
                return val === '1' || val === 1 || val === 'true' || val === true;
            }
        }
        return undefined;
    };

    // Helper to extract number
    const getNum = (key: string): number | undefined => {
        const foundKey = Object.keys(innerMap).find(k => k.toLowerCase() === key.toLowerCase());
        if (foundKey) {
            const node = innerMap[foundKey];
            if (node && node.definitions && node.definitions.length > 0) {
                const val = node.definitions[0].value;
                const num = parseFloat(String(val));
                return isNaN(num) ? undefined : num;
            }
        }
        return undefined;
    };

    // Helper to extract string
    const getStr = (key: string): string | undefined => {
        const foundKey = Object.keys(innerMap).find(k => k.toLowerCase() === key.toLowerCase());
        if (foundKey) {
            const node = innerMap[foundKey];
            if (node && node.definitions && node.definitions.length > 0) {
                return String(node.definitions[0].value);
            }
        }
        return undefined;
    };

    // Extract SDF params
    result.distancealphafromdetail = getBool('$distancealphafromdetail');
    
    result.softedges = getBool('$softedges');
    result.edgesoftnessstart = getNum('$edgesoftnessstart');
    result.edgesoftnessend = getNum('$edgesoftnessend');
    result.scaleedgesoftnessbasedonscreenres = getBool('$scaleedgesoftnessbasedonscreenres');

    result.outline = getBool('$outline');
    result.outlinecolor = getStr('$outlinecolor');
    result.outlinestart0 = getNum('$outlinestart0');
    result.outlinestart1 = getNum('$outlinestart1');
    result.outlineend0 = getNum('$outlineend0');
    result.outlineend1 = getNum('$outlineend1');
    result.scaleoutlinesoftnessbasedonscreenres = getBool('$scaleoutlinesoftnessbasedonscreenres');

    result.glow = getBool('$glow');
    result.glowcolor = getStr('$glowcolor');
    result.glowalpha = getNum('$glowalpha');
    result.glowstart = getNum('$glowstart');
    result.glowend = getNum('$glowend');
    result.glowx = getNum('$glowx');
    result.glowy = getNum('$glowy');

    result.color = getStr('$color');
    result.color2 = getStr('$color2');

    return { definition: result };

  } catch (e) {
    return { definition: null, error: `Parsing error: ${e instanceof Error ? e.message : String(e)}` };
  }
}
