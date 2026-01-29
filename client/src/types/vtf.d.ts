declare module 'vtf' {
  export class Vtf {
    constructor(buffer: ArrayBuffer);
    width: number;
    height: number;
    getImage(mipmapLevel: number): Uint8Array;
  }
}
