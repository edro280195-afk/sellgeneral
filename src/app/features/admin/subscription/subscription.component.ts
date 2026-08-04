import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe, NgClass } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BusinessBootstrapService } from '../../../core/services/business-bootstrap.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { ToastService } from '../../../core/services/toast.service';
import {
    PeriodicityName,
    PlanTierName,
    SubscriptionPlanPriceDto,
    SubscriptionPricingDto,
} from '../../../core/models';

type PeriodicityKey = 'monthly' | 'quarterly' | 'annual';

interface PeriodicityOption {
    key: PeriodicityKey;
    label: string;
    description: string;
    badge?: string;
}

interface PlanTheme {
    icon: string;
    accent: string;
    soft: string;
    tagline: string;
}

const PERIODICITIES: PeriodicityOption[] = [
    {
        key: 'monthly',
        label: 'Mensual',
        description: 'Cobro cada mes, sin compromiso.',
    },
    {
        key: 'quarterly',
        label: 'Trimestral',
        description: 'Paga 3 meses juntos.',
        badge: 'Ahorra 10%',
    },
    {
        key: 'annual',
        label: 'Anual',
        description: 'Paga los 12 meses del año.',
        badge: 'Ahorra 20%',
    },
];

const PLAN_THEMES: Record<string, PlanTheme> = {
    'Básico': {
        icon: '🌱',
        accent: '#7c3aed',
        soft: '#f3f0ff',
        tagline: 'Para empezar a vender y entregar.',
    },
    'Pro': {
        icon: '💖',
        accent: '#db2777',
        soft: '#fdf2f8',
        tagline: 'El favorito. Todo lo que necesita tu tienda.',
    },
    'Elite': {
        icon: '👑',
        accent: '#b45309',
        soft: '#fffbeb',
        tagline: 'C.A.M.I., tráfico en vivo y soporte prioritario.',
    },
};

@Component({
    selector: 'app-subscription',
    imports: [DatePipe, DecimalPipe, NgClass, RouterLink],
    template: `
        <div class="sub-page space-y-8 pb-12">
            <!-- ── HÉROE ── -->
            <header class="sub-hero">
                <div class="sub-hero-inner">
                    <div>
                        <p class="sub-eyebrow">Mi negocio</p>
                        <h1 class="sub-title">
                            Tu plan y suscripción <span class="font-accent text-pink-500">💖</span>
                        </h1>
                        <p class="sub-sub">
                            Esto es lo que incluye cada nivel. El precio lo fija la plataforma —
                            nunca lo escribimos a mano.
                        </p>
                    </div>
                    <div class="sub-plan-chip">
                        <span class="sub-plan-chip-dot"></span>
                        <div>
                            <p class="sub-plan-chip-label">Plan efectivo</p>
                            <p class="sub-plan-chip-value">{{ bootstrap.effectivePlan() }}</p>
                        </div>
                    </div>
                </div>
            </header>

            <!-- ── ESTADO ── -->
            <section class="sub-status">
                @if (bootstrap.loading() && !bootstrap.loaded()) {
                    <div class="sub-status-loading">
                        <div class="shimmer-dot"></div>
                        <p>Cargando estado de tu suscripción...</p>
                    </div>
                } @else if (bootstrap.error(); as err) {
                    <div class="sub-status-error">
                        <span class="sub-status-error-icon">😿</span>
                        <div>
                            <p class="font-bold text-pink-900">No pudimos cargar el estado</p>
                            <p class="text-sm opacity-80">{{ err }}</p>
                        </div>
                        <button class="sub-retry" (click)="bootstrap.refresh()">Reintentar</button>
                    </div>
                } @else {
                    <div class="sub-status-grid">
                        <div class="sub-tile">
                            <span class="sub-tile-icon">💎</span>
                            <div>
                                <p class="sub-tile-label">Plan efectivo</p>
                                <p class="sub-tile-value" [style.color]="planColor()">{{ bootstrap.effectivePlan() }}</p>
                                <p class="sub-tile-hint">{{ planTagline() }}</p>
                            </div>
                        </div>

                        <div class="sub-tile">
                            <span class="sub-tile-icon">🛡️</span>
                            <div>
                                <p class="sub-tile-label">Estado</p>
                                <span class="status-pill" [ngClass]="statusPillClass()">{{ statusLabel() }}</span>
                                <p class="sub-tile-hint">{{ statusHint() }}</p>
                            </div>
                        </div>

                        <div class="sub-tile">
                            <span class="sub-tile-icon">📅</span>
                            <div>
                                <p class="sub-tile-label">Próximo evento</p>
                                @if (nextEventLabel(); as lbl) {
                                    <p class="sub-tile-value">{{ lbl }}</p>
                                    <p class="sub-tile-hint">{{ nextEventIso() | date: 'fullDate' }}</p>
                                } @else {
                                    <p class="sub-tile-value">—</p>
                                    <p class="sub-tile-hint">Sin renovaciones programadas.</p>
                                }
                            </div>
                        </div>

                        <div class="sub-tile">
                            <span class="sub-tile-icon">⏳</span>
                            <div>
                                <p class="sub-tile-label">Cambio programado</p>
                                @if (bootstrap.pendingPlanTier(); as pending) {
                                    <p class="sub-tile-value">
                                        Pasará a <span class="text-pink-600">{{ pending }}</span>
                                    </p>
                                    <p class="sub-tile-hint">
                                        el {{ bootstrap.pendingPlanEffectiveAt() | date: 'longDate' }}
                                    </p>
                                } @else {
                                    <p class="sub-tile-value">Sin cambios</p>
                                    <p class="sub-tile-hint">Tu plan se queda como está.</p>
                                }
                            </div>
                        </div>
                    </div>

                    @if (bootstrap.isLocked()) {
                        <div class="sub-alert sub-alert-locked">
                            <div class="sub-alert-icon">🔒</div>
                            <div class="sub-alert-body">
                                <p class="sub-alert-title">Tu cuenta está bloqueada.</p>
                                <p class="sub-alert-sub">Elige un plan y completa el pago para volver a entrar al panel.</p>
                            </div>
                            <a
                                [routerLink]="['/admin/subscription/checkout']"
                                [queryParams]="{ plan: recommendedPlan, periodicity: 'monthly' }"
                                class="sub-alert-cta">
                                Ir a pagar 💳
                            </a>
                        </div>
                    } @else if (bootstrap.subscriptionStatus() === 'Trialing' && bootstrap.daysLeft() > 0) {
                        <div class="sub-alert sub-alert-trial">
                            <div class="sub-alert-icon">✨</div>
                            <div class="sub-alert-body">
                                <p class="sub-alert-title">
                                    Estás en prueba — te quedan {{ bootstrap.daysLeft() }}
                                    {{ bootstrap.daysLeft() === 1 ? 'día' : 'días' }} Pro.
                                </p>
                                <p class="sub-alert-sub">
                                    Cuando termine la prueba, tu cuenta se bloquea hasta que elijas un plan.
                                </p>
                            </div>
                        </div>
                    } @else if (bootstrap.subscriptionStatus() === 'PastDue') {
                        <div class="sub-alert sub-alert-pastdue">
                            <div class="sub-alert-icon">⚠️</div>
                            <div class="sub-alert-body">
                                <p class="sub-alert-title">
                                    Pago atrasado. Tienes {{ bootstrap.pastDueGraceDays() }} días de gracia
                                    para actualizar el método de pago.
                                </p>
                            </div>
                        </div>
                    }
                }
            </section>

            <!-- ── PLANES ── -->
            <section class="sub-plans">
                <div class="sub-plans-head">
                    <div>
                        <h2 class="sub-section-title">Elige tu plan</h2>
                        <p class="sub-section-sub">
                            Cambias o cancelas cuando quieras. El cargo es recurrente y seguro.
                        </p>
                    </div>

                    <div class="periodicity-toggle">
                        @for (opt of periodicities; track opt.key) {
                            <button
                                type="button"
                                class="period-btn"
                                [class.period-active]="periodicity() === opt.key"
                                (click)="setPeriodicity(opt.key)">
                                <span class="period-label">{{ opt.label }}</span>
                                @if (opt.badge) {
                                    <span class="period-badge">{{ opt.badge }}</span>
                                }
                            </button>
                        }
                    </div>
                </div>

                @if (pricing(); as p) {
                    <div class="plans-grid">
                        @for (plan of p.plans; track plan.planTier) {
                            <article
                                class="plan-card"
                                [class.plan-basico]="plan.planTier === 'Básico'"
                                [class.plan-pro]="plan.planTier === 'Pro'"
                                [class.plan-elite]="plan.planTier === 'Elite'"
                                [class.plan-current]="isCurrentPlan(plan.planTier)"
                                [class.plan-recommended]="plan.planTier === recommendedPlan"
                                [class.plan-locked]="!canPick(plan.planTier)"
                                [style.--plan-accent]="theme(plan.planTier).accent"
                                [style.--plan-soft]="theme(plan.planTier).soft">
                                @if (plan.planTier === recommendedPlan) {
                                    <span class="plan-flag">Más popular</span>
                                }
                                @if (isCurrentPlan(plan.planTier) && !bootstrap.isLocked()) {
                                    <span class="plan-current-badge">✦ Tu plan</span>
                                }

                                <header class="plan-head">
                                    <div class="plan-head-row">
                                        <span class="plan-icon">{{ theme(plan.planTier).icon }}</span>
                                        <div>
                                            <h3 class="plan-name">{{ plan.planTier }}</h3>
                                            <p class="plan-tag">{{ planTagline(plan.planTier) }}</p>
                                        </div>
                                    </div>
                                </header>

                                <div class="plan-price">
                                    <span class="plan-amount">&#36;{{ priceFor(plan) | number: '1.2-2' }}</span>
                                    <span class="plan-cycle">
                                        /{{ cycleLabel() }}
                                        @if (periodicity() === 'quarterly' && plan.quarterlyDiscountPct > 0) {
                                            <span class="plan-save">−{{ plan.quarterlyDiscountPct }}%</span>
                                        }
                                        @if (periodicity() === 'annual' && plan.annualDiscountPct > 0) {
                                            <span class="plan-save">−{{ plan.annualDiscountPct }}%</span>
                                        }
                                    </span>
                                    <span class="plan-currency">MXN</span>
                                </div>

                                <ul class="plan-features">
                                    @for (f of featuresFor(plan.planTier); track f.key) {
                                        <li [class.feature-off]="!f.enabled">
                                            <span class="feature-mark" [class.feature-off-mark]="!f.enabled">
                                                {{ f.enabled ? '✓' : '·' }}
                                            </span>
                                            <span class="feature-emoji">{{ f.emoji }}</span>
                                            <span class="feature-label">{{ f.label }}</span>
                                            @if (!f.enabled) {
                                                <span class="feature-required">{{ f.requiredPlan }}</span>
                                            }
                                        </li>
                                    }
                                </ul>

                                <div class="plan-cta">
                                    @if (isCurrentPlan(plan.planTier) && !bootstrap.isLocked()) {
                                        <button class="plan-btn plan-btn-current" disabled>
                                            ✦ Tu plan actual
                                        </button>
                                    } @else if (isPendingPlan(plan.planTier)) {
                                        <button class="plan-btn plan-btn-pending" disabled>
                                            Cambio programado
                                        </button>
                                    } @else {
                                        <button
                                            class="plan-btn"
                                            [class.plan-btn-primary]="plan.planTier === recommendedPlan || shouldUpgrade(plan.planTier)"
                                            [disabled]="actionInFlight() === plan.planTier"
                                            (click)="onChoose(plan)">
                                            @if (actionInFlight() === plan.planTier) {
                                                Procesando...
                                            } @else if (shouldUpgrade(plan.planTier)) {
                                                Elegir {{ plan.planTier }}
                                            } @else if (isDowngrade(plan.planTier)) {
                                                Bajar a {{ plan.planTier }}
                                            } @else {
                                                Volver a {{ plan.planTier }}
                                            }
                                        </button>
                                    }
                                </div>
                            </article>
                        }
                    </div>
                } @else if (loadingPricing()) {
                    <div class="plans-grid">
                        @for (i of [1,2,3]; track i) {
                            <div class="shimmer h-96 rounded-3xl"></div>
                        }
                    </div>
                } @else if (pricingError(); as err) {
                    <div class="sub-pricing-error">
                        <p>😿 No pudimos cargar los precios.</p>
                        <p class="opacity-70 text-sm mt-1">{{ err }}</p>
                        <button class="sub-retry mt-4" (click)="loadPricing()">Reintentar</button>
                    </div>
                }
            </section>

            <!-- ── ADMINISTRAR SUSCRIPCIÓN ── -->
            @if (hasActiveSubscription() && !bootstrap.isLocked()) {
                <section class="sub-manage">
                    <div class="sub-manage-head">
                        <div>
                            <p class="sub-eyebrow">Administrar</p>
                            <h2 class="sub-section-title">Tu suscripción</h2>
                            <p class="sub-section-sub">
                                Cambias de plan, periodicidad o cancelas. La cancelación deja tu cuenta
                                activa hasta el fin del periodo pagado.
                            </p>
                        </div>
                    </div>

                    <div class="sub-manage-grid">
                        <div class="sub-manage-tile">
                            <span class="sub-manage-icon">💎</span>
                            <p class="sub-manage-label">Plan actual</p>
                            <p class="sub-manage-value">{{ bootstrap.planTier() }}</p>
                            <p class="sub-manage-sub">Suscripción recurrente con Mercado Pago.</p>
                        </div>
                        <div class="sub-manage-tile">
                            <span class="sub-manage-icon">📆</span>
                            <p class="sub-manage-label">Próximo cobro</p>
                            <p class="sub-manage-value">
                                @if (bootstrap.currentPeriodEndsAt()) {
                                    {{ bootstrap.currentPeriodEndsAt() | date: 'longDate' }}
                                } @else {
                                    —
                                }
                            </p>
                            <p class="sub-manage-sub">Cargos automáticos con la tarjeta que diste de alta.</p>
                        </div>
                        <div class="sub-manage-tile">
                            <span class="sub-manage-icon">🛡️</span>
                            <p class="sub-manage-label">Estado</p>
                            <p class="sub-manage-value">{{ statusLabel() }}</p>
                            <p class="sub-manage-sub">{{ statusHint() }}</p>
                        </div>
                    </div>

                    <div class="sub-manage-actions">
                        <button
                            type="button"
                            class="sub-manage-btn sub-manage-primary"
                            [disabled]="actionInFlight() === 'checkout'"
                            (click)="goToCheckoutWithCurrent()">
                            Cambiar tarjeta o plan
                        </button>
                        <button
                            type="button"
                            class="sub-manage-btn sub-manage-danger"
                            [disabled]="actionInFlight() === 'cancel'"
                            (click)="onCancel()">
                            @if (actionInFlight() === 'cancel') {
                                Cancelando...
                            } @else {
                                Cancelar suscripción
                            }
                        </button>
                    </div>

                    @if (bootstrap.pendingPlanTier()) {
                        <p class="sub-manage-pending">
                            ⏳ Cambio programado a <strong>{{ bootstrap.pendingPlanTier() }}</strong>
                            el {{ bootstrap.pendingPlanEffectiveAt() | date: 'longDate' }}.
                        </p>
                    }
                </section>
            }

            <!-- ── FAQ ── -->
            <section class="sub-faq">
                <h3 class="sub-faq-title">Dudas frecuentes</h3>
                <details>
                    <summary>¿Cuándo me cobran?</summary>
                    <p>
                        Al elegir un plan se crea una suscripción recurrente. La primera fecha de cobro
                        se programa al final de tu prueba (si estás en trial) o al confirmar el pago.
                    </p>
                </details>
                <details>
                    <summary>¿Puedo cancelar?</summary>
                    <p>
                        Sí, en cualquier momento. Tu cuenta sigue activa hasta el final del periodo
                        pagado; después pasa a "Bloqueada" hasta que elijas otro plan.
                    </p>
                </details>
                <details>
                    <summary>¿Qué pasa cuando termina la prueba?</summary>
                    <p>
                        Tu cuenta se bloquea. Eliges un plan, pagas y vuelves a entrar — tus datos
                        (pedidos, clientas, rutas) están intactos.
                    </p>
                </details>
            </section>
        </div>
    `,
    styles: [`
        :host { display: block; }

        /* ═══════════ HÉROE ═══════════ */
        .sub-hero {
            position: relative;
            border-radius: 1.75rem;
            padding: 1.75rem 2rem;
            background:
                radial-gradient(120% 200% at 100% 0%, rgba(236,72,153,0.16) 0%, transparent 55%),
                radial-gradient(120% 200% at 0% 100%, rgba(139,92,246,0.14) 0%, transparent 55%),
                linear-gradient(135deg, rgba(255,255,255,0.92), rgba(253,242,248,0.9));
            border: 1px solid rgba(244,114,182,0.2);
            box-shadow: 0 18px 40px -24px rgba(190,24,93,0.3);
            overflow: hidden;
        }
        .sub-hero-inner {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 1.5rem;
            flex-wrap: wrap;
        }
        .sub-eyebrow {
            font-size: 0.7rem;
            font-weight: 800;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #ec4899;
            margin: 0 0 0.3rem;
        }
        .sub-title {
            font-family: var(--font-headings);
            font-size: clamp(1.7rem, 3.5vw, 2.5rem);
            color: #831843;
            margin: 0;
        }
        .sub-sub {
            color: #9d174d;
            font-size: 0.92rem;
            margin: 0.4rem 0 0;
            max-width: 520px;
        }
        .sub-plan-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.7rem;
            background: rgba(255,255,255,0.85);
            border: 1px solid rgba(249,168,212,0.4);
            border-radius: 1rem;
            padding: 0.7rem 1.1rem;
            box-shadow: 0 8px 20px -10px rgba(236,72,153,0.35);
        }
        .sub-plan-chip-dot {
            width: 12px;
            height: 12px;
            border-radius: 999px;
            background: linear-gradient(135deg, #ec4899, #be185d);
            box-shadow: 0 0 0 4px rgba(236,72,153,0.18);
        }
        .sub-plan-chip-label {
            font-size: 0.62rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #be185d;
            margin: 0;
        }
        .sub-plan-chip-value {
            font-family: var(--font-headings);
            font-size: 1.3rem;
            color: #831843;
            font-weight: 900;
            margin: 0;
            line-height: 1.1;
        }

        /* ═══════════ ESTADO ═══════════ */
        .sub-status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }
        .sub-tile {
            display: flex;
            gap: 0.85rem;
            padding: 1.1rem 1.2rem;
            background: rgba(255,255,255,0.85);
            border: 1px solid rgba(249,168,212,0.22);
            border-radius: 1.2rem;
            box-shadow: 0 8px 24px -16px rgba(236,72,153,0.25);
        }
        .sub-tile-icon {
            flex-shrink: 0;
            width: 42px;
            height: 42px;
            border-radius: 0.9rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            background: #fdf2f8;
            border: 1px solid rgba(249,168,212,0.3);
        }
        .sub-tile-label {
            font-size: 0.62rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #ec4899;
            margin: 0 0 0.2rem;
        }
        .sub-tile-value {
            font-family: var(--font-headings);
            font-size: 1.25rem;
            font-weight: 900;
            color: #831843;
            margin: 0;
            line-height: 1.2;
        }
        .sub-tile-hint {
            color: #9d174d;
            font-size: 0.78rem;
            margin: 0.15rem 0 0;
            opacity: 0.85;
        }
        .sub-status-loading {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: #9d174d;
            background: rgba(255,255,255,0.8);
            border-radius: 1.2rem;
            padding: 1.25rem 1.5rem;
        }
        .sub-status-error {
            display: flex;
            align-items: center;
            gap: 0.9rem;
            color: #b91c1c;
            background: #fff1f2;
            border: 1px solid rgba(244,114,182,0.3);
            border-radius: 1.2rem;
            padding: 1.1rem 1.4rem;
        }
        .sub-status-error-icon { font-size: 1.6rem; }
        .sub-retry {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            border: none;
            padding: 0.5rem 1.1rem;
            border-radius: 999px;
            font-weight: 800;
            font-size: 0.8rem;
            margin-left: auto;
            cursor: pointer;
        }
        .shimmer-dot {
            width: 1rem; height: 1rem; border-radius: 999px;
            background: linear-gradient(90deg, #fbcfe8, #f9a8d4, #fbcfe8);
            background-size: 200% 100%;
            animation: shimmer 1.4s linear infinite;
        }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.3rem 0.75rem;
            border-radius: 999px;
            font-weight: 800;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            margin: 0.15rem 0;
        }
        .pill-active { background: #dcfce7; color: #15803d; }
        .pill-trialing { background: #fce7f3; color: #be185d; }
        .pill-pastdue { background: #fef3c7; color: #b45309; }
        .pill-expired, .pill-canceled { background: #fee2e2; color: #b91c1c; }

        .sub-alert {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-top: 1rem;
            padding: 1rem 1.25rem;
            border-radius: 1.2rem;
            border: 1px solid rgba(244,114,182,0.25);
        }
        .sub-alert-locked { background: #fff1f2; }
        .sub-alert-trial { background: #fdf2f8; }
        .sub-alert-pastdue { background: #fffbeb; }
        .sub-alert-icon { font-size: 1.7rem; flex-shrink: 0; }
        .sub-alert-title { font-weight: 800; color: #831843; margin: 0; }
        .sub-alert-sub { color: #9d174d; font-size: 0.85rem; margin: 0.15rem 0 0; }
        .sub-alert-cta {
            flex-shrink: 0;
            margin-left: auto;
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            padding: 0.6rem 1.2rem;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 800;
            font-size: 0.85rem;
            box-shadow: 0 8px 18px rgba(190,24,93,0.3);
        }
        @media (max-width: 640px) {
            .sub-alert { flex-wrap: wrap; }
            .sub-alert-cta { width: 100%; text-align: center; margin-left: 0; }
        }

        /* ═══════════ PLANES ═══════════ */
        .sub-plans-head {
            display: flex;
            align-items: flex-end;
            justify-content: space-between;
            gap: 1.25rem;
            flex-wrap: wrap;
            margin-bottom: 1.4rem;
        }
        .sub-section-title {
            font-family: var(--font-headings);
            font-size: 1.7rem;
            color: #831843;
            margin: 0;
        }
        .sub-section-sub {
            color: #9d174d;
            font-size: 0.9rem;
            margin: 0.15rem 0 0;
        }

        .periodicity-toggle {
            display: inline-flex;
            padding: 0.3rem;
            background: rgba(255,255,255,0.9);
            border-radius: 999px;
            border: 1px solid rgba(244,114,182,0.25);
            box-shadow: 0 6px 18px rgba(244,114,182,0.12);
            gap: 0.25rem;
        }
        .period-btn {
            border: none;
            background: transparent;
            color: #9d174d;
            padding: 0.5rem 1rem;
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.82rem;
            display: flex;
            align-items: center;
            gap: 0.4rem;
            cursor: pointer;
            transition: all 0.25s ease;
        }
        .period-active {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            box-shadow: 0 6px 16px rgba(190,24,93,0.3);
        }
        .period-badge {
            font-size: 0.62rem;
            padding: 0.1rem 0.4rem;
            background: #fbcfe8;
            color: #be185d;
            border-radius: 999px;
            font-weight: 800;
        }
        .period-active .period-badge {
            background: rgba(255,255,255,0.25);
            color: white;
        }

        .plans-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.25rem;
            align-items: stretch;
        }
        @media (max-width: 1000px) {
            .plans-grid { grid-template-columns: 1fr; }
        }

        .plan-card {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 0.9rem;
            padding: 1.6rem 1.5rem;
            border-radius: 1.6rem;
            border: 1.5px solid #fce7f3;
            background: rgba(255,255,255,0.92);
            box-shadow: 0 10px 30px -16px rgba(236,72,153,0.2);
            transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.3s ease;
        }
        .plan-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 24px 46px -20px rgba(190,24,93,0.35);
        }

        /* Variante Básico */
        .plan-basico {
            border-color: color-mix(in srgb, var(--plan-accent) 28%, #fce7f3);
        }
        .plan-basico .plan-head h3 { color: var(--plan-accent); }

        /* Variante Pro (recomendado) */
        .plan-pro.plan-recommended {
            border: 2px solid #ec4899;
            background:
                radial-gradient(140% 120% at 50% 0%, rgba(236,72,153,0.12) 0%, transparent 55%),
                rgba(255,255,255,0.96);
            box-shadow: 0 0 0 5px rgba(236,72,153,0.1), 0 26px 52px -20px rgba(190,24,93,0.5);
            transform: translateY(-6px);
        }
        @media (max-width: 1000px) {
            .plan-pro.plan-recommended { transform: none; }
        }

        /* Variante Elite (premium oscuro) */
        .plan-elite {
            border: 1.5px solid #4c1d95;
            color: #f3e8ff;
            background:
                radial-gradient(140% 130% at 100% 0%, rgba(251,191,36,0.16) 0%, transparent 45%),
                linear-gradient(160deg, #3b0764 0%, #4c1d95 55%, #6d28d9 100%);
            box-shadow: 0 18px 44px -20px rgba(76,29,149,0.55);
        }
        .plan-elite .plan-name { color: #fde68a; }
        .plan-elite .plan-tag { color: #ddd6fe; }
        .plan-elite .plan-amount { color: #fde68a; }
        .plan-elite .plan-cycle, .plan-elite .plan-currency { color: #ddd6fe; }
        .plan-elite .feature-label { color: #ede9fe; }
        .plan-elite .feature-required { background: rgba(251,191,36,0.18); color: #fde68a; }
        .plan-elite .plan-icon { background: rgba(253,230,138,0.15); border-color: rgba(253,230,138,0.35); }

        .plan-current {
            border-color: #16a34a;
            box-shadow: 0 0 0 4px rgba(22,163,74,0.12), 0 20px 40px -18px rgba(22,163,74,0.35);
        }
        .plan-locked { opacity: 0.55; }

        .plan-flag {
            position: absolute;
            top: -13px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            font-size: 0.64rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            padding: 0.32rem 0.9rem;
            border-radius: 999px;
            white-space: nowrap;
            box-shadow: 0 8px 18px -6px rgba(190,24,93,0.5);
        }
        .plan-current-badge {
            position: absolute;
            top: -13px;
            right: 1rem;
            background: #dcfce7;
            color: #15803d;
            font-size: 0.64rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            padding: 0.32rem 0.8rem;
            border-radius: 999px;
            white-space: nowrap;
        }

        .plan-head-row {
            display: flex;
            align-items: center;
            gap: 0.8rem;
        }
        .plan-icon {
            flex-shrink: 0;
            width: 50px;
            height: 50px;
            border-radius: 1.1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.6rem;
            background: var(--plan-soft, #fdf2f8);
            border: 1px solid color-mix(in srgb, var(--plan-accent) 30%, white);
        }
        .plan-name {
            font-family: var(--font-headings);
            font-size: 1.5rem;
            color: #831843;
            font-weight: 900;
            margin: 0;
        }
        .plan-tag {
            color: #9d174d;
            font-size: 0.82rem;
            margin: 0.1rem 0 0;
            line-height: 1.4;
        }

        .plan-price {
            display: flex;
            align-items: baseline;
            gap: 0.4rem;
            flex-wrap: wrap;
            padding: 0.85rem 0;
            border-top: 1px dashed #fbcfe8;
            border-bottom: 1px dashed #fbcfe8;
        }
        .plan-elite .plan-price {
            border-color: rgba(253,230,138,0.25);
        }
        .plan-amount {
            font-family: var(--font-headings);
            font-size: 2.6rem;
            font-weight: 900;
            color: var(--plan-accent, #831843);
            line-height: 1;
        }
        .plan-pro .plan-amount { color: #db2777; }
        .plan-basico .plan-amount { color: #7c3aed; }
        .plan-currency { font-weight: 700; font-size: 0.72rem; color: #9d174d; }
        .plan-cycle { font-weight: 600; font-size: 0.85rem; color: #9d174d; }
        .plan-save {
            background: #dcfce7;
            color: #15803d;
            font-size: 0.68rem;
            font-weight: 800;
            padding: 0.1rem 0.45rem;
            border-radius: 999px;
            margin-left: 0.3rem;
        }

        .plan-features {
            list-style: none;
            padding: 0;
            margin: 0;
            display: flex;
            flex-direction: column;
            gap: 0.45rem;
        }
        .plan-features li {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-size: 0.84rem;
            color: #831843;
            line-height: 1.35;
        }
        .feature-mark {
            flex-shrink: 0;
            width: 18px;
            height: 18px;
            border-radius: 999px;
            background: var(--plan-soft, #fdf2f8);
            color: var(--plan-accent, #be185d);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.66rem;
            font-weight: 900;
        }
        .plan-elite .feature-mark { background: rgba(253,230,138,0.16); color: #fde68a; }
        .feature-off { opacity: 0.45; }
        .feature-off .feature-mark { background: #f3f4f6; color: #9ca3af; }
        .feature-off .feature-label { text-decoration: line-through; }
        .feature-emoji { font-size: 0.95rem; }
        .feature-required {
            margin-left: auto;
            flex-shrink: 0;
            font-size: 0.62rem;
            color: #b91c1c;
            background: #fee2e2;
            padding: 0.1rem 0.45rem;
            border-radius: 999px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .plan-cta { margin-top: auto; padding-top: 0.4rem; }
        .plan-btn {
            width: 100%;
            padding: 0.85rem 1rem;
            border: 1.5px solid #f9a8d4;
            border-radius: 1rem;
            font-weight: 800;
            font-size: 0.9rem;
            background: white;
            color: #831843;
            cursor: pointer;
            transition: all 0.25s ease;
        }
        .plan-btn:hover { background: #fdf2f8; transform: translateY(-1px); }
        .plan-btn-primary {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            border: none;
            box-shadow: 0 12px 24px -10px rgba(190,24,93,0.5);
        }
        .plan-btn-primary:hover { background: linear-gradient(135deg, #db2777, #9d174d); }
        .plan-elite .plan-btn-primary {
            background: linear-gradient(135deg, #f59e0b, #b45309);
            color: white;
            border: none;
            box-shadow: 0 12px 24px -10px rgba(180,83,9,0.5);
        }
        .plan-btn-current {
            background: #dcfce7;
            color: #15803d;
            border-color: #86efac;
            cursor: default;
        }
        .plan-btn-pending {
            background: #fce7f3;
            color: #be185d;
            border-color: #f9a8d4;
            cursor: default;
        }
        .plan-btn:disabled { cursor: not-allowed; opacity: 0.85; }

        .sub-pricing-error {
            background: rgba(255,255,255,0.9);
            border: 1px solid rgba(244,114,182,0.2);
            border-radius: 1.2rem;
            padding: 1.5rem;
            text-align: center;
            color: #9d174d;
        }

        /* ═══════════ ADMINISTRAR ═══════════ */
        .sub-manage {
            background:
                radial-gradient(120% 200% at 100% 0%, rgba(236,72,153,0.1) 0%, transparent 55%),
                linear-gradient(135deg, rgba(255,255,255,0.92), rgba(253,242,248,0.9));
            border: 1px solid rgba(244,114,182,0.2);
            border-radius: 1.6rem;
            padding: 1.6rem 1.8rem;
        }
        .sub-manage-head { margin-bottom: 1rem; }
        .sub-manage-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        .sub-manage-tile {
            padding: 1rem 1.1rem;
            background: rgba(255,255,255,0.85);
            border: 1px solid rgba(249,168,212,0.25);
            border-radius: 1.1rem;
        }
        .sub-manage-icon { font-size: 1.4rem; }
        .sub-manage-label {
            font-size: 0.62rem;
            font-weight: 800;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: #ec4899;
            margin: 0.4rem 0 0.15rem;
        }
        .sub-manage-value {
            font-family: var(--font-headings);
            color: #831843;
            font-size: 1.15rem;
            font-weight: 900;
            margin: 0;
        }
        .sub-manage-sub {
            color: #9d174d;
            font-size: 0.78rem;
            margin: 0.15rem 0 0;
        }
        .sub-manage-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
            margin-top: 0.4rem;
        }
        .sub-manage-btn {
            flex: 1 1 200px;
            padding: 0.7rem 1rem;
            border-radius: 1rem;
            font-weight: 800;
            border: 1.5px solid;
            cursor: pointer;
            background: white;
            transition: transform 0.2s ease;
        }
        .sub-manage-btn:hover { transform: translateY(-1px); }
        .sub-manage-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .sub-manage-primary {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            border: none;
            box-shadow: 0 10px 22px -10px rgba(190,24,93,0.5);
        }
        .sub-manage-danger {
            color: #be185d;
            border-color: #f9a8d4;
        }
        .sub-manage-danger:hover { background: #fff1f2; }
        .sub-manage-pending {
            margin-top: 0.75rem;
            padding: 0.6rem 0.85rem;
            background: #eff6ff;
            border: 1px solid rgba(59,130,246,0.3);
            border-radius: 0.8rem;
            color: #1e3a8a;
            font-size: 0.85rem;
        }

        /* ═══════════ FAQ ═══════════ */
        .sub-faq {
            background: rgba(255,255,255,0.8);
            border: 1px solid rgba(249,168,212,0.2);
            border-radius: 1.5rem;
            padding: 1.4rem 1.6rem;
        }
        .sub-faq-title {
            font-family: var(--font-headings);
            font-size: 1.25rem;
            color: #831843;
            margin: 0 0 0.4rem;
        }
        .sub-faq details {
            border-bottom: 1px solid rgba(244,114,182,0.15);
            padding: 0.7rem 0;
        }
        .sub-faq details:last-child { border-bottom: none; }
        .sub-faq summary {
            cursor: pointer;
            font-weight: 700;
            color: #831843;
            padding: 0.3rem 0;
        }
        .sub-faq p {
            margin: 0.4rem 0 0;
            color: #9d174d;
            font-size: 0.88rem;
        }
    `],
})
export class SubscriptionComponent implements OnInit {
    protected bootstrap = inject(BusinessBootstrapService);
    private subs = inject(SubscriptionService);
    private toast = inject(ToastService);
    private router = inject(Router);

    protected readonly periodicities = PERIODICITIES;
    protected readonly recommendedPlan: PlanTierName = 'Pro';

    protected periodicity = signal<PeriodicityKey>('monthly');
    protected pricing = signal<SubscriptionPricingDto | null>(null);
    protected loadingPricing = signal(true);
    protected pricingError = signal<string | null>(null);
    protected actionInFlight = signal<PlanTierName | 'cancel' | 'checkout' | null>(null);

    protected readonly PLAN_RANK: Record<string, number> = {
        'Básico': 1,
        Pro: 2,
        Elite: 3,
    };

    ngOnInit(): void {
        this.bootstrap.load();
        this.loadPricing();
    }

    protected theme(plan: PlanTierName): PlanTheme {
        return PLAN_THEMES[plan] ?? {
            icon: '✨',
            accent: '#831843',
            soft: '#fdf2f8',
            tagline: '',
        };
    }

    protected setPeriodicity(key: PeriodicityKey): void {
        this.periodicity.set(key);
    }

    protected cycleLabel(): string {
        switch (this.periodicity()) {
            case 'quarterly': return '3 meses';
            case 'annual': return '12 meses';
            default: return 'mes';
        }
    }

    protected loadPricing(): void {
        this.loadingPricing.set(true);
        this.pricingError.set(null);
        this.subs.getPricing().subscribe({
            next: pricing => {
                this.pricing.set(pricing);
                this.loadingPricing.set(false);
            },
            error: err => {
                this.loadingPricing.set(false);
                this.pricingError.set(
                    err?.error?.message || 'Error desconocido al cargar precios.',
                );
            },
        });
    }

    protected isCurrentPlan(plan: PlanTierName): boolean {
        const status = this.bootstrap.subscriptionStatus();
        if (status !== 'Active' && status !== 'Trialing' && status !== 'PastDue') return false;
        return this.bootstrap.effectivePlan() === plan;
    }

    protected isPendingPlan(plan: PlanTierName): boolean {
        return this.bootstrap.pendingPlanTier() === plan;
    }

    protected canPick(plan: PlanTierName): boolean {
        if (this.isPendingPlan(plan)) return false;
        if (this.isCurrentPlan(plan)) return false;
        return plan !== 'Bloqueado';
    }

    protected shouldUpgrade(plan: PlanTierName): boolean {
        const current = this.bootstrap.planTier();
        return (this.PLAN_RANK[plan] ?? 0) > (this.PLAN_RANK[current] ?? 0);
    }

    protected isDowngrade(plan: PlanTierName): boolean {
        const current = this.bootstrap.planTier();
        return (this.PLAN_RANK[plan] ?? 0) < (this.PLAN_RANK[current] ?? 0);
    }

    protected priceFor(plan: SubscriptionPlanPriceDto): number {
        switch (this.periodicity()) {
            case 'quarterly': return plan.quarterlyPrice;
            case 'annual': return plan.annualPrice;
            default: return plan.monthlyPrice;
        }
    }

    protected planTagline(plan?: PlanTierName): string {
        const target = plan ?? this.bootstrap.effectivePlan();
        return PLAN_THEMES[target]?.tagline ?? (target === 'Bloqueado'
            ? 'Cuenta bloqueada por falta de pago.'
            : '');
    }

    protected planColor(): string {
        const plan = this.bootstrap.effectivePlan();
        if (plan === 'Pro') return '#db2777';
        if (plan === 'Elite') return '#b45309';
        if (plan === 'Básico') return '#7c3aed';
        if (plan === 'Bloqueado') return '#dc2626';
        return '#831843';
    }

    protected statusLabel(): string {
        const status = this.bootstrap.subscriptionStatus();
        switch (status) {
            case 'Active': return 'Activa';
            case 'Trialing': return 'En prueba';
            case 'PastDue': return 'Pago atrasado';
            case 'Expired': return 'Vencida';
            case 'Canceled': return 'Cancelada';
            default: return status;
        }
    }

    protected statusPillClass(): string {
        const status = this.bootstrap.subscriptionStatus();
        return `pill-${status.toLowerCase()}`;
    }

    protected statusHint(): string {
        const status = this.bootstrap.subscriptionStatus();
        const days = this.bootstrap.daysLeft();
        if (status === 'Trialing' && days > 0) {
            return `Tu prueba Pro termina en ${days} ${days === 1 ? 'día' : 'días'}.`;
        }
        if (status === 'Active') return 'Tu suscripción está al día.';
        if (status === 'PastDue') return 'Actualiza el método de pago para evitar el bloqueo.';
        if (status === 'Expired') return 'Elige un plan para reactivar la cuenta.';
        if (status === 'Canceled') return 'Tu cuenta está activa hasta fin de periodo.';
        return '';
    }

    protected nextEventLabel(): string | null {
        const status = this.bootstrap.subscriptionStatus();
        if (status === 'Trialing') return `Prueba termina en ${this.bootstrap.daysLeft()} días`;
        if (status === 'Active' && this.bootstrap.currentPeriodEndsAt()) {
            return 'Renueva el';
        }
        if (status === 'PastDue' && this.bootstrap.currentPeriodEndsAt()) {
            return 'Fin de gracia';
        }
        if (status === 'Canceled' && this.bootstrap.currentPeriodEndsAt()) {
            return 'Se bloquea el';
        }
        return null;
    }

    protected nextEventIso(): string | null {
        const status = this.bootstrap.subscriptionStatus();
        if (status === 'Trialing' && this.bootstrap.trialEndsAt()) {
            return this.bootstrap.trialEndsAt();
        }
        if (this.bootstrap.currentPeriodEndsAt()) {
            return this.bootstrap.currentPeriodEndsAt();
        }
        return null;
    }

    protected featuresFor(plan: PlanTierName) {
        const rank = this.PLAN_RANK[plan] ?? 0;
        return this.bootstrap.featureCatalog().map(f => ({
            ...f,
            enabled: (this.PLAN_RANK[f.requiredPlan] ?? 0) <= rank,
        }));
    }

    protected hasActiveSubscription(): boolean {
        const status = this.bootstrap.subscriptionStatus();
        return status === 'Active' || status === 'PastDue' || status === 'Canceled';
    }

    protected onChoose(plan: SubscriptionPlanPriceDto): void {
        if (this.actionInFlight()) return;
        // Si hay suscripcion activa (preapproval vivo) y solo queremos ajustar
        // plan/periodicidad, NO pedimos nueva tarjeta: usamos updatePreapproval.
        // Si la cuenta esta bloqueada o sin preapproval, vamos al checkout.
        if (this.hasActiveSubscription() && !this.bootstrap.isLocked()) {
            this.actionInFlight.set(plan.planTier);
            this.adjustPreapproval(plan.planTier);
            return;
        }
        this.router.navigate(['/admin/subscription/checkout'], {
            queryParams: { plan: plan.planTier, periodicity: this.periodicity() },
        });
    }

    protected goToCheckoutWithCurrent(): void {
        this.actionInFlight.set('checkout');
        this.router.navigate(['/admin/subscription/checkout'], {
            queryParams: {
                plan: this.bootstrap.planTier() === 'Bloqueado'
                    ? this.recommendedPlan
                    : this.bootstrap.planTier(),
                periodicity: 'monthly',
            },
        });
    }

    protected onCancel(): void {
        if (this.actionInFlight()) return;
        const ok = window.confirm(
            '¿Cancelar la suscripción? Tu cuenta sigue activa hasta el fin del periodo pagado; después pasa a Bloqueada.',
        );
        if (!ok) return;

        this.actionInFlight.set('cancel');
        this.subs.cancelPreapproval().subscribe({
            next: () => {
                this.toast.success('Suscripción cancelada. Tu cuenta sigue activa hasta el fin del periodo.');
                this.actionInFlight.set(null);
                this.bootstrap.refresh();
            },
            error: err => {
                this.toast.error(
                    err?.error?.message || 'No pudimos cancelar la suscripción. Intenta de nuevo.',
                );
                this.actionInFlight.set(null);
            },
        });
    }

    private adjustPreapproval(plan: PlanTierName): void {
        this.subs
            .updatePreapproval({
                planTier: plan,
                periodicity: this.periodicity() as PeriodicityName,
            })
            .subscribe({
                next: summary => {
                    if (this.shouldUpgrade(plan)) {
                        this.toast.success(
                            `Listo. Tu plan ahora es ${summary.planTier}. El próximo cargo ya refleja el nuevo monto.`,
                        );
                    } else {
                        this.toast.success(
                            `Tu plan cambiará a ${summary.planTier} al final del periodo.`,
                        );
                    }
                    this.actionInFlight.set(null);
                    this.bootstrap.refresh();
                },
                error: err => {
                    this.toast.error(
                        err?.error?.message || 'No pudimos ajustar la suscripción. Intenta de nuevo.',
                    );
                    this.actionInFlight.set(null);
                },
            });
    }
}
