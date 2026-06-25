import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { subscriptionGuard } from './core/guards/subscription.guard';

export const routes: Routes = [
    {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
    },
    {
        path: 'onboarding',
        loadComponent: () => import('./features/auth/onboarding/onboarding.component').then(m => m.OnboardingComponent)
    },
    {
        path: 'tanda-view/:token',
        loadComponent: () => import('./features/client/tanda-view/tanda-view.component').then(m => m.TandaViewComponent)
    },
    {
        path: 'admin',
        loadComponent: () => import('./features/admin/layout/layout.component').then(m => m.LayoutComponent),
        canActivate: [authGuard],
        children: [
            {
                path: '',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
            },
            {
                path: 'orders',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/orders/orders.component').then(m => m.OrdersComponent)
            },
            {
                path: 'capture',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/orders/capture-order/capture-order').then(m => m.CaptureOrderComponent)
            },
            {
                path: 'send-links',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/orders/send-links/send-links.component').then(m => m.SendLinksComponent)
            },
            {
                path: 'live/import',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/live/live-import.component').then(m => m.LiveImportComponent)
            },
            {
                path: 'live/:id/review',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/live/live-review.component').then(m => m.LiveReviewComponent)
            },
            {
                path: 'clients',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/clients/clients.component').then(m => m.ClientsComponent)
            },
            {
                path: 'clients/duplicates',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/clients/duplicates/duplicates.component').then(m => m.ClientsDuplicatesComponent)
            },
            {
                path: 'clients/facebook-import',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/clients/facebook-import/facebook-import.component').then(m => m.FacebookImportComponent)
            },
            {
                path: 'clients/:id',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/clients/client-profile/client-profile.component').then(m => m.ClientProfileComponent)
            },
            {
                path: 'routes',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/routes/routes.component').then(m => m.RoutesComponent)
            },
            {
                path: 'routes/new',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/routes/route-builder/route-builder.component').then(m => m.RouteBuilderComponent)
            },
            {
                path: 'routes/:id/edit',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/routes/route-builder/route-builder.component').then(m => m.RouteBuilderComponent)
            },
            {
                path: 'suppliers',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/suppliers/suppliers.component').then(m => m.SuppliersComponent)
            },
            {
                path: 'financials',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/financials/financials.component').then(m => m.FinancialsComponent)
            },
            {
                path: 'reports',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/reports/reports.component').then(m => m.ReportsComponent)
            },
            {
                path: 'sales-periods',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/sales-periods/sales-periods.component').then(m => m.SalesPeriodsComponent)
            },
            {
                path: 'cami',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/cami/cami-panel.component').then(m => m.CamiPanelComponent)
            },
            {
                path: 'glow-up',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/glow-up/glow-up.component').then(m => m.GlowUpComponent)
            },
            {
                path: 'tandas',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/tandas/tandas.component').then(m => m.TandasComponent)
            },
            {
                path: 'tandas/:id',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/tandas/tanda-detail.component').then(m => m.TandaDetailComponent)
            },
            {
                path: 'live',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/live/live-import.component').then(m => m.LiveImportComponent)
            },
            {
                path: 'live/:id/review',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/live/live-review.component').then(m => m.LiveReviewComponent)
            },
            {
                path: 'raffles',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/raffles/raffles.component').then(m => m.RafflesComponent)
            },
            {
                path: 'raffles/:id',
                canActivate: [subscriptionGuard],
                loadComponent: () => import('./features/admin/raffles/raffle-detail/raffle-detail.component').then(m => m.RaffleDetailComponent)
            },
            {
                path: 'subscription',
                loadComponent: () => import('./features/admin/subscription/subscription.component').then(m => m.SubscriptionComponent)
            },
            {
                path: 'subscription/checkout',
                loadComponent: () => import('./features/admin/subscription/checkout/subscription-checkout.component').then(m => m.SubscriptionCheckoutComponent)
            },
            {
                path: 'brand',
                loadComponent: () => import('./features/admin/brand/brand.component').then(m => m.BrandComponent)
            }
        ]
    },

    {
        path: 'pedido/:token',
        loadComponent: () => import('./features/client/order-view/order-view.component').then(m => m.OrderViewComponent)
    },
    {
        path: 'live/:id',
        loadComponent: () => import('./features/live/live-view/live-view.component').then(m => m.LiveViewComponent)
    },
    {
        path: 'repartidor/:token',
        loadComponent: () => import('./features/driver/route-view/route-view.component').then(m => m.RouteViewComponent)
    },
    { path: '', redirectTo: '/admin', pathMatch: 'full' },
    { path: '**', redirectTo: '/admin' }
];
