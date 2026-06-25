import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { BusinessBootstrapService } from '../services/business-bootstrap.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const toast = inject(ToastService);
    const router = inject(Router);
    const bootstrap = inject(BusinessBootstrapService);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                if (!req.url.includes('/auth/')) {
                    auth.logout();
                    toast.show('Tu sesion expiro. Vuelve a entrar 🎀', 'error');
                }
            } else if (error.status === 403) {
                toast.show(error.error?.message || 'No tienes permiso para eso', 'error');
            } else if (error.status === 402) {
                // 402 = middleware de SubscriptionLock. Refrescamos el bootstrap
                // para que el paywall se monte de inmediato y mandamos al owner
                // a la pagina "Mi Plan" si es que no esta ahi ya.
                bootstrap.refresh();
                const url = router.url;
                if (!url.startsWith('/admin/subscription')) {
                    router.navigate(['/admin/subscription']);
                }
                toast.show(
                    error.error?.message || 'Tu suscripcion esta bloqueada. Elige un plan para continuar.',
                    'warning',
                );
            }
            return throwError(() => error);
        })
    );
};
