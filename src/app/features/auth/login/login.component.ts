import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

type LoginMethod = 'phone' | 'email';

@Component({
    selector: 'app-login',
    imports: [FormsModule],
    templateUrl: './login.component.html',
    styleUrl: './login.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {
    private auth = inject(AuthService);
    private router = inject(Router);
    private toast = inject(ToastService);

    method = signal<LoginMethod>('phone');
    phoneStep = signal<'enter' | 'verify'>('enter');
    emailMode = signal<'login' | 'register'>('login');
    otpDevMode = signal(false);

    name = '';
    email = '';
    password = '';
    phone = '';
    otpCode = '';

    loading = signal(false);
    errorMsg = signal('');
    showPassword = signal(false);

    setMethod(method: LoginMethod): void {
        this.method.set(method);
        this.errorMsg.set('');
    }

    setEmailMode(mode: 'login' | 'register'): void {
        this.emailMode.set(mode);
        this.errorMsg.set('');
    }

    openRegistration(): void {
        this.method.set('email');
        this.setEmailMode('register');
    }

    submitEmail(): void {
        if (!this.email || !this.password) {
            this.errorMsg.set('Completa tu correo y contraseña.');
            return;
        }

        if (this.emailMode() === 'register' && !this.name.trim()) {
            this.errorMsg.set('Captura tu nombre.');
            return;
        }

        if (this.emailMode() === 'register' && this.password.length < 8) {
            this.errorMsg.set('La contraseña debe tener al menos 8 caracteres.');
            return;
        }

        this.loading.set(true);
        this.errorMsg.set('');

        const request = this.emailMode() === 'register'
            ? this.auth.register({
                name: this.name.trim(),
                email: this.email,
                password: this.password,
            })
            : this.auth.login({ email: this.email, password: this.password });

        request.subscribe({
            next: () => {
                if (this.emailMode() === 'register') {
                    this.toast.success('Cuenta creada. Ahora registra tu tienda.');
                }
                this.afterAuth();
            },
            error: (error) => {
                this.loading.set(false);
                this.errorMsg.set(
                    error?.error?.message ||
                    error?.error ||
                    (this.emailMode() === 'register'
                        ? 'No se pudo crear la cuenta.'
                        : 'El correo o la contraseña no coinciden.'),
                );
            },
        });
    }

    requestOtp(): void {
        if (!this.phone) {
            this.errorMsg.set('Captura tu número de teléfono.');
            return;
        }

        this.loading.set(true);
        this.errorMsg.set('');

        this.auth.requestPhoneOtp({ phone: this.phone }).subscribe({
            next: (response) => {
                this.loading.set(false);
                if (response.otpRequired) {
                    this.otpDevMode.set(response.devMode);
                    this.phoneStep.set('verify');
                } else {
                    this.errorMsg.set('No se pudo enviar el código. Intenta con correo.');
                }
            },
            error: (error) => {
                this.loading.set(false);
                this.errorMsg.set(error?.error?.message || 'No se pudo enviar el código.');
            },
        });
    }

    verifyOtp(): void {
        if (!this.otpCode || this.otpCode.length !== 6) {
            this.errorMsg.set('El código debe tener 6 dígitos.');
            return;
        }

        this.loading.set(true);
        this.errorMsg.set('');

        this.auth.verifyPhoneOtp({ phone: this.phone, code: this.otpCode }).subscribe({
            next: () => {
                this.toast.success('¡Bienvenida a Neni’s!');
                this.afterAuth();
            },
            error: (error) => {
                this.loading.set(false);
                if (error?.status === 501) {
                    this.errorMsg.set('El envío de SMS aún no está disponible. Usa el acceso por correo.');
                } else {
                    this.errorMsg.set(error?.error?.message || 'El código no es válido o ya venció.');
                }
            },
        });
    }

    resetPhoneFlow(): void {
        this.phoneStep.set('enter');
        this.otpDevMode.set(false);
        this.otpCode = '';
        this.errorMsg.set('');
    }

    private afterAuth(): void {
        // Las cuentas sin membresías deben completar primero el registro de su tienda.
        if (this.auth.memberships().length === 0) {
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
