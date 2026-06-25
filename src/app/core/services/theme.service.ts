import { Injectable, computed, effect, inject } from '@angular/core';
import { BusinessBootstrapService } from './business-bootstrap.service';

const STYLE_ID = 'nenis-brand-theme';

const DEFAULT_PRIMARY = '#FF0072';
const DEFAULT_ACCENT = '#6D28D9';

@Injectable({ providedIn: 'root' })
export class ThemeService {
    private bootstrap = inject(BusinessBootstrapService);

    readonly primary = computed(() => this.bootstrap.me()?.brand.brandPrimaryColor || DEFAULT_PRIMARY);
    readonly accent = computed(() => this.bootstrap.me()?.brand.brandAccentColor || DEFAULT_ACCENT);
    readonly name = computed(() => this.bootstrap.me()?.name ?? '');
    readonly logoUrl = computed(() => this.bootstrap.me()?.brand.logoUrl ?? null);
    readonly bannerUrl = computed(() => this.bootstrap.me()?.brand.bannerUrl ?? null);

    constructor() {
        effect(() => {
            this.applyTheme(this.primary(), this.accent());
        });
    }

    /**
     * Aplica la paleta de la marca como CSS custom properties en :root.
     * Las sombras (50-900) se derivan del primary; el accent se mantiene.
     */
    applyTheme(primaryHex: string, accentHex: string | null): void {
        if (typeof document === 'undefined') return;
        const accent = accentHex || DEFAULT_ACCENT;
        const shades = this.buildShades(primaryHex);
        const accentShades = this.buildShades(accent);

        let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
        if (!style) {
            style = document.createElement('style');
            style.id = STYLE_ID;
            document.head.appendChild(style);
        }

        style.textContent = `
            :root {
                --brand-primary: ${primaryHex};
                --brand-accent: ${accent};
                --brand-primary-50: ${shades[50]};
                --brand-primary-100: ${shades[100]};
                --brand-primary-200: ${shades[200]};
                --brand-primary-300: ${shades[300]};
                --brand-primary-400: ${shades[400]};
                --brand-primary-500: ${shades[500]};
                --brand-primary-600: ${shades[600]};
                --brand-primary-700: ${shades[700]};
                --brand-primary-800: ${shades[800]};
                --brand-primary-900: ${shades[900]};
                --brand-accent-50: ${accentShades[50]};
                --brand-accent-500: ${accentShades[500]};
                --brand-accent-700: ${accentShades[700]};
            }
        `;
    }

    /**
     * Construye una paleta de 9 tonos a partir de un color base. Usa HSL
     * para mantener la percepcion de la marca: aclara mezclando con blanco
     * y oscurece mezclando con negro.
     */
    private buildShades(hex: string): Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string> {
        const { h, s, l } = this.hexToHsl(hex);
        const targets: Record<number, number> = {
            50: 96,
            100: 92,
            200: 84,
            300: 74,
            400: 60,
            500: Math.max(35, Math.min(55, l)),
            600: Math.max(28, l - 8),
            700: Math.max(22, l - 16),
            800: Math.max(16, l - 24),
            900: Math.max(10, l - 32),
        };
        const out: Record<number, string> = {};
        for (const key of Object.keys(targets)) {
            out[+key] = this.hslToHex(h, s, targets[+key]);
        }
        return out as Record<50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900, string>;
    }

    private hexToHsl(hex: string): { h: number; s: number; l: number } {
        const value = hex.replace('#', '');
        const r = parseInt(value.substring(0, 2), 16) / 255;
        const g = parseInt(value.substring(2, 4), 16) / 255;
        const b = parseInt(value.substring(4, 6), 16) / 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0;
        let s = 0;
        const l = (max + min) / 2;
        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    private hslToHex(h: number, s: number, l: number): string {
        h = ((h % 360) + 360) % 360;
        s = Math.max(0, Math.min(100, s)) / 100;
        l = Math.max(0, Math.min(100, l)) / 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
        const m = l - c / 2;
        let r = 0, g = 0, b = 0;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        const toHex = (v: number) => {
            const n = Math.round((v + m) * 255);
            return Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
        };
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
    }
}
