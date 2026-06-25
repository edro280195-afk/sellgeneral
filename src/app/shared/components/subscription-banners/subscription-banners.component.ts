import { Component, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BusinessBootstrapService } from '../../../core/services/business-bootstrap.service';

@Component({
    selector: 'app-subscription-banners',
    imports: [DatePipe, RouterLink],
    template: `
        <div class="banners-stack">
            @if (showTrial()) {
                <div class="banner banner-trial" role="status">
                    <span class="banner-icon">✨</span>
                    <div class="banner-text">
                        <p class="banner-title">
                            Estás en prueba Pro
                            <span class="banner-meta">
                                · {{ bootstrap.daysLeft() }}
                                {{ bootstrap.daysLeft() === 1 ? 'día restante' : 'días restantes' }}
                            </span>
                        </p>
                        <p class="banner-sub">
                            Cuando termine, tu cuenta se bloquea hasta que elijas un plan.
                        </p>
                    </div>
                    <a routerLink="/admin/subscription" class="banner-cta">Ver planes</a>
                </div>
            }

            @if (showPastDue()) {
                <div class="banner banner-pastdue" role="alert">
                    <span class="banner-icon">⚠️</span>
                    <div class="banner-text">
                        <p class="banner-title">
                            Pago atrasado
                            <span class="banner-meta">
                                · {{ bootstrap.pastDueGraceDays() }} días de gracia
                            </span>
                        </p>
                        <p class="banner-sub">
                            Actualiza tu método de pago antes de que se agote la gracia o
                            tu cuenta quedará bloqueada.
                        </p>
                    </div>
                    <a routerLink="/admin/subscription" class="banner-cta">Actualizar pago</a>
                </div>
            }

            @if (showPendingPlan()) {
                <div class="banner banner-pending" role="status">
                    <span class="banner-icon">⏳</span>
                    <div class="banner-text">
                        <p class="banner-title">
                            Cambio de plan programado
                        </p>
                        <p class="banner-sub">
                            El {{ bootstrap.pendingPlanEffectiveAt() | date: 'longDate' }}
                            pasarás a <strong>{{ bootstrap.pendingPlanTier() }}</strong>.
                        </p>
                    </div>
                    <a routerLink="/admin/subscription" class="banner-cta">Revisar</a>
                </div>
            }
        </div>
    `,
    styles: [`
        :host { display: block; }
        .banners-stack {
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding: 0 0 1rem;
        }
        .banner {
            display: flex;
            align-items: center;
            gap: 1rem;
            padding: 0.85rem 1.25rem;
            border-radius: 1rem;
            border: 1px solid rgba(244, 114, 182, 0.2);
            background: white;
            box-shadow: 0 8px 24px -12px rgba(244, 114, 182, 0.3);
        }
        .banner-icon { font-size: 1.5rem; }
        .banner-text { flex: 1; }
        .banner-title {
            font-weight: 800;
            color: #831843;
            margin: 0;
            line-height: 1.2;
        }
        .banner-meta {
            color: #be185d;
            font-weight: 700;
            font-size: 0.85rem;
        }
        .banner-sub {
            color: #9d174d;
            font-size: 0.85rem;
            margin: 0.15rem 0 0;
        }
        .banner-cta {
            flex-shrink: 0;
            text-decoration: none;
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.8rem;
            box-shadow: 0 6px 14px rgba(190, 24, 93, 0.3);
            transition: transform 0.2s ease;
        }
        .banner-cta:hover { transform: translateY(-1px); }

        .banner-trial { background: linear-gradient(135deg, #fdf2f8, #fce7f3); }
        .banner-pastdue {
            background: linear-gradient(135deg, #fffbeb, #fef3c7);
            border-color: rgba(245, 158, 11, 0.3);
        }
        .banner-pastdue .banner-cta {
            background: linear-gradient(135deg, #f59e0b, #b45309);
            box-shadow: 0 6px 14px rgba(180, 83, 9, 0.3);
        }
        .banner-pending {
            background: linear-gradient(135deg, #eff6ff, #dbeafe);
            border-color: rgba(59, 130, 246, 0.3);
        }
        .banner-pending .banner-title { color: #1e3a8a; }
        .banner-pending .banner-sub { color: #1e40af; }
        .banner-pending .banner-cta {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            box-shadow: 0 6px 14px rgba(29, 78, 216, 0.3);
        }

        @media (max-width: 640px) {
            .banner { flex-wrap: wrap; }
            .banner-cta { width: 100%; text-align: center; }
        }
    `],
})
export class SubscriptionBannersComponent {
    protected bootstrap = inject(BusinessBootstrapService);

    protected showTrial = computed(() => {
        const status = this.bootstrap.subscriptionStatus();
        return status === 'Trialing' && this.bootstrap.daysLeft() > 0;
    });

    protected showPastDue = computed(() => {
        return this.bootstrap.subscriptionStatus() === 'PastDue';
    });

    protected showPendingPlan = computed(() => {
        return (
            !!this.bootstrap.pendingPlanTier() &&
            !!this.bootstrap.pendingPlanEffectiveAt() &&
            !this.bootstrap.isLocked()
        );
    });
}
