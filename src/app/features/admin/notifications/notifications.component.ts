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
        <div class="notifications-page">
            <header class="page-header">
                <div class="header-copy">
                    <span class="eyebrow">Centro de actividad</span>
                    <h1>Todo bajo control <span aria-hidden="true">♡</span></h1>
                    <p>Alertas importantes de tu tienda, pedidos y operación diaria.</p>
                </div>
                <button class="secondary-button" type="button" [disabled]="!unreadCount()" (click)="markAllRead()">
                    Marcar todo como leído
                </button>
            </header>

            <section class="summary card" aria-label="Resumen de notificaciones">
                <div class="summary-icon" aria-hidden="true">⌁</div>
                <div class="summary-count"><strong>{{ unreadCount() }}</strong><span>sin leer</span></div>
                <p>Las notificaciones se sincronizan con tu cuenta para que no pierdas ningún pendiente.</p>
            </section>

            @if (loading()) {
                <div class="loading card" role="status">Cargando actividad…</div>
            } @else if (notifications().length) {
                <section class="notification-list" aria-label="Notificaciones">
                    @for (notification of notifications(); track notification.id) {
                        <article class="notification card" [class.unread]="!notification.readAt">
                            <div class="notification-icon" aria-hidden="true">{{ iconFor(notification.tag) }}</div>
                            <div class="notification-copy">
                                <div class="notification-top">
                                    <h2>{{ notification.title }}</h2>
                                    <time>{{ notification.createdAt | date:'d MMM, h:mm a' }}</time>
                                </div>
                                <p>{{ notification.message }}</p>
                                <div class="notification-actions">
                                    @if (notification.orderId) {
                                        <a routerLink="/admin/orders" class="notification-link">
                                            Ver pedido #{{ notification.orderId }} <span aria-hidden="true">→</span>
                                        </a>
                                    }
                                    @if (!notification.readAt) {
                                        <button class="mark-read-button" type="button" (click)="markRead(notification)">
                                            Marcar como leída
                                        </button>
                                    }
                                </div>
                            </div>
                            @if (!notification.readAt) {
                                <span class="unread-dot" role="img" aria-label="Sin leer"></span>
                            }
                        </article>
                    }
                </section>
            } @else {
                <section class="empty card" aria-live="polite">
                    <div aria-hidden="true">✦</div>
                    <h2>Todo al día</h2>
                    <p>No tienes notificaciones nuevas por ahora.</p>
                </section>
            }
        </div>
    `,
    styles: [`
        :host { display: block; min-width: 0; }
        .notifications-page { width: 100%; min-width: 0; max-width: 1100px; padding-bottom: 3rem; }
        .page-header { display: flex; align-items: end; justify-content: space-between; gap: 1rem; margin: .75rem 0 1.7rem; }
        .header-copy { min-width: 0; }
        .eyebrow { display: block; color: var(--app-pink, #c62e70); font-size: .68rem; font-weight: 800; letter-spacing: .16em; text-transform: uppercase; }
        h1, h2, p { margin: 0; }
        h1 { margin-top: .35rem; color: var(--app-ink, #66324f); font-size: 1.9rem; font-weight: 800; letter-spacing: -.04em; line-height: 1.2; }
        h1 span { color: var(--app-pink, #c62e70); }
        .page-header p { margin-top: .45rem; color: var(--app-muted, #80546b); font-size: .9rem; line-height: 1.5; }
        .card { min-width: 0; border: 1px solid var(--app-line, #f3cade); border-radius: 1.35rem; background: var(--app-paper, #fffafd); box-shadow: 0 8px 24px rgba(102, 50, 79, .08); }
        .secondary-button, .mark-read-button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: .65rem 1rem; border: 1px solid var(--app-line, #f3cade); border-radius: .9rem; color: var(--app-ink, #66324f); background: var(--app-surface, #fff3f9); font: 700 .78rem 'Quicksand', sans-serif; text-align: center; text-decoration: none; cursor: pointer; }
        .secondary-button:focus-visible, .mark-read-button:focus-visible, .notification-link:focus-visible { outline: 3px solid var(--app-focus, rgba(198, 46, 112, .2)); outline-offset: 2px; }
        .secondary-button:disabled { opacity: .5; cursor: default; }
        .summary { display: flex; min-width: 0; align-items: center; gap: .85rem; padding: 1rem 1.2rem; margin-bottom: 1rem; background: var(--app-surface, #fff3f9); }
        .summary-icon { display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 2.75rem; place-items: center; border-radius: .9rem; color: var(--app-pink, #c62e70); background: var(--app-paper, #fffafd); font-size: 1.3rem; }
        .summary-count { flex: 0 0 auto; }
        .summary strong { display: block; color: var(--app-ink, #66324f); font-size: 1.2rem; line-height: 1; }
        .summary span { color: var(--app-muted, #80546b); font-size: .7rem; }
        .summary p { max-width: 58ch; margin-left: auto; color: var(--app-muted, #80546b); font-size: .75rem; line-height: 1.5; }
        .notification-list { display: grid; min-width: 0; gap: .7rem; }
        .notification { display: flex; min-width: 0; align-items: flex-start; gap: .85rem; padding: 1rem 1.1rem; }
        .notification.unread { border-color: var(--app-pink-soft, #ffd5e8); background: #fff5fa; }
        .notification-icon { display: grid; width: 2.75rem; height: 2.75rem; flex: 0 0 2.75rem; place-items: center; border-radius: .9rem; color: var(--app-pink, #c62e70); background: var(--app-surface, #fff3f9); font-size: 1.1rem; }
        .notification-copy { flex: 1; min-width: 0; }
        .notification-top { display: flex; min-width: 0; align-items: baseline; justify-content: space-between; gap: .7rem; }
        .notification h2 { min-width: 0; color: var(--app-ink, #66324f); font-size: .9rem; font-weight: 800; overflow-wrap: anywhere; }
        .notification time { flex: 0 1 auto; color: var(--app-muted, #80546b); font-size: .68rem; text-align: right; }
        .notification p { margin-top: .3rem; color: var(--app-muted, #80546b); font-size: .8rem; line-height: 1.55; overflow-wrap: anywhere; }
        .notification-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; margin-top: .45rem; }
        .notification-link { display: inline-flex; min-height: 44px; align-items: center; gap: .35rem; color: var(--app-pink, #c62e70); font-size: .76rem; font-weight: 800; text-decoration: none; }
        .mark-read-button { min-height: 44px; font-size: .72rem; }
        .unread-dot { width: .55rem; height: .55rem; flex: 0 0 .55rem; margin-top: .45rem; border-radius: 50%; background: var(--app-pink, #c62e70); }
        .loading, .empty { padding: 3.5rem 1rem; color: var(--app-muted, #80546b); text-align: center; font-size: .82rem; }
        .empty div { color: var(--app-pink, #c62e70); font-size: 2rem; }
        .empty h2 { margin-top: .5rem; color: var(--app-ink, #66324f); font-size: 1rem; font-weight: 800; }
        .empty p { margin-top: .3rem; font-size: .78rem; }
        @media (max-width: 640px) {
            .notifications-page { padding-bottom: 1.5rem; }
            .page-header { align-items: stretch; flex-direction: column; margin-bottom: 1rem; }
            h1 { font-size: 1.65rem; }
            .secondary-button { width: 100%; }
            .summary { align-items: flex-start; flex-wrap: wrap; padding: .9rem; }
            .summary p { width: 100%; margin-left: 0; }
            .notification { gap: .65rem; padding: .85rem; }
            .notification-icon { width: 2.5rem; height: 2.5rem; flex-basis: 2.5rem; }
            .notification-top { align-items: flex-start; flex-direction: column; gap: .2rem; }
            .notification-actions { align-items: stretch; flex-direction: column; }
            .notification-link, .mark-read-button { width: 100%; justify-content: center; }
        }
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
