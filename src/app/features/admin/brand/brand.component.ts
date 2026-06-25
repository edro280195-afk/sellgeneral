import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrandService } from '../../../core/services/brand.service';
import { BusinessBootstrapService } from '../../../core/services/business-bootstrap.service';
import { ThemeService } from '../../../core/services/theme.service';
import { ToastService } from '../../../core/services/toast.service';

const HEX_RE = /^#([A-Fa-f0-9]{6})$/;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const MAX_BANNER_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

@Component({
    selector: 'app-brand',
    imports: [FormsModule],
    template: `
        <div class="brand-page space-y-6 pb-12">
            <header class="page-header">
                <p class="text-pink-500 font-semibold uppercase tracking-widest text-xs">Identidad</p>
                <h1 class="font-headings text-3xl lg:text-4xl text-pink-900 mt-1">
                    Mi marca <span class="font-accent text-pink-500">🎨</span>
                </h1>
                <p class="text-pink-700/80 mt-2 max-w-2xl">
                    Lo que cambies aquí se aplica en vivo a tu panel y a tu app. La marca
                    es lo que hace único a tu negocio.
                </p>
            </header>

            <div class="brand-grid">
                <!-- ── FORMULARIO ── -->
                <section class="brand-form card-coquette p-6 space-y-5">
                    <div class="field">
                        <label for="brand-name">Nombre del negocio</label>
                        <input
                            id="brand-name"
                            class="text-input"
                            type="text"
                            maxlength="150"
                            [ngModel]="nameDraft()"
                            (ngModelChange)="nameDraft.set($event)" />
                    </div>

                    <div class="color-grid">
                        <div class="field">
                            <label for="brand-primary">Color principal</label>
                            <div class="color-row">
                                <input
                                    id="brand-primary"
                                    class="color-swatch"
                                    type="color"
                                    [ngModel]="primaryDraft()"
                                    (ngModelChange)="primaryDraft.set($event)" />
                                <input
                                    class="text-input hex-input"
                                    type="text"
                                    maxlength="7"
                                    [ngModel]="primaryDraft()"
                                    (ngModelChange)="primaryDraft.set($event.toUpperCase())" />
                            </div>
                            <p class="field-hint">Se usa en botones, acentos y bordes del panel.</p>
                        </div>
                        <div class="field">
                            <label for="brand-accent">Color de acento <span class="muted">(opcional)</span></label>
                            <div class="color-row">
                                <input
                                    id="brand-accent"
                                    class="color-swatch"
                                    type="color"
                                    [ngModel]="accentDraft() || defaultAccent"
                                    (ngModelChange)="accentDraft.set($event)" />
                                <input
                                    class="text-input hex-input"
                                    type="text"
                                    maxlength="7"
                                    [ngModel]="accentDraft()"
                                    (ngModelChange)="accentDraft.set($event.toUpperCase())"
                                    placeholder="Sin acento" />
                            </div>
                            <p class="field-hint">Para CTAs secundarios o detalles de marca.</p>
                        </div>
                    </div>

                    <div class="field">
                        <label>Logo <span class="muted">(png/jpg/webp, máx 2MB)</span></label>
                        <div class="upload-row">
                            <div class="upload-preview">
                                @if (logoPreview()) {
                                    <img [src]="logoPreview()" alt="Logo">
                                } @else {
                                    <span class="muted">Sin logo</span>
                                }
                            </div>
                            <div class="upload-actions">
                                <label class="btn-coquette upload-btn">
                                    Subir logo
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        (change)="onLogoSelected($event)"
                                        hidden />
                                </label>
                                @if (logoPreview()) {
                                    <button type="button" class="upload-clear" (click)="clearLogo()">
                                        Quitar
                                    </button>
                                }
                            </div>
                        </div>
                    </div>

                    <div class="field">
                        <label>Banner <span class="muted">(png/jpg/webp, máx 5MB)</span></label>
                        <div class="upload-row">
                            <div class="banner-preview">
                                @if (bannerPreview()) {
                                    <img [src]="bannerPreview()" alt="Banner">
                                } @else {
                                    <span class="muted">Sin banner</span>
                                }
                            </div>
                            <div class="upload-actions">
                                <label class="btn-coquette upload-btn">
                                    Subir banner
                                    <input
                                        type="file"
                                        accept="image/png,image/jpeg,image/webp"
                                        (change)="onBannerSelected($event)"
                                        hidden />
                                </label>
                                @if (bannerPreview()) {
                                    <button type="button" class="upload-clear" (click)="clearBanner()">
                                        Quitar
                                    </button>
                                }
                            </div>
                        </div>
                    </div>

                    @if (formError(); as e) {
                        <p class="form-error">⚠️ {{ e }}</p>
                    }

                    <div class="form-actions">
                        <button
                            type="button"
                            class="btn-coquette save-btn"
                            [disabled]="saving() || !dirty()"
                            (click)="save()">
                            @if (saving()) {
                                Guardando...
                            } @else {
                                Guardar cambios
                            }
                        </button>
                        <button
                            type="button"
                            class="reset-btn"
                            [disabled]="saving() || !dirty()"
                            (click)="resetDrafts()">
                            Descartar
                        </button>
                    </div>
                </section>

                <!-- ── VISTA PREVIA ── -->
                <aside class="brand-preview card-coquette p-6">
                    <p class="text-pink-500 text-xs font-bold uppercase tracking-widest">Vista previa</p>
                    <h2 class="font-headings text-xl text-pink-900 mb-3">Así se ve tu panel</h2>

                    <div class="preview-window">
                        <div class="preview-sidebar" [style.background]="primaryGradient()">
                            <div class="preview-brand">
                                <div class="preview-logo">
                                    @if (logoPreview()) {
                                        <img [src]="logoPreview()" alt="Logo">
                                    } @else {
                                        {{ previewInitial() }}
                                    }
                                </div>
                                <div>
                                    <p class="preview-name">{{ nameDraft() || 'Mi negocio' }}</p>
                                    <p class="preview-sub">Admin Panel</p>
                                </div>
                            </div>
                        </div>
                        <div class="preview-body" [style.background]="bodyGradient()">
                            @if (bannerPreview()) {
                                <img [src]="bannerPreview()" alt="Banner" class="preview-banner">
                            } @else {
                                <div class="preview-banner preview-banner-fallback"></div>
                            }
                            <div class="preview-content">
                                <p class="preview-hello">Hola, beautiful ✨</p>
                                <p class="preview-meta">Tu panel con la marca de <strong>{{ nameDraft() || 'tu negocio' }}</strong></p>
                                <button class="preview-cta" [style.background]="primaryGradient()">
                                    Acción principal
                                </button>
                                @if (accentDraft()) {
                                    <button class="preview-cta-secondary" [style.background]="accentDraft()">
                                        Acción acento
                                    </button>
                                }
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    `,
    styles: [`
        :host { display: block; }

        .brand-grid {
            display: grid;
            grid-template-columns: minmax(320px, 1fr) minmax(320px, 1fr);
            gap: 1.5rem;
            align-items: start;
        }
        @media (max-width: 900px) {
            .brand-grid { grid-template-columns: 1fr; }
        }

        .field { display: flex; flex-direction: column; gap: 0.4rem; }
        .field label {
            font-weight: 700;
            color: #9d174d;
            font-size: 0.85rem;
        }
        .muted { color: #be185d; font-weight: 500; font-size: 0.75rem; }

        .text-input {
            padding: 0.65rem 0.85rem;
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
        .field-hint { color: #be185d; font-size: 0.75rem; }

        .color-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        @media (max-width: 540px) {
            .color-grid { grid-template-columns: 1fr; }
        }
        .color-row {
            display: flex;
            gap: 0.5rem;
            align-items: stretch;
        }
        .color-swatch {
            width: 50px;
            height: auto;
            border: 1.5px solid #f9a8d4;
            border-radius: 0.7rem;
            cursor: pointer;
            padding: 0;
            background: transparent;
        }
        .hex-input { flex: 1; font-family: monospace; }

        .upload-row {
            display: flex;
            gap: 1rem;
            align-items: center;
        }
        .upload-preview {
            width: 80px;
            height: 80px;
            border-radius: 1rem;
            border: 1.5px dashed #f9a8d4;
            background: #fdf2f8;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .upload-preview img { width: 100%; height: 100%; object-fit: cover; }
        .banner-preview {
            width: 140px;
            height: 70px;
            border-radius: 0.75rem;
            border: 1.5px dashed #f9a8d4;
            background: #fdf2f8;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }
        .banner-preview img { width: 100%; height: 100%; object-fit: cover; }
        .upload-actions {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
        }
        .upload-btn {
            background: white;
            color: #9d174d;
            border: 1.5px solid #f9a8d4;
            padding: 0.5rem 0.85rem;
            border-radius: 0.6rem;
            font-weight: 700;
            font-size: 0.8rem;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
        }
        .upload-btn:hover { background: #fdf2f8; }
        .upload-clear {
            background: transparent;
            border: none;
            color: #b91c1c;
            font-size: 0.8rem;
            text-decoration: underline;
            cursor: pointer;
            text-align: left;
            padding: 0;
        }

        .form-actions {
            display: flex;
            gap: 0.5rem;
            padding-top: 0.5rem;
            border-top: 1px solid rgba(244, 114, 182, 0.15);
        }
        .save-btn {
            background: linear-gradient(135deg, var(--brand-primary-500, #ec4899), var(--brand-primary-700, #be185d));
            color: white;
            border: none;
            padding: 0.7rem 1.2rem;
            border-radius: 0.85rem;
            font-weight: 800;
        }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .reset-btn {
            background: transparent;
            border: 1px solid rgba(244, 114, 182, 0.3);
            color: #9d174d;
            padding: 0.7rem 1rem;
            border-radius: 0.85rem;
            font-weight: 600;
        }
        .reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .form-error {
            background: #fff1f2;
            border: 1px solid rgba(244, 114, 182, 0.3);
            color: #9d174d;
            padding: 0.5rem 0.85rem;
            border-radius: 0.5rem;
            font-size: 0.85rem;
        }

        /* Preview window mock */
        .preview-window {
            border-radius: 1rem;
            overflow: hidden;
            border: 1px solid rgba(244, 114, 182, 0.2);
            box-shadow: 0 8px 24px -10px rgba(190, 24, 93, 0.3);
        }
        .preview-sidebar {
            padding: 1rem;
            color: white;
        }
        .preview-brand {
            display: flex;
            align-items: center;
            gap: 0.6rem;
        }
        .preview-logo {
            width: 36px;
            height: 36px;
            border-radius: 0.75rem;
            background: rgba(255, 255, 255, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 900;
            font-size: 1.1rem;
            overflow: hidden;
        }
        .preview-logo img { width: 100%; height: 100%; object-fit: cover; }
        .preview-name {
            font-family: var(--font-headings);
            font-weight: 900;
            font-size: 1rem;
            margin: 0;
        }
        .preview-sub {
            font-size: 0.65rem;
            letter-spacing: 0.15em;
            text-transform: uppercase;
            opacity: 0.8;
            margin: 0;
        }
        .preview-body { position: relative; min-height: 220px; padding: 0; }
        .preview-banner {
            width: 100%;
            height: 80px;
            object-fit: cover;
            display: block;
        }
        .preview-banner-fallback {
            background:
                radial-gradient(circle at 30% 40%, rgba(255, 255, 255, 0.4), transparent 50%),
                linear-gradient(135deg, var(--brand-primary-300, #f9a8d4), var(--brand-primary-500, #ec4899));
        }
        .preview-content {
            padding: 1rem 1.1rem 1.25rem;
        }
        .preview-hello {
            font-family: var(--font-accent);
            color: var(--brand-primary-500, #ec4899);
            font-size: 1.3rem;
            margin: 0 0 0.15rem;
        }
        .preview-meta {
            color: #9d174d;
            font-size: 0.85rem;
            margin: 0 0 0.85rem;
        }
        .preview-cta {
            color: white;
            padding: 0.45rem 0.95rem;
            border-radius: 999px;
            border: none;
            font-weight: 700;
            font-size: 0.8rem;
            margin-right: 0.4rem;
            cursor: pointer;
        }
        .preview-cta-secondary {
            color: white;
            padding: 0.45rem 0.95rem;
            border-radius: 999px;
            border: none;
            font-weight: 700;
            font-size: 0.8rem;
            cursor: pointer;
        }
    `],
})
export class BrandComponent implements OnInit {
    private brand = inject(BrandService);
    private bootstrap = inject(BusinessBootstrapService);
    private theme = inject(ThemeService);
    private toast = inject(ToastService);

    protected readonly defaultAccent = '#6D28D9';

    protected nameDraft = signal('');
    protected primaryDraft = signal('#FF0072');
    protected accentDraft = signal<string | null>(null);

    protected logoPreview = signal<string | null>(null);
    protected bannerPreview = signal<string | null>(null);

    protected saving = signal(false);
    protected formError = signal<string | null>(null);

    private newLogoFile: File | null = null;
    private newBannerFile: File | null = null;
    private removeLogo = false;
    private removeBanner = false;

    protected dirty = computed(() => {
        const me = this.bootstrap.me();
        if (!me) return false;
        if (this.nameDraft().trim() !== me.name) return true;
        if (this.primaryDraft().toUpperCase() !== me.brand.brandPrimaryColor.toUpperCase()) return true;
        const accent = (this.accentDraft() || '').toUpperCase();
        const currentAccent = (me.brand.brandAccentColor || '').toUpperCase();
        if (accent !== currentAccent) return true;
        if (this.newLogoFile || this.newBannerFile) return true;
        if (this.removeLogo || this.removeBanner) return true;
        return false;
    });

    protected primaryGradient = computed(() => {
        const p = this.primaryDraft();
        return `linear-gradient(180deg, ${this.shade(p, -16)} 0%, ${this.shade(p, -8)} 40%, ${p} 100%)`;
    });

    protected bodyGradient = computed(() => {
        const p = this.primaryDraft();
        return `linear-gradient(160deg, ${this.shade(p, 40, true)} 0%, ${this.shade(p, 35, true)} 30%, ${this.shade(p, 30, true)} 60%, ${this.shade(p, 35, true)} 100%)`;
    });

    protected previewInitial = computed(() => {
        const name = this.nameDraft() || this.theme.name() || 'N';
        return name.charAt(0).toUpperCase();
    });

    ngOnInit(): void {
        this.bootstrap.load();
        const me = this.bootstrap.me();
        if (me) {
            this.nameDraft.set(me.name);
            this.primaryDraft.set(me.brand.brandPrimaryColor);
            this.accentDraft.set(me.brand.brandAccentColor);
            this.logoPreview.set(me.brand.logoUrl);
            this.bannerPreview.set(me.brand.bannerUrl);
        }
    }

    protected onLogoSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        const err = this.validateImage(file, MAX_LOGO_BYTES, 'logo');
        if (err) { this.formError.set(err); return; }
        this.formError.set(null);
        this.newLogoFile = file;
        this.removeLogo = false;
        this.readAsDataUrl(file).then(url => this.logoPreview.set(url));
    }

    protected onBannerSelected(event: Event): void {
        const input = event.target as HTMLInputElement;
        const file = input.files?.[0];
        if (!file) return;
        const err = this.validateImage(file, MAX_BANNER_BYTES, 'banner');
        if (err) { this.formError.set(err); return; }
        this.formError.set(null);
        this.newBannerFile = file;
        this.removeBanner = false;
        this.readAsDataUrl(file).then(url => this.bannerPreview.set(url));
    }

    protected clearLogo(): void {
        this.newLogoFile = null;
        this.removeLogo = true;
        this.logoPreview.set(null);
    }

    protected clearBanner(): void {
        this.newBannerFile = null;
        this.removeBanner = true;
        this.bannerPreview.set(null);
    }

    protected resetDrafts(): void {
        const me = this.bootstrap.me();
        if (!me) return;
        this.nameDraft.set(me.name);
        this.primaryDraft.set(me.brand.brandPrimaryColor);
        this.accentDraft.set(me.brand.brandAccentColor);
        this.logoPreview.set(me.brand.logoUrl);
        this.bannerPreview.set(me.brand.bannerUrl);
        this.newLogoFile = null;
        this.newBannerFile = null;
        this.removeLogo = false;
        this.removeBanner = false;
        this.formError.set(null);
    }

    protected save(): void {
        const me = this.bootstrap.me();
        if (!me) return;

        const primary = this.primaryDraft().toUpperCase();
        const accent = this.accentDraft();
        const name = this.nameDraft().trim();

        if (!HEX_RE.test(primary)) {
            this.formError.set('El color principal debe ser un hex válido (ej. #FF0072).');
            return;
        }
        if (accent && !HEX_RE.test(accent.toUpperCase())) {
            this.formError.set('El color de acento debe ser un hex válido.');
            return;
        }
        if (!name) {
            this.formError.set('El nombre del negocio es obligatorio.');
            return;
        }

        this.saving.set(true);
        this.formError.set(null);

        const tasks: Array<Promise<unknown>> = [];

        if (name !== me.name || primary !== me.brand.brandPrimaryColor.toUpperCase() ||
            (accent || '').toUpperCase() !== (me.brand.brandAccentColor || '').toUpperCase()) {
            tasks.push(
                new Promise<void>((resolve, reject) => {
                    this.brand
                        .updateBrand({
                            name,
                            brandPrimaryColor: primary,
                            brandAccentColor: accent ?? undefined,
                        })
                        .subscribe({ next: () => resolve(), error: err => reject(err) });
                }),
            );
        }
        if (this.newLogoFile) {
            tasks.push(this.brand.uploadLogo(this.newLogoFile).toPromise().then(() => undefined));
        } else if (this.removeLogo) {
            // No hay endpoint "removeLogo" en el backend; el usuario puede dejar vacio subiendo una version vacia.
            // Para esta fase lo dejamos: quitar = no subir, y el cliente conservara el logo previo.
            this.toast.info('Para quitar el logo, sube uno nuevo o contactanos.');
        }
        if (this.newBannerFile) {
            tasks.push(this.brand.uploadBanner(this.newBannerFile).toPromise().then(() => undefined));
        } else if (this.removeBanner) {
            this.toast.info('Para quitar el banner, sube uno nuevo o contactanos.');
        }

        Promise.all(tasks)
            .then(() => {
                this.newLogoFile = null;
                this.newBannerFile = null;
                this.removeLogo = false;
                this.removeBanner = false;
                this.saving.set(false);
                this.toast.success('Marca actualizada. Tu panel ya muestra los cambios.');
                this.bootstrap.refresh();
            })
            .catch((err: { error?: { message?: string } } | undefined) => {
                this.saving.set(false);
                this.formError.set(
                    err?.error?.message || 'No pudimos guardar la marca. Intenta de nuevo.',
                );
            });
    }

    private validateImage(file: File, maxBytes: number, kind: string): string | null {
        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
            return `El ${kind} debe ser png, jpg o webp.`;
        }
        if (file.size > maxBytes) {
            return `El ${kind} pesa más del máximo (${(maxBytes / 1024 / 1024).toFixed(0)}MB).`;
        }
        return null;
    }

    private readAsDataUrl(file: File): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            reader.readAsDataURL(file);
        });
    }

    private shade(hex: string, delta: number, lighten = false): string {
        const value = hex.replace('#', '');
        const r = parseInt(value.substring(0, 2), 16);
        const g = parseInt(value.substring(2, 4), 16);
        const b = parseInt(value.substring(4, 6), 16);
        const f = lighten ? 255 : 0;
        const mix = (c: number) => Math.max(0, Math.min(255, Math.round(c + (f - c) * (Math.abs(delta) / 100))));
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(mix(r))}${toHex(mix(g))}${toHex(mix(b))}`.toUpperCase();
    }
}
