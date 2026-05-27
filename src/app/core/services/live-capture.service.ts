import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    ConfirmLiveCandidateRequest,
    ImportLiveRequest,
    LiveCandidateDto,
    LiveProductDto,
    LiveSessionDto,
    PagedResult
} from '../models';

@Injectable({ providedIn: 'root' })
export class LiveCaptureService {
    private http = inject(HttpClient);
    private readonly base = `${environment.apiUrl}/live`;

    importLive(request: ImportLiveRequest): Observable<LiveSessionDto> {
        return this.http.post<LiveSessionDto>(`${this.base}/import`, request);
    }

    getSession(id: number): Observable<LiveSessionDto> {
        return this.http.get<LiveSessionDto>(`${this.base}/${id}`);
    }

    getProducts(id: number): Observable<LiveProductDto[]> {
        return this.http.get<LiveProductDto[]>(`${this.base}/${id}/products`);
    }

    getCandidates(
        id: number,
        options: {
            page?: number;
            pageSize?: number;
            productId?: number;
            status?: string;
            includeResolution?: boolean;
        } = {}
    ): Observable<PagedResult<LiveCandidateDto>> {
        let params = new HttpParams()
            .set('page', (options.page ?? 1).toString())
            .set('pageSize', (options.pageSize ?? 200).toString())
            .set('includeResolution', (options.includeResolution ?? true).toString());

        if (options.productId) params = params.set('productId', options.productId.toString());
        if (options.status) params = params.set('status', options.status);

        return this.http.get<PagedResult<LiveCandidateDto>>(`${this.base}/${id}/candidates`, { params });
    }

    confirmCandidate(id: number, request: ConfirmLiveCandidateRequest): Observable<LiveCandidateDto> {
        return this.http.post<LiveCandidateDto>(`${this.base}/candidates/${id}/confirm`, request);
    }

    ignoreCandidate(id: number): Observable<LiveCandidateDto> {
        return this.http.post<LiveCandidateDto>(`${this.base}/candidates/${id}/ignore`, {});
    }

    getClip(liveSessionId: number, atSeconds: number, durationSeconds = 5): Observable<Blob> {
        const params = new HttpParams()
            .set('at', Math.max(0, atSeconds).toString())
            .set('duration', durationSeconds.toString());

        return this.http.get(`${this.base}/${liveSessionId}/clip`, {
            params,
            responseType: 'blob'
        });
    }

    clipUrl(liveSessionId: number, atSeconds: number, durationSeconds = 5): string {
        const params = new URLSearchParams({
            at: String(Math.max(0, atSeconds)),
            duration: String(durationSeconds),
        });
        return `${this.base}/${liveSessionId}/clip?${params.toString()}`;
    }
}
