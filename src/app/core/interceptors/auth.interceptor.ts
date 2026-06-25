import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

const PUBLIC_PATH_PATTERNS = [
    '/pedido/',
    '/repartidor/',
    '/tanda-view/',
    '/live/',
];

/**
 * Inyecta Authorization (JWT del Account) en TODAS las llamadas autenticadas
 * y X-Business-Id en las llamadas a /api/** de admin. Las vistas públicas
 * (pedido/repartidor/tanda-view/live) van por token de recurso y NO
 * necesitan X-Business-Id ni el JWT del Account.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(AuthService);
    const token = auth.getToken();
    const businessId = auth.getActiveBusinessId();
    const isApiAdmin = req.url.includes('/api/');
    const isPublic = PUBLIC_PATH_PATTERNS.some(p => req.url.includes(p));

    const headers: Record<string, string> = {};
    if (token && !isPublic) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (token && isApiAdmin && !isPublic && businessId !== null) {
        headers['X-Business-Id'] = String(businessId);
    }

    if (Object.keys(headers).length === 0) {
        return next(req);
    }

    const cloned = req.clone({ setHeaders: headers });
    return next(cloned);
};
