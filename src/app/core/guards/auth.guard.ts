import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isLoggedIn()) {
        return router.parseUrl('/login');
    }

    // Si el Account autenticado no tiene memberships, mandamos al wizard
    // de FE-2. Asi el guard no protege al onboarding; protege al admin.
    if (!auth.hasOwnerMembership() && !auth.memberships().some(m => m.role === 'Driver' || m.role === 'Scaner')) {
        return router.parseUrl('/onboarding');
    }

    const role = auth.currentRole();
    const url = state.url;

    if (role === 'Driver' && !url.startsWith('/admin/routes')) {
        return router.parseUrl('/admin/routes');
    }
    if (role === 'Scaner' && !url.startsWith('/pos-mobile')) {
        return router.parseUrl('/pos-mobile/home');
    }

    return true;
};
