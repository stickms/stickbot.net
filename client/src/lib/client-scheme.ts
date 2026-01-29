import { parseKeyValues, KeyValues } from './keyvalues';

export interface SchemeColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface SchemeBorder {
  name: string;
  borderType: 'simple' | 'image' | 'scalable_image';
  backgroundType?: string;
  // For scalable_image
  image?: string;
  srcCornerHeight?: number;
  srcCornerWidth?: number;
  drawCornerHeight?: number;
  drawCornerWidth?: number;
  // For simple borders
  left?: BorderSide;
  right?: BorderSide;
  top?: BorderSide;
  bottom?: BorderSide;
  inset?: string; // "0 0 0 0"
}

export interface BorderSide {
  lines: {
    color: string;
    offset: string; // "0 0"
  }[];
}

export class ClientSchemeManager {
  private colors: Map<string, SchemeColor> = new Map();
  private borders: Map<string, SchemeBorder> = new Map();
  private isLoaded: boolean = false;

  async loadScheme(path: string = '/default_hud/resource/clientscheme.res') {
    if (this.isLoaded) return;

    try {
      const res = await fetch(path);
      const text = await res.text();
      const kv = parseKeyValues(text);

      const scheme = kv['Scheme'] as KeyValues;
      if (!scheme) return;

      // Parse Colors
      const colors = scheme['Colors'] as KeyValues;
      if (colors) {
        this.parseColors(colors);
      }

      // Parse Borders
      const borders = scheme['Borders'] as KeyValues;
      if (borders) {
        this.parseBorders(borders);
      }

      this.isLoaded = true;
      console.log('[ClientScheme] Loaded scheme:', { 
        colors: this.colors.size, 
        borders: this.borders.size 
      });

    } catch (e) {
      console.error('[ClientScheme] Failed to load scheme:', e);
    }
  }

  private parseColors(colors: KeyValues) {
    for (const [name, value] of Object.entries(colors)) {
      if (typeof value === 'string') {
        const parsed = this.parseColorString(value);
        if (parsed) {
          this.colors.set(name, parsed);
        }
      }
    }
  }

  private parseColorString(str: string): SchemeColor | null {
    // Format: "255 255 255 255"
    const parts = str.split(/\s+/).map(Number);
    if (parts.length >= 3) {
      return {
        r: parts[0],
        g: parts[1],
        b: parts[2],
        a: parts.length > 3 ? parts[3] : 255
      };
    }
    return null;
  }

  private parseBorders(borders: KeyValues) {
    for (const [name, value] of Object.entries(borders)) {
      if (typeof value === 'object' && value !== null) {
        this.borders.set(name, this.parseBorder(name, value as KeyValues));
      }
    }
  }

  private parseBorder(name: string, kv: KeyValues): SchemeBorder {
    const borderType = (kv['bordertype'] as string) || 'simple';
    const backgroundType = (kv['backgroundtype'] as string) || (kv['PaintBackgroundType'] as string);
    
    const border: SchemeBorder = {
      name,
      borderType: borderType as any,
      backgroundType,
      inset: kv['inset'] as string
    };

    if (borderType === 'scalable_image' || borderType === 'image') {
      border.image = kv['image'] as string;
      border.srcCornerHeight = Number(kv['src_corner_height'] || 0);
      border.srcCornerWidth = Number(kv['src_corner_width'] || 0);
      border.drawCornerHeight = Number(kv['draw_corner_height'] || 0);
      border.drawCornerWidth = Number(kv['draw_corner_width'] || 0);
    } else {
      // Simple border
      border.left = this.parseBorderSide(kv['Left'] as KeyValues);
      border.right = this.parseBorderSide(kv['Right'] as KeyValues);
      border.top = this.parseBorderSide(kv['Top'] as KeyValues);
      border.bottom = this.parseBorderSide(kv['Bottom'] as KeyValues);
    }

    return border;
  }

  private parseBorderSide(kv: KeyValues | undefined): BorderSide | undefined {
    if (!kv) return undefined;
    const lines = [];
    // Keys are usually "1", "2", etc.
    for (const value of Object.values(kv)) {
      if (typeof value === 'object' && value !== null) {
        lines.push({
          color: value['color'] as string,
          offset: value['offset'] as string
        });
      }
    }
    return { lines };
  }

  getColor(name: string): string {
    const color = this.colors.get(name);
    if (color) {
      return `rgba(${color.r}, ${color.g}, ${color.b}, ${color.a / 255})`;
    }
    // Try parsing as raw string if not found
    const raw = this.parseColorString(name);
    if (raw) {
       return `rgba(${raw.r}, ${raw.g}, ${raw.b}, ${raw.a / 255})`;
    }
    return name; // Return as is (might be CSS color)
  }

  getBorder(name: string): SchemeBorder | undefined {
    return this.borders.get(name);
  }
  
  getAllBorders(): string[] {
      return Array.from(this.borders.keys());
  }
}

export const clientScheme = new ClientSchemeManager();
