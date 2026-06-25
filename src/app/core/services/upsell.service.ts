import { Injectable, signal } from '@angular/core';
import { PlanTierName } from '../../core/models';

export interface UpsellRequest {
    featureKey: string;
    featureLabel: string;
    requiredPlan: PlanTierName;
}

@Injectable({ providedIn: 'root' })
export class UpsellService {
    private _request = signal<UpsellRequest | null>(null);
    readonly request = this._request.asReadonly();

    open(featureKey: string, featureLabel: string, requiredPlan: PlanTierName): void {
        this._request.set({ featureKey, featureLabel, requiredPlan });
    }

    close(): void {
        this._request.set(null);
    }
}
