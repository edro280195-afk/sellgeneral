import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AvailableLabelPackageDto } from '../../../core/models';

@Component({
    selector: 'app-labels',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
        <div class="labels-page">
            <header class="page-header"><div><span class="eyebrow">Operación · Presentación</span><h1>Etiquetas bonitas, pedidos claros <span>✦</span></h1><p>Prepara las bolsas listas para entregar y conserva la identidad de Neni's App en cada paquete.</p></div></header>
            <section class="labels-layout">
                <div class="packages-card card">
                    <div class="panel-heading"><div><span class="section-kicker">Bolsas disponibles</span><h2>Selecciona qué quieres imprimir</h2></div><button class="text-button" type="button" (click)="toggleAll()">{{ allSelected() ? 'Quitar selección' : 'Seleccionar todo' }}</button></div>
                    @if (loading()) { <div class="loading">Cargando bolsas…</div> } @else if (packages().length) {
                        <div class="package-list">@for (item of packages(); track item.id) {<label class="package-row" [class.selected]="selected().has(item.id)"><input type="checkbox" [checked]="selected().has(item.id)" (change)="toggle(item.id)"><span class="package-check">✓</span><span class="package-main"><strong>{{ item.clientName }}</strong><small>Pedido #{{ item.orderId }} · Bolsa {{ item.packageNumber }} de {{ item.totalPackages }}</small></span><span class="package-status">{{ item.status === 'Packed' ? 'Empacada' : 'Cargada' }}</span></label>}</div>
                    } @else { <div class="empty-state"><div>♡</div><h2>No hay bolsas pendientes</h2><p>Cuando prepares pedidos aparecerán aquí.</p></div> }
                </div>
                <aside class="print-panel card"><span class="section-kicker">Listo para salir</span><h2>Configura tu impresión</h2><div class="selected-count"><strong>{{ selected().size }}</strong><span>{{ selected().size === 1 ? 'bolsa seleccionada' : 'bolsas seleccionadas' }}</span></div><label>Formato<select [(ngModel)]="mediaSize"><option value="Shipping4x6">Envío · 10 × 15 cm</option><option value="Square50x50">Cuadrada · 5 × 5 cm</option></select></label><label>Copias<input type="number" min="1" max="100" [(ngModel)]="copies"></label><button class="primary-button full" type="button" [disabled]="!selected().size || printing()" (click)="print()">{{ printing() ? 'Preparando…' : 'Preparar impresión' }} <span>→</span></button><p class="print-note">El diseño publicado se congela en cada trabajo para que una reimpresión conserve la misma información.</p></aside>
            </section>
        </div>
    `,
    styles: [`
        :host { display:block; }.labels-page { width:100%; max-width:1420px; min-width:0; padding-bottom:3rem; }.page-header { display:flex; align-items:end; justify-content:space-between; gap:1rem; margin:.75rem 0 1.7rem; }.eyebrow,.section-kicker { display:block; color:#c00058; font-size:.68rem; font-weight:800; letter-spacing:.16em; text-transform:uppercase; } h1,h2,p { margin:0; } h1 { margin-top:.35rem; color:#421536; font-size:clamp(1.8rem,3vw,2.55rem); font-weight:800; letter-spacing:-.05em; } h1 span { color:#ff0072; } .page-header p { margin-top:.45rem; max-width:680px; color:#8d7185; font-size:.9rem; }.card { border:1px solid rgba(255,0,114,.1); border-radius:1.45rem; background:rgba(255,255,255,.79); box-shadow:0 18px 50px -28px rgba(77,16,59,.3); backdrop-filter:blur(18px); }.labels-layout { display:grid; grid-template-columns:minmax(0,1.55fr) minmax(280px,.65fr); gap:1rem; }.packages-card,.print-panel { min-width:0; padding:1.25rem; }.panel-heading { display:flex; align-items:center; justify-content:space-between; gap:1rem; }.panel-heading h2,.print-panel h2 { margin-top:.22rem; color:#512042; font-size:1.05rem; font-weight:800; }.text-button { color:#c00058; border:0; background:none; font:700 .72rem Poppins; cursor:pointer; }.package-list { margin-top:1.1rem; }.package-row { display:flex; min-width:0; align-items:center; gap:.75rem; padding:.85rem .5rem; border-top:1px solid #f6e8ef; cursor:pointer; }.package-row.selected { border-radius:.85rem; background:#fff1f7; }.package-row input { position:absolute; opacity:0; pointer-events:none; }.package-check { display:grid; place-items:center; width:1.4rem; height:1.4rem; color:transparent; border:1px solid #e7c9d9; border-radius:.45rem; background:#fff; font-size:.8rem; }.package-row.selected .package-check { color:#fff; border-color:#ff0072; background:#ff0072; }.package-main { flex:1; min-width:0; }.package-main strong,.package-main small { display:block; }.package-main strong { color:#54223f; font-size:.8rem; }.package-main small { margin-top:.2rem; color:#a17f95; font-size:.67rem; }.package-status { padding:.25rem .5rem; color:#b00050; border-radius:999px; background:#fff0f6; font-size:.62rem; font-weight:700; }.selected-count { display:flex; align-items:baseline; gap:.55rem; padding:1.2rem 0; margin:1rem 0; border-top:1px solid #f5e6ee; border-bottom:1px solid #f5e6ee; }.selected-count strong { color:#ff0072; font-size:2.2rem; line-height:1; }.selected-count span { color:#9b7890; font-size:.75rem; }.print-panel label { display:block; margin-top:1rem; color:#79566e; font-size:.72rem; font-weight:700; }.print-panel input,.print-panel select { display:block; width:100%; margin-top:.35rem; padding:.75rem .85rem; color:#4c2440; border:1px solid #f2dce8; border-radius:.75rem; outline:0; background:#fffafd; font:500 .82rem Poppins; }.primary-button,.secondary-button { display:inline-flex; align-items:center; justify-content:center; gap:.45rem; padding:.78rem 1.1rem; border-radius:.85rem; font:700 .78rem Poppins; text-decoration:none; cursor:pointer; }.primary-button { color:#fff; border:0; background:linear-gradient(135deg,#ff0072,#d50065); box-shadow:0 12px 24px -12px rgba(255,0,114,.65); }.primary-button:disabled { opacity:.55; cursor:wait; }.secondary-button { color:#b00050; border:1px solid rgba(255,0,114,.18); background:#fff; }.full { width:100%; margin-top:1.25rem; }.print-note { margin-top:1rem; color:#a07d93; font-size:.68rem; line-height:1.6; }.loading,.empty-state { padding:3rem 1rem; color:#a38295; text-align:center; font-size:.8rem; }.empty-state div { margin-bottom:.5rem; color:#ff0072; font-size:2rem; }.empty-state h2 { color:#52203f; font-size:1rem; font-weight:800; }.empty-state p { margin-top:.3rem; font-size:.75rem; } @media(max-width:800px){.page-header{align-items:stretch;flex-direction:column}.labels-layout{grid-template-columns:minmax(0,1fr)}} @media(max-width:640px){.packages-card,.print-panel{padding:1rem}.panel-heading{align-items:flex-start;flex-wrap:wrap}.panel-heading h2{font-size:.95rem}.package-row{align-items:flex-start;gap:.55rem;padding:.8rem .35rem}.package-status{max-width:86px;flex:0 0 auto;white-space:normal;text-align:center}.package-main strong,.package-main small{overflow-wrap:anywhere}.text-button{min-height:44px;padding-inline:.5rem}.selected-count{padding:1rem 0}}
        .package-row input:focus-visible + .package-check { outline: 3px solid rgba(198,46,112,.3); outline-offset: 2px; }
    `]
})
export class LabelsComponent implements OnInit {
    private readonly api = inject(ApiService);
    private readonly toast = inject(ToastService);
    readonly packages = signal<AvailableLabelPackageDto[]>([]);
    readonly selected = signal<Set<string>>(new Set());
    readonly loading = signal(true);
    readonly printing = signal(false);
    readonly allSelected = () => this.packages().length > 0 && this.selected().size === this.packages().length;
    mediaSize = 'Shipping4x6';
    copies = 1;

    ngOnInit(): void {
        this.api.getAvailableLabelPackages().subscribe({
            next: packages => { this.packages.set(packages); this.loading.set(false); },
            error: () => { this.loading.set(false); this.toast.error('No pudimos cargar las bolsas pendientes.'); }
        });
    }

    toggle(id: string): void {
        this.selected.update(current => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next; });
    }

    toggleAll(): void {
        this.selected.set(this.allSelected() ? new Set() : new Set(this.packages().map(item => item.id)));
    }

    print(): void {
        const packageIds = [...this.selected()];
        if (!packageIds.length) return;
        this.printing.set(true);
        this.api.createLabelPrintJob({ packageIds, mediaSize: this.mediaSize, copies: Math.max(1, Math.min(100, Number(this.copies) || 1)), output: 'SystemPrint' }).subscribe({
            next: job => {
                this.api.updateLabelPrintJobStatus(job.id, { status: 'SentToSystem', output: 'SystemPrint' }).subscribe({
                    next: () => { this.toast.success('Trabajo enviado al sistema de impresión.'); this.printing.set(false); this.selected.set(new Set()); },
                    error: () => { this.printing.set(false); this.toast.info('Trabajo preparado. Confirma la impresión desde tu dispositivo.'); }
                });
            },
            error: error => { this.printing.set(false); this.toast.error(error?.error?.message || 'No pudimos preparar la impresión.'); }
        });
    }
}
