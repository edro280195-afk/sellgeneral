import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

type LoginMethod = 'phone' | 'email';
type AccountMode = 'login' | 'register';

const CURRENT_LEGAL_VERSION = '2026-08-17';

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
    accountMode = signal<AccountMode>('login');

    name = '';
    email = '';
    password = '';
    confirmPassword = '';
    phone = '';
    acceptedTerms = false;
    acceptedPrivacy = false;

    loading = signal(false);
    errorMsg = signal('');
    showPassword = signal(false);

    setMethod(method: LoginMethod): void {
        this.method.set(method);
        this.errorMsg.set('');
    }

    setAccountMode(mode: AccountMode): void {
        this.accountMode.set(mode);
        this.errorMsg.set('');
        if (mode === 'login') {
            this.acceptedTerms = false;
            this.acceptedPrivacy = false;
        }
    }

    submit(): void {
        const isRegistering = this.accountMode() === 'register';
        this.errorMsg.set('');

        if (isRegistering && !this.name.trim()) {
            this.errorMsg.set('Escribe tu nombre para crear la cuenta.');
            return;
        }

        if (this.method() === 'phone') {
            const digits = this.phone.replace(/\D/g, '');
            const nationalPhone = digits.length === 12 && digits.startsWith('52')
                ? digits.slice(2)
                : digits;
            if (!/^\d{10}$/.test(nationalPhone)) {
                this.errorMsg.set('Escribe un teléfono mexicano de 10 dígitos con lada.');
                return;
            }
        } else if (!this.email.trim()) {
            this.errorMsg.set('Escribe tu correo electrónico.');
            return;
        }

        if (!this.password) {
            this.errorMsg.set('Escribe tu contraseña.');
            return;
        }

        if (isRegistering) {
            if (this.password.length < 8 || this.password.length > 128) {
                this.errorMsg.set('La contraseña debe tener entre 8 y 128 caracteres.');
                return;
            }

            if (this.password !== this.confirmPassword) {
                this.errorMsg.set('Las contraseñas no coinciden.');
                return;
            }

            if (!this.acceptedTerms || !this.acceptedPrivacy) {
                this.errorMsg.set('Acepta los Términos de servicio y el Aviso de privacidad para continuar.');
                return;
            }
        }

        this.loading.set(true);

        const request = this.method() === 'phone'
            ? isRegistering
                ? this.auth.registerWithPhone({
                    name: this.name.trim(),
                    phone: this.phone.trim(),
                    password: this.password,
                    acceptedLegal: this.acceptedTerms && this.acceptedPrivacy,
                    legalVersion: CURRENT_LEGAL_VERSION,
                })
                : this.auth.loginWithPhonePassword({ phone: this.phone.trim(), password: this.password })
            : isRegistering
                ? this.auth.register({
                    name: this.name.trim(),
                    email: this.email.trim(),
                    password: this.password,
                    acceptedLegal: this.acceptedTerms && this.acceptedPrivacy,
                    legalVersion: CURRENT_LEGAL_VERSION,
                })
                : this.auth.login({ email: this.email.trim(), password: this.password });

        request.subscribe({
            next: () => {
                this.loading.set(false);
                if (isRegistering) {
                    this.toast.success('Cuenta creada. Ahora registra tu tienda.');
                } else {
                    this.toast.success('¡Bienvenida a Neni’s!');
                }
                this.afterAuth();
            },
            error: (error) => {
                this.loading.set(false);
                this.errorMsg.set(
                    error?.error?.message ||
                    (isRegistering
                        ? 'No se pudo crear la cuenta.'
                        : 'El teléfono/correo o la contraseña no coinciden.'),
                );
            },
        });
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
