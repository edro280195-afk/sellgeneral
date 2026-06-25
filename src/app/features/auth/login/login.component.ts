import { Component, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

type LoginMethod = 'phone' | 'facebook' | 'email';

@Component({
    selector: 'app-login',
    imports: [FormsModule],
    template: `
        <div class="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
            <div class="absolute inset-0 bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
                <div class="absolute top-10 left-10 w-72 h-72 bg-pink-300/30 rounded-full blur-3xl animate-float"></div>
                <div class="absolute bottom-10 right-10 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-float" style="animation-delay: 1s"></div>
                <div class="absolute top-1/2 left-1/3 w-64 h-64 bg-rose-300/20 rounded-full blur-3xl animate-float" style="animation-delay: 2s"></div>
            </div>

            <div class="relative z-10 w-full max-w-md mx-4 animate-scale-in">
                <div class="glass-strong rounded-3xl p-8 shadow-2xl" style="box-shadow: 0 25px 60px rgba(236, 72, 153, 0.15)">
                    <div class="text-center mb-8 animate-slide-down">
                        <div class="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white mb-4 shadow-lg overflow-hidden border-2 border-pink-200">
                            <img src="pwa-icon.png" alt="Regi Bazar" class="w-full h-full object-cover">
                        </div>
                        <h1 class="text-3xl font-bold gradient-text" style="font-family: 'Dancing Script', cursive; font-size: 2.5rem;">
                            Neni's App
                        </h1>
                        <p class="text-pink-400 mt-2 text-sm font-medium">✨ La plataforma de tu tienda ✨</p>
                    </div>

                    <div class="grid grid-cols-3 gap-2 mb-6 bg-pink-50/60 rounded-2xl p-1.5">
                        <button
                            type="button"
                            (click)="setMethod('phone')"
                            class="py-2 rounded-xl text-sm font-medium transition"
                            [class.bg-white]="method() === 'phone'"
                            [class.shadow]="method() === 'phone'"
                            [class.text-pink-600]="method() === 'phone'"
                            [class.text-pink-400]="method() !== 'phone'">
                            📱 Teléfono
                        </button>
                        <button
                            type="button"
                            (click)="setMethod('facebook')"
                            class="py-2 rounded-xl text-sm font-medium transition"
                            [class.bg-white]="method() === 'facebook'"
                            [class.shadow]="method() === 'facebook'"
                            [class.text-pink-600]="method() === 'facebook'"
                            [class.text-pink-400]="method() !== 'facebook'">
                            f Facebook
                        </button>
                        <button
                            type="button"
                            (click)="setMethod('email')"
                            class="py-2 rounded-xl text-sm font-medium transition"
                            [class.bg-white]="method() === 'email'"
                            [class.shadow]="method() === 'email'"
                            [class.text-pink-600]="method() === 'email'"
                            [class.text-pink-400]="method() !== 'email'">
                            ✉️ Correo
                        </button>
                    </div>

                    @if (method() === 'phone') {
                        @if (phoneStep() === 'enter') {
                            <form (ngSubmit)="requestOtp()" class="space-y-4">
                                <div>
                                    <label class="label-coquette">📱 Tu número (con lada)</label>
                                    <input
                                        type="tel"
                                        class="input-coquette"
                                        placeholder="+52 868 ..."
                                        [(ngModel)]="phone"
                                        name="phone"
                                        required
                                        autocomplete="tel" />
                                </div>

                                @if (errorMsg()) {
                                    <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
                                        😿 {{ errorMsg() }}
                                    </div>
                                }

                                <button
                                    type="submit"
                                    class="btn-coquette btn-pink w-full justify-center py-3.5 text-base"
                                    [disabled]="loading()">
                                    @if (loading()) {
                                        <span class="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>Enviando…</span>
                                    } @else {
                                        <span>Enviar código</span>
                                        <span>💌</span>
                                    }
                                </button>
                            </form>
                        } @else {
                            <form (ngSubmit)="verifyOtp()" class="space-y-4">
                                <div>
                                    <label class="label-coquette">🔐 Código de 6 dígitos</label>
                                    <input
                                        type="text"
                                        inputmode="numeric"
                                        maxlength="6"
                                        class="input-coquette text-center tracking-[0.5em] text-lg"
                                        placeholder="••••••"
                                        [(ngModel)]="otpCode"
                                        name="otpCode"
                                        required
                                        autocomplete="one-time-code" />
                                </div>
                                <!-- DEV: mientras el proveedor SMS no esta, el backend
                                     acepta cualquier codigo y crea/autentica un Account
                                     con ese telefono. Lo dejamos visible para pruebas. -->
                                <p class="text-xs text-pink-400 text-center">
                                    // DEV: enviaremos un SMS cuando esté el proveedor listo.
                                </p>

                                @if (errorMsg()) {
                                    <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
                                        😿 {{ errorMsg() }}
                                    </div>
                                }

                                <button
                                    type="submit"
                                    class="btn-coquette btn-pink w-full justify-center py-3.5 text-base"
                                    [disabled]="loading()">
                                    @if (loading()) {
                                        <span class="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                        <span>Verificando…</span>
                                    } @else {
                                        <span>Entrar</span>
                                        <span>💖</span>
                                    }
                                </button>
                                <button
                                    type="button"
                                    class="text-xs text-pink-400 hover:text-pink-600"
                                    (click)="resetPhoneFlow()">
                                    Cambiar número
                                </button>
                            </form>
                        }
                    } @else if (method() === 'facebook') {
                        <div class="space-y-4">
                            <button
                                type="button"
                                (click)="facebookLogin()"
                                class="w-full py-3.5 rounded-xl font-semibold bg-[#1877F2] text-white hover:opacity-90 transition disabled:opacity-50 flex items-center justify-center gap-2"
                                [disabled]="loading()">
                                @if (loading()) {
                                    <span class="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Conectando…</span>
                                } @else {
                                    <span>Continuar con Facebook</span>
                                }
                            </button>
                            <p class="text-xs text-pink-400 text-center">
                                // DEV: el SDK de Facebook se conecta cuando esté configurado.
                            </p>
                            @if (errorMsg()) {
                                <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
                                    😿 {{ errorMsg() }}
                                </div>
                            }
                        </div>
                    } @else {
                        <form (ngSubmit)="onEmailLogin()" class="space-y-4">
                            <div>
                                <label class="label-coquette">💌 Correo</label>
                                <input
                                    type="email"
                                    class="input-coquette"
                                    placeholder="tu@correo.com"
                                    [(ngModel)]="email"
                                    name="email"
                                    required
                                    autocomplete="email" />
                            </div>
                            <div>
                                <label class="label-coquette">🔐 Contraseña</label>
                                <div class="relative">
                                    <input
                                        [type]="showPassword() ? 'text' : 'password'"
                                        class="input-coquette pr-12"
                                        placeholder="••••••••"
                                        [(ngModel)]="password"
                                        name="password"
                                        required
                                        autocomplete="current-password" />
                                    <button
                                        type="button"
                                        class="absolute right-3 top-1/2 -translate-y-1/2 text-pink-400 hover:text-pink-600 transition-colors"
                                        (click)="showPassword.set(!showPassword())">
                                        {{ showPassword() ? '🙈' : '👁️' }}
                                    </button>
                                </div>
                            </div>
                            @if (errorMsg()) {
                                <div class="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm text-center">
                                    😿 {{ errorMsg() }}
                                </div>
                            }
                            <button
                                type="submit"
                                class="btn-coquette btn-pink w-full justify-center py-3.5 text-base"
                                [disabled]="loading()">
                                @if (loading()) {
                                    <span class="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    <span>Entrando…</span>
                                } @else {
                                    <span>Entrar</span>
                                    <span>💖</span>
                                }
                            </button>
                            <p class="text-xs text-pink-400 text-center">
                                Acceso de equipo. Pronto te llevaremos al panel con teléfono.
                            </p>
                        </form>
                    }
                </div>
            </div>
        </div>
    `
})
export class LoginComponent {
    private auth = inject(AuthService);
    private router = inject(Router);
    private toast = inject(ToastService);

    method = signal<LoginMethod>('phone');
    phoneStep = signal<'enter' | 'verify'>('enter');

    email = '';
    password = '';
    phone = '';
    otpCode = '';

    loading = signal(false);
    errorMsg = signal('');
    showPassword = signal(false);

    setMethod(m: LoginMethod): void {
        this.method.set(m);
        this.errorMsg.set('');
    }

    onEmailLogin(): void {
        if (!this.email || !this.password) {
            this.errorMsg.set('Por favor llena todos los campos 🌸');
            return;
        }
        this.loading.set(true);
        this.errorMsg.set('');

        this.auth.login({ email: this.email, password: this.password }).subscribe({
            next: () => this.afterAuth(),
            error: (err) => {
                this.loading.set(false);
                this.errorMsg.set(err?.error?.message || err?.error || 'Correo o contraseña incorrectos');
            }
        });
    }

    requestOtp(): void {
        if (!this.phone) {
            this.errorMsg.set('Captura tu número 🌸');
            return;
        }
        this.loading.set(true);
        this.errorMsg.set('');

        this.auth.requestPhoneOtp({ phone: this.phone }).subscribe({
            next: (res) => {
                this.loading.set(false);
                if (res.otpRequired) {
                    this.phoneStep.set('verify');
                } else {
                    this.errorMsg.set('No se pudo enviar el código. Intenta con correo.');
                }
            },
            error: (err) => {
                this.loading.set(false);
                this.errorMsg.set(err?.error?.message || 'No se pudo enviar el código');
            }
        });
    }

    verifyOtp(): void {
        if (!this.otpCode || this.otpCode.length !== 6) {
            this.errorMsg.set('El código tiene 6 dígitos 🌸');
            return;
        }
        this.loading.set(true);
        this.errorMsg.set('');

        this.auth.verifyPhoneOtp({ phone: this.phone, code: this.otpCode }).subscribe({
            next: () => {
                this.toast.success('¡Bienvenida! 💖');
                this.afterAuth();
            },
            error: (err) => {
                this.loading.set(false);
                const code = err?.status;
                if (code === 501) {
                    this.errorMsg.set('El proveedor SMS aún no está conectado. Usa correo por ahora.');
                } else {
                    this.errorMsg.set(err?.error?.message || 'Código inválido o expirado');
                }
            }
        });
    }

    facebookLogin(): void {
        this.loading.set(true);
        this.errorMsg.set('');

        // El SDK real de Facebook iria aqui; mientras tanto mandamos un token
        // dummy y dejamos que el backend responda 501 para confirmar el wiring.
        this.auth.facebookLogin({ accessToken: 'dev-fb-token' }).subscribe({
            next: () => {
                this.toast.success('¡Bienvenida! 💖');
                this.afterAuth();
            },
            error: (err) => {
                this.loading.set(false);
                if (err?.status === 501) {
                    this.errorMsg.set('Facebook Login aún no está conectado. Usa teléfono o correo.');
                } else {
                    this.errorMsg.set(err?.error?.message || 'No se pudo iniciar con Facebook');
                }
            }
        });
    }

    resetPhoneFlow(): void {
        this.phoneStep.set('enter');
        this.otpCode = '';
        this.errorMsg.set('');
    }

    private afterAuth(): void {
        // Si el Account autenticado NO tiene memberships (caso FE-2
        // onboarding), lo mandamos al wizard. Si ya es Owner/Admin/Driver,
        // al panel.
        if (!this.auth.hasOwnerMembership()) {
            this.router.navigate(['/onboarding']);
            return;
        }

        const role = this.auth.currentRole();
        if (role === 'Driver') {
            this.router.navigate(['/admin/routes']);
        } else if (role === 'Scaner') {
            this.router.navigate(['/pos']);
        } else {
            this.router.navigate(['/admin']);
        }
    }
}
