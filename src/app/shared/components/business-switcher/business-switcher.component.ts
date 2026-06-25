import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessBootstrapService } from '../../../core/services/business-bootstrap.service';

@Component({
    selector: 'app-business-switcher',
    template: `
        @if (showSwitcher()) {
            <div class="switcher" [class.switcher-open]="open()">
                <button
                    type="button"
                    class="switcher-trigger"
                    (click)="toggle()"
                    [attr.aria-expanded]="open()">
                    <span class="switcher-current-name">{{ currentName() }}</span>
                    <span class="switcher-caret" [class.caret-open]="open()">▾</span>
                </button>
                @if (open()) {
                    <div class="switcher-menu" role="menu">
                        @for (m of memberships(); track m.businessId) {
                            <button
                                type="button"
                                class="switcher-option"
                                [class.option-active]="m.businessId === activeId()"
                                (click)="onPick(m.businessId)">
                                <span class="option-name">{{ m.businessName }}</span>
                                <span class="option-role">{{ m.role }}</span>
                            </button>
                        }
                    </div>
                }
            </div>
        }
    `,
    styles: [`
        :host { display: inline-flex; position: relative; }
        .switcher-trigger {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.4rem 0.8rem;
            background: white;
            border: 1px solid rgba(0, 0, 0, 0.06);
            border-radius: 999px;
            cursor: pointer;
            color: #9d174d;
            font-weight: 700;
            font-size: 0.8rem;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
            transition: all 0.2s ease;
        }
        .switcher-trigger:hover {
            border-color: rgba(236, 72, 153, 0.3);
            box-shadow: 0 4px 14px rgba(236, 72, 153, 0.12);
        }
        .switcher-caret {
            font-size: 0.7rem;
            transition: transform 0.2s ease;
        }
        .caret-open { transform: rotate(180deg); }
        .switcher-menu {
            position: absolute;
            top: calc(100% + 0.5rem);
            right: 0;
            min-width: 220px;
            background: white;
            border-radius: 1rem;
            border: 1px solid rgba(244, 114, 182, 0.2);
            box-shadow: 0 16px 40px -10px rgba(190, 24, 93, 0.3);
            padding: 0.4rem;
            z-index: 80;
            display: flex;
            flex-direction: column;
            gap: 0.2rem;
        }
        .switcher-option {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 0.1rem;
            padding: 0.5rem 0.75rem;
            background: transparent;
            border: none;
            border-radius: 0.6rem;
            cursor: pointer;
            text-align: left;
            transition: background 0.15s ease;
            color: #831843;
        }
        .switcher-option:hover { background: #fdf2f8; }
        .option-active { background: #fce7f3; }
        .option-name { font-weight: 700; font-size: 0.85rem; }
        .option-role {
            font-size: 0.65rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: #be185d;
            font-weight: 700;
        }
    `],
})
export class BusinessSwitcherComponent {
    private auth = inject(AuthService);
    private bootstrap = inject(BusinessBootstrapService);

    protected open = signal(false);

    protected memberships = computed(() => this.auth.memberships());
    protected activeId = computed(() => this.auth.activeBusinessId());
    protected currentName = computed(() => {
        const id = this.activeId();
        if (id === null) return 'Sin negocio';
        return this.memberships().find(m => m.businessId === id)?.businessName
            ?? this.bootstrap.me()?.name
            ?? 'Mi negocio';
    });
    protected showSwitcher = computed(() => this.memberships().length > 1);

    protected toggle(): void {
        this.open.update(v => !v);
    }

    protected onPick(businessId: number): void {
        if (businessId === this.activeId()) {
            this.open.set(false);
            return;
        }
        this.auth.setActiveBusiness(businessId);
        this.bootstrap.refresh();
        this.open.set(false);
    }
}
