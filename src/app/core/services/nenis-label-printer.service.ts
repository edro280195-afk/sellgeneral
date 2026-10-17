import { Injectable } from '@angular/core';
import html2canvas from 'html2canvas';
import { NenisBluetoothPrinterService } from './nenis-bluetooth-printer.service';
import { buildE40TsplCommand } from './e40-tspl-command-builder';

const LABEL_WIDTH_MM = 101.6;
const LABEL_HEIGHT_MM = 152.4;
const LABEL_WIDTH_PX = 812;
const LABEL_HEIGHT_PX = 1218;
const CSS_WIDTH_PX = 384;
const CSS_HEIGHT_PX = 576;
const RENDER_SCALE = LABEL_WIDTH_PX / CSS_WIDTH_PX;

@Injectable({ providedIn: 'root' })
export class NenisLabelPrinterService {
    constructor(private readonly bluetoothPrinter: NenisBluetoothPrinterService) {}

    async printHtml(html: string): Promise<number> {
        const pages = await this.renderPages(html);
        const commands: Uint8Array[] = [];
        for (const canvas of pages) {
            const context = canvas.getContext('2d', { alpha: false });
            if (!context) throw new Error('No se pudo preparar la imagen térmica de la etiqueta.');
            const pixels = context.getImageData(0, 0, LABEL_WIDTH_PX, LABEL_HEIGHT_PX).data;
            commands.push(buildE40TsplCommand(pixels, LABEL_WIDTH_PX, LABEL_HEIGHT_PX, {
                widthMm: LABEL_WIDTH_MM,
                heightMm: LABEL_HEIGHT_MM,
                gapMm: 2,
                density: 8,
                copies: 1
            }));
        }
        return this.bluetoothPrinter.printCommands(commands);
    }

    private async renderPages(html: string): Promise<HTMLCanvasElement[]> {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('aria-hidden', 'true');
        iframe.style.position = 'fixed';
        iframe.style.left = '-10000px';
        iframe.style.top = '0';
        iframe.style.width = `${CSS_WIDTH_PX}px`;
        iframe.style.height = `${CSS_HEIGHT_PX}px`;
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        document.body.appendChild(iframe);

        try {
            const frameDocument = iframe.contentDocument;
            if (!frameDocument) throw new Error('No se pudo abrir el diseño de la etiqueta.');
            frameDocument.open();
            frameDocument.write(html.replace(/<script>[\s\S]*?<\/script>/gi, ''));
            frameDocument.close();
            await this.waitForImages(frameDocument);

            const labelPages = Array.from(frameDocument.querySelectorAll<HTMLElement>('.label-page'));
            if (!labelPages.length) throw new Error('El diseño no contiene páginas de etiqueta para imprimir.');

            const rendered: HTMLCanvasElement[] = [];
            for (const page of labelPages) {
                page.style.width = `${LABEL_WIDTH_MM}mm`;
                page.style.height = `${LABEL_HEIGHT_MM}mm`;
                const preview = await html2canvas(page, {
                    backgroundColor: '#FFFFFF',
                    scale: RENDER_SCALE,
                    width: CSS_WIDTH_PX,
                    height: CSS_HEIGHT_PX,
                    windowWidth: CSS_WIDTH_PX,
                    windowHeight: CSS_HEIGHT_PX,
                    useCORS: true,
                    logging: false
                });
                const output = document.createElement('canvas');
                output.width = LABEL_WIDTH_PX;
                output.height = LABEL_HEIGHT_PX;
                const outputContext = output.getContext('2d', { alpha: false });
                if (!outputContext) throw new Error('No se pudo convertir la etiqueta a resolución térmica.');
                outputContext.fillStyle = '#FFFFFF';
                outputContext.fillRect(0, 0, output.width, output.height);
                outputContext.drawImage(preview, 0, 0, output.width, output.height);
                rendered.push(output);
            }
            return rendered;
        } finally {
            iframe.remove();
        }
    }

    private async waitForImages(frameDocument: Document): Promise<void> {
        await Promise.all(Array.from(frameDocument.images).map(image => {
            if (image.complete) return Promise.resolve();
            return new Promise<void>(resolve => {
                image.addEventListener('load', () => resolve(), { once: true });
                image.addEventListener('error', () => resolve(), { once: true });
                window.setTimeout(resolve, 5000);
            });
        }));
        if (frameDocument.fonts) await frameDocument.fonts.ready;
    }
}
