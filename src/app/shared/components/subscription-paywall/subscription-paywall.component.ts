import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BusinessBootstrapService } from '../../../core/services/business-bootstrap.service';
import { PlanTierName } from '../../../core/models';

@Component({
    selector: 'app-subscription-paywall',
    imports: [DatePipe, RouterLink],
    template: `
        <div class="paywall-backdrop" role="dialog" aria-modal="true" aria-labelledby="paywall-title">
            <div class="paywall-card">
                <div class="paywall-emoji">🔒</div>
                <p class="paywall-eyebrow">Suscripción bloqueada</p>
                <h2 id="paywall-title" class="paywall-title">
                    Tu cuenta está en pausa
                </h2>
                <p class="paywall-sub">
                    Elige un plan y completa el pago para volver a entrar al panel.
                    Tus datos (pedidos, clientas, rutas) están intactos.
                </p>

                @if (bootstrap.trialEndsAt()) {
                    <p class="paywall-meta">
                        La prueba terminó el
                        <strong>{{ bootstrap.trialEndsAt() | date: 'longDate' }}</strong>.
                    </p>
                } @else if (bootstrap.currentPeriodEndsAt()) {
                    <p class="paywall-meta">
                        El periodo pagado terminó el
                        <strong>{{ bootstrap.currentPeriodEndsAt() | date: 'longDate' }}</strong>.
                    </p>
                }

                <div class="paywall-actions">
                    <a
                        [routerLink]="['/admin/subscription/checkout']"
                        [queryParams]="{ plan: recommendedPlan, periodicity: 'monthly' }"
                        class="btn-coquette paywall-cta">
                        Pagar y entrar 💖
                    </a>
                    <a routerLink="/admin/subscription" class="paywall-secondary">
                        Ver todos los planes
                    </a>
                    <button
                        type="button"
                        class="paywall-tertiary"
                        (click)="refresh()">
                        Ya pagué · Verificar
                    </button>
                </div>

                <p class="paywall-foot">
                    ¿Necesitas ayuda? Escríbenos desde la sección de soporte.
                </p>
            </div>
        </div>
    `,
    styles: [`
        :host { display: contents; }
        .paywall-backdrop {
            position: fixed;
            inset: 0;
            z-index: 60;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background:
                radial-gradient(120% 120% at 50% 0%, rgba(255, 228, 235, 0.85) 0%, rgba(253, 242, 248, 0.92) 60%, rgba(252, 231, 243, 0.96) 100%);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            animation: fadeIn 0.3s ease;
        }
        .paywall-card {
            max-width: 480px;
            width: 100%;
            background: white;
            border: 1px solid rgba(244, 114, 182, 0.25);
            border-radius: 2rem;
            padding: 2.5rem 2rem;
            text-align: center;
            box-shadow:
                0 30px 80px -20px rgba(190, 24, 93, 0.35),
                0 0 0 1px rgba(255, 255, 255, 0.4) inset;
            animation: pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .paywall-emoji {
            font-size: 3.5rem;
            margin-bottom: 0.5rem;
            animation: shake 2s ease-in-out infinite;
        }
        .paywall-eyebrow {
            color: #ec4899;
            font-weight: 800;
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            margin: 0;
        }
        .paywall-title {
            font-family: var(--font-headings);
            color: #831843;
            font-size: 1.75rem;
            margin: 0.5rem 0;
        }
        .paywall-sub {
            color: #9d174d;
            font-size: 0.95rem;
            margin: 0 0 1rem;
            line-height: 1.5;
        }
        .paywall-meta {
            color: #be185d;
            background: #fdf2f8;
            border-radius: 0.75rem;
            padding: 0.5rem 0.75rem;
            font-size: 0.85rem;
            margin: 0 0 1.5rem;
        }
        .paywall-actions {
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .paywall-cta {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            border: none;
            padding: 0.9rem 1.5rem;
            border-radius: 999px;
            font-weight: 800;
            font-size: 1rem;
            cursor: pointer;
            box-shadow: 0 12px 24px -10px rgba(190, 24, 93, 0.5);
        }
        .paywall-cta:hover { transform: translateY(-1px); }
        .paywall-secondary {
            background: transparent;
            border: 1px solid rgba(244, 114, 182, 0.4);
            color: #9d174d;
            padding: 0.7rem 1rem;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            text-align: center;
        }
        .paywall-secondary:hover { background: #fdf2f8; }
        .paywall-tertiary {
            background: transparent;
            border: none;
            color: #be185d;
            padding: 0.4rem 0.6rem;
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            text-decoration: underline;
            text-underline-offset: 3px;
        }
        .paywall-foot {
            color: #be185d;
            font-size: 0.75rem;
            margin: 1.5rem 0 0;
            opacity: 0.75;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes pop {
            from { opacity: 0; transform: scale(0.92) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shake {
            0%, 100% { transform: translateY(0) rotate(0); }
            25% { transform: translateY(-2px) rotate(-4deg); }
            75% { transform: translateY(-2px) rotate(4deg); }
        }
    `],
})
export class SubscriptionPaywallComponent {
    protected bootstrap = inject(BusinessBootstrapService);
    private router = inject(Router);

    protected readonly recommendedPlan: PlanTierName = 'Pro';

    protected goToPlans(): void {
        this.router.navigate(['/admin/subscription']);
    }

    protected refresh(): void {
        this.bootstrap.refresh();
    }
}
