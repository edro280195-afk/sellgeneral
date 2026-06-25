import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BrandService } from '../../../core/services/brand.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthMembershipDto, SubscriptionSummaryDto } from '../../../core/models';

type WizardStep = 'datos' | 'marca' | 'listo';

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

                            @case ('listo') {
                                <div class="text-center py-6">
                                    <div class="text-6xl mb-4">🎉</div>
                                    <h1 class="text-2xl font-bold text-gray-800 mb-2">¡Listo!</h1>
                                    <p class="text-gray-600 mb-1">
                                        Tu tienda
                                        <span class="font-semibold text-pink-600">{{ createdName() }}</span>
                                        ya está activa.
                                    </p>
                                    @if (subscription()?.trialEndsAt) {
                                        <p class="text-pink-500 font-medium">
                                            Tienes {{ daysLeft() }} días de prueba Pro.
                                        </p>
                                    } @else {
                                        <p class="text-gray-500 text-sm">
                                            Tu plan Pro está activo.
                                        </p>
                                    }

                                    <button
                                        type="button"
                                        class="btn-coquette btn-pink w-full justify-center py-3 mt-6"
                                        (click)="goToPanel()">
                                        Entrar al panel
                                        <span>→</span>
                                    </button>
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
            </div>
        </div>
    `
})
export class OnboardingComponent {
    private auth = inject(AuthService);
    private brand = inject(BrandService);
    private toast = inject(ToastService);
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
            },
            error: () => {
                // /me puede fallar si el X-Business-Id no esta en el JWT;
                // igual dejamos al usuario entrar al panel.
                this.creating.set(false);
                this.currentStep.set('listo');
            },
        });
    }

    goToPanel(): void {
        this.router.navigate(['/admin']);
    }
}
