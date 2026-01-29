import { useState, useEffect } from 'react';
import { ClientSchemeManager } from '../lib/client-scheme';
import { loadTexture } from '../lib/texture-loader';

export function useBorder(manager: ClientSchemeManager, borderName?: string) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    if (!borderName || !manager) {
      setStyle({});
      return;
    }

    const border = manager.getBorder(borderName);
    if (!border) {
      setStyle({});
      return;
    }

    if (border.borderType === 'scalable_image' || border.borderType === 'image') {
      if (border.image) {
        loadTexture(border.image, 'vgui/').then((url) => {
          if (url) {
            const sliceW = border.srcCornerWidth || 0;
            const sliceH = border.srcCornerHeight || 0;
            const widthW = border.drawCornerWidth || 0;
            const widthH = border.drawCornerHeight || 0;

            setStyle({
              borderImageSource: `url(${url})`,
              borderImageSlice: `${sliceH} ${sliceW} fill`,
              borderWidth: `${widthH}px ${widthW}px`,
              borderStyle: 'solid',
              background: 'none' // scalable_image usually replaces background
            });
          }
        });
      }
    } else {
      // Simple border
      // We use box-shadow to simulate borders
      const shadows: string[] = [];

      // Helper to resolve color
      const getColor = (c: string) => manager.getColor(c);

      // Left
      if (border.left) {
        border.left.lines.forEach((line: { color: string; offset: string }, i: number) => {
           const col = getColor(line.color);
           const width = i + 1;
           shadows.push(`inset ${width}px 0 0 0 ${col}`);
        });
      }
      
      if (border.top) {
          border.top.lines.forEach((line: { color: string; offset: string }, i: number) => {
              const col = getColor(line.color);
              const width = i + 1;
              shadows.push(`inset 0 ${width}px 0 0 ${col}`);
          });
      }
      
      if (border.right) {
          border.right.lines.forEach((line: { color: string; offset: string }, i: number) => {
              const col = getColor(line.color);
              const width = i + 1;
              shadows.push(`inset -${width}px 0 0 0 ${col}`);
          });
      }
      
      if (border.bottom) {
          border.bottom.lines.forEach((line: { color: string; offset: string }, i: number) => {
              const col = getColor(line.color);
              const width = i + 1;
              shadows.push(`inset 0 -${width}px 0 0 ${col}`);
          });
      }
      
      const baseStyle: React.CSSProperties = {
          boxShadow: shadows.join(', '),
          border: 'none'
      };

      if (border.backgroundType === '2') {
          baseStyle.borderRadius = '5px'; // Standard Source rounded corner
      }

      setStyle(baseStyle);
    }
  }, [borderName, manager]);

  return style;
}
