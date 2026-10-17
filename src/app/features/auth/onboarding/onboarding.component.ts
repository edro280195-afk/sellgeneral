import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BrandService } from '../../../core/services/brand.service';
import {
    AuthMembershipDto,
    BusinessOnboardingResponse,
    SubscriptionSummaryDto,
} from '../../../core/models';

type WizardStep = 'datos' | 'listo';

@Component({
    selector: 'app-onboarding',
    imports: [FormsModule],
    template: `
        <div class="min-h-screen bg-gradient-to-br from-pink-50 via-rose-50 to-purple-50 py-6 px-4">
            <div class="max-w-5xl mx-auto">
                <!-- Stepper -->
                <div class="flex items-center justify-center gap-2 mb-6">
                    @for (s of steps; track s.id; let i = $index) {
                        <div class="flex items-center gap-2">
                            <div
                                class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition"
                                [class.bg-pink-500]="currentStep() === s.id"
                                [class.text-white]="currentStep() === s.id"
                                [class.bg-pink-200]="currentStep() !== s.id && isStepReached(s.id)"
                                [class.text-pink-700]="currentStep() !== s.id && isStepReached(s.id)"
                                [class.bg-gray-200]="!isStepReached(s.id)"
                                [class.text-gray-500]="!isStepReached(s.id)">
                                {{ i + 1 }}
                            </div>
                            <span class="text-sm font-medium hidden sm:inline"
                                [class.text-pink-600]="currentStep() === s.id"
                                [class.text-gray-500]="currentStep() !== s.id">
                                {{ s.label }}
                            </span>
                            @if (i < steps.length - 1) {
                                <div class="w-8 h-0.5 bg-pink-200"></div>
                            }
                        </div>
                    }
                </div>

                @if (currentStep() !== 'listo') {
                    <div class="max-w-2xl mx-auto">
                        <!-- Form column -->
                        <div class="bg-white rounded-3xl shadow-xl p-6 sm:p-8">
                            @switch (currentStep()) {
                                @case ('datos') {
                                    <h1 class="text-2xl font-bold text-gray-800 mb-1">Cuéntanos de tu tienda</h1>
                                    <p class="text-gray-500 text-sm mb-6">Lo básico para empezar. El resto lo afinamos después.</p>

                                    <form (ngSubmit)="nextFromDatos()" class="space-y-4">
                                        <div>
                                            <label class="label-coquette">🏷️ Nombre de la tienda</label>
                                            <input
                                                type="text"
                                                class="input-coquette"
                                                placeholder="Mi tiendita"
                                                [(ngModel)]="name"
                                                name="name"
                                                maxlength="150"
                                                required />
                                            <p class="text-xs text-gray-400 mt-1">Lo verán tus clientas en cada pedido.</p>
                                        </div>

                                        <div>
                                            <label class="label-coquette">📍 Ciudad (opcional)</label>
                                            <input
                                                type="text"
                                                class="input-coquette"
                                                placeholder="Nuevo Laredo"
                                                [(ngModel)]="city"
                                                name="city"
                                                maxlength="120" />
                                        </div>

                                        @if (errorMsg()) {
                                            <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                                                {{ errorMsg() }}
                                            </div>
                                        }

                                        <button
                                            type="submit"
                                            class="btn-coquette btn-pink w-full justify-center py-3"
                                            [disabled]="creating()">
                                            @if (creating()) {
                                                <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                <span>Creando tu tienda…</span>
                                            } @else {
                                                <span>Crear mi tienda</span>
                                                <span>✨</span>
                                            }
                                        </button>
                                    </form>
                                }
                            }
                        </div>
                    </div>
                } @else {
                    <!-- ═══════════ PASO FINAL: PRUEBA ACTIVA ═══════════ -->
                    <div class="done-wrap animate-slide-up">
                        <!-- Celebración -->
                        <section class="done-hero">
                            <div class="done-emoji-ring">
                                <span class="done-emoji">✨</span>
                                <span class="ring-dot d1"></span>
                                <span class="ring-dot d2"></span>
                                <span class="ring-dot d3"></span>
                            </div>
                            <p class="done-eyebrow">Tu tienda está lista</p>
                            <h1 class="done-title">¡Bienvenida a Neni's App!</h1>
                            <p class="done-store">
                                <span class="done-store-name">{{ createdName() }}</span>
                                ya quedó creada. Puedes configurar tu tienda después.
                            </p>

                            @if (isTrialActive()) {
                                <div class="done-trial">
                                    <span class="done-trial-icon">🎁</span>
                                    <div>
                                        <strong>Tu prueba Pro de 14 días ya está activa.</strong>
                                        <p>Te quedan {{ daysLeft() }} {{ daysLeft() === 1 ? 'día' : 'días' }} para usar todas las herramientas, sin costo ni tarjeta.</p>
                                    </div>
                                </div>
                            } @else if (subscription()?.isLocked === false) {
                                <div class="done-trial">
                                    <span class="done-trial-icon">💖</span>
                                    <div>
                                        <strong>Tu tienda ya está activa.</strong>
                                        <p>Puedes empezar a capturar pedidos de inmediato.</p>
                                    </div>
                                </div>
                            } @else {
                                <div class="done-trial">
                                    <span class="done-trial-icon">🌸</span>
                                    <div>
                                        <strong>No pudimos activar la prueba en esta cuenta.</strong>
                                        <p>Tu tienda se creó, pero necesita una revisión antes de empezar a usarse.</p>
                                    </div>
                                </div>
                            }

                            @if (isTrialActive()) {
                                <p class="done-note">
                                    Al terminar la prueba, si no contratas un plan, se bloqueará el acceso a tu tienda y a los enlaces que compartiste.
                                </p>
                            }
                        </section>

                        <!-- Acciones -->
                        <section class="done-actions">
                            @if (subscription()?.isLocked === false) {
                                <button
                                    type="button"
                                    class="done-primary"
                                    (click)="goToCapture()">
                                    Empezar a capturar
                                    <span>→</span>
                                </button>
                            } @else {
                                <button
                                    type="button"
                                    class="done-primary"
                                    (click)="goToSubscription()">
                                    Revisar opciones de activación
                                    <span>→</span>
                                </button>
                            }
                        </section>
                    </div>
                }
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }

        /* ═══════ PASO FINAL ═══════ */
        .done-wrap {
            max-width: 680px;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 2rem;
        }

        /* ── Héroe ── */
        .done-hero {
            text-align: center;
            background: linear-gradient(160deg, rgba(255,255,255,0.9), rgba(253,242,248,0.9));
            border: 1px solid rgba(249,168,212,0.25);
            border-radius: 2rem;
            padding: 2.5rem 1.5rem 2rem;
            box-shadow: 0 20px 50px -20px rgba(236,72,153,0.25);
            position: relative;
            overflow: hidden;
        }

        .done-emoji-ring {
            position: relative;
            width: 84px;
            height: 84px;
            margin: 0 auto 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .done-emoji {
            width: 84px;
            height: 84px;
            border-radius: 999px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.4rem;
            background: linear-gradient(135deg, #fce7f3, #ede9fe);
            border: 2px solid rgba(236,72,153,0.25);
            box-shadow: 0 10px 30px -8px rgba(236,72,153,0.4);
            animation: bounceIn 0.6s ease-out forwards;
        }

        .ring-dot {
            position: absolute;
            border-radius: 999px;
            animation: sparkle 2.4s ease-in-out infinite;
        }
        .ring-dot.d1 { width: 12px; height: 12px; top: 2px; left: 12px; background: #f9a8d4; }
        .ring-dot.d2 { width: 8px; height: 8px; top: 8px; right: 8px; background: #a78bfa; animation-delay: 0.6s; }
        .ring-dot.d3 { width: 10px; height: 10px; bottom: 6px; left: 22px; background: #fda4af; animation-delay: 1.2s; }

        .done-eyebrow {
            font-size: 0.72rem;
            font-weight: 800;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #ec4899;
            margin: 0 0 0.35rem;
        }

        .done-title {
            font-family: var(--font-headings);
            font-size: clamp(1.9rem, 4vw, 2.7rem);
            color: #831843;
            margin: 0 0 0.6rem;
            background: linear-gradient(135deg, #be185d, #7c3aed);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .done-store {
            color: #9d174d;
            font-size: 1.02rem;
            margin: 0 0 1.25rem;
        }
        .done-store-name {
            font-weight: 800;
            color: #be185d;
        }

        .done-trial {
            display: inline-flex;
            align-items: center;
            gap: 0.85rem;
            text-align: left;
            background: #fdf2f8;
            border: 1px solid rgba(244,114,182,0.25);
            border-radius: 1.1rem;
            padding: 0.85rem 1.15rem;
            max-width: 460px;
        }
        .done-trial-icon { font-size: 1.5rem; }
        .done-trial strong { color: #be185d; font-size: 0.95rem; }
        .done-trial p { color: #9d174d; font-size: 0.82rem; margin: 0; }

        /* ── Acciones ── */
        .done-actions {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.85rem;
            padding-bottom: 1rem;
        }
        .done-primary {
            background: linear-gradient(135deg, #f472b6, #ec4899, #be185d);
            color: white;
            border: none;
            padding: 0.95rem 2.4rem;
            border-radius: 999px;
            font-weight: 800;
            font-size: 1.02rem;
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            box-shadow: 0 16px 34px -12px rgba(190,24,93,0.55);
            cursor: pointer;
            transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .done-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 20px 42px -12px rgba(190,24,93,0.65);
        }
        .done-note {
            color: #9d174d;
            font-size: 0.8rem;
            opacity: 0.75;
            margin: 0;
        }
    `],
})
export class OnboardingComponent {
    private auth = inject(AuthService);
    private brand = inject(BrandService);
    private router = inject(Router);

    readonly steps: { id: WizardStep; label: string }[] = [
        { id: 'datos', label: 'Datos' },
        { id: 'listo', label: 'Listo' },
    ];

    currentStep = signal<WizardStep>('datos');

    // Step 1
    name = '';
    city = '';

    // Final step
    createdName = signal<string>('');
    subscription = signal<SubscriptionSummaryDto | null>(null);
    creating = signal(false);
    errorMsg = signal<string>('');
    readonly daysLeft = computed(() => this.subscription()?.daysLeft ?? 0);
    readonly isTrialActive = computed(() => {
        const subscription = this.subscription();
        return subscription?.subscriptionStatus === 'Trialing' &&
            subscription.isLocked === false &&
            subscription.trialEndsAt !== null;
    });

    // ── Step navigation ──

    nextFromDatos(): void {
        const n = this.name.trim();
        if (!n) {
            this.errorMsg.set('El nombre de la tienda es obligatorio 🌸');
            return;
        }
        if (n.length > 150) {
            this.errorMsg.set('El nombre no puede exceder 150 caracteres');
            return;
        }
        this.createBusiness();
    }

    isStepReached(id: WizardStep): boolean {
        const order: WizardStep[] = ['datos', 'listo'];
        const current = order.indexOf(this.currentStep());
        const target = order.indexOf(id);
        return target <= current;
    }

    // ── Create business + finalize ──

    createBusiness(): void {
        if (this.creating()) return;

        this.creating.set(true);
        this.errorMsg.set('');

        this.brand.createBusiness({ name: this.name.trim(), city: this.city.trim() || undefined })
            .subscribe({
                next: (created) => {
                    this.createdName.set(created.name);
                    this.finishBusinessCreation(created);
                },
                error: (err) => {
                    this.creating.set(false);
                    this.errorMsg.set(err?.error?.message || 'No se pudo crear la tienda');
                },
            });
    }

    private finishBusinessCreation(created: BusinessOnboardingResponse): void {
        // Refrescar memberships + active business localmente (no tenemos
        // endpoint de refresh de JWT todavia; el panel funciona porque el
        // backend valida la membership contra la DB, no contra el JWT).
        const newMembership: AuthMembershipDto = {
            businessId: created.businessId,
            businessName: created.name,
            role: created.role,
        };
        const updated = [
            newMembership,
            ...this.auth.memberships().filter(m => m.businessId !== created.businessId),
        ];
        this.auth.setActiveBusiness(created.businessId);
        try {
            localStorage.setItem('rb_memberships', JSON.stringify(updated));
        } catch { /* ignore */ }

        const trial = created.subscription;
        this.subscription.set({
            effectivePlan: trial.effectivePlan,
            subscriptionStatus: trial.subscriptionStatus,
            trialEndsAt: trial.trialEndsAt,
            currentPeriodEndsAt: trial.currentPeriodEndsAt,
            isLocked: trial.isLocked,
            daysLeft: trial.daysLeft,
            pastDueGraceDays: trial.pastDueGraceDays,
        });
        this.creating.set(false);
        this.currentStep.set('listo');
    }

    goToCapture(): void {
        this.router.navigate(['/admin/capture']);
    }

    goToSubscription(): void {
        this.router.navigate(['/admin/subscription']);
    }
}
