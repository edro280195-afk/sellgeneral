import { Component, inject, signal, OnInit, computed, effect } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';
import { FormsModule } from '@angular/forms';
import { CurrencyPipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClientDto, CLIENT_TAG_LABELS } from '../../../core/models';
import { gsap } from 'gsap';

@Component({
  selector: 'app-clients',
  imports: [FormsModule, CurrencyPipe],
  template: `
    <div class="relative min-w-0 overflow-hidden -m-4 lg:-m-8 p-4 lg:p-8">
      <!-- Parallax Background Elements -->
      <div class="absolute inset-0 pointer-events-none z-[-1] overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br from-pink-50/50 via-purple-50/50 to-rose-50/50"></div>
        
        <!-- Slowest Layer -->
        <div class="hidden sm:block absolute inset-0 opacity-40">
          <div class="absolute top-[10%] left-[5%] text-6xl animate-pulse-slow blur-[1px]">🌸</div>
          <div class="absolute top-[60%] right-[10%] text-5xl opacity-50">✨</div>
        </div>
        
        <!-- Medium Layer -->
        <div class="hidden sm:block absolute inset-0 opacity-60">
          <div class="absolute top-[20%] right-[20%] text-4xl animate-float-delayed">💖</div>
          <div class="absolute top-[75%] left-[15%] text-5xl animate-bounce-slow blur-[1px]">🎀</div>
        </div>
        
        <!-- Fast Layer -->
        <div class="hidden sm:block absolute inset-0 opacity-80">
          <div class="absolute top-[40%] left-[8%] text-3xl animate-float">🌷</div>
          <div class="absolute top-[85%] right-[25%] text-2xl blur-[1px]">💎</div>
        </div>
      </div>

      <div class="space-y-6 relative z-10 w-full min-w-0 max-w-7xl mx-auto">
        <div class="flex flex-wrap items-center justify-between gap-4 animate-slide-down">
          <div>
            <h1 class="min-w-0 text-2xl sm:text-3xl font-black text-pink-900 font-display flex flex-wrap items-center gap-2 sm:gap-3">
              <span class="animate-wiggle inline-block drop-shadow-md">💎</span> 
              Directorio de Clientas
            </h1>
            <p class="text-sm text-pink-500 font-medium ml-1 mt-1">El corazón de {{ theme.name() || "Neni's App" }} 💕</p>
          </div>
          <div class="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-pink-100 shadow-sm flex items-center gap-2">
            <span class="text-2xl animate-pulse">🌸</span>
            <div class="flex flex-col">
              <span class="text-xl font-black text-pink-700 leading-none">{{ filteredClients().length }}</span>
              <span class="text-[10px] uppercase font-bold text-pink-400 tracking-wider">Clientas</span>
            </div>
          </div>
        </div>

        <!-- Filters (Glassmorphic) -->
        <div class="bg-white/70 backdrop-blur-xl p-5 rounded-3xl border border-white shadow-[0_8px_30px_rgb(244,114,182,0.1)] animate-slide-up delay-100" style="opacity:0; animation-fill-mode: forwards;">
          <div class="client-filter-controls">
            <div class="client-filter-search relative">
              <span class="absolute left-4 top-1/2 -translate-y-1/2 text-pink-400">🔍</span>
              <input class="client-filter-input bg-white/60 border border-pink-200/50 rounded-2xl py-3 pl-10 pr-4 text-pink-900 placeholder-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all shadow-inner"
                     placeholder="Buscar por nombre, teléfono o dirección..." 
                     aria-label="Buscar clientas por nombre, teléfono o dirección"
                     [ngModel]="search()" (ngModelChange)="setSearch($event)" />
            </div>
            <select class="client-filter-select client-filter-select-tags bg-white/60 border border-pink-200/50 rounded-2xl py-3 px-4 text-pink-700 font-medium focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all shadow-inner"
                    aria-label="Filtrar por etiqueta"
                    [ngModel]="tagFilter()" (ngModelChange)="setTagFilter($event)">
              <option value="">🏷️ Todas</option>
              <option value="None">🌸 Normal</option>
              <option value="RisingStar">🚀 En Ascenso</option>
              <option value="Vip">👑 Consentida VIP</option>
              <option value="Blacklist">🚫 Lista Negra</option>
            </select>
            <select class="client-filter-select client-filter-select-type bg-white/60 border border-pink-200/50 rounded-2xl py-3 px-4 text-pink-700 font-medium focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-all shadow-inner"
                    aria-label="Filtrar por tipo de clienta"
                    [ngModel]="typeFilter()" (ngModelChange)="setTypeFilter($event)">
              <option value="">👥 Todos</option>
              <option value="Nueva">🌱 Nueva</option>
              <option value="Frecuente">💫 Frecuente</option>
            </select>
          </div>
        </div>

        @if (!loading() && filteredClients().length > 0) {
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-pink-700" aria-label="Paginación de clientas" aria-live="polite">
            <span>Mostrando {{ pageRangeStart() }}–{{ pageRangeEnd() }} de {{ filteredClients().length }}</span>
            @if (clientPageCount() > 1) {
              <div class="flex items-center gap-2">
                <button type="button" class="min-h-11 min-w-11 rounded-xl border border-pink-100 bg-white/75 px-3 font-bold disabled:opacity-40"
                        aria-label="Página anterior" (click)="goToClientPage(currentPage() - 1)" [disabled]="currentPage() <= 1"><span class="sm:hidden">←</span><span class="hidden sm:inline">← Anterior</span></button>
                <span class="whitespace-nowrap">{{ currentPage() }} / {{ clientPageCount() }}</span>
                <button type="button" class="min-h-11 min-w-11 rounded-xl border border-pink-100 bg-white/75 px-3 font-bold disabled:opacity-40"
                        aria-label="Página siguiente" (click)="goToClientPage(currentPage() + 1)" [disabled]="currentPage() >= clientPageCount()"><span class="sm:hidden">→</span><span class="hidden sm:inline">Siguiente →</span></button>
              </div>
            }
          </div>
        }

        @if (loading()) {
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            @for (i of [1,2,3,4,5,6]; track i) { 
              <div class="shimmer h-40 rounded-3xl border border-white/50 shadow-sm"></div> 
            }
          </div>
        } @else {
          <!-- Client Cards -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            @for (client of visibleClients(); track client.id; let i = $index) {
              <div class="client-card-anim group relative min-w-0 bg-white/80 backdrop-blur-xl p-3 sm:p-5 rounded-3xl border border-white shadow-[0_8px_25px_rgb(0,0,0,0.04)] cursor-pointer transition-all duration-300"
                   role="link" tabindex="0" [attr.aria-label]="'Abrir perfil de ' + client.name"
                   (click)="viewProfile(client.id)" (keydown.enter)="viewProfile(client.id)">
                
                <!-- VIP Shimmer Overlay -->
                @if (client.tag === 'Vip') {
                  <div class="absolute inset-0 -translate-x-full group-hover:animate-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 z-0 rounded-3xl pointer-events-none transition-all duration-1000"></div>
                }

                <div class="relative z-10 flex flex-col h-full">
                  <div class="flex items-start justify-between mb-4">
                    <div class="flex items-center gap-3">
                      <div class="w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-xl sm:text-2xl shrink-0 shadow-inner border border-white transition-transform group-hover:scale-110 group-hover:-rotate-3"
                           [class]="getAvatarClass(client.tag)">
                        {{ getAvatarEmoji(client.tag) }}
                      </div>
                      <div class="min-w-0">
                        <p class="font-black text-pink-900 text-base sm:text-lg leading-tight truncate font-display">{{ client.name }}</p>
                        <div class="flex items-center gap-1.5 mt-1">
                          <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm" [class]="getTagBadgeClass(client.tag)">
                            {{ getTagLabel(client.tag) }}
                          </span>
                          @if (client.type) {
                            <span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest bg-purple-50 text-purple-600 shadow-sm border border-purple-100">
                              {{ client.type }}
                            </span>
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Contact Details (Phone & Address) -->
                  <div class="bg-gray-50/50 rounded-2xl p-2.5 sm:p-3 space-y-2 mb-3 sm:mb-4 border border-gray-100 flex-1">
                    <!-- Phone -->
                    <div class="flex items-center gap-2 text-xs">
                      <div class="w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center shrink-0 text-[10px]">📱</div>
                      @if (client.phone) {
                        <span class="font-mono font-bold text-pink-700">{{ client.phone }}</span>
                      } @else {
                        <span class="text-gray-400 font-medium italic">Sin teléfono...</span>
                      }
                    </div>
                    <!-- Address -->
                    <div class="flex gap-2 text-xs">
                      <div class="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-[10px]">📍</div>
                      @if (client.address) {
                        <span class="text-blue-800/80 font-medium leading-tight line-clamp-2 mt-0.5" [title]="client.address">{{ client.address }}</span>
                      } @else {
                        <span class="text-gray-400 font-medium italic mt-0.5">Sin dirección guardada...</span>
                      }
                    </div>
                  </div>

                  <!-- Stats Footer -->
                  <div class="flex items-end justify-between pt-3 border-t border-pink-50">
                    <div>
                      <p class="text-[9px] uppercase font-bold text-pink-400 tracking-wider mb-0.5">Pedidos</p>
                      <p class="font-bold text-pink-700 flex items-center gap-1">
                        <span class="text-base leading-none">{{ client.ordersCount }}</span>
                        <span class="text-[10px] bg-pink-100 text-pink-600 px-1 rounded">📦</span>
                      </p>
                    </div>
                    <div class="text-right">
                      <p class="text-[9px] uppercase font-bold text-pink-400 tracking-wider mb-0.5">Inversión (Total)</p>
                      <p class="text-xl font-black text-pink-900 leading-none drop-shadow-sm font-display">{{ client.totalSpent | currency:'MXN':'symbol-narrow':'1.0-0' }}</p>
                    </div>
                  </div>
                </div>
              </div>
            }
          </div>

          @if (filteredClients().length === 0) {
            <div class="bg-white/50 backdrop-blur-md rounded-3xl p-16 text-center shadow-inner border border-white mt-10">
              <div class="text-6xl mb-4 animate-bounce-slow drop-shadow-md">🦋</div>
              <h3 class="text-2xl font-black text-pink-900 font-display mb-2">No se encontraron clientas</h3>
              <p class="text-pink-500 font-medium">Intenta ajustando los filtros mágicos de búsqueda ✨</p>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .client-filter-controls {
      display: grid;
      min-width: 0;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      align-items: center;
    }

    .client-filter-search {
      grid-column: 1 / -1;
      min-width: 0;
      width: 100%;
    }

    .client-filter-input,
    .client-filter-select {
      box-sizing: border-box;
      min-width: 0;
      min-height: 48px;
    }

    .client-filter-input { width: 100%; }
    .client-filter-select { width: 100%; padding-right: 2rem; }

    @media (max-width: 380px) {
      .client-filter-controls { grid-template-columns: minmax(0, 1fr); }
    }

    @media (min-width: 640px) {
      .client-filter-controls { display: flex; flex-wrap: wrap; }
      .client-filter-search { flex: 1 1 250px; width: auto; min-width: 250px; }
      .client-filter-select-tags { width: 12rem; }
      .client-filter-select-type { width: 11rem; }
    }
  `]
})
export class ClientsComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private router = inject(Router);
  protected theme = inject(ThemeService);

  clients = signal<ClientDto[]>([]);
  loading = signal(true);
  
  // Use signals for filters to make them reactive
  search = signal('');
  tagFilter = signal('');
  typeFilter = signal('');
  currentPage = signal(1);
  readonly clientPageSize = 15;

  // Computed signal for filtered clients
  filteredClients = computed(() => {
    const clients = this.clients();
    const searchTerm = this.normalizeSearch(this.search());
    const searchDigits = searchTerm.replace(/\D/g, '');
    const tag = this.tagFilter().trim();
    const type = this.typeFilter().trim();

    return clients.filter(c => {
      // 1. Search filter
      const matchSearch = !searchTerm ||
        this.normalizeSearch(c.name).includes(searchTerm) ||
        (!!searchDigits && (c.phone ?? '').replace(/\D/g, '').includes(searchDigits)) ||
        this.normalizeSearch(c.address ?? '').includes(searchTerm);
      
      // 2. Tag filter (Case-insensitive)
      const matchTag = !tag || (c.tag && c.tag.toLowerCase() === tag.toLowerCase());
      
      // 3. Type filter (Case-insensitive + handle 'Nueva' as default)
      // If the filter is 'Nueva' and the client has no type, we consider it 'Nueva'
      const clientType = (c.type || '').trim();
      const matchType = !type || 
        (clientType.toLowerCase() === type.toLowerCase()) ||
        (type.toLowerCase() === 'nueva' && !clientType);

      return matchSearch && matchTag && matchType;
    });
  });
  clientPageCount = computed(() => Math.max(1, Math.ceil(this.filteredClients().length / this.clientPageSize)));
  visibleClients = computed(() => {
    const clients = this.filteredClients();
    const page = Math.min(this.currentPage(), this.clientPageCount());
    const start = (page - 1) * this.clientPageSize;
    return clients.slice(start, start + this.clientPageSize);
  });
  pageRangeStart = computed(() => this.filteredClients().length === 0
    ? 0
    : (Math.min(this.currentPage(), this.clientPageCount()) - 1) * this.clientPageSize + 1);
  pageRangeEnd = computed(() => Math.min(this.filteredClients().length, Math.min(this.currentPage(), this.clientPageCount()) * this.clientPageSize));

  constructor() {
    // Automatically trigger animation when filtered list changes
    effect(() => {
      const list = this.filteredClients();
      if (!this.loading() && list.length > 0) {
        // Increase timeout slightly to ensure Angular's @for has finished rendering
        setTimeout(() => this.animateList(), 50);
      }
    });
  }

  ngOnInit(): void {
    this.api.getClients().subscribe({
      next: (c) => {
        this.clients.set(c);
        this.currentPage.set(1);
        this.loading.set(false);
      },
      error: () => { 
        this.loading.set(false); 
        this.toast.error('Error al cargar clientas'); 
      }
    });
  }

  private animateList(): void {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    gsap.fromTo('.client-card-anim', { opacity: 0, y: 30 }, {
      opacity: 1,
      y: 0,
      duration: 0.35, // Accelerated from 0.6
      stagger: 0.02, // Accelerated from 0.05
      ease: 'back.out(1.2)', 
      overwrite: true
    });
  }

  viewProfile(id: number): void {
    this.router.navigate(['/admin/clients', id]);
  }

  private normalizeSearch(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.currentPage.set(1);
  }

  setTagFilter(value: string): void {
    this.tagFilter.set(value);
    this.currentPage.set(1);
  }

  setTypeFilter(value: string): void {
    this.typeFilter.set(value);
    this.currentPage.set(1);
  }

  goToClientPage(page: number): void {
    this.currentPage.set(Math.max(1, Math.min(page, this.clientPageCount())));
  }

  getTagLabel(tag: string): string { return CLIENT_TAG_LABELS[tag] || tag; }

  getAvatarEmoji(tag: string): string {
    const map: Record<string, string> = { 'Vip': '👑', 'RisingStar': '🚀', 'Blacklist': '🚫', 'None': '🌸' };
    return map[tag] || '🌸';
  }

  getAvatarClass(tag: string): string {
    const map: Record<string, string> = {
      'Vip': 'bg-amber-100', 'RisingStar': 'bg-blue-100', 'Blacklist': 'bg-red-100', 'None': 'bg-pink-100'
    };
    return map[tag] || 'bg-pink-100';
  }

  getTagBadgeClass(tag: string): string {
    const map: Record<string, string> = {
      'Vip': 'bg-amber-100 text-amber-700', 'RisingStar': 'bg-blue-100 text-blue-700',
      'Blacklist': 'bg-red-100 text-red-700', 'None': 'bg-pink-100 text-pink-700'
    };
    return map[tag] || 'bg-pink-100 text-pink-700';
  }
}
