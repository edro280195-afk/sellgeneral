import {
    ChangeDetectionStrategy,
    Component,
    computed,
    effect,
    input,
    OnInit,
    output,
    signal
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import * as QRCode from 'qrcode';
import {
    LabelAssetDto,
    LabelPrintJobDto,
    LabelPrintPayloadDto,
    LabelTemplateEditorDto,
    OrderPackageDto,
    OrderSummaryDto
} from '../../../core/models';
import { ApiService } from '../../../core/services/api.service';

export type LabelElementType =
    | 'frame'
    | 'brand'
    | 'tagline'
    | 'text'
    | 'clientName'
    | 'qr'
    | 'packageCounter'
    | 'divider'
    | 'decoration'
    | 'footerMessage'
    | 'footerThanks';

export interface LabelElement {
    id: string;
    type: LabelElementType;
    label: string;
    enabled: boolean;
    text?: string;
    icon?: 'home' | 'heart' | 'sparkles' | 'leaves';
    fontSize?: number;
    bold?: boolean;
    align?: 'left' | 'center' | 'right';
}

export interface LabelPrintRequest {
    html: string;
    title: string;
    jobId: string;
}

interface LabelElementOption {
    type: LabelElementType;
    label: string;
    icon: 'brand' | 'type' | 'qr' | 'counter' | 'divider' | 'decoration' | 'message';
}

type BackendLabelElementType = 'text' | 'data' | 'image' | 'qr' | 'barcode' | 'shape' | 'line';

interface BackendLabelElement {
    id: string;
    type: BackendLabelElementType;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    visible: boolean;
    zIndex: number;
    properties: Record<string, unknown>;
}

interface BackendLabelDesign {
    schemaVersion: number;
    canvas: {
        widthMm: number;
        heightMm: number;
        background: string;
    };
    elements: BackendLabelElement[];
}

const DEFAULT_ELEMENTS: LabelElement[] = [
    { id: 'frame', type: 'frame', label: 'Marco redondeado', enabled: true },
    { id: 'brand', type: 'brand', label: 'Logo y nombre de la tienda', enabled: true, align: 'center' },
    { id: 'tagline', type: 'tagline', label: 'Frase de marca', enabled: true, text: 'Todo para tu hogar', align: 'center' },
    { id: 'top-divider', type: 'divider', label: 'Separador superior', enabled: true },
    { id: 'deliver-to', type: 'text', label: 'Título del pedido', enabled: true, text: 'PEDIDO PARA:', fontSize: 12, bold: true, align: 'center' },
    { id: 'client-name', type: 'clientName', label: 'Nombre de la clienta', enabled: true, fontSize: 25, bold: true, align: 'center' },
    { id: 'client-divider', type: 'divider', label: 'Separador del pedido', enabled: true },
    { id: 'qr', type: 'qr', label: 'Código QR de la bolsa', enabled: true },
    { id: 'package-counter', type: 'packageCounter', label: 'Contador de bolsas', enabled: true },
    { id: 'bottom-divider', type: 'divider', label: 'Separador inferior', enabled: true },
    { id: 'footer-message', type: 'footerMessage', label: 'Mensaje de llegada', enabled: true, text: '¡Llegó tu pedido! ♡', fontSize: 19, align: 'center' },
    { id: 'footer-thanks', type: 'footerThanks', label: 'Mensaje de agradecimiento', enabled: true, text: 'Esperamos que te encante.\n¡Gracias por tu compra! ♡', fontSize: 12, align: 'center' },
    { id: 'top-decoration', type: 'decoration', label: 'Decoración superior', enabled: true, icon: 'home' },
    { id: 'footer-decoration', type: 'decoration', label: 'Decoración inferior', enabled: true, icon: 'leaves' }
];

@Component({
    selector: 'app-label-editor',
    standalone: true,
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './label-editor.component.html',
    styleUrl: './label-editor.component.css'
})
export class LabelEditorComponent implements OnInit {
    readonly order = input.required<OrderSummaryDto>();
    readonly packageData = input.required<OrderPackageDto>();
    readonly packages = input.required<OrderPackageDto[]>();
    readonly businessName = input('Regi Bazar');
    readonly logoUrl = input<string | null>(null);
    readonly mediaSize = input('Shipping4x6');

    readonly closed = output<void>();
    readonly printRequested = output<LabelPrintRequest>();

    readonly elementOptions: readonly LabelElementOption[] = [
        { type: 'frame', label: 'Marco redondeado', icon: 'decoration' },
        { type: 'brand', label: 'Logo y tienda', icon: 'brand' },
        { type: 'tagline', label: 'Frase de marca', icon: 'type' },
        { type: 'text', label: 'Texto libre', icon: 'type' },
        { type: 'clientName', label: 'Nombre de clienta', icon: 'type' },
        { type: 'qr', label: 'Código QR', icon: 'qr' },
        { type: 'packageCounter', label: 'Bolsa x de y', icon: 'counter' },
        { type: 'divider', label: 'Línea separadora', icon: 'divider' },
        { type: 'decoration', label: 'Decoración', icon: 'decoration' },
        { type: 'footerMessage', label: 'Mensaje final', icon: 'message' },
        { type: 'footerThanks', label: 'Agradecimiento', icon: 'message' }
    ];

    readonly elements = signal<LabelElement[]>(this.cloneDefaults());
    readonly selectedElementId = signal('brand');
    readonly saving = signal(false);
    readonly printing = signal(false);
    readonly publishing = signal(false);
    readonly templateLoading = signal(true);
    readonly template = signal<LabelTemplateEditorDto | null>(null);
    readonly assets = signal<LabelAssetDto[]>([]);
    readonly selectedLogoAssetId = signal<string | null>(null);
    readonly uploadingAsset = signal(false);
    readonly statusMessage = signal('');
    readonly errorMessage = signal('');
    readonly qrPreviewUrl = signal('');

    readonly selectedElement = computed(() =>
        this.elements().find(element => element.id === this.selectedElementId()) ?? null
    );

    readonly enabledCount = computed(() => this.elements().filter(element => element.enabled).length);

    constructor(private readonly api: ApiService) {
        effect(() => {
            const qrValue = this.packageData()?.qrCodeValue;
            if (!qrValue) return;
            void QRCode.toDataURL(qrValue, { errorCorrectionLevel: 'M', width: 280, margin: 1 })
                .then(url => this.qrPreviewUrl.set(url))
                .catch(() => this.qrPreviewUrl.set(''));
        });
    }

    ngOnInit(): void {
        this.loadTemplate();
    }

    private loadTemplate(): void {
        this.templateLoading.set(true);
        this.errorMessage.set('');
        this.api.getOrderLabelTemplate(this.mediaSize()).subscribe({
            next: template => {
                this.template.set(template);
                this.elements.set(this.elementsFromDesign(template.draftVersion.designJson));
                this.selectedElementId.set('brand');
                this.templateLoading.set(false);
            },
            error: () => {
                this.errorMessage.set('No se pudo cargar la plantilla de etiquetas.');
                this.templateLoading.set(false);
            }
        });
        this.api.getLabelAssets().subscribe({
            next: assets => {
                this.assets.set(assets);
                const templateDesign = this.template()?.draftVersion.designJson;
                const design = templateDesign ? this.parseDesign(templateDesign) : null;
                const templateLogo = design?.elements.find(element => element.id === 'brand-logo');
                this.selectedLogoAssetId.set(
                    (templateLogo ? this.propertyString(templateLogo, 'assetId') : null) ??
                    assets.find(asset => asset.url === this.logoUrl())?.id ??
                    null
                );
            },
            error: () => this.assets.set([])
        });
    }

    uploadLogo(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file || this.uploadingAsset()) return;

        this.uploadingAsset.set(true);
        this.api.uploadLabelAsset(file, 'Logo de la etiqueta').subscribe({
            next: asset => {
                this.assets.update(assets => [asset, ...assets]);
                this.selectedLogoAssetId.set(asset.id);
                this.statusMessage.set('Logo agregado a la biblioteca de etiquetas.');
                this.uploadingAsset.set(false);
                input.value = '';
            },
            error: () => {
                this.errorMessage.set('No se pudo subir el logo. Usa PNG, JPG o WEBP de máximo 3 MB.');
                this.uploadingAsset.set(false);
                input.value = '';
            }
        });
    }

    isEnabled(id: string): boolean {
        return this.elements().some(element => element.id === id && element.enabled);
    }

    toggleElement(id: string): void {
        if (this.isRequiredElement(id)) return;
        this.elements.update(elements => elements.map(element =>
            element.id === id ? { ...element, enabled: !element.enabled } : element
        ));
        this.selectedElementId.set(id);
    }

    isRequiredElement(id: string): boolean {
        return id === 'client-name' || id === 'qr' || id === 'package-counter';
    }

    selectElement(id: string): void {
        this.selectedElementId.set(id);
    }

    addElement(type: LabelElementType): void {
        const existing = this.elements().find(element => element.type === type && !this.isCustomText(element));
        if (existing) {
            this.elements.update(elements => elements.map(element =>
                element.id === existing.id ? { ...element, enabled: true } : element
            ));
            this.selectedElementId.set(existing.id);
            return;
        }

        const suffix = this.elements().filter(element => element.type === type).length + 1;
        const element = this.createElement(type, suffix);
        this.elements.update(elements => [...elements, element]);
        this.selectedElementId.set(element.id);
    }

    updateSelectedText(event: Event): void {
        const inputElement = event.target as HTMLInputElement | HTMLTextAreaElement;
        this.updateElement(this.selectedElementId(), { text: inputElement.value });
    }

    updateSelectedFontSize(event: Event): void {
        const inputElement = event.target as HTMLInputElement;
        const fontSize = Number(inputElement.value);
        if (Number.isFinite(fontSize)) this.updateElement(this.selectedElementId(), { fontSize });
    }

    updateSelectedAlign(event: Event): void {
        const inputElement = event.target as HTMLSelectElement;
        const align = inputElement.value as 'left' | 'center' | 'right';
        this.updateElement(this.selectedElementId(), { align });
    }

    toggleSelectedBold(): void {
        const selected = this.selectedElement();
        if (selected) this.updateElement(selected.id, { bold: !selected.bold });
    }

    removeSelected(): void {
        const selected = this.selectedElement();
        if (!selected || !this.isRemovable(selected)) return;
        this.elements.update(elements => elements.filter(element => element.id !== selected.id));
        this.selectedElementId.set(this.elements()[0]?.id ?? 'brand');
    }

    saveLayout(): void {
        void this.saveDraft(false);
    }

    publishLayout(): void {
        void this.saveDraft(true);
    }

    resetLayout(): void {
        const currentTemplate = this.template();
        if (!currentTemplate || this.saving() || this.publishing()) return;

        this.saving.set(true);
        this.api.resetLabelTemplateDraft(currentTemplate.id).subscribe({
            next: template => {
                this.template.set(template);
                this.elements.set(this.elementsFromDesign(template.draftVersion.designJson));
                this.selectedElementId.set('brand');
                this.statusMessage.set('Borrador restablecido.');
                this.saving.set(false);
            },
            error: () => {
                this.errorMessage.set('No se pudo restablecer el borrador.');
                this.saving.set(false);
            }
        });
    }

    async printCurrent(): Promise<void> {
        await this.preparePrint([this.packageData()], 'Etiqueta Bolsa ' + this.packageData().packageNumber);
    }

    async printAll(): Promise<void> {
        if (this.packages().length === 0) return;
        await this.preparePrint(this.packages(), 'Etiquetas Pedido ' + this.order().id);
    }

    private async saveDraft(publish: boolean): Promise<void> {
        const currentTemplate = this.template();
        if (!currentTemplate || this.saving() || this.publishing()) return;

        this.errorMessage.set('');
        this.saving.set(true);
        try {
            const saved = await firstValueFrom(this.api.saveLabelTemplateDraft(
                currentTemplate.id,
                {
                    designJson: JSON.stringify(this.toBackendDesign()),
                    expectedRevision: currentTemplate.draftVersion.revision
                }
            ));
            this.template.set(saved);

            if (publish) {
                this.publishing.set(true);
                const published = await firstValueFrom(this.api.publishLabelTemplate(saved.id));
                this.template.set(published);
                this.statusMessage.set('Diseño guardado y publicado.');
            } else {
                this.statusMessage.set('Diseño guardado como borrador.');
            }
        } catch (error) {
            console.error('Error al guardar la plantilla de etiquetas:', error);
            this.errorMessage.set('No se pudo guardar. Es posible que la plantilla haya cambiado en otra ventana; vuelve a cargarla e inténtalo de nuevo.');
        } finally {
            this.saving.set(false);
            this.publishing.set(false);
        }
    }

    private async preparePrint(packages: OrderPackageDto[], title: string): Promise<void> {
        if (this.printing() || this.templateLoading() || packages.length === 0) return;

        this.printing.set(true);
        this.errorMessage.set('');
        try {
            await this.saveDraftAndPublish();
            const job = await firstValueFrom(this.api.createLabelPrintJob({
                packageIds: packages.map(packageData => packageData.id),
                mediaSize: this.mediaSize(),
                copies: 1,
                output: 'SystemPrint'
            }));
            const html = await this.renderPrintJob(job);
            this.printRequested.emit({ html, title, jobId: job.id });
        } catch (error) {
            console.error('Error al preparar la impresión de etiquetas:', error);
            this.errorMessage.set('No se pudo preparar la impresión. Guarda y publica el diseño antes de intentarlo de nuevo.');
        } finally {
            this.printing.set(false);
        }
    }

    private async saveDraftAndPublish(): Promise<LabelTemplateEditorDto> {
        const currentTemplate = this.template();
        if (!currentTemplate) throw new Error('La plantilla todavía no está disponible.');

        const saved = await firstValueFrom(this.api.saveLabelTemplateDraft(
            currentTemplate.id,
            {
                designJson: JSON.stringify(this.toBackendDesign()),
                expectedRevision: currentTemplate.draftVersion.revision
            }
        ));
        this.template.set(saved);

        const published = await firstValueFrom(this.api.publishLabelTemplate(saved.id));
        this.template.set(published);
        return published;
    }

    private toBackendDesign(): BackendLabelDesign {
        const visible = (id: string): boolean =>
            this.isEnabled(id) || id === 'client-name' || id === 'qr' || id === 'package-counter';
        const elements: BackendLabelElement[] = [];
        const add = (element: BackendLabelElement): void => {
            elements.push(element);
        };

        add(this.shapeElement('frame', 3, 3, 95.6, 146.4, visible('frame')));
        add(this.textElement('top-decoration', '✦   ⌂   ✦', 20, 7, 61.6, 9, 12, 700, 'center', visible('top-decoration')));

        const logoAsset = this.assets().find(asset => asset.id === this.selectedLogoAssetId());
        if (logoAsset && visible('brand')) {
            add({
                id: 'brand-logo',
                type: 'image',
                x: 36,
                y: 13,
                width: 29.6,
                height: 14,
                rotation: 0,
                visible: true,
                zIndex: 3,
                properties: { assetId: logoAsset.id, objectFit: 'contain' }
            });
        }
        add(this.dataElement('brand-name', 'business.name', 15, 16, 71.6, 15, 34, 900, 'center', visible('brand')));
        add(this.textElement('tagline', this.textValue('tagline', 'Todo para tu hogar'), 16, 32, 69.6, 7, 13, 800, 'center', visible('tagline')));
        add(this.lineElement('top-divider', 10, 42, 81.6, visible('top-divider'), true));
        add(this.textElement('deliver-to', this.textValue('deliver-to', 'PEDIDO PARA:'), 13, 47, 75.6, 7, 12, 700, 'center', visible('deliver-to')));
        add(this.dataElement('client-name', 'order.clientName', 7, 55, 87.6, 13, 25, 900, 'center', true));
        add(this.lineElement('client-divider', 10, 70, 81.6, visible('client-divider'), false));
        add(this.qrElement('package-qr', 'package.qrCodeValue', 7, 75, 55, true));
        add(this.textElement('package-label', 'BOLSA', 68, 76, 28, 7, 13, 900, 'center', visible('package-counter')));
        add(this.dataElement('package-number', 'package.number', 68, 85, 28, 15, 27, 900, 'center', true));
        add(this.dataElement('package-total', 'package.total', 68, 102, 28, 8, 13, 700, 'center', true, 'DE '));
        add(this.textElement('package-bag', '♡', 68, 112, 28, 13, 28, 900, 'center', visible('package-counter')));

        const customTexts = this.elements().filter(element => element.enabled && element.type === 'text' && element.id !== 'deliver-to');
        customTexts.forEach((element, index) => {
            add(this.textElement(
                this.safeElementId(element.id),
                element.text || '',
                12,
                Math.min(124, 66 + index * 5),
                76,
                4,
                element.fontSize || 14,
                element.bold ? 800 : 500,
                element.align || 'center',
                true
            ));
        });

        const extraDecorations = this.elements().filter(element =>
            element.enabled && element.type === 'decoration' &&
            element.id !== 'top-decoration' && element.id !== 'footer-decoration'
        );
        extraDecorations.forEach((element, index) => {
            add(this.textElement(
                this.safeElementId(element.id),
                element.icon === 'leaves' ? '⌁  ❧  ⌁' : element.icon === 'sparkles' ? '✦  ✦  ✦' : '♥',
                17,
                Math.min(124, 67 + index * 4),
                67.6,
                4,
                12,
                700,
                'center',
                true
            ));
        });

        add(this.lineElement('bottom-divider', 10, 130, 81.6, visible('bottom-divider'), false));
        add(this.textElement('footer-message', this.textValue('footer-message', '¡Llegó tu pedido! ♡'), 10, 134, 81.6, 6, 17, 800, 'center', visible('footer-message')));
        add(this.textElement('footer-thanks', this.textValue('footer-thanks', 'Esperamos que te encante.\n¡Gracias por tu compra! ♡'), 10, 141, 81.6, 6, 10, 500, 'center', visible('footer-thanks')));
        add(this.textElement('footer-decoration', '⌁  ❧  ⌁', 22, 147, 57.6, 4, 13, 500, 'center', visible('footer-decoration')));

        return {
            schemaVersion: 1,
            canvas: { widthMm: 101.6, heightMm: 152.4, background: '#FFFFFF' },
            elements
        };
    }

    private textElement(
        id: string,
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fontSize: number,
        fontWeight: number,
        align: string,
        visible: boolean
    ): BackendLabelElement {
        return {
            id,
            type: 'text',
            x,
            y,
            width,
            height,
            rotation: 0,
            visible,
            zIndex: 4,
            properties: { text, fontSize, fontWeight, align, wrap: true }
        };
    }

    private dataElement(
        id: string,
        binding: string,
        x: number,
        y: number,
        width: number,
        height: number,
        fontSize: number,
        fontWeight: number,
        align: string,
        visible: boolean,
        prefix = ''
    ): BackendLabelElement {
        return {
            id,
            type: 'data',
            x,
            y,
            width,
            height,
            rotation: 0,
            visible,
            zIndex: 5,
            properties: { binding, fontSize, fontWeight, align, wrap: true, prefix, suffix: '' }
        };
    }

    private qrElement(id: string, binding: string, x: number, y: number, size: number, visible: boolean): BackendLabelElement {
        return {
            id,
            type: 'qr',
            x,
            y,
            width: size,
            height: size,
            rotation: 0,
            visible,
            zIndex: 5,
            properties: { binding, errorCorrection: 'M' }
        };
    }

    private lineElement(id: string, x: number, y: number, width: number, visible: boolean, dotted: boolean): BackendLabelElement {
        return {
            id,
            type: 'line',
            x,
            y,
            width,
            height: 0.6,
            rotation: 0,
            visible,
            zIndex: 2,
            properties: { color: '#111111', strokeWidth: 0.6, style: dotted ? 'dotted' : 'solid' }
        };
    }

    private shapeElement(id: string, x: number, y: number, width: number, height: number, visible: boolean): BackendLabelElement {
        return {
            id,
            type: 'shape',
            x,
            y,
            width,
            height,
            rotation: 0,
            visible,
            zIndex: 1,
            properties: { shape: 'roundedRect', fill: '#FFFFFF', stroke: '#111111', strokeWidth: 0.6, radius: 8 }
        };
    }

    private textValue(id: string, fallback: string): string {
        return this.elements().find(element => element.id === id)?.text || fallback;
    }

    private safeElementId(value: string): string {
        const sanitized = value.replace(/[^A-Za-z0-9_-]/g, '-');
        return sanitized || 'label-element';
    }

    elementTitle(element: LabelElement): string {
        return element.enabled ? element.label : element.label + ' (oculto)';
    }

    isRemovable(element: LabelElement): boolean {
        return element.type === 'text' || element.type === 'decoration' || element.type === 'divider';
    }

    iconSvg(icon: LabelElement['icon'] | 'bag' | 'store'): string {
        const common = 'fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"';
        switch (icon) {
            case 'bag':
                return '<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path ' + common + ' d=\"M12 17h24l3 25H9l3-25Z\"/><path ' + common + ' d=\"M17 17v-4a7 7 0 0 1 14 0v4\"/><path fill=\"currentColor\" d=\"M20 27h8v8h-8z\"/></svg>';
            case 'store':
                return '<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path ' + common + ' d=\"M8 20h32l-3-10H11L8 20Z\"/><path ' + common + ' d=\"M11 20v19h26V20M17 39V28h14v11\"/><path ' + common + ' d=\"M8 20c0 5 8 5 8 0 0 5 8 5 8 0 0 5 8 5 8 0 0 5 8 5 8 0\"/></svg>';
            case 'home':
                return '<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path ' + common + ' d=\"m7 22 17-14 17 14v18H7V22Z\"/><path ' + common + ' d=\"M18 40V27h12v13M20 18h8\"/><path ' + common + ' d=\"M34 8v7\"/></svg>';
            case 'heart':
                return '<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M24 39S8 29 8 18c0-7 9-11 16-3 7-8 16-4 16 3 0 11-16 21-16 21Z\"/></svg>';
            case 'sparkles':
                return '<svg viewBox=\"0 0 48 48\" aria-hidden=\"true\"><path ' + common + ' d=\"M24 5v12M24 31v12M5 24h12M31 24h12M11 11l8 8M29 29l8 8M37 11l-8 8M19 29l-8 8\"/></svg>';
            case 'leaves':
                return '<svg viewBox=\"0 0 80 32\" aria-hidden=\"true\"><path ' + common + ' d=\"M40 29C30 18 19 10 5 6M13 12c3-6 7-8 13-8-1 6-5 10-13 8ZM21 19c2-6 6-9 12-10 0 6-4 10-12 10ZM29 26c2-5 6-8 11-8 0 5-4 8-11 8ZM67 12c-3-6-7-8-13-8 1 6 5 10 13 8ZM59 19c-2-6-6-9-12-10 0 6 4 10 12 10ZM51 26c-2-5-6-8-11-8 0 5-4 8-11 8Z\"/></svg>';
            default:
                return '';
        }
    }

    private updateElement(id: string, patch: Partial<LabelElement>): void {
        this.elements.update(elements => elements.map(element =>
            element.id === id ? { ...element, ...patch } : element
        ));
    }

    private createElement(type: LabelElementType, suffix: number): LabelElement {
        const id = type + '-' + suffix;
        switch (type) {
            case 'text':
                return { id, type, label: 'Texto libre ' + suffix, enabled: true, text: 'Escribe aquí', fontSize: 14, align: 'center' };
            case 'decoration':
                return { id, type, label: 'Decoración ' + suffix, enabled: true, icon: 'heart' };
            case 'divider':
                return { id, type, label: 'Separador ' + suffix, enabled: true };
            case 'tagline':
                return { id, type, label: 'Frase de marca ' + suffix, enabled: true, text: 'Todo para tu hogar', align: 'center' };
            case 'footerMessage':
                return { id, type, label: 'Mensaje final ' + suffix, enabled: true, text: '¡Llegó tu pedido! ♡', fontSize: 19, align: 'center' };
            case 'footerThanks':
                return { id, type, label: 'Agradecimiento ' + suffix, enabled: true, text: '¡Gracias por tu compra! ♡', fontSize: 12, align: 'center' };
            default: {
                const defaultElement = DEFAULT_ELEMENTS.find(element => element.type === type);
                return { ...(defaultElement ?? DEFAULT_ELEMENTS[0]), id, label: (defaultElement?.label ?? 'Elemento') + ' ' + suffix };
            }
        }
    }

    private isCustomText(element: LabelElement): boolean {
        return element.type === 'text' || (element.type === 'decoration' && element.id !== 'top-decoration' && element.id !== 'footer-decoration');
    }

    private cloneDefaults(): LabelElement[] {
        return DEFAULT_ELEMENTS.map(element => ({ ...element }));
    }

    private elementsFromDesign(designJson: string): LabelElement[] {
        const elements = this.cloneDefaults();
        const design = this.parseDesign(designJson);
        if (!design) return elements;

        const byId = (id: string): BackendLabelElement | undefined =>
            design.elements.find(element => element.id === id);
        const applyVisibility = (id: string, sourceId = id): void => {
            const source = byId(sourceId);
            if (source) {
                const target = elements.find(element => element.id === id);
                if (target) target.enabled = source.visible;
            }
        };
        const applyText = (id: string, sourceId = id): void => {
            const source = byId(sourceId);
            const target = elements.find(element => element.id === id);
            if (!source || !target) return;
            const text = this.propertyString(source, 'text');
            if (text !== null) target.text = text;
            target.enabled = source.visible;
            target.fontSize = this.propertyNumber(source, 'fontSize') ?? target.fontSize;
            target.bold = (this.propertyNumber(source, 'fontWeight') ?? 500) >= 700;
            target.align = this.propertyString(source, 'align') as LabelElement['align'] || target.align;
        };

        applyVisibility('frame');
        applyVisibility('brand', 'brand-name');
        applyText('tagline');
        applyText('deliver-to', 'recipient-kicker');
        applyVisibility('client-name');
        applyVisibility('client-divider');
        applyVisibility('qr', 'package-qr');
        applyVisibility('package-counter', 'package-number');
        applyVisibility('top-divider');
        applyVisibility('bottom-divider');
        applyText('footer-message');
        applyText('footer-thanks');
        applyText('top-decoration');
        applyText('footer-decoration');
        return elements;
    }

    private parseDesign(designJson: string): BackendLabelDesign | null {
        try {
            const parsed = JSON.parse(designJson) as BackendLabelDesign;
            if (!parsed.canvas || !Array.isArray(parsed.elements)) return null;
            return parsed;
        } catch {
            return null;
        }
    }

    private async renderPrintJob(job: LabelPrintJobDto): Promise<string> {
        const design = this.parseDesign(job.templateVersion.designJson);
        if (!design) throw new Error('La plantilla publicada tiene un formato inválido.');

        const assets = new Map(job.assets.map(asset => [asset.id, asset.url]));
        const pages = await Promise.all(job.items.map(item =>
            this.renderBackendPage(design, item.payload, assets)
        ));
        const width = design.canvas.widthMm;
        const height = design.canvas.heightMm;
        return '<!doctype html><html><head><meta charset="utf-8"><style>' +
            this.backendPrintStyles(width, height) +
            '</style></head><body>' + pages.join('') + '</body></html>';
    }

    private async renderBackendPage(
        design: BackendLabelDesign,
        payload: LabelPrintPayloadDto,
        assets: Map<string, string>
    ): Promise<string> {
        const sortedElements = design.elements
            .filter(element => element.visible)
            .sort((left, right) => left.zIndex - right.zIndex);
        const renderedElements = await Promise.all(sortedElements.map(element =>
            this.renderBackendElement(element, payload, assets)
        ));
        return '<section class="label-page">' + renderedElements.join('') + '</section>';
    }

    private async renderBackendElement(
        element: BackendLabelElement,
        payload: LabelPrintPayloadDto,
        assets: Map<string, string>
    ): Promise<string> {
        const props = element.properties;
        const position = 'position:absolute;left:' + element.x + 'mm;top:' + element.y + 'mm;width:' +
            element.width + 'mm;height:' + element.height + 'mm;z-index:' + element.zIndex +
            ';transform:rotate(' + element.rotation + 'deg);overflow:hidden;';

        if (element.type === 'line') {
            const style = this.propertyString(props, 'style') === 'dotted' ? 'dotted' : 'solid';
            return '<div style="' + position + 'border-top:' + (this.propertyNumber(element, 'strokeWidth') ?? 0.6) +
                'mm ' + style + ' ' + this.safeColor(this.propertyString(props, 'color')) + ';"></div>';
        }

        if (element.type === 'shape') {
            const radius = this.propertyNumberFromProperties(props, 'radius') ?? 8;
            return '<div style="' + position + 'box-sizing:border-box;background:' +
                this.safeColor(this.propertyString(props, 'fill'), '#FFFFFF') + ';border:' +
                (this.propertyNumberFromProperties(props, 'strokeWidth') ?? 0.6) + 'mm solid ' +
                this.safeColor(this.propertyString(props, 'stroke'), '#111111') + ';border-radius:' + radius + 'mm;"></div>';
        }

        if (element.type === 'image') {
            const assetId = this.propertyString(props, 'assetId');
            const url = assetId ? assets.get(assetId) : undefined;
            return url ? '<img src="' + this.escapeHtml(url) + '" alt="" style="' + position + 'object-fit:contain;">' : '';
        }

        if (element.type === 'qr') {
            const binding = this.propertyString(props, 'binding') || '';
            const qrValue = this.resolveBinding(binding, payload);
            const qrUrl = await QRCode.toDataURL(qrValue, { errorCorrectionLevel: 'M', width: 700, margin: 1 });
            return '<img src="' + qrUrl + '" alt="Código QR de la bolsa" style="' + position + 'object-fit:contain;">';
        }

        const value = element.type === 'data'
            ? (this.propertyString(props, 'prefix') || '') +
              this.resolveBinding(this.propertyString(props, 'binding') || '', payload) +
              (this.propertyString(props, 'suffix') || '')
            : this.propertyString(props, 'text') || '';
        const fontSize = this.propertyNumberFromProperties(props, 'fontSize') ?? 14;
        const fontWeight = this.propertyNumberFromProperties(props, 'fontWeight') ?? 500;
        const align = this.propertyString(props, 'align') || 'center';
        const textStyle = position + 'font-family:Arial,Helvetica,sans-serif;font-size:' + fontSize +
            'pt;font-weight:' + fontWeight + ';text-align:' + align + ';line-height:1.05;white-space:pre-line;' +
            'display:flex;align-items:center;justify-content:' + (align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center') + ';';
        return '<div style="' + textStyle + '">' + this.escapeHtml(value).replace(/\n/g, '<br>') + '</div>';
    }

    private resolveBinding(binding: string, payload: LabelPrintPayloadDto): string {
        const values: Record<string, string> = {
            'business.name': payload.businessName,
            'order.clientName': payload.order.clientName,
            'order.phone': payload.order.phone || '',
            'order.address': payload.order.address || '',
            'order.itemSummary': payload.order.itemSummary,
            'order.deliveryInstructions': payload.order.deliveryInstructions || '',
            'package.number': String(payload.package.number),
            'package.total': String(payload.package.total),
            'package.qrCodeValue': payload.package.qrCodeValue
        };
        return values[binding] || '';
    }

    private propertyString(element: BackendLabelElement, key: string): string | null;
    private propertyString(properties: Record<string, unknown>, key: string): string | null;
    private propertyString(source: BackendLabelElement | Record<string, unknown>, key: string): string | null {
        const properties: Record<string, unknown> =
            'properties' in source && typeof source.properties === 'object' && source.properties !== null
                ? source.properties as Record<string, unknown>
                : source as Record<string, unknown>;
        const value = properties[key];
        return typeof value === 'string' ? value : null;
    }

    private propertyNumberFromProperties(properties: Record<string, unknown>, key: string): number | null {
        const value = properties[key];
        return typeof value === 'number' && Number.isFinite(value) ? value : null;
    }

    private propertyNumber(element: BackendLabelElement, key: string): number | null {
        return this.propertyNumberFromProperties(element.properties, key);
    }

    private safeColor(value: string | null, fallback = '#111111'): string {
        return value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
    }

    private backendPrintStyles(width: number, height: number): string {
        return '@page{size:' + width + 'mm ' + height + 'mm;margin:0}' +
            '*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff}' +
            '.label-page{position:relative;width:' + width + 'mm;height:' + height + 'mm;overflow:hidden;' +
            'background:#fff;color:#111;page-break-after:always}.label-page:last-child{page-break-after:auto}';
    }

    private async createPrintDocument(packages: OrderPackageDto[]): Promise<string> {
        const pages = await Promise.all(packages.map(async pkg => {
            const qrUrl = await QRCode.toDataURL(pkg.qrCodeValue, {
                errorCorrectionLevel: 'M',
                width: 600,
                margin: 1
            });
            return this.renderPrintPage(pkg, qrUrl, packages.length);
        }));

        return '<!doctype html><html><head><meta charset=\"utf-8\"><style>' + this.printStyles() + '</style></head><body>' + pages.join('') + '</body></html>';
    }

    private renderPrintPage(pkg: OrderPackageDto, qrUrl: string, totalPackages: number): string {
        const enabled = (type: LabelElementType, id?: string) => this.elements().some(element =>
            element.enabled && element.type === type && (!id || element.id === id)
        );
        const firstOf = (type: LabelElementType, id?: string) => this.elements().find(element =>
            element.enabled && element.type === type && (!id || element.id === id)
        );
        const customTexts = this.elements().filter(element => element.enabled && element.type === 'text');
        const extraDecorations = this.elements().filter(element => element.enabled && element.type === 'decoration' && element.id !== 'top-decoration' && element.id !== 'footer-decoration');
        const brand = firstOf('brand');
        const tagline = firstOf('tagline');
        const footerMessage = firstOf('footerMessage');
        const footerThanks = firstOf('footerThanks');
        const clientName = firstOf('clientName');
        const logo = this.logoUrl() ? '<img class=\"brand-logo\" src=\"' + this.escapeHtml(this.logoUrl()!) + '\" alt=\"Logo de ' + this.escapeHtml(this.businessName()) + '\">' : '';
        const deliverTitle = firstOf('text', 'deliver-to');
        const customTextHtml = customTexts
            .filter(element => element.id !== 'deliver-to')
            .map(element => '<div class=\"custom-text\" style=\"' + this.textStyle(element) + '\">' + this.escapeHtml(element.text || '').replace(/\n/g, '<br>') + '</div>')
            .join('');

        return '<section class=\"label-page' + (enabled('frame') ? ' has-frame' : '') + '\">' +
            (enabled('decoration', 'top-decoration') ? '<div class=\"top-decoration\">' + this.iconSvg('sparkles') + '<span>' + this.iconSvg('home') + '</span>' + this.iconSvg('sparkles') + '</div>' : '') +
            (brand ? '<div class=\"brand-block\">' + logo + '<div class=\"brand-name\">' + this.escapeHtml(this.businessName()) + '</div></div>' : '') +
            (tagline ? '<div class=\"tagline\">' + this.escapeHtml(tagline.text || '') + '</div>' : '') +
            (enabled('divider', 'top-divider') ? '<div class=\"dotted-divider\"></div>' : '') +
            customTextHtml +
            (clientName ? '<div class=\"deliver-title\">' + this.escapeHtml(deliverTitle?.text || 'PEDIDO PARA:') + '</div><div class=\"client-name\" style=\"' + this.textStyle(clientName) + '\">' + this.escapeHtml(this.order().clientName) + '</div>' : '') +
            (enabled('divider', 'client-divider') ? '<div class=\"solid-divider\"></div>' : '') +
            (enabled('qr') ? '<div class=\"qr-package\"><div class=\"qr-frame\"><img class=\"qr\" src=\"' + qrUrl + '\" alt=\"Código QR de la bolsa\"></div>' +
                (enabled('packageCounter') ? '<div class=\"package-block\"><div class=\"package-ribbon\">BOLSA</div><strong>' + pkg.packageNumber + '</strong><span>DE</span><strong>' + totalPackages + '</strong>' + this.iconSvg('bag') + '</div>' : '') +
                '</div>' : '') +
            (!enabled('qr') && enabled('packageCounter') ? '<div class=\"package-block package-only\"><div class=\"package-ribbon\">BOLSA</div><strong>' + pkg.packageNumber + '</strong><span>DE</span><strong>' + totalPackages + '</strong>' + this.iconSvg('bag') + '</div>' : '') +
            extraDecorations.map(element => '<div class=\"extra-decoration\">' + this.iconSvg(element.icon || 'heart') + '</div>').join('') +
            (enabled('divider', 'bottom-divider') ? '<div class=\"solid-divider\"></div>' : '') +
            (footerMessage ? '<div class=\"footer-message\" style=\"' + this.textStyle(footerMessage) + '\">' + this.escapeHtml(footerMessage.text || '').replace(/\n/g, '<br>') + '</div>' : '') +
            (footerThanks ? '<div class=\"footer-thanks\" style=\"' + this.textStyle(footerThanks) + '\">' + this.escapeHtml(footerThanks.text || '').replace(/\n/g, '<br>') + '</div>' : '') +
            (enabled('decoration', 'footer-decoration') ? '<div class=\"footer-decoration\">' + this.iconSvg('leaves') + '</div>' : '') +
            '</section>';
    }

    private textStyle(element: LabelElement): string {
        return 'font-size:' + (element.fontSize || 14) + 'px;font-weight:' + (element.bold ? 800 : 500) + ';text-align:' + (element.align || 'center') + ';';
    }

    private escapeHtml(value: string): string {
        const replacements: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return value.replace(/[&<>"']/g, character => replacements[character] || character);
    }

    private printStyles(): string {
        return '@page{size:100mm 150mm;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#090909;font-family:Arial,Helvetica,sans-serif}.label-page{width:100mm;height:150mm;position:relative;overflow:hidden;padding:5mm 6mm 4mm;display:flex;flex-direction:column;align-items:center;text-align:center;page-break-after:always}.label-page:last-child{page-break-after:auto}.label-page.has-frame:before{content:\"\";position:absolute;inset:2.5mm;border:1.5px solid #111;border-radius:9mm;pointer-events:none}.brand-block{width:100%;display:flex;flex-direction:column;align-items:center;gap:1mm;z-index:1}.brand-logo{width:30mm;height:18mm;object-fit:contain}.brand-name{font-size:16mm;line-height:.8;font-weight:900;letter-spacing:-1.5mm;font-style:italic}.top-decoration{height:13mm;display:flex;align-items:center;justify-content:center;gap:9mm;margin-top:1mm}.top-decoration svg{width:5mm;height:5mm}.top-decoration span svg{width:19mm;height:15mm}.tagline{font-size:3.7mm;font-weight:700;border:1px solid #111;border-radius:50%;padding:1.5mm 6mm;margin-top:1mm;transform:rotate(-4deg)}.dotted-divider{width:82%;border-top:1px dotted #111;margin:3mm 0}.solid-divider{width:86%;border-top:1.5px solid #111;margin:2.5mm 0}.deliver-title{font-size:4.6mm;letter-spacing:1mm;font-weight:600;margin-top:1mm}.client-name{font-size:8mm;line-height:.95;font-weight:900;letter-spacing:.3mm;text-transform:uppercase;max-width:88%;margin:2mm 0}.custom-text{width:88%;line-height:1.1;margin:1mm 0}.qr-package{display:grid;grid-template-columns:1fr 34mm;gap:3mm;align-items:stretch;width:88%;flex:1;min-height:51mm}.qr-frame{border:1px solid #111;border-radius:4mm;padding:3mm;display:flex;align-items:center;justify-content:center;min-width:0}.qr{width:100%;height:auto;aspect-ratio:1;object-fit:contain}.package-block{border-left:1px dotted #111;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1mm;padding-left:3mm}.package-ribbon{background:#111;color:#fff;font-size:4mm;font-weight:900;letter-spacing:.7mm;padding:2mm 3mm;clip-path:polygon(0 0,100% 0,90% 50%,100% 100%,0 100%,10% 50%)}.package-block strong{font-size:14mm;line-height:.9}.package-block span{font-size:4mm;font-weight:700;letter-spacing:1mm}.package-block svg{width:16mm;height:16mm;margin-top:2mm}.package-only{border:0;width:100%;min-height:55mm}.extra-decoration{height:8mm}.extra-decoration svg{width:12mm;height:8mm}.footer-message{font-style:italic;font-weight:700;line-height:1;margin-top:1mm}.footer-thanks{line-height:1.25;white-space:normal}.footer-decoration{height:9mm;margin-top:1mm}.footer-decoration svg{width:28mm;height:10mm}';
    }
}
