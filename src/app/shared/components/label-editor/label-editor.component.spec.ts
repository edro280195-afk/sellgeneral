import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LabelEditorComponent } from './label-editor.component';
import { of } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { LabelPrintJobDto, LabelTemplateEditorDto, OrderPackageDto, OrderSummaryDto } from '../../../core/models';

describe('LabelEditorComponent', () => {
    let fixture: ComponentFixture<LabelEditorComponent>;
    let component: LabelEditorComponent;

    const packageData: OrderPackageDto = {
        id: 'package-1', packageNumber: 1, qrCodeValue: 'regibazar-package-1', status: 'Generated', createdAt: '2026-08-26T12:00:00Z'
    };
    const order = { id: 42, clientName: 'María Fernanda López' } as OrderSummaryDto;
    const designJson = JSON.stringify({
        schemaVersion: 1,
        canvas: { widthMm: 101.6, heightMm: 152.4, background: '#FFFFFF' },
        elements: [
            { id: 'client-name', type: 'data', x: 5, y: 5, width: 90, height: 10, rotation: 0, visible: true, zIndex: 1, properties: { binding: 'order.clientName', fontSize: 18, fontWeight: 800, align: 'center' } },
            { id: 'package-number', type: 'data', x: 5, y: 20, width: 20, height: 10, rotation: 0, visible: true, zIndex: 1, properties: { binding: 'package.number', fontSize: 18, fontWeight: 800, align: 'center' } },
            { id: 'package-label', type: 'text', x: 30, y: 20, width: 20, height: 10, rotation: 0, visible: true, zIndex: 1, properties: { text: 'BOLSA', fontSize: 12, fontWeight: 800, align: 'center' } },
            { id: 'package-qr', type: 'qr', x: 5, y: 35, width: 30, height: 30, rotation: 0, visible: true, zIndex: 1, properties: { binding: 'package.qrCodeValue' } }
        ]
    });
    const template: LabelTemplateEditorDto = {
        id: 'template-1',
        name: 'Etiqueta de pedidos',
        description: null,
        kind: 'OrderPackage',
        mediaSize: 'Shipping4x6',
        isDefault: true,
        publishedVersion: null,
        draftVersion: {
            id: 'draft-1',
            versionNumber: 1,
            status: 'Draft',
            revision: 1,
            designJson,
            createdAt: '2026-08-26T12:00:00Z',
            publishedAt: null
        },
        history: []
    };
    const printJob: LabelPrintJobDto = {
        id: 'job-1',
        status: 'Prepared',
        mediaSize: 'Shipping4x6',
        output: 'SystemPrint',
        copies: 1,
        requestedAt: '2026-08-26T12:00:00Z',
        handedOffAt: null,
        failureReason: null,
        templateVersion: {
            id: 'published-1',
            versionNumber: 1,
            designJson,
            publishedAt: '2026-08-26T12:00:00Z'
        },
        assets: [],
        items: [{
            id: 'job-item-1',
            orderPackageId: packageData.id,
            sequence: 1,
            packageQrCodeValue: packageData.qrCodeValue,
            payload: {
                businessName: 'Regi Bazar',
                order: { id: order.id, clientName: order.clientName, phone: null, address: null, itemSummary: '', deliveryInstructions: null },
                package: { id: packageData.id, number: 1, total: 1, qrCodeValue: packageData.qrCodeValue }
            }
        }]
    };
    const apiMock = {
        getOrderLabelTemplate: vi.fn(() => of(template)),
        getLabelAssets: vi.fn(() => of([])),
        saveLabelTemplateDraft: vi.fn(() => of(template)),
        publishLabelTemplate: vi.fn(() => of(template)),
        resetLabelTemplateDraft: vi.fn(() => of(template)),
        createLabelPrintJob: vi.fn(() => of(printJob)),
        updateLabelPrintJobStatus: vi.fn(() => of(printJob))
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LabelEditorComponent],
            providers: [{ provide: ApiService, useValue: apiMock }]
        }).compileComponents();
        fixture = TestBed.createComponent(LabelEditorComponent);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('order', order);
        fixture.componentRef.setInput('packageData', packageData);
        fixture.componentRef.setInput('packages', [packageData]);
        fixture.componentRef.setInput('businessName', 'Regi Bazar');
        fixture.detectChanges();
    });

    it('crea el editor con los elementos de la etiqueta de referencia', () => {
        expect(component).toBeTruthy();
        expect(component.elements().map(element => element.type)).toEqual([
            'frame', 'brand', 'tagline', 'divider', 'text', 'clientName', 'divider', 'qr', 'packageCounter', 'divider', 'footerMessage', 'footerThanks', 'decoration', 'decoration'
        ]);
    });

    it('agrega y quita un texto libre', () => {
        component.addElement('text');
        const added = component.elements().find(element => element.id === 'text-2');
        expect(added?.enabled).toBeTruthy();
        component.selectElement('text-2');
        component.removeSelected();
        expect(component.elements().some(element => element.id === 'text-2')).toBeFalsy();
    });

    it('oculta y muestra elementos desde las capas', () => {
        component.toggleElement('tagline');
        expect(component.isEnabled('tagline')).toBeFalsy();
        component.toggleElement('tagline');
        expect(component.isEnabled('tagline')).toBeTruthy();
        component.toggleElement('qr');
        expect(component.isEnabled('qr')).toBeTruthy();
    });

    it('emite un documento de impresión con el QR y el contador de bolsa', async () => {
        const emitSpy = vi.spyOn(component.printRequested, 'emit');
        await component.printCurrent();
        expect(emitSpy).toHaveBeenCalled();
        const request = emitSpy.mock.calls[emitSpy.mock.calls.length - 1][0];
        expect(request.title).toContain('Bolsa 1');
        expect(request.html).toContain('Código QR de la bolsa');
        expect(request.html).toContain('BOLSA');
        expect(request.html).toContain('María Fernanda López');
    });
});
