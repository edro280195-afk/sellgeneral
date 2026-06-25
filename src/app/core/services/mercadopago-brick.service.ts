import { Injectable, inject, signal } from '@angular/core';
import { loadMercadoPago } from '@mercadopago/sdk-js';
import { SubscriptionService } from './subscription.service';

export interface MercadoPagoCardFormData {
    token: string;
    paymentMethodId: string;
    issuerId: string | null;
    installments: string;
}

export interface MercadoPagoCardFormCallbacks {
    onFormMounted?: (error: unknown) => void;
    onSubmit?: (event: Event) => void;
    onFetching?: (resource: string) => () => void;
    onError?: (error: unknown) => void;
}

export interface MercadoPagoCardFormOptions {
    amount: string;
    form: {
        id: string;
        cardNumber: { id: string; placeholder?: string };
        expirationDate: { id: string; placeholder?: string };
        securityCode: { id: string; placeholder?: string };
        cardholderName: { id: string; placeholder?: string };
        issuer: { id: string; placeholder?: string };
        installments: { id: string; placeholder?: string };
        cardholderEmail?: { id: string; placeholder?: string };
    };
    callbacks?: MercadoPagoCardFormCallbacks;
}

export interface MercadoPagoCardFormInstance {
    getCardFormData: () => Partial<MercadoPagoCardFormData>;
    unmount: () => void;
}

declare global {
    interface Window {
        MercadoPago?: new (publicKey: string, options?: { locale?: string }) => {
            cardForm: (opts: MercadoPagoCardFormOptions) => MercadoPagoCardFormInstance;
            fields: {
                createCardToken: (
                    data: Record<string, string>,
                    callback: (error: unknown, token: string) => void,
                ) => void;
            };
        };
    }
}

const SDK_SCRIPT_ID = 'mp-sdk-script';
const SDK_URL = 'https://sdk.mercadopago.com/js/v2';

@Injectable({ providedIn: 'root' })
export class MercadoPagoBrickService {
    private subs = inject(SubscriptionService);

    private _mp: unknown | null = null;
    private _publicKey = signal<string | null>(null);
    private _locale = 'es-MX';
    private _scriptLoading: Promise<void> | null = null;

    readonly publicKey = this._publicKey.asReadonly();

    /**
     * Carga el SDK de MercadoPago y la PublicKey de PLATAFORMA expuesta por
     * el backend (NUNCA la del tenant). Idempotente: si ya esta cargado
     * no vuelve a pedir nada.
     */
    async load(): Promise<{ publicKey: string }> {
        if (!this._publicKey()) {
            const key = await new Promise<string>((resolve, reject) => {
                this.subs.getPlatformPublicKey().subscribe({
                    next: dto => resolve(dto.publicKey),
                    error: err => reject(err),
                });
            });
            this._publicKey.set(key);
        }

        if (!this._mp) {
            await this.ensureScript();
            const MercadoPagoCtor = window.MercadoPago;
            if (!MercadoPagoCtor) {
                throw new Error('El SDK de MercadoPago cargo pero no expone el constructor global.');
            }
            this._mp = new MercadoPagoCtor(this._publicKey()!, { locale: this._locale });
        }

        return { publicKey: this._publicKey()! };
    }

    cardForm(options: MercadoPagoCardFormOptions): MercadoPagoCardFormInstance {
        const mp = this._mp as {
            cardForm: (opts: MercadoPagoCardFormOptions) => MercadoPagoCardFormInstance;
        } | null;
        if (!mp) {
            throw new Error('MP no esta listo. Llama load() antes de montar el brick.');
        }
        return mp.cardForm(options);
    }

    private ensureScript(): Promise<void> {
        if (window.MercadoPago) {
            return Promise.resolve();
        }
        if (this._scriptLoading) {
            return this._scriptLoading;
        }
        this._scriptLoading = new Promise<void>((resolve, reject) => {
            const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
            if (existing) {
                existing.addEventListener('load', () => resolve());
                existing.addEventListener(
                    'error',
                    () => reject(new Error('No se pudo cargar el SDK de Mercado Pago')),
                );
                return;
            }
            const script = document.createElement('script');
            script.id = SDK_SCRIPT_ID;
            script.src = SDK_URL;
            script.async = true;
            script.onload = () => {
                loadMercadoPago()
                    .then(() => resolve())
                    .catch(err => reject(err));
            };
            script.onerror = () => reject(new Error('No se pudo cargar el SDK de Mercado Pago'));
            document.head.appendChild(script);
        });
        return this._scriptLoading;
    }
}
