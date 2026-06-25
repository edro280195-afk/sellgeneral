import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { BusinessBootstrapService } from '../services/business-bootstrap.service';

const SUBSCRIPTION_ALLOWED_ROUTES = ['/admin/subscription'];

/**
 * Guard de suscripcion. Se aplica a las rutas internas de /admin/* (excepto
 * la pagina "Mi Plan"). Si la suscripcion del negocio esta bloqueada y el
 * usuario es Owner/Admin, redirige a /admin/subscription donde esta el muro
 * con el CTA de pago. Los Driver/Scaner no se ven afectados.
 */
export const subscriptionGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthService);
    const bootstrap = inject(BusinessBootstrapService);
    const router = inject(Router);

    if (SUBSCRIPTION_ALLOWED_ROUTES.some(r => state.url.startsWith(r))) {
        return true;
    }

    const role = auth.currentRole();
    if (role !== 'Owner' && role !== 'Admin') {
        return true;
    }

    bootstrap.load();
    if (!bootstrap.loaded() && bootstrap.loading()) {
        return true;
    }

    if (bootstrap.isLocked()) {
        return router.parseUrl('/admin/subscription');
    }

    return true;
};
