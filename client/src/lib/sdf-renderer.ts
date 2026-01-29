import { VmtDefinition } from './vmt';

export function renderSdfTexture(
  baseImg: HTMLImageElement,
  detailImg: HTMLImageElement,
  params: VmtDefinition,
  screenWidth: number = window.innerWidth,
  screenHeight: number = window.innerHeight
): string {
  // Upscale for smoother SDF rendering
  // If the base texture is small (e.g. 64x64), the SDF will look blocky if rendered 1:1.
  // We scale up to ensure we have enough pixels for the soft edges.
  const scale = 4; 
  // Use detail image dimensions as the reference size because it defines the shape/mask.
  // The base texture (often a gradient) should be stretched to fill this shape.
  const width = detailImg.width * scale;
  const height = detailImg.height * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  // Draw base and detail to offscreen canvases to read pixel data
  const baseCanvas = document.createElement('canvas');
  baseCanvas.width = width;
  baseCanvas.height = height;
  const baseCtx = baseCanvas.getContext('2d');
  if (!baseCtx) throw new Error('Failed to get base canvas context');
  
  baseCtx.imageSmoothingEnabled = true;
  baseCtx.imageSmoothingQuality = 'high';
  // Draw base scaled to detail size (stretch to fill)
  baseCtx.drawImage(baseImg, 0, 0, width, height);
  const baseData = baseCtx.getImageData(0, 0, width, height);

  const detailCanvas = document.createElement('canvas');
  detailCanvas.width = width;
  detailCanvas.height = height;
  const detailCtx = detailCanvas.getContext('2d');
  if (!detailCtx) throw new Error('Failed to get detail canvas context');
  
  detailCtx.imageSmoothingEnabled = true;
  detailCtx.imageSmoothingQuality = 'high';
  // Draw detail scaled to base size (upscaled)
  detailCtx.drawImage(detailImg, 0, 0, width, height);
  const detailData = detailCtx.getImageData(0, 0, width, height);

  const outputData = ctx.createImageData(width, height);

  // Parse colors
  // const outlineColor = parseColor(params.outlinecolor) || { r: 0, g: 0, b: 0 };
  // const glowColor = parseColor(params.glowcolor) || { r: 0, g: 0, b: 0 };
  
  // let tint = parseColor(params.color || params.color2);

  // Parameters
  const softEdges = params.softedges;
  let edgeStart = params.edgesoftnessstart ?? 0.5;
  let edgeEnd = params.edgesoftnessend ?? 0.5; // Default to 0.5 if not set

  /*
  const outline = params.outline;
  const outlinecolor = params.outlinecolor;
  const outlineStart0 = params.outlinestart0 ?? 0.0;
  let outlineStart1 = params.outlinestart1 ?? 0.2;
  const outlineEnd0 = params.outlineend0 ?? 0.5;
  let outlineEnd1 = params.outlineend1 ?? 0.6;

  const glow = params.glow;
  const glowcolor = params.glowcolor;
  const glowAlpha = params.glowalpha ?? 1.0;
  const glowStart = params.glowstart ?? 0.0;
  const glowEnd = params.glowend ?? 0.5;
  const glowX = params.glowx ?? 0;
  const glowY = params.glowy ?? 0;
  */
  
  // Force disable for "Stencil" mode
  const outline = false;
  const glow = false;

  // Screen Resolution Scaling
  // Screen Resolution Scaling
  /*
  const scaleEdges = params.scaleedgesoftnessbasedonscreenres;
  const scaleOutline = params.scaleoutlinesoftnessbasedonscreenres;
  
  if (scaleEdges || scaleOutline) {
      const flResScale = Math.max(0.5, Math.max(1024.0 / screenWidth, 768.0 / screenHeight));

      if (scaleEdges) {
          const flMid = 0.5 * (edgeStart + edgeEnd);
          edgeStart = Math.min(0.99, Math.max(0.05, flMid + flResScale * (edgeStart - flMid)));
          edgeEnd = Math.min(0.99, Math.max(0.05, flMid + flResScale * (edgeEnd - flMid)));
      }

      if (scaleOutline) {
          // shrink the soft part of the outline, enlarging hard part
          const flMidS = 0.5 * (outlineStart1 + outlineStart0);
          outlineStart1 = Math.min(0.99, Math.max(0.05, flMidS + flResScale * (outlineStart1 - flMidS)));
          
          const flMidE = 0.5 * (outlineEnd1 + outlineEnd0);
          outlineEnd1 = Math.min(0.99, Math.max(0.05, flMidE + flResScale * (outlineEnd1 - flMidE)));
      }
  }
  */
  // Only keep edge scaling if needed, but for now disable all complex logic
  const scaleEdges = params.scaleedgesoftnessbasedonscreenres;
  if (scaleEdges) {
      const flResScale = Math.max(0.5, Math.max(1024.0 / screenWidth, 768.0 / screenHeight));
      const flMid = 0.5 * (edgeStart + edgeEnd);
      edgeStart = Math.min(0.99, Math.max(0.05, flMid + flResScale * (edgeStart - flMid)));
      edgeEnd = Math.min(0.99, Math.max(0.05, flMid + flResScale * (edgeEnd - flMid)));
  }

  // Helper for smoothstep
  const smoothstep = (min: number, max: number, value: number) => {
    const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return x * x * (3 - 2 * x);
  };

  // Helper to map [0, 255] to [0, 1]
  const toFloat = (v: number) => v / 255.0;
  const toByte = (v: number) => Math.min(255, Math.max(0, Math.round(v * 255)));

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;

      // Base color (RGB)
      const rawR = baseData.data[idx];
      const rawG = baseData.data[idx + 1];
      const rawB = baseData.data[idx + 2];
      const rawA = baseData.data[idx + 3];

      let r = toFloat(rawR);
      let g = toFloat(rawG);
      let b = toFloat(rawB);

      // Debug logging for center pixel (Temporary)
      if (x === Math.floor(width / 2) && y === Math.floor(height / 2)) {
         console.log(`[SDF Debug] Params: color=${params.color}, color2=${params.color2}, softEdges=${softEdges}`);
         console.log(`[SDF Debug] Center Pixel @ ${x},${y} (Base Texture): R=${rawR}, G=${rawG}, B=${rawB}, A=${rawA}`);
      }

      // Apply VMT color tint if present
      const tint = parseColor(params.color || params.color2);
      if (tint) {
          r = (r * tint.r) / 255;
          g = (g * tint.g) / 255;
          b = (b * tint.b) / 255;
      }
      
      // Detail alpha (Distance value)
      const dist = toFloat(detailData.data[idx + 3]);

      // 1. Soft Edges (Main Fill)
      let fillAlpha = 0;
      if (softEdges) {
        // edgeStart is usually > edgeEnd for "inside"
        fillAlpha = smoothstep(edgeEnd, edgeStart, dist);
      } else {
        fillAlpha = dist > 0.5 ? 1.0 : 0.0;
      }

      // 2. Outline
      let outlineAlpha = 0;
      /*
      if (outline) {
        const alphaStart = smoothstep(outlineStart0, outlineStart1, dist);
        const alphaEnd = smoothstep(outlineEnd1, outlineEnd0, dist); 
        outlineAlpha = alphaStart * alphaEnd;
      }
      */

      // 3. Glow
      let glowVal = 0;
      /*
      if (glow) {
        // ... (glow logic)
        let sampleDist = dist;
        if (glowX !== 0 || glowY !== 0) {
            const offX = Math.round(glowX * width);
            const offY = Math.round(glowY * height);
            const sx = Math.min(width - 1, Math.max(0, x + offX));
            const sy = Math.min(height - 1, Math.max(0, y + offY));
            const sIdx = (sy * width + sx) * 4;
            sampleDist = toFloat(detailData.data[sIdx + 3]);
        }

        glowVal = smoothstep(glowStart, glowEnd, sampleDist) * glowAlpha;
      }
      */

      // Composite
      // Order: Glow -> Outline -> Fill
      // Painter's algorithm:
      // 1. Start with Glow
      // 2. Blend Outline over Glow
      // 3. Blend Fill over (Glow + Outline)

      // Initialize with clear
      let accR = 0, accG = 0, accB = 0, accA = 0;

      // Blend Fill (Base Texture)
      // Src: BaseColor, FillAlpha
      const fa = fillAlpha;
      accR = (r * fa) + (accR * (1 - fa));
      accG = (g * fa) + (accG * (1 - fa));
      accB = (b * fa) + (accB * (1 - fa));
      accA = fa + (accA * (1 - fa));

      outputData.data[idx] = toByte(accR);
      outputData.data[idx + 1] = toByte(accG);
      outputData.data[idx + 2] = toByte(accB);
      outputData.data[idx + 3] = toByte(accA);

      if (x === Math.floor(width / 2) && y === Math.floor(height / 2)) {
         console.log(`[SDF Debug] Center Pixel Output: R=${outputData.data[idx]}, G=${outputData.data[idx+1]}, B=${outputData.data[idx+2]}, A=${outputData.data[idx+3]}`);
      }
    }
  }

  ctx.putImageData(outputData, 0, 0);
  return canvas.toDataURL('image/png');
}

function parseColor(colorStr?: string): { r: number, g: number, b: number } | null {
  if (!colorStr) return null;
  // Format: "[0.7 0.7 0.5]" or "255 255 255"
  // Remove brackets
  const clean = colorStr.replace(/[\[\]]/g, '').trim();
  const parts = clean.split(/\s+/).map(Number);
  if (parts.length < 3) return null;

  // Check if float (0-1) or byte (0-255)
  // Heuristic: if any value > 1, assume byte.
  const isByte = parts.some(p => p > 1.0);
  
  if (isByte) {
    return { r: parts[0], g: parts[1], b: parts[2] };
  } else {
    return { r: parts[0] * 255, g: parts[1] * 255, b: parts[2] * 255 };
  }
}
