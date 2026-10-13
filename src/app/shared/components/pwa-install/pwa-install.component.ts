import { Component, inject } from '@angular/core';
import { PwaInstallService } from '../../../core/services/pwa-install.service';

@Component({
    selector: 'app-pwa-install',
    standalone: true,
    template: `
        @if (pwa.canInstall()) {
            <button class="install-button" type="button" (click)="pwa.install()">
                <span class="install-icon">↓</span>
                <span>Instalar app</span>
            </button>
        }
    `,
    styles: [`
        :host { display: inline-flex; }
        .install-button {
            display: inline-flex;
            align-items: center;
            gap: .45rem;
            padding: .6rem .9rem;
            border: 1px solid rgba(255, 0, 114, .16);
            border-radius: 999px;
            color: #b00050;
            background: rgba(255, 255, 255, .82);
            font: 700 .74rem/1 Poppins, sans-serif;
            box-shadow: 0 8px 24px rgba(255, 0, 114, .08);
            transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .install-button:hover {
            transform: translateY(-1px);
            border-color: rgba(255, 0, 114, .35);
            box-shadow: 0 10px 28px rgba(255, 0, 114, .16);
        }
        .install-icon {
            display: grid;
            place-items: center;
            width: 1.25rem;
            height: 1.25rem;
            border-radius: 50%;
            color: #fff;
            background: linear-gradient(135deg, #ff0072, #c70062);
            font-size: 1rem;
        }
    `]
})
export class PwaInstallComponent {
    readonly pwa = inject(PwaInstallService);
}
