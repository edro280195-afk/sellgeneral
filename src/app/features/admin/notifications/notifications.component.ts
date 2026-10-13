import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { BuyerNotificationDto } from '../../../core/models';

@Component({
    selector: 'app-notifications',
    standalone: true,
    imports: [CommonModule, RouterLink],
    template: `
        <div class="notifications-page"><header class="page-header"><div><span class="eyebrow">Centro de actividad</span><h1>Todo bajo control <span>♡</span></h1><p>Alertas importantes de tu tienda, pedidos y operación diaria.</p></div><button class="secondary-button" type="button" [disabled]="!unreadCount()" (click)="markAllRead()">Marcar todo como leído</button></header><section class="summary card"><div class="summary-icon">⌁</div><div><strong>{{ unreadCount() }}</strong><span>sin leer</span></div><p>Las notificaciones se sincronizan con tu cuenta para que no pierdas ningún pendiente.</p></section>@if (loading()) {<div class="loading card">Cargando actividad…</div>} @else if (notifications().length) {<section class="notification-list">@for (notification of notifications(); track notification.id) {<article class="notification card" [class.unread]="!notification.readAt" (click)="markRead(notification)"><div class="notification-icon">{{ iconFor(notification.tag) }}</div><div class="notification-copy"><div class="notification-top"><h2>{{ notification.title }}</h2><time>{{ notification.createdAt | date:'d MMM, h:mm a' }}</time></div><p>{{ notification.message }}</p>@if (notification.orderId) {<a routerLink="/admin/orders" class="notification-link" (click)="$event.stopPropagation()">Ver pedido #{{ notification.orderId }} →</a>}</div>@if (!notification.readAt) {<span class="unread-dot"></span>}</article>}</section>} @else {<section class="empty card"><div>✦</div><h2>Todo al día</h2><p>No tienes notificaciones nuevas por ahora.</p></section>}</div>
    `,
    styles: [`
        :host{display:block}.notifications-page{max-width:1100px;padding-bottom:3rem}.page-header{display:flex;align-items:end;justify-content:space-between;gap:1rem;margin:.75rem 0 1.7rem}.eyebrow,.section-kicker{display:block;color:#c00058;font-size:.68rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}h1,h2,p{margin:0}h1{margin-top:.35rem;color:#421536;font-size:clamp(1.8rem,3vw,2.55rem);font-weight:800;letter-spacing:-.05em}h1 span{color:#ff0072}.page-header p{margin-top:.45rem;color:#8d7185;font-size:.9rem}.card{border:1px solid rgba(255,0,114,.1);border-radius:1.45rem;background:rgba(255,255,255,.79);box-shadow:0 18px 50px -28px rgba(77,16,59,.3);backdrop-filter:blur(18px)}.secondary-button{display:inline-flex;align-items:center;justify-content:center;padding:.78rem 1.1rem;color:#b00050;border:1px solid rgba(255,0,114,.18);border-radius:.85rem;background:#fff;font:700 .78rem Poppins;cursor:pointer}.secondary-button:disabled{opacity:.45;cursor:default}.summary{display:flex;align-items:center;gap:.85rem;padding:1rem 1.2rem;margin-bottom:1rem;background:linear-gradient(135deg,#fff0f6,#fffafd)}.summary-icon{display:grid;place-items:center;width:2.5rem;height:2.5rem;color:#ff0072;border-radius:.8rem;background:#fff;font-size:1.3rem}.summary strong{display:block;color:#4d193c;font-size:1.2rem;line-height:1}.summary span{color:#9b7890;font-size:.68rem}.summary p{margin-left:auto;color:#a17f95;font-size:.72rem}.notification-list{display:grid;gap:.7rem}.notification{position:relative;display:flex;align-items:flex-start;gap:.9rem;padding:1rem 1.1rem;cursor:pointer;transition:transform .2s ease,border-color .2s ease}.notification:hover{transform:translateY(-2px);border-color:rgba(255,0,114,.24)}.notification.unread{border-left:3px solid #ff0072;background:linear-gradient(100deg,#fff4f8,rgba(255,255,255,.8))}.notification-icon{display:grid;place-items:center;width:2.45rem;height:2.45rem;flex:none;color:#c00058;border-radius:.8rem;background:#fff0f6;font-size:1.1rem}.notification-copy{flex:1;min-width:0}.notification-top{display:flex;align-items:baseline;justify-content:space-between;gap:1rem}.notification h2{color:#562443;font-size:.85rem;font-weight:800}.notification time{flex:none;color:#aa879a;font-size:.65rem}.notification p{margin-top:.3rem;color:#8e6c82;font-size:.75rem;line-height:1.55}.notification-link{display:inline-block;margin-top:.5rem;color:#c00058;font-size:.7rem;font-weight:800;text-decoration:none}.unread-dot{width:.48rem;height:.48rem;margin-top:.35rem;flex:none;border-radius:50%;background:#ff0072;box-shadow:0 0 0 4px rgba(255,0,114,.1)}.loading,.empty{padding:3.5rem 1rem;color:#a38295;text-align:center;font-size:.8rem}.empty div{color:#ff0072;font-size:2rem}.empty h2{margin-top:.5rem;color:#52203f;font-size:1rem;font-weight:800}.empty p{margin-top:.3rem;font-size:.75rem}@media(max-width:640px){.page-header{align-items:stretch;flex-direction:column}.summary{align-items:flex-start;flex-wrap:wrap}.summary p{width:100%;margin-left:0}}
    `]
})
export class NotificationsComponent implements OnInit {
    private readonly api = inject(ApiService);
    private readonly toast = inject(ToastService);
    readonly notifications = signal<BuyerNotificationDto[]>([]);
    readonly unreadCount = signal(0);
    readonly loading = signal(true);

    ngOnInit(): void {
        this.api.getNotifications('seller').subscribe({ next: items => { this.notifications.set(items); this.unreadCount.set(items.filter(item => !item.readAt).length); this.loading.set(false); }, error: () => { this.loading.set(false); this.toast.error('No pudimos cargar tus notificaciones.'); } });
    }

    markRead(notification: BuyerNotificationDto): void {
        if (notification.readAt) return;
        this.api.markNotificationRead(notification.id).subscribe({ next: () => { this.notifications.update(items => items.map(item => item.id === notification.id ? { ...item, readAt: new Date().toISOString() } : item)); this.unreadCount.update(count => Math.max(0, count - 1)); } });
    }

    markAllRead(): void {
        this.api.markAllNotificationsRead('seller').subscribe({ next: () => { const now = new Date().toISOString(); this.notifications.update(items => items.map(item => ({ ...item, readAt: item.readAt || now }))); this.unreadCount.set(0); this.toast.success('Actividad marcada como leída.'); } });
    }

    iconFor(tag: string): string { const icons: Record<string, string> = { OrderStatus: '📦', Delivery: '🚚', Payment: '✦', System: '🔔', default: '♡' }; return icons[tag] || icons['default']; }
}
