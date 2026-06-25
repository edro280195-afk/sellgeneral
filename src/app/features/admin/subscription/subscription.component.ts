import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

@Component({
    selector: 'app-subscription',
    imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
    template: `
        <div class="subscription-page space-y-8 pb-12">
            <!-- ── ENCABEZADO ── -->
            <header class="page-header">
                <p class="text-pink-500 font-semibold uppercase tracking-widest text-xs">Mi Negocio</p>
                <h1 class="font-headings text-3xl lg:text-4xl text-pink-900 mt-1">
                    Plan y Suscripción <span class="font-accent text-pink-500">💖</span>
                </h1>
                <p class="text-pink-700/80 mt-2 max-w-2xl">
                    Aquí ves el plan activo, lo que viene en cada nivel y el método de pago.
                    El precio lo fija la plataforma — nunca lo escribimos a mano.
                </p>
            </header>

            <!-- ── TARJETA DE ESTADO ── -->
            <section class="status-card card-coquette p-6 lg:p-8">
                @if (bootstrap.loading() && !bootstrap.loaded()) {
                    <div class="state-row state-loading">
                        <div class="shimmer-dot"></div>
                        <p>Cargando estado de tu suscripción...</p>
                    </div>
                } @else if (bootstrap.error(); as err) {
                    <div class="state-row state-error">
                        <span class="state-icon">😿</span>
                        <div>
                            <p class="font-semibold">No pudimos cargar el estado</p>
                            <p class="text-sm opacity-80">{{ err }}</p>
                        </div>
                        <button class="btn-coquette ml-auto px-4 py-2 rounded-xl bg-pink-600 text-white" (click)="bootstrap.refresh()">
                            Reintentar
                        </button>
                    </div>
                } @else {
                    <div class="status-grid">
                        <div>
                            <p class="text-pink-500 text-xs font-bold uppercase tracking-widest">Plan efectivo</p>
                            <p class="status-plan" [class]="planClass()">
                                {{ bootstrap.effectivePlan() }}
                            </p>
                            <p class="text-pink-700/80 text-sm mt-1">
                                {{ planTagline() }}
                            </p>
                        </div>

                        <div>
                            <p class="text-pink-500 text-xs font-bold uppercase tracking-widest">Estado</p>
                            <p class="status-pill" [class]="statusPillClass()">
                                {{ statusLabel() }}
                            </p>
                            <p class="text-pink-700/80 text-sm mt-1">
                                {{ statusHint() }}
                            </p>
                        </div>

                        <div>
                            <p class="text-pink-500 text-xs font-bold uppercase tracking-widest">Próximo evento</p>
                            @if (nextEventLabel(); as lbl) {
                                <p class="font-semibold text-pink-900">{{ lbl }}</p>
                                <p class="text-pink-700/80 text-sm mt-1">
                                    {{ nextEventIso() | date: 'fullDate' }}
                                </p>
                            } @else {
                                <p class="font-semibold text-pink-900">—</p>
                                <p class="text-pink-700/80 text-sm mt-1">
                                    Sin renovaciones programadas.
                                </p>
                            }
                        </div>

                        <div>
                            <p class="text-pink-500 text-xs font-bold uppercase tracking-widest">Cambio programado</p>
                            @if (bootstrap.pendingPlanTier(); as pending) {
                                <p class="font-semibold text-pink-900">
                                    Pasará a <span class="text-pink-600">{{ pending }}</span>
                                </p>
                                <p class="text-pink-700/80 text-sm mt-1">
                                    el {{ bootstrap.pendingPlanEffectiveAt() | date: 'longDate' }}
                                </p>
                            } @else {
                                <p class="font-semibold text-pink-900">Sin cambios</p>
                                <p class="text-pink-700/80 text-sm mt-1">
                                    Tu plan se queda como está.
                                </p>
                            }
                        </div>
                    </div>

                    @if (bootstrap.isLocked()) {
                        <div class="locked-alert mt-6">
                            <div class="locked-icon">🔒</div>
                            <div class="flex-1">
                                <p class="font-bold text-pink-900">
                                    Tu cuenta está bloqueada.
                                </p>
                                <p class="text-pink-800/80 text-sm">
                                    Elige un plan y completa el pago para volver a entrar al panel.
                                </p>
                            </div>
                            <a
                                [routerLink]="['/admin/subscription/checkout']"
                                [queryParams]="{ plan: recommendedPlan, periodicity: 'monthly' }"
                                class="locked-cta">
                                Ir a pagar 💳
                            </a>
                        </div>
                    } @else if (bootstrap.subscriptionStatus() === 'Trialing' && bootstrap.daysLeft() > 0) {
                        <div class="trial-alert mt-6">
                            <div class="locked-icon">✨</div>
                            <div class="flex-1">
                                <p class="font-bold text-pink-900">
                                    Estás en prueba — te quedan {{ bootstrap.daysLeft() }}
                                    {{ bootstrap.daysLeft() === 1 ? 'día' : 'días' }} Pro.
                                </p>
                                <p class="text-pink-800/80 text-sm">
                                    Cuando termine la prueba, tu cuenta se bloquea hasta que elijas un plan.
                                </p>
                            </div>
                        </div>
                    } @else if (bootstrap.subscriptionStatus() === 'PastDue') {
                        <div class="pastdue-alert mt-6">
                            <div class="locked-icon">⚠️</div>
                            <div class="flex-1">
                                <p class="font-bold text-pink-900">
                                    Pago atrasado. Tienes {{ bootstrap.pastDueGraceDays() }} días de gracia
                                    para actualizar el método de pago.
                                </p>
                            </div>
                        </div>
                    }
                }
            </section>

            <!-- ── PERIODICIDAD ── -->
            <section class="periodicity-section">
                <div class="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
                    <div>
                        <h2 class="font-headings text-2xl text-pink-900">Elige un plan</h2>
                        <p class="text-pink-700/80 text-sm">
                            Cambias o cancelas cuando quieras. El cargo es recurrente y seguro.
                        </p>
                    </div>

                    <div class="periodicity-toggle">
                        @for (opt of periodicities; track opt.key) {
                            <button
                                type="button"
                                class="period-btn btn-coquette"
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
                                class="plan-card card-coquette"
                                [class.plan-current]="isCurrentPlan(plan.planTier)"
                                [class.plan-recommended]="plan.planTier === recommendedPlan"
                                [class.plan-locked]="!canPick(plan.planTier)">
                                <header class="plan-head">
                                    <div>
                                        <p class="plan-name">{{ plan.planTier }}</p>
                                        <p class="plan-tag">{{ planTagline(plan.planTier) }}</p>
                                    </div>
                                    @if (plan.planTier === recommendedPlan) {
                                        <span class="plan-flag">Más popular</span>
                                    }
                                </header>

                                <div class="plan-price">
                                    <span class="plan-amount">
                                        &#36;{{ priceFor(plan) | number: '1.2-2' }}
                                    </span>
                                    <span class="plan-currency">MXN</span>
                                    <span class="plan-cycle">
                                        /{{ periodicityLabel() }}
                                        @if (periodicity() === 'quarterly' && plan.quarterlyDiscountPct > 0) {
                                            <span class="plan-save">−{{ plan.quarterlyDiscountPct }}%</span>
                                        }
                                        @if (periodicity() === 'annual' && plan.annualDiscountPct > 0) {
                                            <span class="plan-save">−{{ plan.annualDiscountPct }}%</span>
                                        }
                                    </span>
                                </div>

                                <ul class="plan-features">
                                    @for (f of featuresFor(plan.planTier); track f.key) {
                                        <li [class.feature-off]="!f.enabled">
                                            <span class="feature-emoji">{{ f.emoji }}</span>
                                            <span>{{ f.label }}</span>
                                            @if (!f.enabled) {
                                                <span class="feature-required">requiere {{ f.requiredPlan }}</span>
                                            }
                                        </li>
                                    }
                                </ul>

                                <div class="plan-cta">
                                    @if (isCurrentPlan(plan.planTier) && !bootstrap.isLocked()) {
                                        <button class="btn-coquette plan-btn plan-btn-current" disabled>
                                            ✦ Tu plan actual
                                        </button>
                                    } @else if (isPendingPlan(plan.planTier)) {
                                        <button class="btn-coquette plan-btn plan-btn-pending" disabled>
                                            Cambio programado
                                        </button>
                                    } @else {
                                        <button
                                            class="btn-coquette plan-btn"
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
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                        @for (i of [1,2,3]; track i) {
                            <div class="shimmer h-80 rounded-2xl"></div>
                        }
                    </div>
                } @else if (pricingError(); as err) {
                    <div class="card-coquette p-6 text-center text-pink-700">
                        <p>😿 No pudimos cargar los precios.</p>
                        <p class="text-sm opacity-70 mt-1">{{ err }}</p>
                        <button class="btn-coquette mt-4 px-4 py-2 rounded-xl bg-pink-600 text-white" (click)="loadPricing()">
                            Reintentar
                        </button>
                    </div>
                }
            </section>

            <!-- ── ADMINISTRAR SUSCRIPCIÓN (solo con preapproval activo) ── -->
            @if (hasActiveSubscription() && !bootstrap.isLocked()) {
                <section class="manage card-coquette p-6 lg:p-7">
                    <div class="manage-head">
                        <div>
                            <p class="text-pink-500 text-xs font-bold uppercase tracking-widest">Administrar</p>
                            <h2 class="font-headings text-2xl text-pink-900">Tu suscripción</h2>
                            <p class="text-pink-700/80 text-sm mt-1">
                                Cambias de plan, periodicidad o cancelas. La cancelación deja tu cuenta
                                activa hasta el fin del periodo pagado.
                            </p>
                        </div>
                    </div>

                    <div class="manage-grid">
                        <div class="manage-tile">
                            <p class="manage-eyebrow">Plan actual</p>
                            <p class="manage-value">{{ bootstrap.planTier() }}</p>
                            <p class="manage-sub">Suscripción recurrente con Mercado Pago.</p>
                        </div>
                        <div class="manage-tile">
                            <p class="manage-eyebrow">Próximo cobro</p>
                            <p class="manage-value">
                                @if (bootstrap.currentPeriodEndsAt()) {
                                    {{ bootstrap.currentPeriodEndsAt() | date: 'longDate' }}
                                } @else {
                                    —
                                }
                            </p>
                            <p class="manage-sub">Cargos automáticos con la tarjeta que diste de alta.</p>
                        </div>
                        <div class="manage-tile">
                            <p class="manage-eyebrow">Estado</p>
                            <p class="manage-value">{{ statusLabel() }}</p>
                            <p class="manage-sub">{{ statusHint() }}</p>
                        </div>
                    </div>

                    <div class="manage-actions">
                        <button
                            type="button"
                            class="manage-btn manage-primary"
                            [disabled]="actionInFlight() === 'checkout'"
                            (click)="goToCheckoutWithCurrent()">
                            Cambiar tarjeta o plan
                        </button>
                        <button
                            type="button"
                            class="manage-btn manage-danger"
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
                        <p class="manage-pending">
                            ⏳ Cambio programado a <strong>{{ bootstrap.pendingPlanTier() }}</strong>
                            el {{ bootstrap.pendingPlanEffectiveAt() | date: 'longDate' }}.
                        </p>
                    }
                </section>
            }

            <!-- ── PIE / FAQ ── -->
            <section class="faq card-coquette p-6">
                <h3 class="font-headings text-xl text-pink-900 mb-3">Dudas frecuentes</h3>
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

        .page-header { padding-top: 0.5rem; }

        .status-card {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(253, 242, 248, 0.9));
            border: 1px solid rgba(244, 114, 182, 0.15);
        }

        .status-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1.5rem;
        }

        .status-plan {
            font-family: var(--font-headings);
            font-size: 1.75rem;
            font-weight: 900;
            margin-top: 0.25rem;
        }

        .plan-active { color: #16a34a; }
        .plan-pro { color: #db2777; }
        .plan-entrada { color: #6d28d9; }
        .plan-elite { color: #b45309; }
        .plan-bloqueado { color: #dc2626; }

        .status-pill {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.35rem 0.85rem;
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.8rem;
            margin-top: 0.4rem;
            text-transform: uppercase;
            letter-spacing: 0.06em;
        }
        .pill-active { background: #dcfce7; color: #15803d; }
        .pill-trialing { background: #fce7f3; color: #be185d; }
        .pill-pastdue { background: #fef3c7; color: #b45309; }
        .pill-expired, .pill-canceled { background: #fee2e2; color: #b91c1c; }

        .state-row {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            color: #9d174d;
        }
        .state-error { color: #b91c1c; }
        .shimmer-dot {
            width: 1rem; height: 1rem; border-radius: 999px;
            background: linear-gradient(90deg, #fbcfe8, #f9a8d4, #fbcfe8);
            background-size: 200% 100%;
            animation: shimmer 1.4s linear infinite;
        }
        @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
        }

        .locked-alert, .trial-alert, .pastdue-alert {
            display: flex; align-items: center; gap: 1rem;
            padding: 1rem 1.25rem;
            border-radius: 1rem;
            border: 1px solid rgba(244, 114, 182, 0.2);
        }
        .locked-alert { background: #fff1f2; }
        .trial-alert { background: #fdf2f8; }
        .pastdue-alert { background: #fffbeb; }
        .locked-icon { font-size: 1.75rem; }
        .locked-cta {
            flex-shrink: 0;
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            padding: 0.6rem 1.1rem;
            border-radius: 999px;
            text-decoration: none;
            font-weight: 800;
            font-size: 0.85rem;
            box-shadow: 0 8px 18px rgba(190, 24, 93, 0.3);
        }
        .locked-cta:hover { transform: translateY(-1px); }
        @media (max-width: 640px) {
            .locked-alert { flex-wrap: wrap; }
            .locked-cta { width: 100%; text-align: center; }
        }

        .manage {
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(253, 242, 248, 0.9));
            border: 1px solid rgba(244, 114, 182, 0.15);
        }
        .manage-head { margin-bottom: 1rem; }
        .manage-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 1rem;
            margin: 1rem 0;
        }
        .manage-tile {
            padding: 0.85rem 1rem;
            background: #fdf2f8;
            border-radius: 0.85rem;
            border: 1px solid rgba(244, 114, 182, 0.15);
        }
        .manage-eyebrow {
            color: #ec4899;
            font-weight: 800;
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            margin: 0;
        }
        .manage-value {
            font-family: var(--font-headings);
            color: #831843;
            font-size: 1.15rem;
            font-weight: 900;
            margin: 0.15rem 0 0.2rem;
        }
        .manage-sub {
            color: #9d174d;
            font-size: 0.8rem;
            margin: 0;
        }
        .manage-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 0.6rem;
            margin-top: 0.5rem;
        }
        .manage-btn {
            flex: 1 1 200px;
            padding: 0.7rem 1rem;
            border-radius: 0.85rem;
            font-weight: 800;
            border: 1.5px solid;
            cursor: pointer;
            background: white;
            transition: transform 0.2s ease;
        }
        .manage-btn:hover { transform: translateY(-1px); }
        .manage-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .manage-primary {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            border: none;
            box-shadow: 0 10px 22px -10px rgba(190, 24, 93, 0.5);
        }
        .manage-danger {
            color: #be185d;
            border-color: #f9a8d4;
        }
        .manage-danger:hover { background: #fff1f2; }
        .manage-pending {
            margin-top: 0.75rem;
            padding: 0.6rem 0.85rem;
            background: #eff6ff;
            border: 1px solid rgba(59, 130, 246, 0.3);
            border-radius: 0.65rem;
            color: #1e3a8a;
            font-size: 0.85rem;
        }

        .periodicity-toggle {
            display: inline-flex;
            padding: 0.3rem;
            background: white;
            border-radius: 999px;
            border: 1px solid rgba(244, 114, 182, 0.2);
            box-shadow: 0 6px 18px rgba(244, 114, 182, 0.1);
            gap: 0.25rem;
        }
        .period-btn {
            border: none;
            background: transparent;
            color: #9d174d;
            padding: 0.5rem 1rem;
            border-radius: 999px;
            font-weight: 700;
            font-size: 0.85rem;
            display: flex;
            align-items: center;
            gap: 0.4rem;
        }
        .period-active {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            box-shadow: 0 6px 16px rgba(190, 24, 93, 0.3);
        }
        .period-badge {
            font-size: 0.65rem;
            padding: 0.1rem 0.4rem;
            background: #fbcfe8;
            color: #be185d;
            border-radius: 999px;
            font-weight: 800;
        }
        .period-active .period-badge {
            background: rgba(255, 255, 255, 0.25);
            color: white;
        }

        .plans-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
            gap: 1.25rem;
        }

        .plan-card {
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            padding: 1.5rem;
            background: white;
            border: 1px solid rgba(244, 114, 182, 0.18);
        }

        .plan-current {
            border-color: #16a34a;
            box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.12), 0 20px 40px -20px rgba(22, 163, 74, 0.3);
        }
        .plan-recommended {
            border-color: #ec4899;
            box-shadow: 0 0 0 4px rgba(236, 72, 153, 0.12), 0 20px 40px -20px rgba(236, 72, 153, 0.3);
        }
        .plan-locked { opacity: 0.55; }

        .plan-head {
            display: flex; justify-content: space-between; align-items: flex-start; gap: 0.75rem;
        }
        .plan-name {
            font-family: var(--font-headings);
            font-size: 1.5rem;
            color: #831843;
            font-weight: 900;
        }
        .plan-tag { color: #9d174d; font-size: 0.85rem; margin-top: 0.15rem; }
        .plan-flag {
            font-size: 0.65rem;
            font-weight: 800;
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            padding: 0.3rem 0.7rem;
            border-radius: 999px;
            text-transform: uppercase;
            letter-spacing: 0.1em;
        }

        .plan-price {
            display: flex; align-items: baseline; gap: 0.35rem; flex-wrap: wrap;
        }
        .plan-amount {
            font-family: var(--font-headings);
            font-size: 2.5rem;
            font-weight: 900;
            color: #831843;
            line-height: 1;
        }
        .plan-currency { color: #9d174d; font-weight: 700; font-size: 0.8rem; }
        .plan-cycle { color: #9d174d; font-size: 0.9rem; font-weight: 600; }
        .plan-save {
            background: #dcfce7;
            color: #15803d;
            font-size: 0.7rem;
            font-weight: 800;
            padding: 0.1rem 0.45rem;
            border-radius: 999px;
            margin-left: 0.35rem;
        }

        .plan-features {
            list-style: none;
            padding: 0; margin: 0;
            display: flex; flex-direction: column; gap: 0.45rem;
        }
        .plan-features li {
            display: flex; align-items: center; gap: 0.5rem;
            font-size: 0.85rem;
            color: #831843;
        }
        .feature-emoji { font-size: 1.05rem; }
        .feature-off { opacity: 0.5; text-decoration: line-through; }
        .feature-required {
            margin-left: auto;
            font-size: 0.65rem;
            color: #b91c1c;
            background: #fee2e2;
            padding: 0.1rem 0.45rem;
            border-radius: 999px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .plan-cta { margin-top: auto; }
        .plan-btn {
            width: 100%;
            padding: 0.85rem 1rem;
            border: none;
            border-radius: 1rem;
            font-weight: 800;
            font-size: 0.9rem;
            background: white;
            color: #831843;
            border: 1.5px solid #f9a8d4;
        }
        .plan-btn-primary {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            border: none;
            box-shadow: 0 12px 24px -10px rgba(190, 24, 93, 0.5);
        }
        .plan-btn-current {
            background: #dcfce7; color: #15803d; border-color: #86efac;
        }
        .plan-btn-pending {
            background: #fce7f3; color: #be185d; border-color: #f9a8d4;
        }
        .plan-btn:disabled { cursor: not-allowed; opacity: 0.85; }

        .faq details {
            border-bottom: 1px solid rgba(244, 114, 182, 0.15);
            padding: 0.75rem 0;
        }
        .faq details:last-child { border-bottom: none; }
        .faq summary {
            cursor: pointer;
            font-weight: 700;
            color: #831843;
            padding: 0.4rem 0;
        }
        .faq p {
            margin: 0.4rem 0 0 0;
            color: #9d174d;
            font-size: 0.9rem;
        }

        .shimmer {
            background: linear-gradient(90deg, #fdf2f8, #fce7f3, #fdf2f8);
            background-size: 200% 100%;
            animation: shimmer 1.4s linear infinite;
            border-radius: 1.5rem;
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
        Entrada: 1,
        Pro: 2,
        Elite: 3,
    };

    ngOnInit(): void {
        this.bootstrap.load();
        this.loadPricing();
    }

    protected setPeriodicity(key: PeriodicityKey): void {
        this.periodicity.set(key);
    }

    protected periodicityLabel(): string {
        return this.periodicities.find(p => p.key === this.periodicity())?.label.toLowerCase() ?? 'mes';
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
        switch (target) {
            case 'Entrada': return 'Para empezar a vender y entregar.';
            case 'Pro': return 'El plan que usa Regi Bazar. Todo lo importante.';
            case 'Elite': return 'C.A.M.I. y rutas con tráfico en vivo.';
            default: return 'Cuenta bloqueada por falta de pago.';
        }
    }

    protected planClass(): string {
        const plan = this.bootstrap.effectivePlan();
        if (plan === 'Pro') return 'plan-pro';
        if (plan === 'Elite') return 'plan-elite';
        if (plan === 'Entrada') return 'plan-entrada';
        if (plan === 'Bloqueado') return 'plan-bloqueado';
        return 'plan-active';
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
