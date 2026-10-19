import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { InventoryBoxDto, InventoryBoxSummaryDto, InventoryItemDto } from '../../../core/models';

@Component({
    selector: 'app-inventory',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    template: `
        <div class="inventory-page">
            @if (!boxId()) {
                <header class="page-header">
                    <div>
                    <span class="eyebrow">Operación · Neni's App</span>
                        <h1>Bodega inteligente <span>♡</span></h1>
                        <p>Controla existencias, ubicaciones y etiquetas desde cualquier dispositivo.</p>
                    </div>
                    <button class="primary-button" type="button" (click)="showCreate.set(!showCreate())">
                        <span>＋</span> Nueva caja
                    </button>
                </header>

                @if (showCreate()) {
                    <section class="create-panel card">
                        <div class="panel-heading">
                            <div>
                                <span class="section-kicker">Nueva ubicación</span>
                                <h2>Organiza una caja</h2>
                            </div>
                            <button class="icon-button" type="button" (click)="showCreate.set(false)" aria-label="Cerrar">×</button>
                        </div>
                        <div class="form-grid">
                            <label>Código<input [(ngModel)]="newBox.code" placeholder="B-01" maxlength="30"></label>
                            <label>Nombre<input [(ngModel)]="newBox.name" placeholder="Blusas y tops" maxlength="120"></label>
                            <label>Ubicación<input [(ngModel)]="newBox.location" placeholder="Estante A · Nivel 2" maxlength="200"></label>
                        </div>
                        <div class="panel-actions">
                            <button class="ghost-button" type="button" (click)="showCreate.set(false)">Cancelar</button>
                            <button class="primary-button" type="button" [disabled]="saving()" (click)="createBox()">
                                {{ saving() ? 'Guardando…' : 'Guardar caja' }}
                            </button>
                        </div>
                    </section>
                }

                <section class="stat-grid">
                    <article class="stat-card stat-card--pink"><span class="stat-icon">▦</span><div><strong>{{ boxes().length }}</strong><small>Cajas activas</small></div></article>
                    <article class="stat-card stat-card--lavender"><span class="stat-icon">✦</span><div><strong>{{ totalUnits() }}</strong><small>Unidades registradas</small></div></article>
                    <article class="stat-card stat-card--peach"><span class="stat-icon">⌁</span><div><strong>{{ totalArticleTypes() }}</strong><small>Artículos distintos</small></div></article>
                </section>

                <section class="toolbar card">
                    <div class="search-field"><span>⌕</span><input [(ngModel)]="search" (keyup.enter)="loadBoxes()" placeholder="Busca por caja, artículo o código…"><button type="button" (click)="loadBoxes()">Buscar</button></div>
                    <span class="toolbar-note">{{ boxes().length }} ubicaciones visibles</span>
                </section>

                @if (loading()) {
                    <div class="box-grid"><div class="skeleton card" *ngFor="let item of [1,2,3]"></div></div>
                } @else if (boxes().length) {
                    <section class="box-grid">
                        @for (box of boxes(); track box.id) {
                            <a class="box-card card" [routerLink]="['/admin/inventory', box.id]">
                                <div class="box-card-top"><span class="box-code">{{ box.code }}</span><span class="nfc-badge" [class.bound]="box.isNfcBound">{{ box.isNfcBound ? 'NFC listo' : 'Sin NFC' }}</span></div>
                                <h2>{{ box.name }}</h2>
                                <p class="box-location">⌖ {{ box.location || 'Ubicación por definir' }}</p>
                                <div class="box-card-footer"><span><strong>{{ box.totalUnits }}</strong> unidades</span><span><strong>{{ box.articleTypesCount }}</strong> artículos</span><span class="arrow">↗</span></div>
                            </a>
                        }
                    </section>
                } @else {
                    <section class="empty-state card"><div class="empty-mark">♡</div><h2>Aún no hay cajas registradas</h2><p>Crea tu primera ubicación para empezar a organizar tu inventario.</p><button class="primary-button" type="button" (click)="showCreate.set(true)">Crear primera caja</button></section>
                }
            } @else {
                <header class="page-header detail-header">
                    <div><a class="back-link" routerLink="/admin/inventory">← Volver a inventario</a><span class="eyebrow">Caja · {{ selectedBox()?.code }}</span><h1>{{ selectedBox()?.name || 'Detalle de caja' }}</h1><p>{{ selectedBox()?.location || 'Ubicación no definida' }}</p></div>
                    <div class="header-actions"><button class="secondary-button" type="button" (click)="copyNfcLink()">Copiar enlace NFC</button><button class="primary-button" type="button" (click)="requestBoxLabel()">Imprimir etiqueta</button></div>
                </header>

                @if (loading()) { <div class="detail-loading card">Cargando caja…</div> }
                @if (selectedBox(); as box) {
                    <section class="detail-grid">
                        <div class="detail-main">
                            <article class="card items-card">
                                <div class="panel-heading"><div><span class="section-kicker">Existencias</span><h2>Artículos en esta caja</h2></div><span class="total-pill">{{ box.totalUnits }} unidades</span></div>
                                <div class="add-item-row"><input [(ngModel)]="newItem.name" placeholder="Nombre del artículo"><input [(ngModel)]="newItem.variant" placeholder="Variante · talla · color"><input class="quantity-input" type="number" min="1" [(ngModel)]="newItem.quantity"><button class="primary-button" type="button" [disabled]="saving()" (click)="addItem()">＋ Agregar</button></div>
                                @if (box.items.length) {
                                    <div class="items-list">
                                        @for (item of box.items; track item.id) {
                                            <div class="item-row"><div class="item-mark">✦</div><div class="item-info"><strong>{{ item.name }}</strong><span>{{ item.variant || 'Sin variante' }} · Código {{ item.labelCode }}</span></div><div class="quantity-control"><button type="button" (click)="adjustItem(item, -1)" [disabled]="item.quantity < 1">−</button><strong>{{ item.quantity }}</strong><button type="button" (click)="adjustItem(item, 1)">＋</button></div></div>
                                        }
                                    </div>
                                } @else { <div class="inline-empty">Agrega el primer artículo de esta caja.</div> }
                            </article>
                        </div>
                        <aside class="detail-aside">
                            <article class="card nfc-card"><div class="nfc-symbol">⌁</div><span class="section-kicker">Identidad digital</span><h2>{{ box.isNfcBound ? 'Etiqueta NFC vinculada' : 'Vincula una etiqueta NFC' }}</h2><p>Abre esta caja desde el móvil al escanear su etiqueta.</p><code>{{ box.nfcUrl }}</code><button class="secondary-button full" type="button" (click)="copyNfcLink()">Copiar enlace</button></article>
                            <article class="card activity-card"><div class="panel-heading"><div><span class="section-kicker">Trazabilidad</span><h2>Actividad reciente</h2></div></div>@for (movement of box.movements.slice(0, 5); track movement.id) {<div class="movement"><span [class.negative]="movement.quantityDelta < 0">{{ movement.quantityDelta > 0 ? '+' : '' }}{{ movement.quantityDelta }}</span><div><strong>{{ movement.itemName || 'Movimiento' }}</strong><small>{{ movement.note || movement.type }} · {{ movement.occurredAt | date:'d MMM, h:mm a' }}</small></div></div>} @empty {<div class="inline-empty">Todavía no hay movimientos.</div>}</article>
                        </aside>
                    </section>
                }
            }
        </div>
    `,
    styles: [`
        :host { display: block; }
        .inventory-page { width: 100%; max-width: 1420px; min-width: 0; margin: 0 auto; padding-bottom: 3rem; }
        .page-header { display: flex; justify-content: space-between; align-items: end; gap: 1.5rem; margin: .75rem 0 1.7rem; }
        .eyebrow, .section-kicker { display: block; color: #c20057; font-size: .68rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        h1, h2, p { margin: 0; }
        h1 { margin-top: .35rem; color: #421536; font-size: clamp(1.8rem, 3vw, 2.55rem); font-weight: 800; letter-spacing: -.05em; }
        h1 span { color: #ff0072; }
        .page-header p { margin-top: .45rem; color: #8d7185; font-size: .9rem; }
        .card { border: 1px solid rgba(255, 0, 114, .1); border-radius: 1.45rem; background: rgba(255,255,255,.79); box-shadow: 0 18px 50px -28px rgba(77, 16, 59, .3); backdrop-filter: blur(18px); }
        .primary-button, .secondary-button, .ghost-button { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; border-radius: .85rem; padding: .78rem 1.1rem; border: 1px solid transparent; font: 700 .78rem Poppins, sans-serif; cursor: pointer; transition: transform .2s ease, box-shadow .2s ease, background .2s ease; }
        .primary-button { color: #fff; background: linear-gradient(135deg, #ff0072, #d50065); box-shadow: 0 12px 24px -12px rgba(255,0,114,.65); }
        .primary-button:hover { transform: translateY(-1px); box-shadow: 0 16px 30px -12px rgba(255,0,114,.7); }
        .primary-button:disabled { cursor: wait; opacity: .65; }
        .secondary-button { color: #b00050; background: #fff; border-color: rgba(255,0,114,.18); }
        .secondary-button:hover { background: #fff3f8; }
        .ghost-button, .icon-button { color: #9e6b8b; background: transparent; }
        .icon-button { border: 0; font-size: 1.5rem; cursor: pointer; }
        .create-panel, .toolbar { padding: 1.25rem; margin-bottom: 1.2rem; }
        .panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
        .panel-heading h2, .nfc-card h2 { color: #512042; margin-top: .22rem; font-size: 1.05rem; font-weight: 800; letter-spacing: -.02em; }
        .form-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: .8rem; margin-top: 1.15rem; }
        label { color: #79566e; font-size: .72rem; font-weight: 700; }
        input { display: block; width: 100%; margin-top: .35rem; padding: .75rem .85rem; color: #4c2440; border: 1px solid #f2dce8; border-radius: .75rem; outline: none; background: #fffafd; font: 500 .82rem Poppins, sans-serif; }
        input:focus { border-color: #ff8abb; box-shadow: 0 0 0 4px rgba(255,0,114,.08); }
        .panel-actions { display: flex; justify-content: flex-end; gap: .65rem; margin-top: 1rem; }
        .stat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem; }
        .stat-card { display: flex; align-items: center; gap: .85rem; padding: 1rem 1.1rem; border-radius: 1.2rem; border: 1px solid rgba(255,0,114,.08); }
        .stat-card--pink { background: linear-gradient(135deg, #fff0f6, #fffafd); }.stat-card--lavender { background: linear-gradient(135deg, #f4f0ff, #fffafd); }.stat-card--peach { background: linear-gradient(135deg, #fff3ee, #fffafd); }
        .stat-icon { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border-radius: .8rem; color: #ff0072; background: #fff; font-size: 1.2rem; box-shadow: 0 7px 18px rgba(120,35,83,.08); }
        .stat-card strong { display: block; color: #4d193c; font-size: 1.35rem; line-height: 1.1; }.stat-card small { color: #9b7890; font-size: .7rem; }
        .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }.search-field { display: flex; align-items: center; flex: 1; max-width: 650px; border: 1px solid #f0dce8; border-radius: .9rem; padding-left: .8rem; background: #fffafd; }.search-field span { color: #ff0072; font-size: 1.3rem; }.search-field input { margin: 0; border: 0; box-shadow: none; background: transparent; }.search-field button { padding: .6rem .9rem; margin-right: .25rem; color: #ba0a57; border: 0; border-radius: .6rem; background: #fff0f6; font: 700 .72rem Poppins; cursor: pointer; }.toolbar-note { color: #a07d93; font-size: .72rem; }
        .box-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }.box-card { display: block; padding: 1.2rem; color: inherit; text-decoration: none; transition: transform .22s ease, border-color .22s ease, box-shadow .22s ease; }.box-card:hover { transform: translateY(-4px); border-color: rgba(255,0,114,.28); box-shadow: 0 24px 50px -26px rgba(100,20,70,.35); }.box-card-top, .box-card-footer { display: flex; align-items: center; justify-content: space-between; gap: .6rem; }.box-code { color: #ff0072; font-size: .7rem; font-weight: 800; letter-spacing: .12em; }.nfc-badge { padding: .25rem .5rem; border-radius: 999px; color: #9a718b; background: #f8f1f6; font-size: .62rem; font-weight: 700; }.nfc-badge.bound { color: #ad0c55; background: #ffe8f2; }.box-card h2 { margin-top: 1.1rem; color: #4c1c3c; font-size: 1.1rem; font-weight: 800; }.box-location { margin-top: .25rem; color: #a17f95; font-size: .76rem; }.box-card-footer { margin-top: 1.5rem; padding-top: .8rem; border-top: 1px solid #f6e8ef; color: #a17c93; font-size: .7rem; }.box-card-footer strong { color: #5b2445; font-size: .95rem; }.arrow { color: #ff0072; font-size: 1.1rem; }.empty-state { padding: 4rem 1.5rem; text-align: center; }.empty-mark { display: grid; place-items: center; width: 4rem; height: 4rem; margin: 0 auto 1rem; color: #ff0072; border-radius: 1.3rem; background: #fff0f6; font-size: 2rem; }.empty-state h2 { color: #52203f; font-size: 1.2rem; font-weight: 800; }.empty-state p { margin: .4rem 0 1.2rem; color: #99768d; font-size: .82rem; }.skeleton { height: 185px; background: linear-gradient(110deg,#fff8fb 30%,#ffeef6 50%,#fff8fb 70%); background-size: 200% 100%; animation: inventory-shimmer 1.4s infinite; }
        .back-link { display: inline-block; margin-bottom: .8rem; color: #c00058; font-size: .74rem; font-weight: 700; text-decoration: none; }.detail-header { align-items: center; }.header-actions { display: flex; gap: .6rem; }.detail-grid { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(280px, .7fr); gap: 1rem; }.items-card, .nfc-card, .activity-card { padding: 1.2rem; }.total-pill { padding: .35rem .65rem; color: #b30051; border-radius: 999px; background: #fff0f6; font-size: .7rem; font-weight: 800; }.add-item-row { display: grid; grid-template-columns: 1.2fr 1fr 75px auto; gap: .5rem; margin: 1.1rem 0; }.add-item-row input { margin: 0; }.add-item-row .primary-button { padding-inline: .8rem; }.items-list { border-top: 1px solid #f5e6ee; }.item-row { display: flex; align-items: center; gap: .75rem; padding: .75rem 0; border-bottom: 1px solid #f7eaf0; }.item-mark { display: grid; place-items: center; width: 2rem; height: 2rem; color: #ff0072; border-radius: .7rem; background: #fff0f6; }.item-info { flex: 1; min-width: 0; }.item-info strong, .item-info span { display: block; }.item-info strong { color: #54223f; font-size: .8rem; }.item-info span { overflow: hidden; color: #a27f93; font-size: .68rem; text-overflow: ellipsis; white-space: nowrap; }.quantity-control { display: flex; align-items: center; gap: .65rem; }.quantity-control button { width: 1.8rem; height: 1.8rem; color: #bd0b57; border: 1px solid #f4dce8; border-radius: .55rem; background: #fff7fb; cursor: pointer; }.quantity-control strong { min-width: 1.2rem; text-align: center; color: #592544; font-size: .82rem; }.nfc-symbol { display: grid; place-items: center; width: 3.1rem; height: 3.1rem; margin-bottom: .75rem; color: #ff0072; border-radius: 1rem; background: #fff0f6; font-size: 1.7rem; }.nfc-card p { margin: .65rem 0; color: #99788e; font-size: .76rem; line-height: 1.6; }.nfc-card code { display: block; overflow: hidden; padding: .65rem; color: #a20a50; border-radius: .6rem; background: #fff4f8; font: .62rem monospace; text-overflow: ellipsis; white-space: nowrap; }.full { width: 100%; margin-top: .75rem; }.activity-card { margin-top: 1rem; }.movement { display: flex; gap: .7rem; padding: .75rem 0; border-bottom: 1px solid #f7eaf0; }.movement > span { color: #b80053; font-size: .8rem; font-weight: 800; }.movement > span.negative { color: #ae5a74; }.movement strong, .movement small { display: block; }.movement strong { color: #5b2848; font-size: .74rem; }.movement small { margin-top: .1rem; color: #aa879a; font-size: .64rem; }.inline-empty, .detail-loading { padding: 2rem; color: #a38295; text-align: center; font-size: .78rem; }.detail-loading { padding: 3rem; }
        @keyframes inventory-shimmer { to { background-position: -200% 0; } }
        @media (max-width: 900px) { .box-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }.detail-grid { grid-template-columns: minmax(0, 1fr); }.detail-aside { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }.activity-card { margin-top: 0; } }
        @media (max-width: 640px) { .inventory-page { width: 100%; min-width: 0; }.page-header, .toolbar { align-items: stretch; flex-direction: column; }.page-header > .primary-button, .header-actions > button { width: 100%; }.stat-grid, .box-grid, .form-grid, .detail-aside { grid-template-columns: minmax(0, 1fr); }.header-actions { flex-wrap: wrap; }.add-item-row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }.add-item-row .primary-button { grid-column: span 2; }.toolbar-note { align-self: flex-start; }.box-card-footer { flex-wrap: wrap; justify-content: flex-start; }.quantity-control { gap: .35rem; }.quantity-control button { width: 44px; min-height: 44px; }.panel-actions { flex-wrap: wrap; }.panel-actions > button { flex: 1 1 130px; } }
    `]
})
export class InventoryComponent implements OnInit {
    private readonly api = inject(ApiService);
    private readonly toast = inject(ToastService);
    private readonly route = inject(ActivatedRoute);

    readonly boxes = signal<InventoryBoxSummaryDto[]>([]);
    readonly selectedBox = signal<InventoryBoxDto | null>(null);
    readonly loading = signal(true);
    readonly saving = signal(false);
    readonly showCreate = signal(false);
    readonly boxId = signal<string | null>(null);
    readonly totalUnits = computed(() => this.boxes().reduce((sum, box) => sum + box.totalUnits, 0));
    readonly totalArticleTypes = computed(() => this.boxes().reduce((sum, box) => sum + box.articleTypesCount, 0));

    newBox = { code: '', name: '', location: '' };
    newItem = { name: '', variant: '', quantity: 1 };
    search = '';

    ngOnInit(): void {
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            this.boxId.set(id);
            if (id) this.loadBox(id); else this.loadBoxes();
        });
    }

    loadBoxes(): void {
        this.loading.set(true);
        this.api.getInventoryBoxes(this.search).subscribe({
            next: boxes => { this.boxes.set(boxes); this.loading.set(false); },
            error: () => { this.loading.set(false); this.toast.error('No pudimos cargar el inventario.'); }
        });
    }

    loadBox(id: string): void {
        this.loading.set(true);
        this.api.getInventoryBox(id).subscribe({
            next: box => { this.selectedBox.set(box); this.loading.set(false); },
            error: () => { this.loading.set(false); this.toast.error('No pudimos cargar esta caja.'); }
        });
    }

    createBox(): void {
        if (!this.newBox.code.trim() || !this.newBox.name.trim()) {
            this.toast.warning('Escribe un código y un nombre para la caja.');
            return;
        }
        this.saving.set(true);
        this.api.createInventoryBox(this.newBox).subscribe({
            next: box => { this.saving.set(false); this.showCreate.set(false); this.newBox = { code: '', name: '', location: '' }; this.toast.success('Caja creada.'); this.loadBoxes(); },
            error: error => { this.saving.set(false); this.toast.error(error?.error?.message || 'No pudimos crear la caja.'); }
        });
    }

    addItem(): void {
        const box = this.selectedBox();
        if (!box || !this.newItem.name.trim() || this.newItem.quantity < 1) return;
        this.saving.set(true);
        this.api.addInventoryItem(box.id, this.newItem).subscribe({
            next: updated => { this.selectedBox.set(updated); this.newItem = { name: '', variant: '', quantity: 1 }; this.saving.set(false); this.toast.success('Existencia actualizada.'); },
            error: error => { this.saving.set(false); this.toast.error(error?.error?.message || 'No pudimos agregar el artículo.'); }
        });
    }

    adjustItem(item: InventoryItemDto, delta: number): void {
        this.api.adjustInventoryItem(item.id, delta).subscribe({
            next: updated => this.selectedBox.set(updated),
            error: error => this.toast.error(error?.error?.message || 'No pudimos actualizar la existencia.')
        });
    }

    requestBoxLabel(): void {
        const box = this.selectedBox();
        if (!box) return;
        this.api.createInventoryLabelPrint({ kind: 'InventoryBox', targetId: box.id, mediaSize: 'Square50x50', copies: 1, output: 'SystemPrint' }).subscribe({
            next: () => this.toast.success('Etiqueta lista para imprimir desde tu dispositivo.'),
            error: error => this.toast.error(error?.error?.message || 'No pudimos preparar la etiqueta.')
        });
    }

    async copyNfcLink(): Promise<void> {
        const url = this.selectedBox()?.nfcUrl;
        if (!url) return;
        try { await navigator.clipboard.writeText(url); this.toast.success('Enlace NFC copiado.'); }
        catch { this.toast.info(url); }
    }
}
