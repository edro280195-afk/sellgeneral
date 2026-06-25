import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BrandDto, BusinessMeDto } from '../models';

@Injectable({ providedIn: 'root' })
export class BrandService {
    private http = inject(HttpClient);
    private base = environment.apiUrl;

    getMe(): Observable<BusinessMeDto> {
        return this.http.get<BusinessMeDto>(`${this.base}/business/me`);
    }

    createBusiness(req: { name: string; city?: string }): Observable<{
        businessId: number;
        name: string;
        slug: string;
        role: string;
    }> {
        return this.http.post<{ businessId: number; name: string; slug: string; role: string }>(
            `${this.base}/business`,
            req,
        );
    }

    updateBrand(req: {
        name?: string;
        brandPrimaryColor?: string;
        brandAccentColor?: string;
    }): Observable<BrandDto> {
        return this.http.put<BrandDto>(`${this.base}/business/brand`, req);
    }

    uploadLogo(file: File): Observable<{ kind: string; url: string }> {
        const form = new FormData();
        form.append('file', file);
        return this.http.post<{ kind: string; url: string }>(
            `${this.base}/business/brand/logo`,
            form,
        );
    }

    uploadBanner(file: File): Observable<{ kind: string; url: string }> {
        const form = new FormData();
        form.append('file', file);
        return this.http.post<{ kind: string; url: string }>(
            `${this.base}/business/brand/banner`,
            form,
        );
    }
}
