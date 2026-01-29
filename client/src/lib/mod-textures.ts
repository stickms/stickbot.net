import { parseKeyValues } from './keyvalues';

export interface ModTextureDefinition {
  file?: string;
  x?: string;
  y?: string;
  width?: string;
  height?: string;
  font?: string;
  character?: string;
}

export interface ModTexturesData {
  [key: string]: ModTextureDefinition;
}

export async function loadModTextures(baseUrl: string): Promise<ModTexturesData> {
  try {
    const url = `${baseUrl}/scripts/mod_textures.txt`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Failed to load mod_textures.txt: ${res.status}`);
      return {};
    }

    const text = await res.text();
    // mod_textures.txt usually starts with "sprites/640_hud" or similar root key
    // We can use the simple parser
    const data = parseKeyValues(text);

    // Find the root object (it might be "sprites/640_hud" or something else)
    const rootKey = Object.keys(data)[0];
    if (!rootKey) return {};

    const root = data[rootKey];
    if (typeof root !== 'object') return {};

    // We are interested in "TextureData"
    const textureData = root['TextureData'];
    if (typeof textureData !== 'object') return {};

    // Convert to our typed interface
    const result: ModTexturesData = {};
    for (const [key, val] of Object.entries(textureData)) {
      if (typeof val === 'object') {
        result[key] = val as ModTextureDefinition;
      }
    }

    return result;

  } catch (e) {
    console.warn('Error parsing mod_textures.txt:', e);
    return {};
  }
}
