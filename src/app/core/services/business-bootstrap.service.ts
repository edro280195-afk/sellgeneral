import { Injectable, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { tap, catchError, of } from 'rxjs';
import { BrandService } from './brand.service';
import { SubscriptionService } from './subscription.service';
import { BusinessMeDto, SubscriptionAccountStateDto } from '../models';

const FEATURE_LABELS: Record<string, { label: string; emoji: string; plan: 'Entrada' | 'Pro' | 'Elite' }> = {
    ManualOrders: { label: 'Pedidos manuales', emoji: '📝', plan: 'Entrada' },
    ClientDirectory: { label: 'Directorio de clientas', emoji: '👩‍💼', plan: 'Entrada' },
    PublicTrackingLink: { label: 'Link público de rastreo', emoji: '🔗', plan: 'Entrada' },
    OrderStatusPush: { label: 'Notificaciones push de pedido', emoji: '🔔', plan: 'Entrada' },
    ClientAccount: { label: 'Cuenta para la clienta', emoji: '👛', plan: 'Entrada' },
    Loyalty: { label: 'RegiPuntos / Lealtad', emoji: '💖', plan: 'Entrada' },
    LivePush: { label: 'Lives (captura de pedidos)', emoji: '📺', plan: 'Pro' },
    LiveGpsTracking: { label: 'GPS en vivo durante el live', emoji: '📍', plan: 'Pro' },
    Financials: { label: 'Finanzas y gastos', emoji: '💰', plan: 'Pro' },
    TandasRaffles: { label: 'Tandas y sorteos', emoji: '🎉', plan: 'Pro' },
    Pos: { label: 'Punto de venta', emoji: '🛒', plan: 'Pro' },
    FacebookImport: { label: 'Importar clientas de Facebook', emoji: '📥', plan: 'Pro' },
    VipDrops: { label: 'Lanzamientos VIP', emoji: '👑', plan: 'Pro' },
    CamiAssistant: { label: 'Asistente C.A.M.I.', emoji: '✦', plan: 'Elite' },
    TrafficRouteOptimization: { label: 'Optimización de rutas con tráfico', emoji: '🚦', plan: 'Elite' },
    Exports: { label: 'Exportar reportes', emoji: '📤', plan: 'Elite' },
    PrioritySupport: { label: 'Soporte prioritario', emoji: '🛟', plan: 'Elite' },
};

export interface FeatureDescriptor {
    key: string;
    label: string;
    emoji: string;
    requiredPlan: 'Entrada' | 'Pro' | 'Elite';
    enabled: boolean;
}

@Injectable({ providedIn: 'root' })
export class BusinessBootstrapService {
    private brand = inject(BrandService);
    private subs = inject(SubscriptionService);

    private _me = signal<BusinessMeDto | null>(null);
    private _state = signal<SubscriptionAccountStateDto | null>(null);
    private _loaded = signal(false);
    private _loading = signal(false);
    private _error = signal<string | null>(null);

    readonly me = this._me.asReadonly();
    readonly subscription = this._state.asReadonly();
    readonly loaded = this._loaded.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly features = computed(() => this._me()?.features ?? []);
    readonly isLocked = computed(() => this._state()?.isLocked ?? false);
    readonly effectivePlan = computed(() => this._state()?.effectivePlan ?? 'Bloqueado');
    readonly planTier = computed(() => this._state()?.planTier ?? 'Bloqueado');
    readonly subscriptionStatus = computed(
        () => this._state()?.subscriptionStatus ?? 'Expired',
    );
    readonly trialEndsAt = computed(() => this._state()?.trialEndsAt ?? null);
    readonly currentPeriodEndsAt = computed(() => this._state()?.currentPeriodEndsAt ?? null);
    readonly pendingPlanTier = computed(() => this._state()?.pendingPlanTier ?? null);
    readonly pendingPlanEffectiveAt = computed(
        () => this._state()?.pendingPlanEffectiveAt ?? null,
    );
    readonly daysLeft = computed(() => this._state()?.daysLeft ?? 0);
    readonly pastDueGraceDays = computed(() => this._state()?.pastDueGraceDays ?? 0);

    readonly featureCatalog = computed<FeatureDescriptor[]>(() => {
        const enabled = new Set(this.features());
        return Object.entries(FEATURE_LABELS)
            .map(([key, info]) => ({
                key,
                label: info.label,
                emoji: info.emoji,
                requiredPlan: info.plan,
                enabled: enabled.has(key),
            }))
            .sort((a, b) => {
                const order: Record<string, number> = { Entrada: 1, Pro: 2, Elite: 3 };
                return (order[a.requiredPlan] ?? 99) - (order[b.requiredPlan] ?? 99);
            });
    });

    load(force = false): void {
        if (this._loading()) return;
        if (this._loaded() && !force) return;
        this._loading.set(true);
        this._error.set(null);

        forkJoin({
            me: this.brand.getMe(),
            state: this.subs.getAccountStatus(),
        })
            .pipe(
                tap(({ me, state }) => {
                    this._me.set(me);
                    this._state.set(state);
                    this._loaded.set(true);
                }),
                catchError(err => {
                    this._error.set(
                        err?.error?.message ||
                        'No se pudo cargar el estado del negocio. Intenta de nuevo.',
                    );
                    return of(null);
                }),
            )
            .subscribe({
                complete: () => this._loading.set(false),
            });
    }

    refresh(): void {
        this._loaded.set(false);
        this.load(true);
    }

    applyMe(me: BusinessMeDto, state: SubscriptionAccountStateDto): void {
        this._me.set(me);
        this._state.set(state);
        this._loaded.set(true);
    }

    reset(): void {
        this._me.set(null);
        this._state.set(null);
        this._loaded.set(false);
        this._loading.set(false);
        this._error.set(null);
    }

    hasFeature(feature: string): boolean {
        return this.features().includes(feature);
    }
}
