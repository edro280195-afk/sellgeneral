import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    LoginRequest,
    LoginResponse,
    RegisterRequest,
    PhoneOtpRequest,
    PhoneOtpResponse,
    PhoneOtpVerifyRequest,
    FacebookLoginRequest,
    AuthMembershipDto,
} from '../models';

const STORAGE_KEYS = {
    token: 'rb_token',
    name: 'rb_name',
    expires: 'rb_expires',
    accountId: 'rb_account_id',
    memberships: 'rb_memberships',
    activeBusinessId: 'rb_active_business_id',
} as const;

@Injectable({ providedIn: 'root' })
export class AuthService {
    private http = inject(HttpClient);
    private router = inject(Router);

    private _token = signal<string | null>(this.stored(STORAGE_KEYS.token));
    private _accountId = signal<number | null>(this.storedNumber(STORAGE_KEYS.accountId));
    private _displayName = signal<string>(this.stored(STORAGE_KEYS.name) ?? '');
    private _memberships = signal<AuthMembershipDto[]>(this.storedMemberships());
    private _activeBusinessId = signal<number | null>(this.storedNumber(STORAGE_KEYS.activeBusinessId));
    private _expiresAt = signal<string | null>(this.stored(STORAGE_KEYS.expires));

    readonly token = this._token.asReadonly();
    readonly accountId = this._accountId.asReadonly();
    readonly displayName = this._displayName.asReadonly();
    readonly memberships = this._memberships.asReadonly();
    readonly activeBusinessId = this._activeBusinessId.asReadonly();
    readonly expiresAt = this._expiresAt.asReadonly();

    readonly isLoggedIn = computed(() => {
        const token = this._token();
        const exp = this._expiresAt();
        if (!token || !exp) return false;
        return new Date(exp) > new Date();
    });

    readonly currentRole = computed(() => {
        const id = this._activeBusinessId();
        if (id === null) return 'None';
        return this._memberships().find(m => m.businessId === id)?.role ?? 'None';
    });

    constructor() {
        // Al cargar el servicio, si hay sesion guardada pero activeBusinessId
        // no esta seteado (caso tipico de upgrades de sesion vieja), lo
        // autocompletamos con la primera membership para que el backend no
        // rechace las llamadas autenticadas con 400 por X-Business-Id faltante.
        if (this.isLoggedIn() && this._activeBusinessId() === null) {
            const first = this._memberships()[0];
            if (first) {
                this.setActiveBusiness(first.businessId);
            }
        }
    }

    // ── Endpoints ──

    login(req: LoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, req)
            .pipe(tap(res => this.handleLoginSuccess(res)));
    }

    register(req: RegisterRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/register`, req)
            .pipe(tap(res => this.handleLoginSuccess(res)));
    }

    requestPhoneOtp(req: PhoneOtpRequest): Observable<PhoneOtpResponse> {
        return this.http.post<PhoneOtpResponse>(`${environment.apiUrl}/auth/phone/request-otp`, req);
    }

    verifyPhoneOtp(req: PhoneOtpVerifyRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/phone/verify`, req)
            .pipe(tap(res => this.handleLoginSuccess(res)));
    }

    facebookLogin(req: FacebookLoginRequest): Observable<LoginResponse> {
        return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/facebook`, req)
            .pipe(tap(res => this.handleLoginSuccess(res)));
    }

    // ── Sesion ──

    handleLoginSuccess(res: LoginResponse): void {
        this._token.set(res.token);
        this._accountId.set(res.accountId);
        this._displayName.set(res.name);
        this._memberships.set(res.memberships ?? []);
        this._expiresAt.set(res.expiresAt);

        this.persist(STORAGE_KEYS.token, res.token);
        this.persist(STORAGE_KEYS.accountId, String(res.accountId));
        this.persist(STORAGE_KEYS.name, res.name);
        this.persist(STORAGE_KEYS.expires, res.expiresAt);
        this.persistMemberships(res.memberships ?? []);

        // Si el Account no tiene memberships todavia (caso FE-2 post-registro),
        // el activeBusinessId queda en null y el guard lo manda al wizard.
        // Si tiene 1 sola, la elegimos. Si tiene varias, FE-5 mostrara el selector.
        const memberships = res.memberships ?? [];
        if (memberships.length === 1) {
            this.setActiveBusiness(memberships[0].businessId);
        } else if (memberships.length > 1) {
            // Conserva el actual si sigue siendo valido; si no, toma el primero.
            const current = this._activeBusinessId();
            const stillValid = current !== null &&
                memberships.some(m => m.businessId === current);
            if (!stillValid) {
                this.setActiveBusiness(memberships[0].businessId);
            }
        } else {
            this.setActiveBusiness(null);
        }
    }

    setActiveBusiness(businessId: number | null): void {
        this._activeBusinessId.set(businessId);
        if (businessId === null) {
            this.remove(STORAGE_KEYS.activeBusinessId);
        } else {
            this.persist(STORAGE_KEYS.activeBusinessId, String(businessId));
        }
    }

    /** Devuelve true si el Account autenticado tiene al menos una membership Owner/Admin. */
    hasOwnerMembership(): boolean {
        return this._memberships().some(m =>
            m.role === 'Owner' || m.role === 'Admin');
    }

    logout(): void {
        this._token.set(null);
        this._accountId.set(null);
        this._displayName.set('');
        this._memberships.set([]);
        this._activeBusinessId.set(null);
        this._expiresAt.set(null);

        Object.values(STORAGE_KEYS).forEach(k => this.remove(k));
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return this._token();
    }

    getActiveBusinessId(): number | null {
        return this._activeBusinessId();
    }

    // ── Storage helpers ──

    private persist(key: string, value: string): void {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.setItem(key, value);
        } catch { /* storage may be unavailable in SSR/test */ }
    }

    private remove(key: string): void {
        if (typeof localStorage === 'undefined') return;
        try {
            localStorage.removeItem(key);
        } catch { /* ignore */ }
    }

    private stored(key: string): string | null {
        if (typeof localStorage === 'undefined') return null;
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    private storedNumber(key: string): number | null {
        const raw = this.stored(key);
        if (raw === null) return null;
        const n = Number(raw);
        return Number.isFinite(n) ? n : null;
    }

    private persistMemberships(memberships: AuthMembershipDto[]): void {
        try {
            this.persist(STORAGE_KEYS.memberships, JSON.stringify(memberships));
        } catch {
            // ignore serialization errors
        }
    }

    private storedMemberships(): AuthMembershipDto[] {
        const raw = this.stored(STORAGE_KEYS.memberships);
        if (!raw) return [];
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    }
}
