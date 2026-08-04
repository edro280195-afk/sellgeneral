import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { BrandService } from '../../../core/services/brand.service';
import { ToastService } from '../../../core/services/toast.service';
import { SubscriptionService } from '../../../core/services/subscription.service';
import {
    AuthMembershipDto,
    PlanTierName,
    SubscriptionPricingDto,
    SubscriptionSummaryDto,
} from '../../../core/models';

type WizardStep = 'datos' | 'marca' | 'listo';

interface PlanHighlight {
    icon: string;
    bullets: string[];
    tagline: string;
}

const PLAN_HIGHLIGHTS: Record<string, PlanHighlight> = {
    'Básico': {
        icon: '🌱',
        tagline: 'Para empezar a vender y entregar.',
        bullets: [
            'Pedidos manuales y directorio de clientas',
            'Link público de rastreo',
            'Notificaciones push de pedido',
            'Cuenta para la clienta y RegiPuntos',
        ],
    },
    'Pro': {
        icon: '💖',
        tagline: 'El favorito de las vendedoras. Todo lo importante.',
        bullets: [
            'Todo lo de Básico',
            'Lives con captura de pedidos',
            'Finanzas, tandas y sorteos',
            'Punto de venta y lanzamientos VIP',
        ],
    },
    'Elite': {
        icon: '👑',
        tagline: 'Máximo poder: C.A.M.I. y rutas con tráfico.',
        bullets: [
            'Todo lo de Pro',
            'Asistente C.A.M.I.',
            'Optimización de rutas con tráfico',
            'Exportar reportes y soporte prioritario',
        ],
    },
};

@Component({
    selector: 'app-onboarding',
    imports: [FormsModule, RouterLink, DecimalPipe],
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
                    <div class="grid lg:grid-cols-2 gap-6">
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
                                            class="btn-coquette btn-pink w-full justify-center py-3">
                                            Siguiente
                                            <span>→</span>
                                        </button>
                                    </form>
                                }

                                @case ('marca') {
                                    <h1 class="text-2xl font-bold text-gray-800 mb-1">Tu marca</h1>
                                    <p class="text-gray-500 text-sm mb-6">Elige un color y, si quieres, sube tu logo. Puedes cambiarlo después.</p>

                                    <div class="space-y-4">
                                        <div>
                                            <label class="label-coquette">🎨 Color principal</label>
                                            <div class="flex items-center gap-3">
                                                <input
                                                    type="color"
                                                    class="w-14 h-14 rounded-xl border-2 border-pink-200 cursor-pointer"
                                                    [value]="primaryColor()"
                                                    (input)="onColorChange($event)" />
                                                <input
                                                    type="text"
                                                    class="input-coquette flex-1 font-mono"
                                                    [value]="primaryColor()"
                                                    (change)="onColorTextChange($event)"
                                                    maxlength="7"
                                                    placeholder="#6C4AE0" />
                                            </div>
                                        </div>

                                        <div>
                                            <label class="label-coquette">🖼️ Logo (opcional)</label>
                                            <input
                                                #logoInput
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                class="hidden"
                                                (change)="onLogoSelected($event)" />
                                            <button
                                                type="button"
                                                class="w-full py-3 rounded-xl border-2 border-dashed border-pink-200 text-pink-600 hover:bg-pink-50 transition flex items-center justify-center gap-2"
                                                (click)="logoInput.click()"
                                                [disabled]="uploading()">
                                                @if (uploading() && uploadingKind() === 'logo') {
                                                    <span class="inline-block w-4 h-4 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin"></span>
                                                    <span>Subiendo…</span>
                                                } @else if (logoUrl()) {
                                                    <span>✓ Logo listo · cambiar</span>
                                                } @else {
                                                    <span>Subir logo (png/jpg/webp, max 2MB)</span>
                                                }
                                            </button>
                                        </div>

                                        <div>
                                            <label class="label-coquette">🌅 Banner (opcional)</label>
                                            <input
                                                #bannerInput
                                                type="file"
                                                accept="image/png,image/jpeg,image/webp"
                                                class="hidden"
                                                (change)="onBannerSelected($event)" />
                                            <button
                                                type="button"
                                                class="w-full py-3 rounded-xl border-2 border-dashed border-pink-200 text-pink-600 hover:bg-pink-50 transition flex items-center justify-center gap-2"
                                                (click)="bannerInput.click()"
                                                [disabled]="uploading()">
                                                @if (uploading() && uploadingKind() === 'banner') {
                                                    <span class="inline-block w-4 h-4 border-2 border-pink-300 border-t-pink-600 rounded-full animate-spin"></span>
                                                    <span>Subiendo…</span>
                                                } @else if (bannerUrl()) {
                                                    <span>✓ Banner listo · cambiar</span>
                                                } @else {
                                                    <span>Subir banner (png/jpg/webp, max 5MB)</span>
                                                }
                                            </button>
                                        </div>

                                        @if (errorMsg()) {
                                            <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                                                {{ errorMsg() }}
                                            </div>
                                        }

                                        <div class="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                class="flex-1 py-3 rounded-xl border-2 border-pink-200 text-pink-600 hover:bg-pink-50 transition"
                                                (click)="back()">
                                                ← Atrás
                                            </button>
                                            <button
                                                type="button"
                                                class="flex-1 btn-coquette btn-pink justify-center py-3"
                                                [disabled]="creating()"
                                                (click)="createBusiness()">
                                                @if (creating()) {
                                                    <span class="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                                    <span>Creando…</span>
                                                } @else {
                                                    <span>Crear mi tienda</span>
                                                    <span>✨</span>
                                                }
                                            </button>
                                        </div>
                                    </div>
                                }
                            }
                        </div>

                        <!-- Preview column -->
                        <div class="hidden lg:block">
                            <div class="sticky top-6">
                                <p class="text-xs uppercase tracking-wider text-pink-500 font-semibold mb-3 text-center">Vista previa</p>
                                <div class="rounded-3xl shadow-xl overflow-hidden bg-white">
                                    <div
                                        class="h-32 bg-cover bg-center"
                                        [style.background-image]="bannerUrl() ? 'url(' + bannerUrl() + ')' : 'linear-gradient(135deg, ' + primaryColor() + ', ' + primaryColor() + 'cc)'">
                                    </div>
                                    <div class="p-4">
                                        <div class="flex items-center gap-3 -mt-12 mb-3">
                                            <div
                                                class="w-16 h-16 rounded-2xl border-4 border-white shadow-md flex items-center justify-center text-white text-xl font-bold"
                                                [style.background-color]="primaryColor()">
                                                @if (logoUrl()) {
                                                    <img [src]="logoUrl()" alt="logo" class="w-full h-full rounded-xl object-cover" />
                                                } @else {
                                                    {{ initials() }}
                                                }
                                            </div>
                                            <div class="pt-10">
                                                <h3 class="font-bold text-gray-800">{{ name || 'Tu tienda' }}</h3>
                                                @if (city) {
                                                    <p class="text-sm text-gray-500">📍 {{ city }}</p>
                                                }
                                            </div>
                                        </div>
                                        <div
                                            class="rounded-xl p-3 text-white text-sm font-medium"
                                            [style.background-color]="primaryColor()">
                                            Botón principal (color de tu marca)
                                        </div>
                                    </div>
                                    <div class="px-4 pb-4">
                                        <p class="text-xs text-gray-400 text-center">Así se verá la cabecera de tu panel con la marca que elijas.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                } @else {
                    <!-- ═══════════ PASO FINAL: ¡TIENDA LISTA + PLANES ═══════════ -->
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
                                ya está activa y puede recibir pedidos.
                            </p>

                            @if (subscription()?.trialEndsAt) {
                                <div class="done-trial">
                                    <span class="done-trial-icon">🎁</span>
                                    <div>
                                        <strong>Tienes {{ daysLeft() }} {{ daysLeft() === 1 ? 'día' : 'días' }} de prueba Pro gratis.</strong>
                                        <p>Sin tarjeta, sin costo. Tus pedidos y clientas ya funcionan.</p>
                                    </div>
                                </div>
                            } @else {
                                <div class="done-trial">
                                    <span class="done-trial-icon">💖</span>
                                    <div>
                                        <strong>Tu plan Pro está activo.</strong>
                                        <p>Puedes empezar a capturar pedidos de inmediato.</p>
                                    </div>
                                </div>
                            }
                        </section>

                        <!-- Planes -->
                        <section class="done-plans">
                            <div class="done-plans-head">
                                <h2>Elige el plan que quieres usar</h2>
                                <p>Lo cambias o cancelas cuando quieras. Los precios son en MXN y los fija la plataforma.</p>
                            </div>

                            @if (pricing(); as p) {
                                <div class="done-grid">
                                    @for (plan of p.plans; track plan.planTier) {
                                        <article
                                            class="done-plan"
                                            [class.done-plan-rec]="plan.planTier === 'Pro'"
                                            [style.--plan-accent]="planAccent(plan.planTier)">
                                            @if (plan.planTier === 'Pro') {
                                                <span class="done-plan-flag">Más popular</span>
                                            }
                                            <header class="done-plan-head">
                                                <span class="done-plan-icon">{{ planIcon(plan.planTier) }}</span>
                                                <h3>{{ plan.planTier }}</h3>
                                                <p>{{ planTagline(plan.planTier) }}</p>
                                            </header>

                                            <div class="done-price">
                                                <strong>&#36;{{ plan.monthlyPrice | number: '1.2-2' }}</strong>
                                                <span>/mes</span>
                                            </div>

                                            <ul class="done-feats">
                                                @for (b of planBullets(plan.planTier); track b) {
                                                    <li><span class="done-check">✓</span>{{ b }}</li>
                                                }
                                            </ul>

                                            <a
                                                [routerLink]="['/admin/subscription/checkout']"
                                                [queryParams]="{ plan: plan.planTier, periodicity: 'monthly' }"
                                                class="done-btn"
                                                [class.done-btn-rec]="plan.planTier === 'Pro'">
                                                Elegir {{ plan.planTier }}
                                            </a>
                                        </article>
                                    }
                                </div>
                            } @else if (loadingPlans()) {
                                <div class="done-grid">
                                    @for (i of [1,2,3]; track i) {
                                        <div class="shimmer done-plan h-96 rounded-3xl"></div>
                                    }
                                </div>
                            } @else if (plansError(); as err) {
                                <div class="bg-white rounded-2xl p-5 text-center text-pink-700">
                                    <p>😿 No pudimos cargar los precios.</p>
                                    <p class="text-sm opacity-70 mt-1">{{ err }}</p>
                                    <button class="btn-coquette btn-pink mt-3 px-5" (click)="loadPlans()">Reintentar</button>
                                </div>
                            }
                        </section>

                        <!-- Acciones -->
                        <section class="done-actions">
                            <button
                                type="button"
                                class="done-primary"
                                (click)="goToPanel()">
                                Entrar al panel
                                <span>→</span>
                            </button>
                            <a routerLink="/admin/subscription" class="done-secondary">
                                Comparar todos los planes
                            </a>
                            <p class="done-note">
                                Si aún no eliges plan, sigues en prueba sin bloquearte.
                            </p>
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
            max-width: 960px;
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

        /* ── Planes ── */
        .done-plans-head { text-align: center; margin-bottom: 1.25rem; }
        .done-plans-head h2 {
            font-family: var(--font-headings);
            color: #831843;
            font-size: 1.7rem;
            margin: 0 0 0.25rem;
        }
        .done-plans-head p { color: #9d174d; font-size: 0.9rem; margin: 0; }

        .done-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 1.1rem;
            align-items: stretch;
        }
        @media (max-width: 860px) {
            .done-grid { grid-template-columns: 1fr; }
        }

        .done-plan {
            position: relative;
            display: flex;
            flex-direction: column;
            background: rgba(255,255,255,0.92);
            border: 1.5px solid #fce7f3;
            border-radius: 1.5rem;
            padding: 1.5rem 1.4rem;
            box-shadow: 0 10px 30px -14px rgba(236,72,153,0.18);
            transition: transform 0.3s cubic-bezier(0.175,0.885,0.32,1.275), box-shadow 0.3s ease;
        }
        .done-plan:hover {
            transform: translateY(-4px);
            box-shadow: 0 22px 44px -18px rgba(236,72,153,0.3);
        }

        .done-plan-rec {
            border: 2px solid #ec4899;
            background: linear-gradient(180deg, #fff5f7, rgba(255,255,255,0.96));
            box-shadow: 0 0 0 5px rgba(236,72,153,0.1), 0 24px 50px -18px rgba(236,72,153,0.4);
            transform: translateY(-4px);
        }
        @media (max-width: 860px) {
            .done-plan-rec { transform: none; }
        }

        .done-plan-flag {
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(135deg, #ec4899, #be185d);
            color: white;
            font-size: 0.65rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            padding: 0.3rem 0.85rem;
            border-radius: 999px;
            white-space: nowrap;
            box-shadow: 0 8px 18px -6px rgba(190,24,93,0.5);
        }

        .done-plan-head { text-align: left; }
        .done-plan-icon {
            display: inline-flex;
            width: 46px;
            height: 46px;
            align-items: center;
            justify-content: center;
            border-radius: 1rem;
            font-size: 1.5rem;
            background: color-mix(in srgb, var(--plan-accent) 14%, white);
            border: 1px solid color-mix(in srgb, var(--plan-accent) 30%, white);
        }
        .done-plan-head h3 {
            font-family: var(--font-headings);
            color: #831843;
            font-size: 1.35rem;
            margin: 0.6rem 0 0.15rem;
        }
        .done-plan-head p {
            color: #9d174d;
            font-size: 0.82rem;
            line-height: 1.45;
            margin: 0;
            min-height: 2.3rem;
        }

        .done-price {
            display: flex;
            align-items: baseline;
            gap: 0.3rem;
            margin: 1rem 0 0.9rem;
            padding: 0.7rem 0;
            border-top: 1px dashed #fbcfe8;
            border-bottom: 1px dashed #fbcfe8;
        }
        .done-price strong {
            font-family: var(--font-headings);
            font-size: 2.2rem;
            color: var(--plan-accent, #831843);
            line-height: 1;
        }
        .done-price span { color: #9d174d; font-weight: 600; font-size: 0.85rem; }

        .done-feats {
            list-style: none;
            margin: 0 0 1.25rem;
            padding: 0;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }
        .done-feats li {
            display: flex;
            align-items: flex-start;
            gap: 0.5rem;
            color: #831843;
            font-size: 0.84rem;
            line-height: 1.4;
        }
        .done-check {
            flex-shrink: 0;
            width: 18px;
            height: 18px;
            border-radius: 999px;
            background: color-mix(in srgb, var(--plan-accent) 18%, white);
            color: var(--plan-accent, #be185d);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 0.65rem;
            font-weight: 900;
            margin-top: 0.05rem;
        }

        .done-btn {
            margin-top: auto;
            text-align: center;
            display: block;
            padding: 0.8rem 1rem;
            border-radius: 1rem;
            border: 1.5px solid #f9a8d4;
            color: #831843;
            font-weight: 800;
            font-size: 0.9rem;
            text-decoration: none;
            transition: all 0.25s ease;
        }
        .done-btn:hover {
            background: #fdf2f8;
            transform: translateY(-1px);
        }
        .done-btn-rec {
            background: linear-gradient(135deg, #ec4899, #be185d);
            border: none;
            color: white;
            box-shadow: 0 12px 24px -10px rgba(190,24,93,0.5);
        }
        .done-btn-rec:hover {
            background: linear-gradient(135deg, #db2777, #9d174d);
            box-shadow: 0 16px 30px -10px rgba(190,24,93,0.6);
        }

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
        .done-secondary {
            color: #be185d;
            font-weight: 700;
            font-size: 0.92rem;
            text-decoration: none;
        }
        .done-secondary:hover { text-decoration: underline; }
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
    private toast = inject(ToastService);
    private subs = inject(SubscriptionService);
    private router = inject(Router);

    readonly steps: { id: WizardStep; label: string }[] = [
        { id: 'datos', label: 'Datos' },
        { id: 'marca', label: 'Marca' },
        { id: 'listo', label: 'Listo' },
    ];

    currentStep = signal<WizardStep>('datos');

    // Step 1
    name = '';
    city = '';

    // Step 2
    primaryColor = signal<string>('#6C4AE0');
    logoUrl = signal<string | null>(null);
    bannerUrl = signal<string | null>(null);
    uploading = signal(false);
    uploadingKind = signal<'logo' | 'banner' | null>(null);

    // Step 3
    createdName = signal<string>('');
    subscription = signal<SubscriptionSummaryDto | null>(null);
    creating = signal(false);
    errorMsg = signal<string>('');
    pricing = signal<SubscriptionPricingDto | null>(null);
    loadingPlans = signal(false);
    plansError = signal<string | null>(null);

    readonly initials = computed(() => {
        const n = this.name.trim();
        if (!n) return '✨';
        const parts = n.split(/\s+/).slice(0, 2);
        return parts.map(p => p[0]?.toUpperCase() ?? '').join('') || '✨';
    });

    readonly daysLeft = computed(() => this.subscription()?.daysLeft ?? 0);

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
        this.errorMsg.set('');
        this.currentStep.set('marca');
    }

    back(): void {
        this.currentStep.set('datos');
        this.errorMsg.set('');
    }

    isStepReached(id: WizardStep): boolean {
        const order: WizardStep[] = ['datos', 'marca', 'listo'];
        const current = order.indexOf(this.currentStep());
        const target = order.indexOf(id);
        return target <= current;
    }

    // ── Color picker ──

    onColorChange(ev: Event): void {
        const input = ev.target as HTMLInputElement;
        this.primaryColor.set(input.value);
    }

    onColorTextChange(ev: Event): void {
        const input = ev.target as HTMLInputElement;
        const value = input.value.trim();
        if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            this.primaryColor.set(value.toUpperCase());
        }
    }

    // ── Uploads ──

    onLogoSelected(ev: Event): void {
        const input = ev.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.uploading.set(true);
        this.uploadingKind.set('logo');
        this.errorMsg.set('');
        this.brand.uploadLogo(file).subscribe({
            next: (res) => {
                this.logoUrl.set(res.url);
                this.uploading.set(false);
                this.uploadingKind.set(null);
            },
            error: (err) => {
                this.uploading.set(false);
                this.uploadingKind.set(null);
                this.errorMsg.set(err?.error?.message || 'No se pudo subir el logo');
            },
        });
    }

    onBannerSelected(ev: Event): void {
        const input = ev.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        this.uploading.set(true);
        this.uploadingKind.set('banner');
        this.errorMsg.set('');
        this.brand.uploadBanner(file).subscribe({
            next: (res) => {
                this.bannerUrl.set(res.url);
                this.uploading.set(false);
                this.uploadingKind.set(null);
            },
            error: (err) => {
                this.uploading.set(false);
                this.uploadingKind.set(null);
                this.errorMsg.set(err?.error?.message || 'No se pudo subir el banner');
            },
        });
    }

    // ── Create business + finalize ──

    createBusiness(): void {
        this.creating.set(true);
        this.errorMsg.set('');

        this.brand.createBusiness({ name: this.name.trim(), city: this.city.trim() || undefined })
            .subscribe({
                next: (created) => {
                    this.createdName.set(created.name);

                    // Si subio logo/banner/color, los guardamos ahora. Si no,
                    // saltamos directo al paso 3 igual.
                    this.applyBrandThenShowSuccess(created);
                },
                error: (err) => {
                    this.creating.set(false);
                    this.errorMsg.set(err?.error?.message || 'No se pudo crear la tienda');
                },
            });
    }

    private applyBrandThenShowSuccess(created: { businessId: number; name: string; slug: string; role: string }): void {
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

        const color = this.primaryColor();
        const hasAnyBrand = !!this.logoUrl() || !!this.bannerUrl() || color !== '#6C4AE0';

        if (!hasAnyBrand) {
            this.loadSuccessAndAdvance();
            return;
        }

        // PUT con la marca. Si falla (ej. tenant no ready), no bloqueamos
        // el alta: el panel llega igual y la marca se puede editar despues.
        this.brand.updateBrand({
            name: this.name.trim(),
            brandPrimaryColor: color,
        }).subscribe({
            next: () => this.loadSuccessAndAdvance(),
            error: () => this.loadSuccessAndAdvance(),
        });
    }

    private loadSuccessAndAdvance(): void {
        this.brand.getMe().subscribe({
            next: (me) => {
                this.subscription.set(me.subscription);
                this.creating.set(false);
                this.currentStep.set('listo');
                this.loadPlans();
            },
            error: () => {
                // /me puede fallar si el X-Business-Id no esta en el JWT;
                // igual dejamos al usuario entrar al panel.
                this.creating.set(false);
                this.currentStep.set('listo');
                this.loadPlans();
            },
        });
    }

    loadPlans(): void {
        this.loadingPlans.set(true);
        this.plansError.set(null);
        this.subs.getPricing().subscribe({
            next: pricing => {
                this.pricing.set(pricing);
                this.loadingPlans.set(false);
            },
            error: err => {
                this.loadingPlans.set(false);
                this.plansError.set(
                    err?.error?.message || 'Error desconocido al cargar precios.',
                );
            },
        });
    }

    // ── Helpers visuales de planes ──

    protected planIcon(plan: PlanTierName): string {
        return PLAN_HIGHLIGHTS[plan]?.icon ?? '✨';
    }

    protected planTagline(plan: PlanTierName): string {
        return PLAN_HIGHLIGHTS[plan]?.tagline ?? '';
    }

    protected planBullets(plan: PlanTierName): string[] {
        return PLAN_HIGHLIGHTS[plan]?.bullets ?? [];
    }

    protected planAccent(plan: PlanTierName): string {
        switch (plan) {
            case 'Básico': return '#7c3aed';
            case 'Pro': return '#db2777';
            case 'Elite': return '#b45309';
            default: return '#831843';
        }
    }

    goToPanel(): void {
        this.router.navigate(['/admin']);
    }
}
