import { inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { BusinessBootstrapService } from '../services/business-bootstrap.service';

const SUBSCRIPTION_ALLOWED_ROUTES = new Set([
    '/admin/subscription',
    '/admin/subscription/checkout',
]);

/**
 * Solo permite las páginas de plan y checkout cuando la suscripción está
 * bloqueada. Espera la consulta inicial para evitar que una pantalla interna
 * aparezca antes de conocer el estado de la cuenta.
 */
export const subscriptionGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthService);
    const bootstrap = inject(BusinessBootstrapService);
    const router = inject(Router);

    const requestedPath = state.url.split(/[?#]/, 1)[0].replace(/\/+$/, '');
    if (SUBSCRIPTION_ALLOWED_ROUTES.has(requestedPath)) {
        return true;
    }

    const role = auth.currentRole();
    if (role !== 'Owner' && role !== 'Admin') {
        return true;
    }

    bootstrap.load();

    return toObservable(bootstrap.accessCheckSettled).pipe(
        filter(settled => settled),
        take(1),
        map(() => bootstrap.isLocked() || bootstrap.error() !== null
            ? router.parseUrl('/admin/subscription')
            : true),
    );
};
