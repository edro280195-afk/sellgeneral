import { deflate } from 'pako';

export interface TsplCommandOptions {
    widthMm: number;
    heightMm: number;
    gapMm?: number;
    density?: number;
    copies?: number;
}

export function buildE40TsplCommand(
    pixels: Uint8ClampedArray | Uint8Array,
    width: number,
    height: number,
    options: TsplCommandOptions
): Uint8Array {
    const bytesPerRow = (width + 7) >> 3;
    const bitmap = new Uint8Array(bytesPerRow * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixel = (y * width + x) * 4;
            const luminance = Math.round(0.299 * pixels[pixel] + 0.587 * pixels[pixel + 1] + 0.114 * pixels[pixel + 2]);
            // Coincide con el encoder comprimido ya usado por la app Flutter:
            // bit activo para píxel oscuro en el modo TSPL 3 de la E40.
            if (luminance < 128) {
                const byteIndex = y * bytesPerRow + (x >> 3);
                bitmap[byteIndex] |= 1 << (7 - (x & 7));
            }
        }
    }

    const compressedBitmap = deflate(bitmap, { windowBits: 10 });
    const header = new TextEncoder().encode(
        `SIZE ${Math.round(options.widthMm)} mm,${Math.round(options.heightMm)} mm\r\n` +
        `GAP ${options.gapMm ?? 2} mm,0 mm\r\n` +
        `DENSITY ${options.density ?? 8}\r\n` +
        'SPEED 4\r\nDIRECTION 0\r\nREFERENCE 0,0\r\nCLS\r\n' +
        `BITMAP 0,0,${bytesPerRow},${height},3,${compressedBitmap.length},`
    );
    const footer = new TextEncoder().encode(`\r\nPRINT 1,${options.copies ?? 1}\r\n`);
    const command = new Uint8Array(header.length + compressedBitmap.length + footer.length);
    command.set(header, 0);
    command.set(compressedBitmap, header.length);
    command.set(footer, header.length + compressedBitmap.length);
    return command;
}
