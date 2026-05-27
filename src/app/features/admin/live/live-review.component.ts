import { CommonModule, CurrencyPipe } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
    LiveCandidateDto,
    LiveProductDto,
    LiveSessionDto,
    ResolveCandidateDto
} from '../../../core/models';
import { LiveCaptureService } from '../../../core/services/live-capture.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClientResolveResult, ClientResolverComponent } from '../orders/capture-order/client-resolver/client-resolver.component';

type CandidateFilter = 'Pending' | 'Confirmed' | 'Ignored' | 'conflict' | 'all';

@Component({
    selector: 'app-live-review',
    standalone: true,
    imports: [CommonModule, FormsModule, CurrencyPipe, RouterLink, ClientResolverComponent],
    template: `
    <section class="review-page">
      <header class="review-header">
        <div>
          <a routerLink="/admin/live/import" class="back-link">Volver a importar</a>
          <h1>{{ session()?.title || ('Live #' + liveId) }}</h1>
        </div>
        <div class="progress-pill">
          <strong>{{ confirmedCount() }}</strong>
          <span>/ {{ candidates().length }} confirmados</span>
        </div>
      </header>

      <div class="review-toolbar">
        <button type="button" [class.active]="filter() === 'Pending'" (click)="setFilter('Pending')">Sin revisar</button>
        <button type="button" [class.active]="filter() === 'conflict'" (click)="setFilter('conflict')">Con conflicto</button>
        <button type="button" [class.active]="filter() === 'Confirmed'" (click)="setFilter('Confirmed')">Confirmados</button>
        <button type="button" [class.active]="filter() === 'all'" (click)="setFilter('all')">Todos</button>
      </div>

      @if (loading()) {
        <div class="loading-panel">Cargando candidates del live...</div>
      } @else {
        <div class="review-grid">
          <aside class="product-panel">
            <div class="panel-title">Productos</div>
            <button
              type="button"
              class="product-row all"
              [class.selected]="selectedProductId() === null"
              (click)="selectProduct(null)">
              <span>Todos</span>
              <strong>{{ filteredAllCount() }}</strong>
            </button>
            @for (product of products(); track product.id) {
              <button
                type="button"
                class="product-row"
                [class.selected]="selectedProductId() === product.id"
                (click)="selectProduct(product.id)">
                <span class="keyword">{{ product.keyword }}</span>
                <small>{{ product.description }}</small>
                <strong>{{ countForProduct(product.id) }}</strong>
              </button>
            }
          </aside>

          <main class="candidate-panel">
            <div class="panel-title">
              <span>Pedidos detectados</span>
              <small>{{ visibleCandidates().length }} filas</small>
            </div>

            @if (visibleCandidates().length === 0) {
              <div class="empty-state">No hay candidates con este filtro.</div>
            }

            <div class="candidate-list">
              @for (candidate of visibleCandidates(); track candidate.id) {
                <article
                  class="candidate-row"
                  [class.selected]="selectedCandidateId() === candidate.id"
                  [class.confirmed]="candidate.status === 'Confirmed'"
                  [class.ignored]="candidate.status === 'Ignored'"
                  (click)="selectCandidate(candidate)">
                  <div class="row-main">
                    <div class="avatar">{{ initials(displayName(candidate)) }}</div>
                    <div>
                      <strong>{{ displayName(candidate) }}</strong>
                      <span>{{ candidate.productDescription || candidate.keyword }}</span>
                    </div>
                  </div>
                  <div class="row-meta">
                    <span class="source" [class.high]="candidate.source === 'SpokenAndComment'">{{ sourceLabel(candidate.source) }}</span>
                    <strong>{{ candidate.productPrice || 0 | currency:'MXN':'symbol-narrow':'1.0-0' }}</strong>
                  </div>
                </article>
              }
            </div>
          </main>

          <aside class="detail-panel">
            @if (selectedCandidate(); as candidate) {
              <div class="detail-top">
                <div>
                  <span class="source high">{{ sourceLabel(candidate.source) }}</span>
                  <h2>{{ displayName(candidate) }}</h2>
                </div>
                <span class="status" [class.done]="candidate.status === 'Confirmed'" [class.muted]="candidate.status === 'Ignored'">
                  {{ statusLabel(candidate.status) }}
                </span>
              </div>

              <div class="clip-box">
                @if (clipLoading()) {
                  <span>Cargando clip...</span>
                } @else if (clipUrl()) {
                  <video [src]="clipUrl()" controls playsinline></video>
                } @else {
                  <span>Clip no disponible todavia.</span>
                }
              </div>

              <div class="edit-grid">
                <label>
                  Producto
                  <input [(ngModel)]="productOverride" [placeholder]="candidate.productDescription || candidate.keyword">
                </label>
                <label>
                  Precio
                  <input type="number" min="0" step="1" [(ngModel)]="priceOverride">
                </label>
              </div>

              <section class="identity-box">
                <div class="identity-header">
                  <strong>Identidad</strong>
                  @if (selectedClientName()) {
                    <span>{{ selectedClientName() }}</span>
                  }
                </div>

                @if (candidate.resolvedClientId && candidate.resolvedClientName) {
                  <button type="button" class="choice selected" (click)="useResolved(candidate)">
                    Usar {{ candidate.resolvedClientName }}
                  </button>
                }

                @if (candidate.resolution?.candidates?.length) {
                  <div class="quick-choices">
                    @for (option of candidate.resolution!.candidates; track option.clientId) {
                      <button type="button" class="choice" [class.selected]="selectedClientId() === option.clientId" (click)="chooseClient(option)">
                        {{ option.name }} <small>{{ percent(option.score) }}%</small>
                      </button>
                    }
                  </div>
                }

                <app-client-resolver
                  [name]="identityName(candidate)"
                  (resolved)="onResolverResult($event)">
                </app-client-resolver>

                <button type="button" class="choice new-client" [class.selected]="selectedClientId() === null && selectedClientName() === 'Clienta nueva'" (click)="markAsNew(candidate)">
                  Crear como clienta nueva
                </button>
              </section>

              @if (candidate.proposedAliasPair) {
                <label class="alias-toggle">
                  <input type="checkbox" [(ngModel)]="acceptAlias">
                  <span>
                    Aprender alias:
                    <strong>{{ candidate.proposedAliasPair.alias }}</strong>
                    para {{ candidate.proposedAliasPair.canonicalName }}
                  </span>
                </label>
              }

              <div class="detail-actions">
                <button type="button" class="confirm" [disabled]="busy()" (click)="confirm(candidate)">Confirmar</button>
                <button type="button" class="ignore" [disabled]="busy()" (click)="ignore(candidate)">Ignorar</button>
              </div>
            } @else {
              <div class="empty-state">Selecciona un pedido detectado.</div>
            }
          </aside>
        </div>
      }
    </section>
  `,
    styles: [`
    :host { display: block; }
    .review-page {
      max-width: 1480px;
      margin: 0 auto;
      padding-bottom: 28px;
    }
    .review-header {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 14px;
    }
    .back-link {
      display: inline-block;
      color: #be185d;
      text-decoration: none;
      font-weight: 900;
      margin-bottom: 4px;
      font-size: .82rem;
    }
    h1, h2 { margin: 0; color: #831843; letter-spacing: 0; }
    h1 { font-size: 2rem; line-height: 1.05; }
    h2 { font-size: 1.35rem; }
    .progress-pill {
      display: flex;
      align-items: baseline;
      gap: 6px;
      background: rgba(255,255,255,.78);
      border: 1px solid rgba(249,168,212,.4);
      border-radius: 999px;
      padding: 9px 14px;
      color: #9d174d;
      white-space: nowrap;
    }
    .progress-pill strong { font-size: 1.2rem; }
    .review-toolbar {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 14px;
    }
    .review-toolbar button,
    .product-row,
    .choice,
    .detail-actions button {
      font: inherit;
      cursor: pointer;
    }
    .review-toolbar button {
      border: 1px solid rgba(249,168,212,.45);
      color: #9d174d;
      background: rgba(255,255,255,.7);
      border-radius: 999px;
      padding: 7px 12px;
      font-weight: 900;
    }
    .review-toolbar button.active {
      background: #be185d;
      color: #fffafd;
      border-color: #be185d;
    }
    .review-grid {
      display: grid;
      grid-template-columns: 280px minmax(360px, 1fr) 390px;
      gap: 14px;
      align-items: start;
    }
    .product-panel,
    .candidate-panel,
    .detail-panel,
    .loading-panel {
      background: rgba(255,255,255,.78);
      border: 1px solid rgba(249,168,212,.35);
      border-radius: 18px;
      box-shadow: 0 18px 40px rgba(190,24,93,.08);
    }
    .product-panel,
    .candidate-panel,
    .detail-panel {
      max-height: calc(100vh - 188px);
      overflow: auto;
    }
    .panel-title {
      position: sticky;
      top: 0;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255,251,253,.94);
      border-bottom: 1px solid #fce7f3;
      padding: 13px 14px;
      color: #831843;
      font-weight: 900;
      border-radius: 18px 18px 0 0;
    }
    .panel-title small { color: #be185d; font-weight: 800; }
    .product-row {
      width: calc(100% - 16px);
      margin: 8px;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 2px 10px;
      text-align: left;
      border: 1px solid transparent;
      background: transparent;
      border-radius: 14px;
      padding: 10px;
      color: #7a3d6a;
    }
    .product-row:hover,
    .product-row.selected {
      background: #fdf2f8;
      border-color: #fbcfe8;
    }
    .product-row small {
      grid-column: 1 / -1;
      color: #9a7187;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .keyword {
      color: #831843;
      font-weight: 900;
    }
    .candidate-list {
      display: grid;
      gap: 8px;
      padding: 10px;
    }
    .candidate-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 10px;
      align-items: center;
      border: 1px solid #fce7f3;
      background: #fffbfd;
      border-radius: 14px;
      padding: 10px;
      cursor: pointer;
    }
    .candidate-row:hover,
    .candidate-row.selected {
      border-color: #f9a8d4;
      background: #fdf2f8;
    }
    .candidate-row.confirmed { border-color: #bbf7d0; background: #f0fdf4; }
    .candidate-row.ignored { opacity: .55; }
    .row-main {
      display: grid;
      grid-template-columns: 40px minmax(0, 1fr);
      gap: 10px;
      align-items: center;
      min-width: 0;
    }
    .avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: linear-gradient(135deg, #f9a8d4, #be185d);
      color: white;
      font-weight: 900;
    }
    .row-main strong,
    .row-main span {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .row-main strong { color: #4a2040; }
    .row-main span { color: #9a7187; font-size: .86rem; }
    .row-meta {
      display: grid;
      justify-items: end;
      gap: 4px;
      color: #831843;
    }
    .source,
    .status {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 3px 8px;
      background: #fce7f3;
      color: #9d174d;
      font-size: .72rem;
      font-weight: 900;
      white-space: nowrap;
    }
    .source.high,
    .status.done {
      background: #dcfce7;
      color: #166534;
    }
    .status.muted {
      background: #f3f4f6;
      color: #6b7280;
    }
    .detail-panel { padding: 14px; }
    .detail-top {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-bottom: 12px;
    }
    .clip-box {
      min-height: 156px;
      border-radius: 14px;
      background: #4a2040;
      color: #fdf2f8;
      display: grid;
      place-items: center;
      overflow: hidden;
      margin-bottom: 12px;
    }
    video {
      width: 100%;
      height: 100%;
      max-height: 220px;
      display: block;
      background: #4a2040;
    }
    .edit-grid {
      display: grid;
      grid-template-columns: 1fr 110px;
      gap: 10px;
      margin-bottom: 12px;
    }
    label {
      color: #831843;
      font-size: .78rem;
      font-weight: 900;
    }
    input {
      width: 100%;
      margin-top: 5px;
      border: 2px solid #fce7f3;
      background: #fffbfd;
      color: #4a2040;
      border-radius: 12px;
      padding: 10px;
      font: inherit;
      outline: none;
    }
    input:focus {
      border-color: #f9a8d4;
      box-shadow: 0 0 0 4px rgba(249,168,212,.15);
    }
    .identity-box {
      border: 1px solid #fce7f3;
      border-radius: 14px;
      padding: 12px;
      margin-bottom: 12px;
      background: #fffbfd;
    }
    .identity-header {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      color: #831843;
      margin-bottom: 9px;
    }
    .identity-header span {
      color: #166534;
      font-weight: 900;
      text-align: right;
    }
    .quick-choices {
      display: grid;
      gap: 7px;
      margin-bottom: 10px;
    }
    .choice {
      width: 100%;
      border: 1px solid #fbcfe8;
      background: #fffafd;
      color: #7a3d6a;
      border-radius: 11px;
      padding: 8px 10px;
      text-align: left;
      font-weight: 900;
    }
    .choice small { float: right; color: #be185d; }
    .choice.selected {
      background: #fdf2f8;
      border-color: #be185d;
      color: #831843;
    }
    .new-client { margin-top: 10px; }
    .alias-toggle {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 9px;
      align-items: start;
      background: #fdf2f8;
      border: 1px solid #fbcfe8;
      border-radius: 14px;
      padding: 10px;
      margin-bottom: 12px;
      color: #7a3d6a;
      line-height: 1.35;
    }
    .alias-toggle input { width: auto; margin: 2px 0 0; }
    .detail-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .detail-actions button {
      border: 0;
      border-radius: 14px;
      padding: 12px;
      color: white;
      font-weight: 900;
    }
    .confirm { background: linear-gradient(135deg, #ec4899, #be185d); }
    .ignore { background: linear-gradient(135deg, #9a7187, #6b4a5e); }
    .detail-actions button:disabled { opacity: .55; cursor: not-allowed !important; }
    .empty-state,
    .loading-panel {
      color: #9d174d;
      padding: 22px;
      text-align: center;
      font-weight: 800;
    }
    @media (max-width: 1180px) {
      .review-grid { grid-template-columns: 240px 1fr; }
      .detail-panel { grid-column: 1 / -1; max-height: none; }
    }
    @media (max-width: 760px) {
      .review-header { align-items: flex-start; flex-direction: column; }
      .review-grid { grid-template-columns: 1fr; }
      .product-panel,
      .candidate-panel,
      .detail-panel { max-height: none; }
      .edit-grid { grid-template-columns: 1fr; }
      .candidate-row { grid-template-columns: 1fr; }
      .row-meta { justify-items: start; grid-auto-flow: column; justify-content: space-between; }
    }
  `]
})
export class LiveReviewComponent implements OnInit, OnDestroy {
    private route = inject(ActivatedRoute);
    private liveCapture = inject(LiveCaptureService);
    private toast = inject(ToastService);

    liveId = Number(this.route.snapshot.paramMap.get('id'));
    loading = signal(true);
    busy = signal(false);
    clipLoading = signal(false);
    session = signal<LiveSessionDto | null>(null);
    products = signal<LiveProductDto[]>([]);
    candidates = signal<LiveCandidateDto[]>([]);
    selectedProductId = signal<number | null>(null);
    selectedCandidateId = signal<number | null>(null);
    filter = signal<CandidateFilter>('Pending');
    selectedClientId = signal<number | null | undefined>(undefined);
    selectedClientName = signal('');
    clipUrl = signal<string | null>(null);
    acceptAlias = true;
    productOverride = '';
    priceOverride: number | null = null;

    confirmedCount = computed(() => this.candidates().filter(c => c.status === 'Confirmed').length);
    visibleCandidates = computed(() => {
        const productId = this.selectedProductId();
        const filter = this.filter();
        return this.candidates().filter(candidate => {
            const productOk = productId === null || candidate.liveProductId === productId;
            if (!productOk) return false;
            if (filter === 'all') return true;
            if (filter === 'conflict') {
                return candidate.status === 'Pending' && (!candidate.resolvedClientId || !!candidate.proposedAliasPair);
            }
            return candidate.status === filter;
        });
    });
    selectedCandidate = computed(() => {
        const id = this.selectedCandidateId();
        return this.candidates().find(c => c.id === id) ?? this.visibleCandidates()[0] ?? null;
    });
    filteredAllCount = computed(() => this.countForProduct(null));

    ngOnInit(): void {
        this.load();
    }

    ngOnDestroy(): void {
        this.revokeClip();
    }

    load(): void {
        this.loading.set(true);
        this.liveCapture.getSession(this.liveId).subscribe({
            next: session => this.session.set(session),
            error: () => this.toast.error('No se pudo cargar el live')
        });

        this.liveCapture.getProducts(this.liveId).subscribe({
            next: products => this.products.set(products),
            error: () => this.toast.error('No se pudieron cargar productos')
        });

        this.liveCapture.getCandidates(this.liveId, { pageSize: 1000, includeResolution: true }).subscribe({
            next: result => {
                this.candidates.set(result.items);
                this.loading.set(false);
                this.ensureSelection();
            },
            error: () => {
                this.loading.set(false);
                this.toast.error('No se pudieron cargar candidates');
            }
        });
    }

    setFilter(filter: CandidateFilter): void {
        this.filter.set(filter);
        this.ensureSelection();
    }

    selectProduct(productId: number | null): void {
        this.selectedProductId.set(productId);
        this.ensureSelection();
    }

    selectCandidate(candidate: LiveCandidateDto): void {
        this.selectedCandidateId.set(candidate.id);
        this.hydrateDetail(candidate);
    }

    hydrateDetail(candidate: LiveCandidateDto): void {
        this.productOverride = candidate.productDescription || candidate.keyword;
        this.priceOverride = candidate.productPrice ?? 0;
        this.acceptAlias = !!candidate.proposedAliasPair;

        const auto = this.autoClient(candidate);
        this.selectedClientId.set(auto?.clientId ?? candidate.resolvedClientId ?? undefined);
        this.selectedClientName.set(auto?.name ?? candidate.resolvedClientName ?? '');
        this.loadClip(candidate);
    }

    ensureSelection(): void {
        const visible = this.visibleCandidates();
        const current = this.selectedCandidate();
        if (!current || !visible.some(c => c.id === current.id)) {
            if (visible[0]) this.selectCandidate(visible[0]);
            else this.selectedCandidateId.set(null);
        } else {
            this.hydrateDetail(current);
        }
    }

    useResolved(candidate: LiveCandidateDto): void {
        this.selectedClientId.set(candidate.resolvedClientId ?? undefined);
        this.selectedClientName.set(candidate.resolvedClientName ?? '');
    }

    chooseClient(option: ResolveCandidateDto): void {
        this.selectedClientId.set(option.clientId);
        this.selectedClientName.set(option.name);
    }

    onResolverResult(result: ClientResolveResult): void {
        if (result.action === 'create' || !result.clientId) {
            this.selectedClientId.set(null);
            this.selectedClientName.set('Clienta nueva');
            return;
        }
        this.selectedClientId.set(result.clientId);
        this.selectedClientName.set(result.matchedCandidate?.name ?? 'Clienta seleccionada');
    }

    markAsNew(candidate: LiveCandidateDto): void {
        this.selectedClientId.set(null);
        this.selectedClientName.set('Clienta nueva');
        if (!this.productOverride) this.productOverride = candidate.productDescription || candidate.keyword;
    }

    confirm(candidate: LiveCandidateDto): void {
        this.busy.set(true);
        this.liveCapture.confirmCandidate(candidate.id, {
            clientId: this.selectedClientId() ?? null,
            productOverride: this.productOverride.trim() || undefined,
            priceOverride: this.priceOverride ?? undefined,
            acceptProposedAlias: this.acceptAlias
        }).pipe(finalize(() => this.busy.set(false))).subscribe({
            next: updated => {
                this.replaceCandidate(updated);
                this.toast.success('Pedido confirmado');
                this.moveNext();
            },
            error: err => this.toast.error(err?.error || 'No se pudo confirmar')
        });
    }

    ignore(candidate: LiveCandidateDto): void {
        this.busy.set(true);
        this.liveCapture.ignoreCandidate(candidate.id).pipe(finalize(() => this.busy.set(false))).subscribe({
            next: updated => {
                this.replaceCandidate(updated);
                this.toast.info('Candidate ignorado');
                this.moveNext();
            },
            error: () => this.toast.error('No se pudo ignorar')
        });
    }

    replaceCandidate(updated: LiveCandidateDto): void {
        this.candidates.update(items => items.map(item => item.id === updated.id ? { ...item, ...updated } : item));
    }

    moveNext(direction = 1): void {
        const visible = this.visibleCandidates();
        if (!visible.length) {
            this.selectedCandidateId.set(null);
            return;
        }
        const currentId = this.selectedCandidateId();
        const index = Math.max(0, visible.findIndex(c => c.id === currentId));
        const next = visible[Math.min(visible.length - 1, Math.max(0, index + direction))];
        if (next) this.selectCandidate(next);
    }

    moveProduct(direction: number): void {
        const ids = [null, ...this.products().map(p => p.id)];
        const currentIndex = ids.findIndex(id => id === this.selectedProductId());
        const nextIndex = Math.min(ids.length - 1, Math.max(0, currentIndex + direction));
        this.selectProduct(ids[nextIndex]);
    }

    @HostListener('window:keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        const target = event.target as HTMLElement | null;
        if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
        const candidate = this.selectedCandidate();
        if (!candidate || this.busy()) return;

        if (event.key === 'Enter') {
            event.preventDefault();
            this.confirm(candidate);
        } else if (event.key === 'Escape') {
            event.preventDefault();
            this.ignore(candidate);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.moveNext(1);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.moveNext(-1);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            this.moveProduct(1);
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            this.moveProduct(-1);
        }
    }

    loadClip(candidate: LiveCandidateDto): void {
        this.revokeClip();
        const at = candidate.spokenAtSeconds ?? candidate.commentedAtSeconds;
        if (at === null || at === undefined) return;

        this.clipLoading.set(true);
        this.liveCapture.getClip(candidate.liveSessionId, Math.max(0, at - 1), 5)
            .pipe(finalize(() => this.clipLoading.set(false)))
            .subscribe({
                next: blob => this.clipUrl.set(URL.createObjectURL(blob)),
                error: () => this.clipUrl.set(null)
            });
    }

    revokeClip(): void {
        const current = this.clipUrl();
        if (current) URL.revokeObjectURL(current);
        this.clipUrl.set(null);
    }

    autoClient(candidate: LiveCandidateDto): ResolveCandidateDto | undefined {
        if (candidate.resolution?.suggestedAction === 'use') return candidate.resolution.candidates[0];
        return undefined;
    }

    identityName(candidate: LiveCandidateDto): string {
        return candidate.clientNameSpoken || candidate.commentDisplayName || '';
    }

    displayName(candidate: LiveCandidateDto): string {
        return candidate.clientNameSpoken || candidate.commentDisplayName || 'Sin nombre';
    }

    countForProduct(productId: number | null): number {
        const filter = this.filter();
        return this.candidates().filter(candidate => {
            if (productId !== null && candidate.liveProductId !== productId) return false;
            if (filter === 'all') return true;
            if (filter === 'conflict') return candidate.status === 'Pending' && (!candidate.resolvedClientId || !!candidate.proposedAliasPair);
            return candidate.status === filter;
        }).length;
    }

    sourceLabel(source: string): string {
        const labels: Record<string, string> = {
            Spoken: 'Audio',
            CommentOnly: 'Comentario',
            SpokenAndComment: 'Audio + comentario'
        };
        return labels[source] ?? source;
    }

    statusLabel(status: string): string {
        const labels: Record<string, string> = {
            Pending: 'Pendiente',
            Confirmed: 'Confirmado',
            Ignored: 'Ignorado'
        };
        return labels[status] ?? status;
    }

    initials(name: string): string {
        const parts = name.trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return '?';
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }

    percent(value: number): number {
        return Math.round(value * 100);
    }
}
