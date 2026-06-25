import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    CreatePreapprovalRequest,
    PreapprovalSummaryDto,
    PlatformMpPublicKeyDto,
    SubscriptionAccountStateDto,
    SubscriptionPricingDto,
    UpdatePreapprovalRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class SubscriptionService {
    private http = inject(HttpClient);
    private base = environment.apiUrl;

    getAccountStatus(): Observable<SubscriptionAccountStateDto> {
        return this.http.get<SubscriptionAccountStateDto>(`${this.base}/business/account-status`);
    }

    getPricing(): Observable<SubscriptionPricingDto> {
        return this.http.get<SubscriptionPricingDto>(`${this.base}/business/subscription/pricing`);
    }

    changePlan(planTier: string): Observable<SubscriptionAccountStateDto> {
        return this.http.put<SubscriptionAccountStateDto>(`${this.base}/business/subscription/plan`, {
            planTier,
        });
    }

    getPlatformPublicKey(): Observable<PlatformMpPublicKeyDto> {
        return this.http.get<PlatformMpPublicKeyDto>(
            `${this.base}/business/subscription/preapproval/public-key`,
        );
    }

    createPreapproval(req: CreatePreapprovalRequest): Observable<PreapprovalSummaryDto> {
        return this.http.post<PreapprovalSummaryDto>(
            `${this.base}/business/subscription/preapproval`,
            req,
        );
    }

    updatePreapproval(req: UpdatePreapprovalRequest): Observable<PreapprovalSummaryDto> {
        return this.http.put<PreapprovalSummaryDto>(
            `${this.base}/business/subscription/preapproval`,
            req,
        );
    }

    cancelPreapproval(): Observable<PreapprovalSummaryDto> {
        return this.http.delete<PreapprovalSummaryDto>(
            `${this.base}/business/subscription/preapproval`,
        );
    }
}
