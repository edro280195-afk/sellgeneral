import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { forkJoin } from 'rxjs';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrderSummaryDto, PagedResult, SalesPeriodDto } from '../../../../core/models';
import { buildOrderMessage } from '../../../../core/utils/order-message.util';
import {
  copyMessageToClipboard,
  MessageShareChannel,
  MessageShareRequest,
  openWhatsAppShare,
  shareMessageToMessenger
} from '../../../../core/utils/message-sharing.util';
import { MessageShareDialogComponent } from '../../../../shared/components/message-share-dialog/message-share-dialog.component';

@Component({
  selector: 'app-send-links',
  standalone: true,
  imports: [FormsModule, CurrencyPipe, RouterLink, MessageShareDialogComponent],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-wrap items-center justify-between gap-4 animate-slide-down">
        <div>
          <h1 class="text-2xl font-bold text-pink-900">💌 Centro de Envíos</h1>
          <p class="text-sm text-pink-400 font-medium mt-1">Comparte los enlaces de tus pedidos, uno por uno y sin perder el hilo.</p>
        </div>
        <div class="flex gap-2">
          <a routerLink="/admin/orders" class="btn-coquette btn-outline-pink text-center align-middle inline-block">← Pedidos</a>
        </div>
      </div>

      <!-- Controls -->
      <div class="card-coquette p-3 sm:p-4 animate-slide-up" style="opacity:0">
        <div class="flex flex-wrap gap-3 items-end">
          <div class="w-full min-w-0 sm:flex-1 sm:min-w-[220px]">
            <label class="label-coquette" for="send-links-period">📋 Corte de venta</label>
            <select id="send-links-period" class="input-coquette" [ngModel]="selectedPeriodId()" (ngModelChange)="changePeriod($event)">
              <option [ngValue]="null">Todos los cortes</option>
              @for (period of salesPeriods(); track period.id) {
                <option [ngValue]="period.id">{{ period.name }}{{ period.isActive ? ' · activo' : '' }}</option>
              }
            </select>
          </div>
          <div class="w-full min-w-0 sm:flex-1 sm:min-w-[220px]">
            <label class="label-coquette" for="send-links-search">🔍 Buscar clienta o pedido</label>
            <input id="send-links-search" class="input-coquette" placeholder="Nombre o #123..." [ngModel]="search()" (ngModelChange)="changeSearch($event)" />
          </div>
          <label class="flex items-center gap-2 cursor-pointer bg-pink-50/60 px-3 py-2.5 rounded-xl border border-pink-100 select-none">
            <input type="checkbox" [ngModel]="hideNotified()" (ngModelChange)="setHideNotified($event)" class="accent-pink-500 w-4 h-4" />
            <span class="text-xs font-bold text-pink-700">Ocultar ya enviados</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer bg-pink-50/60 px-3 py-2.5 rounded-xl border border-pink-100 select-none">
            <input type="checkbox" [ngModel]="hideClosed()" (ngModelChange)="setHideClosed($event)" class="accent-pink-500 w-4 h-4" />
            <span class="text-xs font-bold text-pink-700">Ocultar entregados/cancelados</span>
          </label>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-3 gap-2 sm:gap-3 animate-fade-in">
        <div class="card-coquette p-3 sm:p-4 text-center">
          <p class="text-2xl font-black text-pink-900">{{ stats().total }}</p>
          <p class="text-[10px] font-black text-pink-400 uppercase tracking-widest">En lista</p>
        </div>
        <div class="card-coquette p-3 sm:p-4 text-center">
          <p class="text-2xl font-black text-emerald-600">{{ stats().sent }}</p>
          <p class="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Enviados</p>
        </div>
        <div class="card-coquette p-3 sm:p-4 text-center">
          <p class="text-2xl font-black text-amber-600">{{ stats().pending }}</p>
          <p class="text-[10px] font-black text-amber-400 uppercase tracking-widest">Pendientes</p>
        </div>
      </div>

      <!-- Progress bar -->
      @if (stats().total > 0) {
        <div class="h-2.5 w-full bg-pink-100 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-500"
               [style.width.%]="(stats().sent / stats().total) * 100"></div>
        </div>
      }

      @if (!loading() && filteredOrders().length > 0) {
        <p class="text-xs font-semibold text-pink-700" aria-live="polite">
          Mostrando {{ pageOrders().length }} de {{ filteredOrders().length }} pedidos
        </p>
      }

      @if (!loading() && filteredOrders().length > 0 && pageCount() > 1) {
        <nav class="flex items-center justify-between gap-2" aria-label="Navegación de pedidos">
          <button type="button" class="btn-coquette btn-ghost min-h-11 px-3 text-xs"
                  (click)="goToPage(visiblePage() - 1)" [disabled]="visiblePage() <= 1">← Anterior</button>
          <span class="text-xs font-bold text-pink-800">Página {{ visiblePage() }} de {{ pageCount() }}</span>
          <button type="button" class="btn-coquette btn-ghost min-h-11 px-3 text-xs"
                  (click)="goToPage(visiblePage() + 1)" [disabled]="visiblePage() >= pageCount()">Siguiente →</button>
        </nav>
      }

      <!-- List -->
      @if (loading()) {
        <div class="space-y-3">
          @for (i of [1,2,3,4]; track i) {
            <div class="shimmer h-24 rounded-2xl"></div>
          }
        </div>
      } @else if (filteredOrders().length === 0) {
        <div class="card-coquette p-12 text-center animate-fade-in">
          <div class="text-5xl mb-3">🎉</div>
          <p class="text-pink-900 font-black text-lg">¡Nada pendiente por aquí!</p>
          <p class="text-pink-400 text-sm font-medium mt-1">No hay pedidos que coincidan con los filtros.</p>
        </div>
      } @else {
        <div class="space-y-3 pb-8">
          @for (o of pageOrders(); track o.id) {
            <div class="card-coquette p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all"
                 [class.ring-2]="!!o.notifiedAt"
                 [class.ring-emerald-200]="!!o.notifiedAt"
                 [class.bg-emerald-50/30]="!!o.notifiedAt">

              <!-- Info -->
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="font-black text-pink-900 truncate">{{ o.clientName }}</span>
                  <span class="text-[10px] font-black px-2 py-0.5 rounded-full"
                        [class]="o.type === 'Frecuente' ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'">
                    {{ o.type === 'Frecuente' ? '👑 Frecuente' : '🌸 Nueva' }}
                  </span>
                  @if (o.notifiedAt) {
                    <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">✓ Enviado</span>
                  }
                </div>
                <div class="flex items-center gap-3 mt-1 text-xs text-pink-400 font-medium">
                  <span>Pedido #{{ o.id }}</span>
                  <span class="font-black text-pink-700">{{ o.total | currency:'MXN':'symbol-narrow' }}</span>
                </div>
              </div>

              <!-- Actions -->
              <div class="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:shrink-0">
                <button class="h-11 min-h-[44px] w-11 min-w-[44px] rounded-xl bg-purple-50 text-purple-500 hover:bg-purple-100 active:scale-95 flex items-center justify-center transition-all border border-purple-100/50"
                        title="Solo copiar el enlace" (click)="copyLink(o)">🔗</button>

                <button type="button" class="order-first sm:order-none w-full sm:w-auto min-h-[44px] flex items-center justify-center gap-2 px-4 rounded-xl bg-pink-500 text-white font-black text-sm hover:bg-pink-600 active:scale-95 transition-all shadow-md shadow-pink-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                        [attr.aria-label]="'Elegir dónde compartir el pedido de ' + o.clientName"
                        (click)="send(o)">
                  💌 Compartir enlace
                </button>

                @if (o.notifiedAt) {
                  <button class="h-11 min-h-[44px] w-11 min-w-[44px] rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600 active:scale-95 flex items-center justify-center transition-all border border-gray-100"
                          title="Marcar como NO enviado" (click)="toggleNotified(o)">↩️</button>
                }
              </div>
            </div>
          }
        </div>
      }

      @if (!loading() && filteredOrders().length > 0 && pageCount() > 1) {
        <nav class="flex items-center justify-between gap-2 pb-8" aria-label="Páginas de pedidos">
          <button type="button" class="btn-coquette btn-ghost min-h-11 px-3 text-xs"
                  (click)="goToPage(visiblePage() - 1)" [disabled]="visiblePage() <= 1">← Anterior</button>
          <span class="text-xs font-bold text-pink-800">Página {{ visiblePage() }} de {{ pageCount() }}</span>
          <button type="button" class="btn-coquette btn-ghost min-h-11 px-3 text-xs"
                  (click)="goToPage(visiblePage() + 1)" [disabled]="visiblePage() >= pageCount()">Siguiente →</button>
        </nav>
      }
      @if (shareRequest(); as request) {
        <app-message-share-dialog
          [title]="request.title"
          [recipientName]="request.recipientName"
          [message]="request.message"
          (channelSelected)="shareOrderMessage($event)"
          (closed)="closeShareDialog()" />
      }
    </div>
  `
})
export class SendLinksComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  orders = signal<OrderSummaryDto[]>([]);
  salesPeriods = signal<SalesPeriodDto[]>([]);
  loading = signal(true);
  shareRequest = signal<MessageShareRequest | null>(null);
  private pendingShareOrderId: number | null = null;

  selectedPeriodId = signal<number | null>(null);
  search = signal('');
  hideNotified = signal(false);
  hideClosed = signal(true);
  currentPage = signal(1);
  readonly pageSize = 10;

  private readonly CLOSED_STATUSES = ['Delivered', 'Canceled', 'NotDelivered'];

  filteredOrders = computed(() => {
    const raw = this.search().trim();
    const term = this.normalizeText(raw);
    const idTerm = raw.replace(/^#/, '').trim();
    return this.orders().filter(o => {
      if (this.hideNotified() && o.notifiedAt) return false;
      if (this.hideClosed() && this.CLOSED_STATUSES.includes(o.status)) return false;
      if (term && !this.normalizeText(o.clientName || '').includes(term)
        && !(idTerm && /^\d+$/.test(idTerm) && o.id.toString().includes(idTerm))) return false;
      return true;
    });
  });

  pageCount = computed(() => Math.max(1, Math.ceil(this.filteredOrders().length / this.pageSize)));
  visiblePage = computed(() => Math.min(this.currentPage(), this.pageCount()));
  pageOrders = computed(() => {
    const start = (this.visiblePage() - 1) * this.pageSize;
    return this.filteredOrders().slice(start, start + this.pageSize);
  });

  private normalizeText(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }

  stats = computed(() => {
    const list = this.filteredOrders();
    return {
      total: list.length,
      sent: list.filter(o => !!o.notifiedAt).length,
      pending: list.filter(o => !o.notifiedAt).length
    };
  });

  ngOnInit(): void {
    this.api.getSalesPeriods().subscribe({
      next: (periods) => {
        this.salesPeriods.set(periods);
        const activePeriod = periods.find(period => period.isActive);
        this.selectedPeriodId.set(activePeriod?.id ?? null);
        this.loadOrders();
      },
      error: () => this.loadOrders()
    });
  }

  loadOrders(): void {
    this.loading.set(true);
    const pageSize = 500;
    const salesPeriodId = this.selectedPeriodId() ?? undefined;
    this.api.getOrdersPaged(1, pageSize, '', '', '', undefined, undefined, '', salesPeriodId).subscribe({
      next: (firstPage) => {
        const pageCount = Math.ceil(firstPage.totalCount / pageSize);
        if (pageCount <= 1) {
          this.setLoadedOrders([firstPage]);
          return;
        }

        const remainingPages = Array.from({ length: pageCount - 1 }, (_, index) =>
          this.api.getOrdersPaged(index + 2, pageSize, '', '', '', undefined, undefined, '', salesPeriodId)
        );
        forkJoin(remainingPages).subscribe({
          next: (pages) => this.setLoadedOrders([firstPage, ...pages]),
          error: () => this.failOrderLoad()
        });
      },
      error: () => this.failOrderLoad()
    });
  }

  changePeriod(periodId: number | null): void {
    this.selectedPeriodId.set(periodId);
    this.currentPage.set(1);
    this.loadOrders();
  }

  changeSearch(search: string): void {
    this.search.set(search);
    this.currentPage.set(1);
  }

  setHideNotified(hide: boolean): void {
    this.hideNotified.set(hide);
    this.currentPage.set(1);
  }

  setHideClosed(hide: boolean): void {
    this.hideClosed.set(hide);
    this.currentPage.set(1);
  }

  goToPage(page: number): void {
    this.currentPage.set(Math.min(Math.max(1, page), this.pageCount()));
  }

  private setLoadedOrders(pages: PagedResult<OrderSummaryDto>[]): void {
    this.orders.set(pages.flatMap(page => page.items));
    this.loading.set(false);
    this.currentPage.set(1);
  }

  private failOrderLoad(): void {
    this.loading.set(false);
    this.toast.error('Error al cargar pedidos');
  }

  /** Prepara el mensaje del pedido para elegir el canal de envío. */
  send(o: OrderSummaryDto): void {
    const link = o.link.replace('/o/', '/pedido/');
    const msg = buildOrderMessage({
      clientName: o.clientName,
      publicLink: link,
      scheduledDeliveryDate: o.scheduledDeliveryDate,
      expiresAt: o.expiresAt
    });

    this.pendingShareOrderId = o.id;
    this.shareRequest.set({
      title: 'Compartir pedido',
      recipientName: o.clientName,
      phone: o.clientPhone,
      message: msg
    });
  }

  closeShareDialog(): void {
    this.pendingShareOrderId = null;
    this.shareRequest.set(null);
  }

  async shareOrderMessage(channel: MessageShareChannel): Promise<void> {
    const request = this.shareRequest();
    const orderId = this.pendingShareOrderId;
    if (!request || orderId === null) return;
    this.closeShareDialog();

    let prepared = false;
    try {
      if (channel === 'whatsapp') {
        openWhatsAppShare(request.phone, request.message);
        prepared = true;
        this.toast.info('WhatsApp quedó listo con el enlace; revísalo y envíalo.');
      } else if (channel === 'messenger') {
        const result = await shareMessageToMessenger(request.title, request.message);
        prepared = result !== 'cancelled';
        if (result === 'shared') this.toast.success('El mensaje se compartió desde las opciones del teléfono.');
        if (result === 'copied') this.toast.success('Mensaje copiado; pégalo en Messenger.');
      } else {
        await copyMessageToClipboard(request.message);
        prepared = true;
        this.toast.success(`Mensaje de ${request.recipientName} copiado 💬`);
      }
    } catch {
      this.toast.error('No pudimos preparar el enlace para compartir.');
    }

    if (prepared) {
      const order = this.orders().find(item => item.id === orderId);
      if (order) this.setNotified(order, true);
    }
  }

  copyLink(o: OrderSummaryDto): void {
    const link = o.link.replace('/o/', '/pedido/');
    navigator.clipboard.writeText(link).then(() => this.toast.success('Enlace copiado 🔗'));
  }

  toggleNotified(o: OrderSummaryDto): void {
    this.setNotified(o, !o.notifiedAt);
  }

  /** Actualización optimista + persistencia en backend */
  private setNotified(o: OrderSummaryDto, notified: boolean): void {
    const previous = o.notifiedAt;
    this.patchLocal(o.id, { notifiedAt: notified ? new Date().toISOString() : undefined });
    this.api.markOrderNotified(o.id, notified).subscribe({
      error: () => {
        this.patchLocal(o.id, { notifiedAt: previous });
        this.toast.error('No se pudo guardar el estado de envío');
      }
    });
  }

  private patchLocal(orderId: number, patch: Partial<OrderSummaryDto>): void {
    this.orders.update(list => list.map(o => o.id === orderId ? { ...o, ...patch } : o));
  }
}
