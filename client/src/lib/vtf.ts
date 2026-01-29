
export enum VtfImageFormat {
  None = -1,
  RGBA8888 = 0,
  ABGR8888 = 1,
  RGB888 = 2,
  BGR888 = 3,
  RGB565 = 4,
  I8 = 5,
  IA88 = 6,
  P8 = 7,
  A8 = 8,
  RGB888_BLUESCREEN = 9,
  BGR888_BLUESCREEN = 10,
  ARGB8888 = 11,
  BGRA8888 = 12,
  DXT1 = 13,
  DXT3 = 14,
  DXT5 = 15,
  BGRX8888 = 16,
  BGR565 = 17,
  BGRX5551 = 18,
  BGRA4444 = 19,
  DXT1_ONEBITALPHA = 20,
  BGRA5551 = 21,
  UV88 = 22,
  UVWQ8888 = 23,
  RGBA16161616F = 24,
  RGBA16161616 = 25,
  UVLX8888 = 26
}

export class Vtf {
  public width: number = 0;
  public height: number = 0;
  public flags: number = 0;
  public frames: number = 0;
  public firstFrame: number = 0;
  public format: VtfImageFormat = VtfImageFormat.RGBA8888;
  public mipmapCount: number = 0;
  public lowResImageFormat: VtfImageFormat = VtfImageFormat.RGBA8888;
  public lowResImageWidth: number = 0;
  public lowResImageHeight: number = 0;
  public depth: number = 0;
  
  private data: Uint8Array;
  private version: number = 0;
  private headerSize: number = 0;

  constructor(buffer: ArrayBuffer) {
    this.data = new Uint8Array(buffer);
    this.parseHeader();
  }

  private parseHeader() {
    const view = new DataView(this.data.buffer);
    const signature = String.fromCharCode(...this.data.slice(0, 4));
    
    if (signature !== 'VTF\0') {
      throw new Error('Invalid VTF signature');
    }

    const versionMajor = view.getUint32(4, true);
    const versionMinor = view.getUint32(8, true);
    this.version = versionMajor * 10 + versionMinor;
    this.headerSize = view.getUint32(12, true);

    this.width = view.getUint16(16, true);
    this.height = view.getUint16(18, true);
    this.flags = view.getUint32(20, true);
    this.frames = view.getUint16(24, true);
    this.firstFrame = view.getUint16(26, true);
    
    // Padding at 28 (4 bytes)

    // Reflectivity at 32 (12 bytes vector)

    // Padding at 44 (4 bytes)

    // Bumpmap scale at 48 (4 bytes float)

    this.format = view.getUint32(52, true);
    this.mipmapCount = view.getUint8(56);
    this.lowResImageFormat = view.getUint32(57, true);
    this.lowResImageWidth = view.getUint8(61);
    this.lowResImageHeight = view.getUint8(62);

    if (this.version >= 72) {
        this.depth = view.getUint16(63, true);
    } else {
        this.depth = 1;
    }
  }

  public getImage(frame: number = 0, face: number = 0, slice: number = 0, mipmapLevel: number = 0): Uint8Array | null {
    // Calculate offset to the desired image data
    // VTF layout:
    // Header
    // Low res image data
    // High res image data (smallest mipmap to largest)
    
    let offset = this.headerSize;

    // Skip low res image
    if (this.lowResImageFormat !== -1) { // Check if valid format
        const lowResSize = this.getImageSize(this.lowResImageWidth, this.lowResImageHeight, this.lowResImageFormat);
        offset += lowResSize;
    }

    // Iterate mipmaps from smallest to largest (mipmapCount-1 down to 0)
    // But wait, usually mipmaps are stored 0=largest, but in file they might be stored smallest first?
    // VTF spec says: "The image data is stored in the file starting with the smallest mipmap of the first frame"
    // Actually, it's: Mipmaps are stored from smallest (mipmapCount-1) to largest (0).
    // Within each mipmap: Frames -> Faces -> Z-Slices.

    for (let m = this.mipmapCount - 1; m >= 0; m--) {
        const mipWidth = Math.max(1, this.width >> m);
        const mipHeight = Math.max(1, this.height >> m);
        const mipDepth = Math.max(1, this.depth >> m);
        const size = this.getImageSize(mipWidth, mipHeight, this.format);

        if (m === mipmapLevel) {
            // We found the mipmap level we want.
            // Now calculate offset for specific frame/face/slice
            // Order: Frame -> Face -> Slice
            
            // Total size of one full mipmap level (all frames, faces, slices)
            // const levelSize = size * this.frames * 6 * mipDepth; // 6 faces for cubemaps? Assuming 1 for now if not cubemap flag
            // Actually, let's assume standard 2D texture for now.
            // If it's a cubemap, faces = 6, else 1.
            const numFaces = (this.flags & 0x4000) ? 6 : 1; // TEXTUREFLAGS_ENVMAP
            
            // Offset within this mipmap level
            const frameOffset = frame * numFaces * mipDepth * size;
            const faceOffset = face * mipDepth * size;
            const sliceOffset = slice * size;
            
            const finalOffset = offset + frameOffset + faceOffset + sliceOffset;
            
            if (finalOffset + size > this.data.length) {
                console.error("VTF data offset out of bounds");
                return null;
            }

            const imageData = this.data.subarray(finalOffset, finalOffset + size);
            return this.decodeImage(imageData, mipWidth, mipHeight, this.format);
        }

        // Skip this entire mipmap level
        const numFaces = (this.flags & 0x4000) ? 6 : 1;
        offset += size * this.frames * numFaces * mipDepth;
    }

    return null;
  }

  private getImageSize(width: number, height: number, format: VtfImageFormat): number {
    switch (format) {
      case VtfImageFormat.DXT1:
      case VtfImageFormat.DXT1_ONEBITALPHA:
        return Math.max(1, Math.floor((width + 3) / 4)) * Math.max(1, Math.floor((height + 3) / 4)) * 8;
      case VtfImageFormat.DXT3:
      case VtfImageFormat.DXT5:
        return Math.max(1, Math.floor((width + 3) / 4)) * Math.max(1, Math.floor((height + 3) / 4)) * 16;
      case VtfImageFormat.BGRA8888:
      case VtfImageFormat.BGRX8888:
      case VtfImageFormat.RGBA8888:
      case VtfImageFormat.ARGB8888:
      case VtfImageFormat.ABGR8888:
        return width * height * 4;
      case VtfImageFormat.BGR888:
      case VtfImageFormat.RGB888:
        return width * height * 3;
      case VtfImageFormat.BGR565:
      case VtfImageFormat.RGB565:
      case VtfImageFormat.BGRA4444:
      case VtfImageFormat.BGRA5551:
      case VtfImageFormat.BGRX5551:
        return width * height * 2;
      case VtfImageFormat.I8:
      case VtfImageFormat.A8:
      case VtfImageFormat.P8:
        return width * height;
      default:
        return width * height * 4; // Fallback assumption
    }
  }

  private decodeImage(data: Uint8Array, width: number, height: number, format: VtfImageFormat): Uint8Array {
    const output = new Uint8Array(width * height * 4); // RGBA output

    switch (format) {
      case VtfImageFormat.DXT1:
      case VtfImageFormat.DXT1_ONEBITALPHA:
        this.decodeDXT1(data, width, height, output);
        break;
      case VtfImageFormat.DXT3:
        this.decodeDXT3(data, width, height, output);
        break;
      case VtfImageFormat.DXT5:
        this.decodeDXT5(data, width, height, output);
        break;
      case VtfImageFormat.BGRA8888:
        this.decodeBGRA8888(data, width, height, output);
        break;
      case VtfImageFormat.RGBA8888:
        this.decodeRGBA8888(data, width, height, output);
        break;
      case VtfImageFormat.BGR888:
        this.decodeBGR888(data, width, height, output);
        break;
      default:
        console.warn(`Unsupported VTF format: ${format}, returning empty`);
        // Fill with magenta to indicate error
        for (let i = 0; i < output.length; i += 4) {
            output[i] = 255;
            output[i+1] = 0;
            output[i+2] = 255;
            output[i+3] = 255;
        }
    }

    return output;
  }

  private decodeRGBA8888(data: Uint8Array, width: number, height: number, output: Uint8Array) {
      for (let i = 0; i < width * height; i++) {
          const r = data[i * 4];
          const g = data[i * 4 + 1];
          const b = data[i * 4 + 2];
          const a = data[i * 4 + 3];
          output[i * 4] = r;
          output[i * 4 + 1] = g;
          output[i * 4 + 2] = b;
          output[i * 4 + 3] = a;
      }
  }

  private decodeBGRA8888(data: Uint8Array, width: number, height: number, output: Uint8Array) {
      for (let i = 0; i < width * height; i++) {
          const b = data[i * 4];
          const g = data[i * 4 + 1];
          const r = data[i * 4 + 2];
          const a = data[i * 4 + 3];
          output[i * 4] = r;
          output[i * 4 + 1] = g;
          output[i * 4 + 2] = b;
          output[i * 4 + 3] = a;
      }
  }

  private decodeBGR888(data: Uint8Array, width: number, height: number, output: Uint8Array) {
      for (let i = 0; i < width * height; i++) {
          const b = data[i * 3];
          const g = data[i * 3 + 1];
          const r = data[i * 3 + 2];
          output[i * 4] = r;
          output[i * 4 + 1] = g;
          output[i * 4 + 2] = b;
          output[i * 4 + 3] = 255;
      }
  }

  // DXT Decoding helpers
  // Based on standard DXT decompression algorithms

  private decodeDXT1(data: Uint8Array, width: number, height: number, output: Uint8Array) {
      const blockCountX = Math.floor((width + 3) / 4);
      const blockCountY = Math.floor((height + 3) / 4);
      
      let offset = 0;
      
      for (let by = 0; by < blockCountY; by++) {
          for (let bx = 0; bx < blockCountX; bx++) {
              this.decompressBlockDXT1(bx * 4, by * 4, width, data, offset, output);
              offset += 8;
          }
      }
  }

  private decompressBlockDXT1(x: number, y: number, width: number, data: Uint8Array, offset: number, output: Uint8Array) {
      const c0 = data[offset] | (data[offset + 1] << 8);
      const c1 = data[offset + 2] | (data[offset + 3] << 8);
      
      const r0 = (c0 & 0xF800) >> 8;
      const g0 = (c0 & 0x07E0) >> 3;
      const b0 = (c0 & 0x001F) << 3;
      
      const r1 = (c1 & 0xF800) >> 8;
      const g1 = (c1 & 0x07E0) >> 3;
      const b1 = (c1 & 0x001F) << 3;
      
      const colors = new Uint8Array(16);
      
      colors[0] = r0; colors[1] = g0; colors[2] = b0; colors[3] = 255;
      colors[4] = r1; colors[5] = g1; colors[6] = b1; colors[7] = 255;
      
      if (c0 > c1) {
          colors[8] = (2 * r0 + r1) / 3;
          colors[9] = (2 * g0 + g1) / 3;
          colors[10] = (2 * b0 + b1) / 3;
          colors[11] = 255;
          
          colors[12] = (r0 + 2 * r1) / 3;
          colors[13] = (g0 + 2 * g1) / 3;
          colors[14] = (b0 + 2 * b1) / 3;
          colors[15] = 255;
      } else {
          colors[8] = (r0 + r1) / 2;
          colors[9] = (g0 + g1) / 2;
          colors[10] = (b0 + b1) / 2;
          colors[11] = 255;
          
          colors[12] = 0; colors[13] = 0; colors[14] = 0; colors[15] = 0;
      }
      
      const lookup = data[offset + 4] | (data[offset + 5] << 8) | (data[offset + 6] << 16) | (data[offset + 7] << 24);
      
      for (let i = 0; i < 16; i++) {
          const py = y + Math.floor(i / 4);
          const px = x + (i % 4);
          
          if (px < width && py < width) { // Assuming square texture or handled by caller? Actually need real height
             // Just check bounds
             if (px < width && py * width * 4 < output.length) {
                 const idx = (lookup >> (i * 2)) & 3;
                 const outOffset = (py * width + px) * 4;
                 
                 output[outOffset] = colors[idx * 4];
                 output[outOffset + 1] = colors[idx * 4 + 1];
                 output[outOffset + 2] = colors[idx * 4 + 2];
                 output[outOffset + 3] = colors[idx * 4 + 3];
             }
          }
      }
  }

  private decodeDXT3(data: Uint8Array, width: number, height: number, output: Uint8Array) {
      const blockCountX = Math.floor((width + 3) / 4);
      const blockCountY = Math.floor((height + 3) / 4);
      
      let offset = 0;
      
      for (let by = 0; by < blockCountY; by++) {
          for (let bx = 0; bx < blockCountX; bx++) {
              this.decompressBlockDXT3(bx * 4, by * 4, width, data, offset, output);
              offset += 16;
          }
      }
  }

  private decompressBlockDXT3(x: number, y: number, width: number, data: Uint8Array, offset: number, output: Uint8Array) {
      // 8 bytes of alpha (4 bits per pixel)
      // 8 bytes of color (same as DXT1)
      
      // Decompress color first (offset + 8)
      this.decompressBlockDXT1(x, y, width, data, offset + 8, output);
      
      // Overwrite alpha
      for (let i = 0; i < 16; i++) {
          const py = y + Math.floor(i / 4);
          const px = x + (i % 4);
          
          if (px < width && py * width * 4 < output.length) {
              const alphaIdx = Math.floor(i / 2);
              const alphaByte = data[offset + alphaIdx];
              const alphaBits = (i % 2 === 0) ? (alphaByte & 0x0F) : ((alphaByte & 0xF0) >> 4);
              const alpha = (alphaBits * 17); // Scale 0-15 to 0-255
              
              const outOffset = (py * width + px) * 4;
              output[outOffset + 3] = alpha;
          }
      }
  }

  private decodeDXT5(data: Uint8Array, width: number, height: number, output: Uint8Array) {
      const blockCountX = Math.floor((width + 3) / 4);
      const blockCountY = Math.floor((height + 3) / 4);
      
      let offset = 0;
      
      for (let by = 0; by < blockCountY; by++) {
          for (let bx = 0; bx < blockCountX; bx++) {
              this.decompressBlockDXT5(bx * 4, by * 4, width, data, offset, output);
              offset += 16;
          }
      }
  }

  private decompressBlockDXT5(x: number, y: number, width: number, data: Uint8Array, offset: number, output: Uint8Array) {
      // 8 bytes of alpha (interpolated)
      // 8 bytes of color (same as DXT1)
      
      // Decompress color first (offset + 8)
      this.decompressBlockDXT1(x, y, width, data, offset + 8, output);
      
      const a0 = data[offset];
      const a1 = data[offset + 1];
      const alphas = new Uint8Array(8);
      alphas[0] = a0;
      alphas[1] = a1;
      
      if (a0 > a1) {
          alphas[2] = (6 * a0 + 1 * a1) / 7;
          alphas[3] = (5 * a0 + 2 * a1) / 7;
          alphas[4] = (4 * a0 + 3 * a1) / 7;
          alphas[5] = (3 * a0 + 4 * a1) / 7;
          alphas[6] = (2 * a0 + 5 * a1) / 7;
          alphas[7] = (1 * a0 + 6 * a1) / 7;
      } else {
          alphas[2] = (4 * a0 + 1 * a1) / 5;
          alphas[3] = (3 * a0 + 2 * a1) / 5;
          alphas[4] = (2 * a0 + 3 * a1) / 5;
          alphas[5] = (1 * a0 + 4 * a1) / 5;
          alphas[6] = 0;
          alphas[7] = 255;
      }
      
      // 6 bytes of indices (48 bits), 3 bits per pixel
      // Note: JS bitwise ops are 32-bit. We need to handle 48 bits carefully.
      // Let's read bytes manually to be safe
      
      let alphaIndices = 0n;
      for (let i = 0; i < 6; i++) {
          alphaIndices |= BigInt(data[offset + 2 + i]) << BigInt(i * 8);
      }
      
      for (let i = 0; i < 16; i++) {
          const py = y + Math.floor(i / 4);
          const px = x + (i % 4);
          
          if (px < width && py * width * 4 < output.length) {
              const idx = Number((alphaIndices >> BigInt(i * 3)) & 7n);
              const alpha = alphas[idx];
              
              const outOffset = (py * width + px) * 4;
              output[outOffset + 3] = alpha;
          }
      }
  }
}
