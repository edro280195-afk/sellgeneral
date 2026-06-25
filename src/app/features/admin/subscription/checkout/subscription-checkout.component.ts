import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import confetti from 'canvas-confetti';
import { BusinessBootstrapService } from '../../../../core/services/business-bootstrap.service';
import { SubscriptionService } from '../../../../core/services/subscription.service';
import { MercadoPagoBrickService } from '../../../../core/services/mercadopago-brick.service';
import { ToastService } from '../../../../core/services/toast.service';
import {
    CreatePreapprovalRequest,
    PeriodicityName,
    PlanTierName,
    PreapprovalSummaryDto,
    SubscriptionPricingDto,
} from '../../../../core/models';

type PeriodicityKey = 'monthly' | 'quarterly' | 'annual';
type CheckoutStatus = 'loading' | 'ready' | 'submitting' | 'success' | 'error';

const VALID_PLANS: PlanTierName[] = ['Entrada', 'Pro', 'Elite'];
const VALID_PERIODICITIES: PeriodicityKey[] = ['monthly', 'quarterly', 'annual'];

const FORM_ID = 'mp-checkout-card-form';
const INPUTS = {
    cardNumber: 'mp-checkout-cardNumber',
    expirationDate: 'mp-checkout-expirationDate',
    securityCode: 'mp-checkout-securityCode',
    cardholderName: 'mp-checkout-cardholderName',
    issuer: 'mp-checkout-issuer',
    installments: 'mp-checkout-installments',
    cardholderEmail: 'mp-checkout-cardholderEmail',
};

@Component({
    selector: 'app-subscription-checkout',
    imports: [DatePipe, DecimalPipe, FormsModule, RouterLink],
    template: `
        <div class="checkout-page space-y-6 pb-12">
            <header class="page-header">
                <a routerLink="/admin/subscription" class="back-link">← Volver a "Mi Plan"</a>
                <h1 class="font-headings text-3xl lg:text-4xl text-pink-900 mt-2">
                    Activar tu plan <span class="font-accent text-pink-500">💳</span>
                </h1>
                <p class="text-pink-700/80 mt-1 max-w-2xl">
                    Se te cobra hoy. Tu tarjeta nunca se guarda con nosotros — la maneja Mercado Pago
                    y puedes cancelar cuando quieras.
                </p>
            </header>

            <div class="checkout-grid">
                <!-- ── RESUMEN ── -->
                <aside class="summary card-coquette p-6">
                    <p class="text-pink-500 text-xs font-bold uppercase tracking-widest">Resumen</p>

                    <div class="summary-plan">
                        <p class="summary-name">{{ plan() }}</p>
                        <p class="summary-tagline">{{ planTagline() }}</p>
                    </div>

                    <div class="summary-row">
                        <span>Periodicidad</span>
                        <select
                            class="summary-select"
                            [ngModel]="periodicity()"
                            (ngModelChange)="setPeriodicity($event)"
                            [disabled]="status() === 'submitting' || status() === 'success'">
                            @for (p of periodicities; track p.key) {
                                <option [value]="p.key">{{ p.label }}</option>
                            }
                        </select>
                    </div>

                    <div class="summary-row">
                        <span>Se cobra hoy</span>
                        <strong class="summary-amount">
                            &#36;{{ price() | number: '1.2-2' }} MXN
                        </strong>
                    </div>

                    @if (savings() > 0) {
                        <p class="summary-save">
                            Estás ahorrando &#36;{{ savings() | number: '1.2-2' }}
                            vs. pagar mes a mes.
                        </p>
                    }

                    <ul class="summary-features">
                        @for (f of featuresFor(plan()); track f.key) {
                            <li [class.feat-off]="!f.enabled">
                                <span class="feat-emoji">{{ f.emoji }}</span>
                                <span>{{ f.label }}</span>
                            </li>
                        }
                    </ul>
                </aside>

                <!-- ── FORMULARIO ── -->
                <section class="pay card-coquette p-6">
                    @if (status() === 'success') {
                        <div class="success-card">
                            <div class="success-emoji">✨</div>
                            <p class="success-eyebrow">Pago confirmado</p>
                            <h2 class="success-title">¡Tu plan {{ plan() }} está activo!</h2>
                            <p class="success-sub">
                                El primer cobro ya pasó. La próxima fecha de renovación es
                                {{ result()?.nextPaymentDate | date: 'longDate' }}.
                            </p>
                            <div class="success-actions">
                                <a routerLink="/admin" class="btn-coquette success-primary">
                                    Entrar al panel
                                </a>
                                <a routerLink="/admin/subscription" class="success-secondary">
                                    Ver mi suscripción
                                </a>
                            </div>
                        </div>
                    } @else {
                        <p class="text-pink-500 text-xs font-bold uppercase tracking-widest">Pago</p>
                        <h2 class="pay-title">Datos de facturación</h2>
                        <p class="pay-sub">
                            MercadoPago tokeniza tu tarjeta en su servidor. Nosotros solo recibimos
                            un token de un solo uso.
                        </p>

                        <div class="field">
                            <label for="mp-checkout-cardholderEmail">Email del titular</label>
                            <input
                                id="mp-checkout-cardholderEmail"
                                type="email"
                                class="text-input"
                                placeholder="donde@recibes.com"
                                [ngModel]="payerEmail()"
                                (ngModelChange)="payerEmail.set($event)"
                                [disabled]="status() === 'submitting'"
                                autocomplete="email" />
                            <p class="field-hint">
                                Aquí te llega el comprobante de Mercado Pago.
                            </p>
                        </div>

                        <p class="text-pink-500 text-xs font-bold uppercase tracking-widest mt-2">
                            Tarjeta
                        </p>

                        @if (status() === 'loading') {
                            <div class="brick-loading">
                                <div class="shimmer h-12 rounded-xl mb-3"></div>
                                <div class="shimmer h-12 rounded-xl mb-3"></div>
                                <div class="shimmer h-12 rounded-xl mb-3"></div>
                                <p class="text-pink-700 text-sm mt-2">
                                    Cargando formulario de pago seguro...
                                </p>
                            </div>
                        } @else if (loadError(); as e) {
                            <div class="brick-error">
                                <p class="font-bold text-pink-900">No pudimos cargar el pago</p>
                                <p class="text-sm">{{ e }}</p>
                                <button
                                    type="button"
                                    class="btn-coquette mt-3 px-4 py-2 rounded-xl bg-pink-600 text-white"
                                    (click)="mountBrick()">
                                    Reintentar
                                </button>
                            </div>
                        } @else {
                            <form
                                [id]="FORM_ID"
                                class="brick-form"
                                (submit)="$event.preventDefault()">
                                <div class="brick-row">
                                    <div [id]="INPUTS.cardNumber" class="brick-cell"></div>
                                </div>
                                <div class="brick-row brick-row-2">
                                    <div [id]="INPUTS.expirationDate" class="brick-cell"></div>
                                    <div [id]="INPUTS.securityCode" class="brick-cell"></div>
                                </div>
                                <div class="brick-row">
                                    <div [id]="INPUTS.cardholderName" class="brick-cell"></div>
                                </div>
                                <div class="brick-row brick-row-2">
                                    <div [id]="INPUTS.issuer" class="brick-cell"></div>
                                    <div [id]="INPUTS.installments" class="brick-cell"></div>
                                </div>
                            </form>

                            <button
                                type="button"
                                class="btn-coquette pay-cta"
                                [disabled]="status() === 'submitting' || !cardForm()"
                                (click)="submit()">
                                @if (status() === 'submitting') {
                                    Procesando pago...
                                } @else {
                                    Pagar &#36;{{ price() | number: '1.2-2' }} MXN ✦
                                }
                            </button>

                            <p class="pay-foot">
                                Al pagar aceptas la suscripción recurrente. Puedes cancelar cuando
                                quieras — tu cuenta sigue activa hasta el fin del periodo pagado.
                            </p>
                        }
                    }
                </section>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }

        .back-link {
            color: #9d174d;
            text-decoration: none;
            font-size: 0.85rem;
            font-weight: 700;
        }
        .back-link:hover { text-decoration: underline; }

        .checkout-grid {
            display: grid;
            grid-template-columns: minmax(280px, 360px) 1fr;
            gap: 1.5rem;
            align-items: start;
        }
        @media (max-width: 900px) {
            .checkout-grid { grid-template-columns: 1fr; }
        }

        .summary {
            background: linear-gradient(135deg, #fff5f7, #fdf2f8);
            border: 1px solid rgba(244, 114, 182, 0.2);
            position: sticky;
            top: 1rem;
        }
        .summary-plan { margin-top: 0.5rem; }
        .summary-name {
            font-family: var(--font-headings);
            font-size: 2rem;
            color: #831843;
            font-weight: 900;
            line-height: 1;
        }
        .summary-tagline { color: #9d174d; font-size: 0.85rem; margin-top: 0.25rem; }
        .summary-row {
            display: flex; justify-content: space-between; align-items: center;
            padding: 0.6rem 0;
            border-top: 1px solid rgba(244, 114, 182, 0.15);
            color: #831843;
            font-size: 0.9rem;
        }
        .summary-select {
            background: white;
            border: 1px solid #f9a8d4;
            color: #9d174d;
            padding: 0.4rem 0.6rem;
            border-radius: 0.6rem;
            font-weight: 700;
            font-size: 0.85rem;
        }
        .summary-amount {
            font-family: var(--font-headings);
            font-size: 1.5rem;
            color: #be185d;
        }
        .summary-save {
            color: #15803d;
            background: #dcfce7;
            padding: 0.5rem 0.7rem;
            border-radius: 0.5rem;
            font-size: 0.8rem;
            font-weight: 700;
            margin-top: 0.5rem;
        }
        .summary-features {
            list-style: none; padding: 0; margin: 1rem 0 0;
            display: flex; flex-direction: column; gap: 0.4rem;
        }
        .summary-features li {
            display: flex; align-items: center; gap: 0.4rem;
            font-size: 0.85rem; color: #831843;
        }
        .feat-off { opacity: 0.5; text-decoration: line-through; }
        .feat-emoji { font-size: 1rem; }

        .pay { background: white; }
        .pay-title {
            font-family: var(--font-headings);
            color: #831843;
            font-size: 1.4rem;
            margin: 0.25rem 0 0.25rem;
        }
        .pay-sub { color: #9d174d; font-size: 0.85rem; margin: 0 0 1rem; }
        .field { margin-bottom: 0.75rem; }
        .field label {
            display: block;
            font-weight: 700;
            color: #9d174d;
            font-size: 0.8rem;
            margin-bottom: 0.3rem;
        }
        .text-input {
            width: 100%;
            padding: 0.7rem 0.9rem;
            border: 1.5px solid #f9a8d4;
            border-radius: 0.7rem;
            font-size: 0.95rem;
            color: #831843;
            background: white;
        }
        .text-input:focus {
            outline: none;
            border-color: #ec4899;
            box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15);
        }
        .field-hint { color: #be185d; font-size: 0.75rem; margin: 0.3rem 0 0; opacity: 0.8; }

        .brick-form { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.5rem; }
        .brick-row { display: flex; gap: 0.6rem; }
        .brick-row-2 > .brick-cell { flex: 1; }
        .brick-cell {
            width: 100%;
            min-height: 48px;
            padding: 0.5rem 0.6rem;
            border: 1.5px solid #f9a8d4;
            border-radius: 0.7rem;
            background: white;
        }
        .brick-cell:focus-within {
            border-color: #ec4899;
            box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.15);
        }

        .brick-loading { margin: 0.5rem 0; }

        .brick-error {
            background: #fff1f2;
            border: 1px solid rgba(244, 114, 182, 0.3);
            border-radius: 0.75rem;
            padding: 0.85rem 1rem;
            color: #9d174d;
            margin: 0.5rem 0;
        }

        .pay-cta {
            width: 100%;
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            border: none;
            padding: 0.9rem 1.2rem;
            border-radius: 0.85rem;
            font-weight: 800;
            font-size: 1rem;
            margin-top: 1rem;
            box-shadow: 0 12px 24px -10px rgba(190, 24, 93, 0.5);
        }
        .pay-cta:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            box-shadow: none;
        }
        .pay-foot {
            color: #9d174d;
            font-size: 0.75rem;
            margin: 0.75rem 0 0;
            line-height: 1.5;
            opacity: 0.85;
        }

        .success-card {
            text-align: center;
            padding: 1.5rem 1rem;
        }
        .success-emoji {
            font-size: 3.5rem;
            margin-bottom: 0.5rem;
            animation: pop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .success-eyebrow {
            color: #16a34a;
            font-weight: 800;
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
        }
        .success-title {
            font-family: var(--font-headings);
            color: #831843;
            font-size: 1.6rem;
            margin: 0.5rem 0;
        }
        .success-sub { color: #9d174d; font-size: 0.9rem; }
        .success-actions {
            display: flex;
            gap: 0.6rem;
            justify-content: center;
            flex-wrap: wrap;
            margin-top: 1.25rem;
        }
        .success-primary {
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            padding: 0.7rem 1.2rem;
            border-radius: 999px;
            font-weight: 800;
            text-decoration: none;
        }
        .success-secondary {
            color: #9d174d;
            padding: 0.7rem 1rem;
            border-radius: 999px;
            border: 1px solid rgba(244, 114, 182, 0.4);
            text-decoration: none;
            font-weight: 700;
        }
        @keyframes pop {
            from { transform: scale(0.5); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
    `],
})
export class SubscriptionCheckoutComponent implements OnInit, OnDestroy {
    protected readonly FORM_ID = FORM_ID;
    protected readonly INPUTS = INPUTS;

    private route = inject(ActivatedRoute);
    private router = inject(Router);
    private subs = inject(SubscriptionService);
    private mp = inject(MercadoPagoBrickService);
    private toast = inject(ToastService);
    private bootstrap = inject(BusinessBootstrapService);

    protected readonly periodicities: { key: PeriodicityKey; label: string }[] = [
        { key: 'monthly', label: 'Mensual' },
        { key: 'quarterly', label: 'Trimestral' },
        { key: 'annual', label: 'Anual' },
    ];

    protected plan = signal<PlanTierName>('Pro');
    protected periodicity = signal<PeriodicityKey>('monthly');
    protected pricing = signal<SubscriptionPricingDto | null>(null);
    protected pricingError = signal<string | null>(null);
    protected payerEmail = signal<string>('');

    protected status = signal<CheckoutStatus>('loading');
    protected loadError = signal<string | null>(null);
    protected result = signal<PreapprovalSummaryDto | null>(null);
    protected cardForm = signal<import('../../../../core/services/mercadopago-brick.service').MercadoPagoCardFormInstance | null>(null);

    protected currentPlan = computed(() =>
        this.pricing()?.plans.find(p => p.planTier === this.plan()) ?? null,
    );

    protected price = computed(() => {
        const p = this.currentPlan();
        if (!p) return 0;
        switch (this.periodicity()) {
            case 'quarterly': return p.quarterlyPrice;
            case 'annual': return p.annualPrice;
            default: return p.monthlyPrice;
        }
    });

    protected savings = computed(() => {
        const p = this.currentPlan();
        if (!p) return 0;
        const full = p.monthlyPrice * (this.periodicity() === 'quarterly' ? 3 : 12);
        return Math.max(0, full - this.price());
    });

    ngOnInit(): void {
        const params = this.route.snapshot.queryParamMap;
        const plan = (params.get('plan') ?? 'Pro') as PlanTierName;
        const periodicity = (params.get('periodicity') ?? 'monthly') as PeriodicityKey;

        if (!VALID_PLANS.includes(plan)) {
            this.toast.error('Plan no válido.');
            this.router.navigate(['/admin/subscription']);
            return;
        }
        if (!VALID_PERIODICITIES.includes(periodicity)) {
            this.toast.error('Periodicidad no válida.');
            this.router.navigate(['/admin/subscription']);
            return;
        }

        this.plan.set(plan);
        this.periodicity.set(periodicity);

        this.loadPricing();
        this.mountBrick();
    }

    ngOnDestroy(): void {
        this.unmountBrick();
    }

    protected setPeriodicity(key: PeriodicityKey): void {
        this.periodicity.set(key);
    }

    protected planTagline(): string {
        switch (this.plan()) {
            case 'Entrada': return 'Para empezar a vender y entregar.';
            case 'Pro': return 'El plan que usa Regi Bazar. Todo lo importante.';
            case 'Elite': return 'C.A.M.I. y rutas con tráfico en vivo.';
            default: return '';
        }
    }

    protected featuresFor(plan: PlanTierName) {
        const rank: Record<string, number> = { Entrada: 1, Pro: 2, Elite: 3 };
        const planRank = rank[plan] ?? 0;
        return this.bootstrap.featureCatalog().map(f => ({
            ...f,
            enabled: (rank[f.requiredPlan] ?? 0) <= planRank,
        }));
    }

    private loadPricing(): void {
        this.subs.getPricing().subscribe({
            next: pricing => this.pricing.set(pricing),
            error: err =>
                this.pricingError.set(
                    err?.error?.message || 'No se pudo cargar el precio del plan.',
                ),
        });
    }

    protected async mountBrick(): Promise<void> {
        this.status.set('loading');
        this.loadError.set(null);
        this.unmountBrick();

        try {
            await this.mp.load();
            // Espera un frame para que el DOM tenga los placeholders
            await new Promise(r => setTimeout(r, 50));
            const form = this.mp.cardForm({
                amount: this.price().toFixed(2),
                form: {
                    id: FORM_ID,
                    cardNumber: { id: INPUTS.cardNumber, placeholder: 'Número de tarjeta' },
                    expirationDate: { id: INPUTS.expirationDate, placeholder: 'MM/AA' },
                    securityCode: { id: INPUTS.securityCode, placeholder: 'CVV' },
                    cardholderName: {
                        id: INPUTS.cardholderName,
                        placeholder: 'Nombre como aparece en la tarjeta',
                    },
                    issuer: { id: INPUTS.issuer, placeholder: 'Banco emisor' },
                    installments: { id: INPUTS.installments, placeholder: 'Cuotas' },
                    cardholderEmail: {
                        id: INPUTS.cardholderEmail,
                        placeholder: 'Email (para tu comprobante)',
                    },
                },
                callbacks: {
                    onFormMounted: (err: unknown) => {
                        if (err) {
                            console.error('[MP] brick mount error', err);
                            this.loadError.set(
                                'Mercado Pago no pudo iniciar el formulario de pago. Recarga la página.',
                            );
                            this.status.set('error');
                        } else {
                            this.status.set('ready');
                        }
                    },
                    onFetching: () => () => undefined,
                },
            });
            this.cardForm.set(form);
        } catch (err: any) {
            console.error('[MP] error al cargar el brick', err);
            this.loadError.set(
                err?.error?.message ||
                err?.message ||
                'No se pudo cargar el formulario de pago.',
            );
            this.status.set('error');
        }
    }

    private unmountBrick(): void {
        const form = this.cardForm();
        if (form) {
            try { form.unmount(); } catch { /* ignore */ }
            this.cardForm.set(null);
        }
    }

    protected submit(): void {
        const form = this.cardForm();
        if (!form) {
            this.toast.show('Espera a que cargue el formulario de pago.', 'warning');
            return;
        }
        const email = (this.payerEmail() || '').trim();
        if (!email || !email.includes('@')) {
            this.toast.show('Necesitamos un email válido para el comprobante.', 'warning');
            return;
        }
        const data = form.getCardFormData() as {
            token?: string;
            paymentMethodId?: string;
        };
        if (!data.token) {
            this.toast.show('Completa los datos de tu tarjeta.', 'warning');
            return;
        }

        this.status.set('submitting');
        const req: CreatePreapprovalRequest = {
            planTier: this.plan(),
            periodicity: this.periodicity() as PeriodicityName,
            payerEmail: email,
            cardTokenId: data.token,
        };

        this.subs.createPreapproval(req).subscribe({
            next: summary => {
                this.result.set(summary);
                this.status.set('success');
                this.unmountBrick();
                this.celebrate();
                this.bootstrap.refresh();
            },
            error: err => {
                this.status.set('ready');
                const message =
                    err?.error?.message ||
                    err?.message ||
                    'No pudimos procesar el pago. Revisa los datos e inténtalo de nuevo.';
                this.toast.show(message, 'error');
            },
        });
    }

    private celebrate(): void {
        try {
            const duration = 1500;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };
            const randomInRange = (min: number, max: number) =>
                Math.random() * (max - min) + min;

            const interval = window.setInterval(() => {
                const timeLeft = animationEnd - Date.now();
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    return;
                }
                const particleCount = 50 * (timeLeft / duration);
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
                    colors: ['#ec4899', '#f9a8d4', '#be185d', '#fbcfe8', '#fff'],
                });
                confetti({
                    ...defaults,
                    particleCount,
                    origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
                    colors: ['#ec4899', '#f9a8d4', '#be185d', '#fbcfe8', '#fff'],
                });
            }, 250);
        } catch (e) {
            console.warn('[checkout] confetti no se pudo lanzar', e);
        }
    }
}
