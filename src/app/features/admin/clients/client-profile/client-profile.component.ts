import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ClientDto, CLIENT_TAG_LABELS, OrderSummaryDto } from '../../../../core/models';
import { AddressEditorV2Component } from '../address-editor-v2/address-editor-v2.component';

@Component({
    selector: 'app-client-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, CurrencyPipe, AddressEditorV2Component],
    template: `
    <div class="w-full min-w-0 space-y-6">
        <button class="btn-coquette btn-ghost text-sm" (click)="goBack()">← Volver a Clientas</button>

        @if (loading()) {
            <div class="shimmer h-40 rounded-2xl"></div>
        } @else if (client(); as c) {

            <!-- ── Profile Card ── -->
            <div class="card-coquette p-6 animate-scale-in relative overflow-hidden">
                <div class="absolute top-0 right-0 w-32 h-32 bg-pink-100/50 rounded-full -translate-y-10 translate-x-10 pointer-events-none"></div>
                <div class="relative flex flex-wrap items-start gap-6">
                    <div class="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                         [class]="c.tag === 'Vip' ? 'bg-amber-100' : c.tag === 'RisingStar' ? 'bg-blue-100' : 'bg-pink-100'">
                        {{ c.tag === 'Vip' ? '👑' : c.tag === 'RisingStar' ? '🚀' : '🌸' }}
                    </div>

                    <div class="flex-1 min-w-0">
                        @if (!editingInfo()) {
                        <h2 class="text-2xl font-bold text-pink-900 [overflow-wrap:anywhere]">{{ c.name }}</h2>
                            @if (c.phone) { <p class="text-pink-500 mt-1">📱 {{ c.phone }}</p> }
                            <div class="flex items-center gap-3 mt-3">
                                <span class="badge"
                                      [class]="c.tag === 'Vip' ? 'bg-amber-100 text-amber-700' : c.tag === 'RisingStar' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'">
                                    {{ getTagLabel(c.tag) }}
                                </span>
                                @if (c.type) { <span class="badge bg-purple-50 text-purple-600">{{ c.type }}</span> }
                            </div>
                            <button class="btn-coquette btn-outline-pink text-xs mt-3" (click)="startEditInfo()">
                                ✏️ Editar datos
                            </button>
                        } @else {
                            <div class="space-y-3">
                                <input class="input-coquette" [(ngModel)]="infoForm.name" placeholder="Nombre" aria-label="Nombre de la clienta" />
                                <input class="input-coquette" [(ngModel)]="infoForm.phone" placeholder="Teléfono" aria-label="Teléfono de la clienta" />
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <select class="input-coquette" [(ngModel)]="infoForm.tag" aria-label="Etiqueta de la clienta">
                                        <option value="None">Normal</option>
                                        <option value="RisingStar">🚀 En Ascenso</option>
                                        <option value="Vip">👑 Consentida</option>
                                        <option value="Blacklist">🚫 Lista Negra</option>
                                    </select>
                                    <select class="input-coquette" [(ngModel)]="infoForm.type" aria-label="Tipo de clienta">
                                        <option value="Nueva">Nueva</option>
                                        <option value="Frecuente">Frecuente</option>
                                    </select>
                                </div>
                                <div class="flex gap-2">
                                    <button class="btn-coquette btn-pink flex items-center gap-2"
                                            [disabled]="isSavingInfo()" (click)="saveInfo()">
                                        @if (isSavingInfo()) {
                                            <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        }
                                        💖 Guardar
                                    </button>
                                    <button class="btn-coquette btn-ghost" [disabled]="isSavingInfo()" (click)="editingInfo.set(false)">Cancelar</button>
                                </div>
                            </div>
                        }
                    </div>

                    <div class="w-full shrink-0 text-left sm:w-auto sm:text-right">
                        <p class="text-3xl font-bold text-pink-900">{{ c.totalSpent | currency:'MXN':'symbol-narrow':'1.0-0' }}</p>
                        <p class="text-sm text-pink-400">{{ c.ordersCount }} pedidos</p>
                    </div>
                </div>
            </div>

            <!-- ── Location Card ── -->
            <div class="card-coquette overflow-hidden animate-slide-up">
                <div class="flex flex-col items-start gap-3 border-b border-pink-50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                    <div>
                        <h3 class="text-base font-black text-pink-900 flex items-center gap-2">
                            📍 Ubicación de entrega
                        </h3>
                        <p class="text-[11px] text-pink-400 mt-0.5">
                            {{ locationStatusText(c) }}
                        </p>
                    </div>
                    <div class="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
                        <span class="px-2.5 py-1 rounded-full text-[10px] font-black"
                              [class]="locationStatusClass(c)">
                            {{ locationStatusBadge(c) }}
                        </span>
                        <button (click)="addressEditorOpen.set(true)"
                                class="px-4 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 text-xs font-black transition-all active:scale-95">
                            {{ c.latitude ? '✏️ Reubicar' : '📍 Fijar ubicación' }}
                        </button>
                    </div>
                </div>

                @if (c.latitude != null && c.longitude != null) {
                    <!-- Mini-map via Static Maps API -->
                    <div class="relative">
                        <img [src]="staticMapUrl(c)"
                             alt="Mapa de ubicación"
                             class="w-full h-48 object-cover"
                             loading="lazy" />
                        <!-- Address overlay -->
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-4 py-3">
                            <p class="text-white text-xs font-bold truncate">{{ c.address || 'Sin dirección guardada' }}</p>
                            @if (c.deliveryInstructions) {
                                <p class="text-white/70 text-[10px] truncate mt-0.5">{{ c.deliveryInstructions }}</p>
                            }
                        </div>
                    </div>
                } @else {
                    <!-- No coords yet -->
                    <div class="p-6 text-center bg-gray-50/50">
                        <p class="text-3xl mb-2">🗺️</p>
                        <p class="text-sm font-bold text-gray-500">Sin ubicación precisa</p>
                        @if (c.address) {
                            <p class="text-xs text-gray-400 mt-1 px-4">{{ c.address }}</p>
                        }
                        <button (click)="addressEditorOpen.set(true)"
                                class="mt-3 px-5 py-2 rounded-xl bg-pink-500 text-white text-xs font-black hover:bg-pink-600 transition-all active:scale-95">
                            📍 Fijar en el mapa
                        </button>
                    </div>
                }

                <!-- Instructions edit (inline, quick) -->
                <div class="p-4 border-t border-pink-50/60 bg-white">
                    @if (!editingInstructions()) {
                        <div class="flex items-start justify-between gap-3">
                            <div class="min-w-0">
                                <p class="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-1">Instrucciones de entrega</p>
                                <p class="text-sm text-pink-700">{{ c.deliveryInstructions || 'Sin instrucciones guardadas' }}</p>
                            </div>
                            <button (click)="startEditInstructions(c)" class="text-xs text-pink-400 hover:text-pink-600 font-bold shrink-0 transition-colors">
                                ✏️
                            </button>
                        </div>
                    } @else {
                        <p class="text-[10px] font-black text-pink-400 uppercase tracking-widest mb-2">Instrucciones de entrega</p>
                        <textarea [(ngModel)]="instructionsText" rows="2"
                                  placeholder="Ej: Casa rosa, portón negro, tocar timbre"
                                  class="input-coquette resize-none text-sm mb-2">
                        </textarea>
                        <div class="flex gap-2">
                            <button (click)="saveInstructions(c)"
                                    [disabled]="isSavingInstructions()"
                                    class="btn-coquette btn-pink text-xs flex items-center gap-2">
                                @if (isSavingInstructions()) {
                                    <span class="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                }
                                Guardar
                            </button>
                            <button (click)="editingInstructions.set(false)" class="btn-coquette btn-ghost text-xs">Cancelar</button>
                        </div>
                    }
                </div>
            </div>

            <!-- ── Order History ── -->
            <section class="card-coquette overflow-hidden animate-slide-up" aria-label="Historial de pedidos de la clienta">
                <div class="flex flex-wrap items-center justify-between gap-3 border-b border-pink-50 p-4 sm:p-5">
                    <div class="min-w-0">
                        <h3 class="flex items-center gap-2 text-base font-black text-pink-900">📦 Historial de pedidos</h3>
                        <p class="mt-1 text-[11px] text-pink-400">{{ clientOrderTotalCount() }} pedidos · del más reciente al más antiguo</p>
                    </div>
                    @if (clientOrderPageCount() > 1) {
                        <div class="flex shrink-0 items-center gap-2 text-xs font-bold text-pink-700">
                            <button type="button" class="min-h-11 min-w-11 rounded-xl border border-pink-100 bg-white px-3 disabled:opacity-40"
                                    aria-label="Pedidos anteriores" (click)="loadClientOrders(clientOrderPage() - 1)" [disabled]="clientOrderPage() <= 1 || clientOrdersLoading()">←</button>
                            <span class="whitespace-nowrap">{{ clientOrderPage() }} / {{ clientOrderPageCount() }}</span>
                            <button type="button" class="min-h-11 min-w-11 rounded-xl border border-pink-100 bg-white px-3 disabled:opacity-40"
                                    aria-label="Pedidos siguientes" (click)="loadClientOrders(clientOrderPage() + 1)" [disabled]="clientOrderPage() >= clientOrderPageCount() || clientOrdersLoading()">→</button>
                        </div>
                    }
                </div>

                @if (clientOrdersLoading()) {
                    <div class="space-y-2 p-4" aria-label="Cargando historial de pedidos">
                        @for (row of [1, 2, 3]; track row) { <div class="shimmer h-14 rounded-xl"></div> }
                    </div>
                } @else if (clientOrdersError()) {
                    <div class="p-5 text-center">
                        <p class="text-sm font-semibold text-rose-600">No pudimos cargar el historial.</p>
                        <button type="button" class="mt-3 min-h-11 rounded-xl bg-pink-50 px-4 text-xs font-black text-pink-700"
                                (click)="loadClientOrders(clientOrderPage())">Reintentar</button>
                    </div>
                } @else if (clientOrders().length === 0) {
                    <p class="p-5 text-center text-sm text-pink-400">Todavía no hay pedidos registrados para esta clienta.</p>
                } @else {
                    <div class="divide-y divide-pink-50 px-4 sm:px-5">
                        @for (order of clientOrders(); track order.id) {
                            <div class="flex min-w-0 items-center gap-3 py-3">
                                <div class="min-w-0 flex-1">
                                    <p class="truncate text-sm font-black text-pink-900">Pedido #{{ order.id }}</p>
                                    <p class="mt-0.5 truncate text-[11px] text-pink-400">{{ order.createdAt | date:'d MMM yyyy, h:mm a' }} · {{ order.itemsCount }} productos</p>
                                </div>
                                <div class="shrink-0 text-right">
                                    <p class="text-sm font-black text-pink-800">{{ order.total | currency:'MXN':'symbol-narrow':'1.0-0' }}</p>
                                    <span class="text-[10px] font-bold" [class]="getOrderStatusClass(order.status)">{{ getOrderStatusLabel(order.status) }}</span>
                                </div>
                            </div>
                        }
                    </div>
                }
            </section>

            <!-- ── Loyalty ── -->
            @if (loyalty()) {
                <div class="card-coquette p-6 animate-slide-up delay-200 relative overflow-hidden isolate" style="opacity:0; animation-fill-mode: forwards;">
                    <div class="absolute inset-0 bg-gradient-to-br from-pink-50 via-white to-purple-50 -z-10"></div>
                    <div class="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-pink-200/40 via-purple-100/20 to-transparent rounded-bl-full -z-10 blur-xl"></div>

                    <div class="flex items-center justify-between mb-6">
                        <h3 class="text-xl font-bold text-pink-900 font-display flex items-center gap-2">
                            <span class="text-2xl animate-pulse-slow drop-shadow-[0_0_8px_rgba(244,114,182,0.6)]">💎</span> RegiPuntos
                        </h3>
                        <span class="px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm"
                              [ngClass]="{
                                'bg-gradient-to-r from-cyan-200 to-violet-300 text-violet-900': loyalty().tierKey === 'diamante',
                                'bg-gradient-to-r from-pink-200 to-rose-300 text-rose-900': loyalty().tierKey === 'rosegold',
                                'bg-gradient-to-r from-pink-100 to-pink-200 text-pink-800': loyalty().tierKey === 'pink'
                              }">
                            {{ loyalty().tier }}
                        </span>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div class="bg-white/60 p-5 rounded-3xl border border-white shadow-sm flex items-center gap-4">
                            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-3xl shadow-inner border border-white shrink-0">✨</div>
                            <div>
                                <p class="text-[10px] uppercase font-bold text-pink-400 tracking-wider mb-0.5">Saldo Actual</p>
                                <p class="text-3xl font-black text-pink-600 font-display leading-none">{{ loyalty().currentPoints }} <span class="text-base text-pink-300 font-medium">pts</span></p>
                            </div>
                        </div>
                        <div class="bg-white/60 p-5 rounded-3xl border border-white shadow-sm flex items-center gap-4">
                            <div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-100 to-fuchsia-100 flex items-center justify-center text-3xl shadow-inner border border-white shrink-0">🌟</div>
                            <div class="flex-1 w-full">
                                <p class="text-[10px] uppercase font-bold text-purple-400 tracking-wider mb-0.5">Puntos Históricos</p>
                                <p class="text-3xl font-black text-purple-600 font-display leading-none">{{ loyalty().lifetimePoints }} <span class="text-base text-purple-300 font-medium">pts</span></p>
                                <div class="mt-2.5 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                    <div class="bg-gradient-to-r from-purple-400 to-pink-400 h-full rounded-full"
                                         [style.width]="getTierProgressWidth(loyalty().lifetimePoints)"></div>
                                </div>
                                <p class="text-[9px] text-purple-500/70 mt-1 uppercase font-bold text-right tracking-wider">{{ getNextTierGoal(loyalty().lifetimePoints) }}</p>
                            </div>
                        </div>
                    </div>
                </div>
            }
        }

        <!-- ── Address Editor Modal ── -->
        @if (addressEditorOpen() && client()) {
            <app-address-editor-v2
                [clientName]="client()!.name"
                [initialAddress]="client()!.address ?? ''"
                [initialLat]="client()!.latitude"
                [initialLng]="client()!.longitude"
                [initialInstructions]="client()!.deliveryInstructions ?? ''"
                (confirm)="onAddressConfirmed($event)"
                (cancel)="addressEditorOpen.set(false)">
            </app-address-editor-v2>
        }
    </div>
    `
})
export class ClientProfileComponent implements OnInit {
    private api = inject(ApiService);
    private toast = inject(ToastService);
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    private readonly MAPS_KEY = 'AIzaSyD0h3ou4iWXQtthgXE-LMewALcWpYdzzJk';

    client = signal<ClientDto | null>(null);
    loyalty = signal<any>(null);
    loading = signal(true);
    clientOrders = signal<OrderSummaryDto[]>([]);
    clientOrdersLoading = signal(true);
    clientOrdersError = signal(false);
    clientOrderPage = signal(1);
    clientOrderTotalCount = signal(0);
    readonly clientOrderPageSize = 5;
    clientOrderPageCount = computed(() => Math.max(1, Math.ceil(this.clientOrderTotalCount() / this.clientOrderPageSize)));

    // General info editing
    editingInfo = signal(false);
    isSavingInfo = signal(false);
    infoForm = { name: '', phone: '', tag: 'None', type: 'Nueva' };

    // Address editor
    addressEditorOpen = signal(false);

    // Inline instructions editing
    editingInstructions = signal(false);
    isSavingInstructions = signal(false);
    instructionsText = '';


    ngOnInit(): void {
        const id = Number(this.route.snapshot.paramMap.get('id'));
        if (!id) { this.goBack(); return; }
        this.loadClient(id);
        this.api.getLoyaltySummary(id).subscribe({ next: (l) => this.loyalty.set(l), error: () => {} });
        this.loadClientOrders(1);
    }

    loadClientOrders(page: number): void {
        const clientId = Number(this.route.snapshot.paramMap.get('id'));
        if (!clientId) return;

        const safePage = Math.max(1, Math.min(page, this.clientOrderPageCount()));
        this.clientOrderPage.set(safePage);
        this.clientOrdersLoading.set(true);
        this.clientOrdersError.set(false);
        this.api.getClientOrdersPaged(clientId, safePage, this.clientOrderPageSize).subscribe({
            next: result => {
                this.clientOrders.set(result.items);
                this.clientOrderTotalCount.set(result.totalCount);
                this.clientOrderPage.set(result.currentPage);
                this.clientOrdersLoading.set(false);
            },
            error: () => {
                this.clientOrders.set([]);
                this.clientOrdersLoading.set(false);
                this.clientOrdersError.set(true);
            }
        });
    }

    private loadClient(id: number): void {
        this.api.getClient(id).subscribe({
            next: (c) => { this.client.set(c); this.loading.set(false); },
            error: () => { this.loading.set(false); this.toast.error('Clienta no encontrada'); }
        });
    }

    goBack(): void { this.router.navigate(['/admin/clients']); }

    getTagLabel(tag: string): string { return CLIENT_TAG_LABELS[tag] || tag; }

    getOrderStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            Pending: 'Pendiente', Confirmed: 'Confirmado', InRoute: 'En ruta',
            Delivered: 'Entregado', NotDelivered: 'No entregado', Canceled: 'Cancelado',
            Postponed: 'Pospuesto', Shipped: 'Enviado'
        };
        return labels[status] ?? status;
    }

    getOrderStatusClass(status: string): string {
        const classes: Record<string, string> = {
            Pending: 'text-amber-600', Confirmed: 'text-blue-600', InRoute: 'text-indigo-600',
            Delivered: 'text-emerald-600', NotDelivered: 'text-rose-600', Canceled: 'text-gray-500',
            Postponed: 'text-violet-600', Shipped: 'text-cyan-700'
        };
        return classes[status] ?? 'text-pink-600';
    }

    // ── Info editing ──

    startEditInfo(): void {
        const c = this.client()!;
        this.infoForm = { name: c.name, phone: c.phone ?? '', tag: c.tag, type: c.type ?? 'Nueva' };
        this.editingInfo.set(true);
    }

    saveInfo(): void {
        if (this.isSavingInfo()) return;
        const c = this.client()!;
        this.isSavingInfo.set(true);
        this.api.updateClient(c.id, {
            name: this.infoForm.name,
            phone: this.infoForm.phone,
            address: c.address ?? '',
            tag: this.infoForm.tag,
            type: this.infoForm.type,
            deliveryInstructions: c.deliveryInstructions
        }).subscribe({
            next: () => {
                this.toast.success('Datos guardados 💖');
                this.editingInfo.set(false);
                this.isSavingInfo.set(false);
                this.loadClient(c.id);
            },
            error: () => { this.isSavingInfo.set(false); this.toast.error('Error al guardar'); }
        });
    }

    // ── Instructions editing ──

    startEditInstructions(c: ClientDto): void {
        this.instructionsText = c.deliveryInstructions ?? '';
        this.editingInstructions.set(true);
    }

    saveInstructions(c: ClientDto): void {
        if (this.isSavingInstructions()) return;
        this.isSavingInstructions.set(true);
        this.api.updateClient(c.id, {
            name: c.name,
            phone: c.phone ?? '',
            address: c.address ?? '',
            tag: c.tag,
            type: c.type ?? 'Nueva',
            deliveryInstructions: this.instructionsText
        }).subscribe({
            next: () => {
                this.toast.success('Instrucciones guardadas 📝');
                this.editingInstructions.set(false);
                this.isSavingInstructions.set(false);
                this.loadClient(c.id);
            },
            error: () => { this.isSavingInstructions.set(false); this.toast.error('Error al guardar'); }
        });
    }

    // ── Address editor confirm ──

    onAddressConfirmed(result: { address: string; lat: number; lng: number; deliveryInstructions: string }): void {
        const c = this.client()!;
        this.api.setClientCoordinates(
            c.id,
            result.lat,
            result.lng,
            result.address,
            result.deliveryInstructions
        ).subscribe({
            next: () => {
                this.toast.success('📍 Ubicación guardada');
                this.addressEditorOpen.set(false);
                this.loadClient(c.id);
            },
            error: () => this.toast.error('Error al guardar la ubicación')
        });
    }

    // ── Location display helpers ──

    staticMapUrl(c: ClientDto): string {
        if (!c.latitude || !c.longitude) return '';
        const lat = c.latitude;
        const lng = c.longitude;
        const marker = `color:0xec4899|${lat},${lng}`;
        return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=16&size=800x400&markers=${encodeURIComponent(marker)}&key=${this.MAPS_KEY}&scale=2&style=feature:poi|visibility:off`;
    }

    locationStatusText(c: ClientDto): string {
        if (c.latitude != null && c.longitude != null) return `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`;
        if (c.address) return 'Dirección sin coordenadas — toca "Fijar en el mapa"';
        return 'Sin dirección ni coordenadas';
    }

    locationStatusBadge(c: ClientDto): string {
        if (c.latitude != null) return '🎯 Precisa';
        if (c.address) return '🌀 Sin ubicar';
        return '❓ Vacía';
    }

    locationStatusClass(c: ClientDto): string {
        if (c.latitude != null) return 'bg-emerald-100 text-emerald-700';
        if (c.address) return 'bg-amber-100 text-amber-700';
        return 'bg-gray-100 text-gray-500';
    }

    // ── Loyalty helpers ──

    getTierProgressWidth(lifetime: number): string {
        if (lifetime < 1000) return `${(lifetime / 1000) * 100}%`;
        if (lifetime < 5000) return `${((lifetime - 1000) / 4000) * 100}%`;
        return '100%';
    }

    getNextTierGoal(lifetime: number): string {
        if (lifetime < 1000) return `${1000 - lifetime} pts para 🚀 En Ascenso`;
        if (lifetime < 5000) return `${5000 - lifetime} pts para 👑 VIP`;
        return '¡Máximo Nivel Alcanzado! 👑';
    }
}
