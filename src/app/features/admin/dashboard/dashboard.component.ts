import { Component, inject, signal, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { DashboardDto } from '../../../core/models';
import { ThemeService } from '../../../core/services/theme.service';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  imports: [CurrencyPipe, RouterLink, DatePipe, DecimalPipe],
  template: `
    <div class="dashboard-container min-w-0 space-y-6 pb-10 lg:space-y-8">
      <!-- Hero del tenant con banner + nombre -->
      @if (theme.bannerUrl() || theme.name()) {
        <section class="tenant-hero card-coquette overflow-hidden">
          @if (theme.bannerUrl()) {
            <img [src]="theme.bannerUrl()" alt="Banner" class="tenant-banner">
          } @else {
            <div class="tenant-banner tenant-banner-fallback"></div>
          }
          <div class="tenant-hero-text">
            @if (theme.logoUrl()) {
              <img [src]="theme.logoUrl()" alt="Logo" class="tenant-logo">
            }
            <div>
              <p class="tenant-eyebrow">Tu negocio</p>
              <h2 class="tenant-name">{{ theme.name() || 'Mi negocio' }}</h2>
            </div>
          </div>
        </section>
      }

      <!-- Title -->
      <div class="dashboard-header">
        <h1 class="text-2xl lg:text-3xl font-bold" style="color: var(--brand-primary-900, #831843);">
          Dashboard
          <span class="text-2xl lg:text-3xl font-accent" style="color: var(--brand-primary-500, #ec4899);"> ✨ Resumen General</span>
        </h1>
      </div>

      @if (loading()) {
        <!-- Loading Shimmer -->
        <div class="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          @for (i of [1,2,3,4,5,6]; track i) {
            <div class="shimmer h-32 rounded-2xl"></div>
          }
        </div>
      } @else if (data()) {
        <!-- KPI Cards -->
        <div class="grid grid-cols-1 min-[380px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <!-- Total Orders -->
          <div class="kpi-card card-coquette p-5 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-20 h-20 bg-pink-100 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center text-xl">📦</span>
                <span class="text-xs font-semibold text-pink-800 uppercase tracking-wider">Pedidos Totales</span>
              </div>
              <p class="text-3xl font-bold text-pink-900 flex items-baseline gap-1 sm:text-4xl">
                <span>{{ data()?.totalOrders | number:'1.0-0' }}</span>
              </p>
              <div class="flex gap-3 mt-2 text-xs">
                <span class="text-green-800">✅ {{ data()!.deliveredOrders }} entregados</span>
                <span class="text-amber-800">⏳ {{ data()!.pendingOrders }} pendientes</span>
              </div>
            </div>
          </div>

          <!-- Revenue Today -->
          <div class="kpi-card card-coquette p-5 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-xl">💵</span>
                <span class="text-xs font-semibold text-green-800 uppercase tracking-wider">Ingresos Hoy</span>
              </div>
              <p class="text-3xl font-bold text-green-700 flex items-baseline gap-1 sm:text-4xl">
                <span class="text-2xl font-medium">$</span>
                <span>{{ data()?.revenueToday | number:'1.0-0' }}</span>
              </p>
            </div>
          </div>

          <!-- Revenue Month -->
          <div class="kpi-card card-coquette p-5 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-20 h-20 bg-purple-100 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-xl">💰</span>
                <span class="text-xs font-semibold text-purple-800 uppercase tracking-wider">Ingresos del Mes</span>
              </div>
              <p class="text-3xl font-bold text-purple-700 flex items-baseline gap-1 sm:text-4xl">
                <span class="text-2xl font-medium">$</span>
                <span>{{ data()?.revenueMonth | number:'1.0-0' }}</span>
              </p>
            </div>
          </div>

          <!-- Total Clients -->
          <div class="kpi-card card-coquette p-5 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-20 h-20 bg-rose-100 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-xl">👩‍💼</span>
                <span class="text-xs font-semibold text-rose-800 uppercase tracking-wider">Total Clientas</span>
              </div>
              <p class="text-3xl font-bold text-rose-700 flex items-baseline gap-1 sm:text-4xl">
                <span>{{ data()?.totalClients | number:'1.0-0' }}</span>
              </p>
              <div class="flex gap-3 mt-2 text-xs">
                <span class="text-pink-700">🌸 {{ data()!.clientsNueva }} nuevas</span>
                <span class="text-purple-800">👑 {{ data()!.clientsFrecuente }} frecuentes</span>
              </div>
            </div>
          </div>

          <!-- Active Routes -->
          <div class="kpi-card card-coquette p-5 relative overflow-hidden group">
            <div class="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">🚗</span>
                <span class="text-xs font-semibold text-blue-800 uppercase tracking-wider">Rutas Activas</span>
              </div>
              <p class="text-3xl font-bold text-blue-700 flex items-baseline gap-1 sm:text-4xl">
                <span>{{ data()?.activeRoutes | number:'1.0-0' }}</span>
              </p>
            </div>
          </div>

          <!-- Pending Amount -->
          <a routerLink="/admin/reports" [queryParams]="{ tab: 'porCobrar' }"
             class="kpi-card card-coquette p-5 relative overflow-hidden group block cursor-pointer hover:-translate-y-1 transition-transform">
            <div class="absolute top-0 right-0 w-20 h-20 bg-amber-100 rounded-full -translate-y-6 translate-x-6 group-hover:scale-150 transition-transform duration-500"></div>
            <div class="relative">
              <div class="flex items-center gap-2 mb-3">
                <span class="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl">💳</span>
                <span class="text-xs font-semibold text-amber-800 uppercase tracking-wider">Por Cobrar</span>
              </div>
              <p class="text-3xl font-bold text-amber-700 flex items-baseline gap-1 sm:text-4xl">
                <span class="text-2xl font-medium">$</span>
                <span>{{ data()?.pendingAmount | number:'1.0-0' }}</span>
              </p>
              <p class="text-xs font-semibold text-amber-800 mt-2 flex items-center gap-1">
                Ver lista para cobrar →
              </p>
            </div>
          </a>
        </div>

        <!-- Charts & Activity Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <!-- Monthly Sales Chart -->
          <div class="chart-container card-coquette p-6">
            <h3 class="text-base font-bold text-pink-900 mb-4 flex items-center gap-2">📈 Ventas por Mes</h3>
            <div class="relative h-64">
              <canvas #salesChart></canvas>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="recent-activity-card card-coquette p-6 relative overflow-hidden">
             <!-- Background Decal -->
             <div class="absolute -right-4 -bottom-4 text-8xl opacity-5 rotate-12 pointer-events-none">✨</div>
             
             <div class="flex items-center justify-between mb-4">
               <h3 class="text-base font-bold text-pink-900 flex items-center gap-2">🎀 Actividad Reciente</h3>
               <a routerLink="/admin/orders" class="text-xs font-bold text-pink-700 hover:text-pink-700 transition-colors uppercase tracking-widest">Ver todo</a>
             </div>

             <div class="recent-orders-list space-y-3">
               @for (order of data()?.recentOrders; track order.id) {
                 <div class="recent-order-item p-3 rounded-2xl bg-white/50 border border-pink-50 hover:border-pink-200 transition-all flex items-center justify-between group">
                   <div class="flex min-w-0 flex-1 items-center gap-3">
                     <div class="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-pink-100/50 group-hover:scale-110 transition-transform">
                       {{ getStatusEmoji(order.status) }}
                     </div>
                     <div class="min-w-0">
                       <p class="truncate text-sm font-bold leading-tight text-pink-900">{{ order.clientName }}</p>
                       <p class="truncate text-[10px] font-medium uppercase tracking-tighter text-pink-800">
                         {{ order.createdAt | date:'shortTime' }} • {{ order.orderType }}
                       </p>
                     </div>
                   </div>
                   <div class="shrink-0 text-right">
                     <p class="text-sm font-black text-pink-700">{{ order.total | currency:'MXN':'symbol-narrow':'1.0-0' }}</p>
                     <span class="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase" [class]="getStatusClass(order.status)">
                       {{ order.status }}
                     </span>
                   </div>
                 </div>
               } @empty {
                 <div class="flex flex-col items-center justify-center py-10 opacity-60">
                    <span class="text-4xl mb-2">🎀</span>
                    <p class="text-xs font-medium text-pink-800">Sin actividad reciente</p>
                 </div>
               }
             </div>
          </div>
        </div>

        <!-- Payment Methods & Quick Actions Row -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
           <!-- Payment Methods -->
           <div class="payment-methods-card card-coquette p-6">
            <h3 class="text-base font-bold text-pink-900 mb-4 flex items-center gap-2">💳 Métodos de Pago</h3>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div class="text-center p-3 rounded-xl bg-green-50 border border-green-100">
                <p class="text-2xl font-bold text-green-700">{{ data()!.totalCashOrders }}</p>
                <p class="text-xs text-green-800 font-medium">💵 Efectivo</p>
                <p class="text-sm font-semibold text-green-800">{{ data()!.totalCashAmount | currency:'MXN':'symbol-narrow':'1.0-0' }}</p>
              </div>
              <div class="text-center p-3 rounded-xl bg-blue-50 border border-blue-100">
                <p class="text-2xl font-bold text-blue-700">{{ data()!.totalTransferOrders }}</p>
                <p class="text-xs text-blue-800 font-medium">🏦 Transferencia</p>
                <p class="text-sm font-semibold text-blue-600">{{ data()!.totalTransferAmount | currency:'MXN':'symbol-narrow':'1.0-0' }}</p>
              </div>
              <div class="text-center p-3 rounded-xl bg-purple-50 border border-purple-100">
                <p class="text-2xl font-bold text-purple-700">{{ data()!.totalDepositOrders }}</p>
                <p class="text-xs text-purple-800 font-medium">💳 Otros</p>
                <p class="text-sm font-semibold text-purple-800">{{ data()!.totalDepositAmount | currency:'MXN':'symbol-narrow':'1.0-0' }}</p>
              </div>
            </div>
            <div class="flex gap-6 justify-center pt-2 border-t border-pink-100">
              <div class="text-center">
                <p class="text-xl font-bold text-pink-700">{{ data()!.ordersDelivery }}</p>
                <p class="text-xs text-pink-800">🚗 Domicilio</p>
              </div>
              <div class="text-center">
                <p class="text-xl font-bold text-purple-700">{{ data()!.ordersPickUp }}</p>
                <p class="text-xs text-purple-800">🏪 Recoger</p>
              </div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="grid grid-cols-2 gap-4">
            <a routerLink="/admin/orders"
              class="quick-action card-coquette p-4 text-center hover:shadow-xl transition-all group cursor-pointer">
              <span class="text-3xl block mb-2 group-hover:scale-110 transition-transform">📦</span>
              <span class="text-sm font-semibold text-pink-900">Pedidos</span>
            </a>
            <a routerLink="/admin/clients"
              class="quick-action card-coquette p-4 text-center hover:shadow-xl transition-all group cursor-pointer">
              <span class="text-3xl block mb-2 group-hover:scale-110 transition-transform">👩‍💼</span>
              <span class="text-sm font-semibold text-pink-900">Clientas</span>
            </a>
            <a routerLink="/admin/routes"
              class="quick-action card-coquette p-4 text-center hover:shadow-xl transition-all group cursor-pointer">
              <span class="text-3xl block mb-2 group-hover:scale-110 transition-transform">🚗</span>
              <span class="text-sm font-semibold text-pink-900">Rutas</span>
            </a>
            <a routerLink="/admin/reports"
              class="quick-action card-coquette p-4 text-center hover:shadow-xl transition-all group cursor-pointer">
              <span class="text-3xl block mb-2 group-hover:scale-110 transition-transform">📊</span>
              <span class="text-sm font-semibold text-pink-900">Reportes</span>
            </a>
          </div>
        </div>

      }
    </div>
  `,
  styles: [`
    .tenant-hero {
        position: relative;
        padding: 0;
        border-radius: 1.75rem;
        overflow: hidden;
        min-height: 160px;
        display: flex;
        align-items: flex-end;
        background: linear-gradient(135deg, var(--brand-primary-100, #fdf2f8), var(--brand-primary-200, #fce7f3));
        border: 1px solid rgba(236, 72, 153, 0.2);
    }
    @media (max-width: 639px) {
        .tenant-hero { min-height: 120px; }
        .tenant-hero-text { padding: 0.875rem 1rem; }
        .tenant-name { font-size: 1.25rem; }
        .tenant-logo { width: 48px; height: 48px; }
    }
    .tenant-banner {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    .tenant-banner-fallback {
        background:
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.4), transparent 50%),
            linear-gradient(135deg, var(--brand-primary-300, #f9a8d4), var(--brand-primary-500, #ec4899));
    }
    .tenant-hero-text {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        gap: 0.85rem;
        padding: 1.25rem 1.5rem;
        width: 100%;
        background: linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.35) 100%);
        color: white;
    }
    .tenant-logo {
        width: 56px;
        height: 56px;
        border-radius: 1rem;
        object-fit: cover;
        background: white;
        box-shadow: 0 6px 18px rgba(0, 0, 0, 0.25);
    }
    .tenant-eyebrow {
        font-size: 0.65rem;
        font-weight: 800;
        letter-spacing: 0.2em;
        text-transform: uppercase;
        opacity: 0.85;
        margin: 0;
    }
    .tenant-name {
        font-family: var(--font-headings);
        font-size: 1.6rem;
        font-weight: 900;
        margin: 0.1rem 0 0;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  protected theme = inject(ThemeService);

  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;

  data = signal<DashboardDto | null>(null);
  loading = signal(true);

  private chartInstance: Chart | null = null;

  ngOnInit(): void {
    this.loadDashboard();
  }

  getStatusEmoji(status: string): string {
    switch (status) {
      case 'Pending': return '⏳';
      case 'Confirmed': return '💖';
      case 'InRoute': return '🚗';
      case 'Delivered': return '✅';
      case 'Canceled': return '❌';
      default: return '📦';
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Pending': return 'bg-amber-100 text-amber-800';
      case 'Confirmed': return 'bg-pink-100 text-pink-700';
      case 'InRoute': return 'bg-blue-100 text-blue-800';
      case 'Delivered': return 'bg-green-100 text-green-800';
      case 'Canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-600';
    }
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.api.getDashboard().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        setTimeout(() => this.buildChart(d), 100);
      },
      error: () => this.loading.set(false)
    });
  }

  private buildChart(d: DashboardDto): void {
    if (!this.salesChartRef?.nativeElement || !d.salesByMonth?.length) return;

    if (this.chartInstance) this.chartInstance.destroy();

    const ctx = this.salesChartRef.nativeElement.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 250);
    gradient.addColorStop(0, 'rgba(236, 72, 153, 0.3)');
    gradient.addColorStop(1, 'rgba(236, 72, 153, 0.01)');

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: d.salesByMonth.map(s => s.month),
        datasets: [{
          label: 'Ventas',
          data: d.salesByMonth.map(s => s.sales),
          borderColor: '#ec4899',
          backgroundColor: gradient,
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 5,
          pointBackgroundColor: '#ec4899',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: this.prefersReducedMotion() ? false : { duration: 600 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#831843',
            titleFont: { family: 'Outfit' },
            bodyFont: { family: 'Outfit' },
            padding: 12,
            cornerRadius: 12,
            callbacks: {
              label: (c) => `$${Number(c.raw).toLocaleString('es-MX')}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#9d174d', font: { family: 'Outfit', size: 11 } }
          },
          y: {
            grid: { color: 'rgba(249, 168, 212, 0.15)' },
            ticks: {
              color: '#9d174d',
              font: { family: 'Outfit', size: 11 },
              callback: (v) => `$${Number(v).toLocaleString('es-MX')}`
            }
          }
        }
      }
    });
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}
