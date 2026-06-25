import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UpsellService } from '../../../core/services/upsell.service';
import { BusinessBootstrapService } from '../../../core/services/business-bootstrap.service';

@Component({
    selector: 'app-upsell-modal',
    imports: [RouterLink],
    template: `
        @if (upsell.request(); as req) {
            <div class="upsell-backdrop" (click)="onBackdrop($event)">
                <div class="upsell-card" role="dialog" aria-modal="true">
                    <button type="button" class="upsell-close" (click)="upsell.close()" aria-label="Cerrar">×</button>

                    <div class="upsell-emoji">
                        @switch (req.requiredPlan) {
                            @case ('Elite') { 👑 }
                            @case ('Pro') { ✦ }
                            @default { 🔒 }
                        }
                    </div>

                    <p class="upsell-eyebrow">Función Pro / Elite</p>
                    <h2 class="upsell-title">Desbloquea {{ req.featureLabel }}</h2>
                    <p class="upsell-sub">
                        Esta función está en el plan <strong>{{ req.requiredPlan }}</strong>.
                        Tu plan actual es
                        <strong>{{ bootstrap.effectivePlan() }}</strong>
                        — sube de plan para acceder.
                    </p>

                    <ul class="upsell-perks">
                        <li>💖 Más funciones para tu negocio</li>
                        <li>🔁 Se cobra recurrente con Mercado Pago</li>
                        <li>↩️ Puedes bajar de plan cuando quieras</li>
                    </ul>

                    <div class="upsell-actions">
                        <a
                            routerLink="/admin/subscription"
                            (click)="upsell.close()"
                            class="upsell-primary">
                            Ver planes
                        </a>
                        <button type="button" class="upsell-secondary" (click)="upsell.close()">
                            Ahora no
                        </button>
                    </div>
                </div>
            </div>
        }
    `,
    styles: [`
        :host { display: contents; }
        .upsell-backdrop {
            position: fixed;
            inset: 0;
            z-index: 70;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1.5rem;
            background: rgba(157, 23, 77, 0.18);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            animation: fadeIn 0.2s ease;
        }
        .upsell-card {
            max-width: 440px;
            width: 100%;
            background: white;
            border-radius: 2rem;
            padding: 2rem 1.75rem;
            text-align: center;
            position: relative;
            box-shadow: 0 30px 80px -20px rgba(190, 24, 93, 0.4);
            border: 1px solid rgba(244, 114, 182, 0.25);
            animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .upsell-close {
            position: absolute;
            top: 0.75rem;
            right: 1rem;
            background: transparent;
            border: none;
            color: #9d174d;
            font-size: 1.6rem;
            line-height: 1;
            cursor: pointer;
            padding: 0.25rem 0.5rem;
        }
        .upsell-emoji {
            font-size: 3rem;
            margin: 0.5rem 0;
        }
        .upsell-eyebrow {
            color: var(--brand-primary, #ec4899);
            font-weight: 800;
            font-size: 0.7rem;
            letter-spacing: 0.2em;
            text-transform: uppercase;
            margin: 0;
        }
        .upsell-title {
            font-family: var(--font-headings);
            color: #831843;
            font-size: 1.5rem;
            margin: 0.5rem 0;
        }
        .upsell-sub {
            color: #9d174d;
            font-size: 0.9rem;
            margin: 0 0 1rem;
        }
        .upsell-perks {
            list-style: none;
            padding: 0;
            margin: 0 0 1.25rem;
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            text-align: left;
        }
        .upsell-perks li {
            background: #fdf2f8;
            padding: 0.5rem 0.85rem;
            border-radius: 0.65rem;
            font-size: 0.85rem;
            color: #831843;
        }
        .upsell-actions {
            display: flex;
            gap: 0.5rem;
            flex-wrap: wrap;
            justify-content: center;
        }
        .upsell-primary {
            background: linear-gradient(135deg, var(--brand-primary, #ec4899), var(--brand-primary-700, #be185d));
            color: white;
            padding: 0.7rem 1.25rem;
            border-radius: 999px;
            font-weight: 800;
            text-decoration: none;
            box-shadow: 0 10px 22px -10px rgba(190, 24, 93, 0.5);
        }
        .upsell-secondary {
            background: transparent;
            border: 1px solid rgba(244, 114, 182, 0.4);
            color: #9d174d;
            padding: 0.7rem 1.1rem;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
        }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop {
            from { opacity: 0; transform: scale(0.92) translateY(20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }
    `],
})
export class UpsellModalComponent {
    protected upsell = inject(UpsellService);
    protected bootstrap = inject(BusinessBootstrapService);
    private router = inject(Router);

    protected onBackdrop(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.upsell.close();
        }
    }
}
