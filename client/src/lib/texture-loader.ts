import { Vtf } from './vtf';


const TEXTURE_CACHE: Record<string, string> = {};
const FAILED_TEXTURES = new Set<string>();

export async function loadTexture(path: string, searchPath: string = 'vgui/'): Promise<string | null> {
  // Normalize path
  let cleanPath = path.replace(/\\/g, '/').toLowerCase();
  
  // Remove extension if present (we'll add our own)
  cleanPath = cleanPath.replace(/\.(vmt|vtf)$/, '');

  // Cache key should include searchPath to avoid collisions
  const cacheKey = `${searchPath}${cleanPath}`;

  if (TEXTURE_CACHE[cacheKey]) {
    return TEXTURE_CACHE[cacheKey];
  }

  if (FAILED_TEXTURES.has(cacheKey)) {
    return null;
  }

  // All paths are relative to materials/ + searchPath
  const baseUrl = `/default_hud/materials/${searchPath}`;
  
  try {
      const { texture, errors } = await attemptLoad(baseUrl, cleanPath);
      if (texture) {
          TEXTURE_CACHE[cacheKey] = texture;
          return texture;
      }

      // Fallback: If searchPath was 'vgui/', try loading from root materials/
      // Many HUD textures are in materials/hud/ but referenced as "hud/texture"
      if (searchPath === 'vgui/') {
          const fallbackBaseUrl = `/default_hud/materials/`;
          const fallbackResult = await attemptLoad(fallbackBaseUrl, cleanPath);
          if (fallbackResult.texture) {
              console.log(`[TextureLoader] Found ${cleanPath} in root materials/ (fallback from vgui/)`);
              TEXTURE_CACHE[cacheKey] = fallbackResult.texture;
              return fallbackResult.texture;
          }
          // Add fallback errors to main errors for logging
          errors.push(...fallbackResult.errors);
      }
      
      if (errors.length > 0) {
          console.warn(`Failed to load texture: ${cleanPath}\nReasons:\n- ${errors.join('\n- ')}`);
      } else {
          console.warn(`Failed to load texture: ${cleanPath} (Unknown error)`);
      }

  } catch (e) {
      console.warn(`Failed to load texture: ${cleanPath}`, e);
  }

  FAILED_TEXTURES.add(cacheKey);
  return null;
}

import { parseVmt } from './vmt';
import { renderSdfTexture } from './sdf-renderer';

// ... (imports)

async function attemptLoad(baseUrl: string, relativePath: string): Promise<{ texture: string | null, errors: string[] }> {
    const errors: string[] = [];

    // 1. Try to fetch VMT first
    const vmtUrl = `${baseUrl}${relativePath}.vmt`;
    
    const vmtResult = await parseVmt(vmtUrl);
    
    if (vmtResult.definition) {
        const vmtData = vmtResult.definition;
        console.log(`[TextureLoader] Loaded VMT: ${relativePath}`, vmtData);

        if (vmtData.baseTexture) {
            // $basetexture is relative to materials/
            const vtfPath = vmtData.baseTexture;
            const vtfUrl = `/default_hud/materials/${vtfPath}.vtf`;
            
            // Check for $detail (mask)
            if (vmtData.detail) {
                 const detailPath = vmtData.detail;
                 const detailUrl = `/default_hud/materials/${detailPath}.vtf`;

                 try {
                     const [baseRes, detailRes] = await Promise.all([
                         fetch(vtfUrl),
                         fetch(detailUrl)
                     ]);

                     if (!baseRes.ok) throw new Error(`Failed to fetch base texture: ${vtfUrl}`);
                     if (!detailRes.ok) throw new Error(`Failed to fetch detail texture: ${detailUrl}`);

                     const [baseImg, detailImg] = await Promise.all([
                         processVtfToImage(baseRes),
                         processVtfToImage(detailRes)
                     ]);

                     // Check if using Distance Field rendering
                     if (vmtData.distancealphafromdetail) {
                         console.log(`[SDF] Rendering ${relativePath} with base: ${vmtData.baseTexture}, detail: ${vmtData.detail}`);
                         const dataUrl = renderSdfTexture(baseImg, detailImg, vmtData, window.innerWidth, window.innerHeight);
                         return { texture: dataUrl, errors };
                     }

                     // Create masked texture
                     const canvas = document.createElement('canvas');
                     canvas.width = baseImg.width;
                     canvas.height = baseImg.height;
                     const ctx = canvas.getContext('2d');
                     if (!ctx) throw new Error('Failed to get canvas context');

                     // Draw base
                     ctx.drawImage(baseImg, 0, 0);

                     // Apply mask
                     // The detail texture's alpha channel will determine the opacity of the base texture
                     ctx.globalCompositeOperation = 'destination-in';
                     
                     // Scale detail to match base if needed (usually they match or detail is tiled, but for UI masks usually 1:1)
                     ctx.drawImage(detailImg, 0, 0, baseImg.width, baseImg.height);

                     return { texture: canvas.toDataURL('image/png'), errors };

                 } catch (e) {
                     errors.push(`VMT masking failed: ${e instanceof Error ? e.message : String(e)}`);
                     // Fallback to just base texture if masking fails? 
                     // For now, let's treat it as a failure or maybe fall through to base-only load?
                     // Let's try to recover by loading just the base texture below if this block fails?
                     // Actually, if base failed to load, we can't do anything. 
                     // If detail failed, we could show unmasked base.
                     // But for now let's return null to be safe and see errors.
                     return { texture: null, errors };
                 }
            }

            const vtfRes = await fetch(vtfUrl);
            if (vtfRes.ok) {
                try {
                    const texture = await processVtf(vtfRes);
                    return { texture, errors };
                } catch (e) {
                    errors.push(`VMT $basetexture found but failed to process VTF: ${e instanceof Error ? e.message : String(e)}`);
                    return { texture: null, errors };
                }
            } else {
                errors.push(`VMT $basetexture defined as '${vtfPath}' but failed to fetch VTF: ${vtfUrl} (Status: ${vtfRes.status})`);
                return { texture: null, errors };
            }
        } else {
             // VMT exists but has no $basetexture. It might be a color-only material.
             errors.push(`VMT found at ${vmtUrl} but missing $basetexture`);
             return { texture: null, errors };
        }
    } else {
        // VMT failed to load or parse
        if (vmtResult.error) {
            errors.push(`VMT failed: ${vmtResult.error}`);
        }

        // Only fallback if VMT was strictly NOT FOUND (404 or HTML fallback)
        // If it was a parsing error, we probably shouldn't fallback, but for now let's stick to the "not found" logic.
        const isNotFound = vmtResult.error && (vmtResult.error.includes('404') || vmtResult.error.includes('HTML'));
        
        if (isNotFound) {
            // 2. Fallback: Fetch VTF directly
            const vtfUrl = `${baseUrl}${relativePath}.vtf`;
            const vtfRes = await fetch(vtfUrl);
            
            if (vtfRes.ok) {
                try {
                    const texture = await processVtf(vtfRes);
                    return { texture, errors };
                } catch (e) {
                    errors.push(`Fallback VTF found but failed to process: ${e instanceof Error ? e.message : String(e)}`);
                }
            } else {
                errors.push(`Fallback VTF failed: ${vtfUrl} (Status: ${vtfRes.status})`);
            }
        }
    }

    return { texture: null, errors };
}

async function processVtf(res: Response): Promise<string> {
    const img = await processVtfToImage(res);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL('image/png');
}

async function processVtfToImage(res: Response): Promise<HTMLImageElement> {
    // Check for HTML response (SPA fallback for 404)
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
        throw new Error(`Expected VTF but received HTML (likely 404): ${res.url}`);
    }

    const buffer = await res.arrayBuffer();
    // Double check signature before passing to Vtf
    const signature = new Uint8Array(buffer.slice(0, 4));
    const sigStr = String.fromCharCode(...signature);
    if (sigStr !== 'VTF\0') {
         throw new Error(`Invalid VTF signature: ${sigStr} (URL: ${res.url})`);
    }

    const vtf = new Vtf(buffer);
    
    // Get the first frame of the highest resolution image
    const image = vtf.getImage(0); 
    if (!image) throw new Error('No image data in VTF');

    // Create a canvas to convert to data URL
    const canvas = document.createElement('canvas');
    canvas.width = vtf.width;
    canvas.height = vtf.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const imageData = ctx.createImageData(vtf.width, vtf.height);
    // Vtf returns RGBA data
    imageData.data.set(new Uint8ClampedArray(image));
    ctx.putImageData(imageData, 0, 0);

    const dataUrl = canvas.toDataURL('image/png');
    
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to create Image from VTF data'));
        img.src = dataUrl;
    });
}
// Debug helper
(window as any).debugTexture = async (path: string) => {
    console.log(`Debugging texture: ${path}`);
    try {
        const url = `/default_hud/materials/${path}.vtf`;
        const res = await fetch(url);
        if (!res.ok) {
            console.log(`Failed to fetch: ${url}`);
            return;
        }
        const buffer = await res.arrayBuffer();
        const vtf = new Vtf(buffer);
        
        console.log('VTF Header:', {
            width: vtf.width,
            height: vtf.height,
            format: vtf.format,
            flags: vtf.flags
        });
        
        const img = vtf.getImage(0, 0, 0, 0);
        if (img) {
            console.log('Image Data (First 16 bytes):', JSON.stringify(Array.from(img.slice(0, 16))));
            const cx = Math.floor(vtf.width / 2);
            const cy = Math.floor(vtf.height / 2);
            const idx = (cy * vtf.width + cx) * 4;
            console.log(`Center Pixel (${cx},${cy}):`, JSON.stringify(Array.from(img.slice(idx, idx + 4))));
        } else {
            console.log('Failed to get image data');
        }
    } catch (e) {
        console.error(e);
    }
};

(window as any).debugLoadTexture = async (path: string, searchPath: string = 'vgui/') => {
    console.log(`Debugging loadTexture: ${path} (searchPath: ${searchPath})`);
    try {
        const result = await loadTexture(path, searchPath);
        console.log('Result:', result ? 'Success (Data URL length: ' + result.length + ')' : 'Null');
        if (result) {
            const img = document.createElement('img');
            img.src = result;
            img.style.position = 'fixed';
            img.style.top = '50px';
            img.style.left = '50px';
            img.style.zIndex = '99999';
            img.style.border = '5px solid red';
            img.style.background = 'url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMUlEQVQ4T2NkYGAQYcAP3uCTZhw1gGGYhAGBZIA/nYDCgBDAm9BGDWAAJyRCgLaBCAAgXwixzAS0pgAAAABJRU5ErkJggg==")'; // checkerboard
            document.body.appendChild(img);
        }
        return result;
    } catch (e) {
        console.error('debugLoadTexture failed:', e);
    }
};
