import { Component, ElementRef, inject, signal, computed, HostListener, OnInit, ViewChild } from '@angular/core';
import { Router, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { BusinessBootstrapService } from '../../../core/services/business-bootstrap.service';
import { ThemeService } from '../../../core/services/theme.service';
import { UpsellService } from '../../../core/services/upsell.service';
import { PlanTierName } from '../../../core/models';
import { SubscriptionBannersComponent } from '../../../shared/components/subscription-banners/subscription-banners.component';
import { UpsellModalComponent } from '../../../shared/components/upsell-modal/upsell-modal.component';
import { BusinessSwitcherComponent } from '../../../shared/components/business-switcher/business-switcher.component';
import { PwaInstallComponent } from '../../../shared/components/pwa-install/pwa-install.component';
import { ApiService } from '../../../core/services/api.service';

interface NavItem {
  label: string;
  iconPath: string;
  route: string;
  group: 'Ventas' | 'Clientas' | 'Operación' | 'Administración';
  /** Feature que debe estar activa para mostrar esta entrada. null = siempre. */
  featureKey?: string;
  /** Si true, la entrada aparece con candado en vez de ocultarse cuando la feature no esta. */
  showLocked?: boolean;
}

interface NavGroup {
  label: NavItem['group'];
  items: NavItem[];
}

const PRIMARY_NAV_ROUTES = ['/admin', '/admin/orders', '/admin/routes', '/admin/inventory'];
const MORE_NAV_GROUPS: NavItem['group'][] = ['Ventas', 'Clientas', 'Operación', 'Administración'];

@Component({
  selector: 'app-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    SubscriptionBannersComponent,
    UpsellModalComponent,
    BusinessSwitcherComponent,
    PwaInstallComponent,
  ],
  template: `
    <div class="app-shell">
      <header class="top-bar">
        <div class="top-left">
          <a [routerLink]="homeRoute()" class="brand-link" aria-label="Ir al inicio">
            <div class="brand-logo">
              @if (theme.logoUrl()) {
                <img [src]="theme.logoUrl()" alt="" />
              } @else {
              <span class="brand-logo-fallback">{{ brandInitial() }}</span>
              }
            </div>
            <span class="brand-text">
              <span class="brand-sub">Neni’s App</span>
              <span class="brand-name">{{ theme.name() || 'Mi negocio' }}</span>
            </span>
          </a>
          <div class="header-date">
            <p class="greeting">{{ greeting() }}</p>
            <p class="date-title">{{ todayDate() }}</p>
          </div>
        </div>

        <div class="top-right">
          @if (!isSubscriptionAccessRestricted()) {
            <div class="business-tools">
              <app-business-switcher />
              <app-pwa-install />
            </div>
          }
          <div class="user-chip" role="group" [attr.aria-label]="'Cuenta de ' + userDisplayName() + ', ' + userRoleLabel()">
            <div class="user-avatar">{{ userInitial() }}</div>
            <div class="user-info">
              <span class="user-role">{{ userRoleLabel() }}</span>
              <span class="user-name">{{ userDisplayName() }}</span>
            </div>
          </div>
        </div>
      </header>

      <div class="nav-region">
        <nav class="primary-nav" aria-label="Navegación principal">
          @for (item of primaryNavItems(); track item.route) {
            <a [routerLink]="isSubscriptionBlockedItem(item) ? null : item.route"
               routerLinkActive="nav-active"
               [routerLinkActiveOptions]="{ exact: item.route === '/admin' }"
               class="nav-link"
               [class.nav-locked]="isLocked(item)"
               [class.nav-subscription-locked]="isSubscriptionBlockedItem(item)"
               [attr.aria-disabled]="isSubscriptionBlockedItem(item) ? 'true' : null"
               [attr.tabindex]="isSubscriptionBlockedItem(item) ? 0 : null"
               [attr.title]="isSubscriptionBlockedItem(item) ? 'Disponible al activar tu suscripción' : null"
               (click)="onNavClick(item, $event)">
              <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path [attr.d]="item.iconPath" />
              </svg>
              <span class="nav-label">{{ item.label }}</span>
              @if (isLocked(item)) {
                <svg class="nav-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" [attr.aria-label]="isSubscriptionBlockedItem(item) ? 'Bloqueado por suscripción' : 'Requiere plan superior'" role="img">
                  <rect x="5" y="10" width="14" height="11" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              }
            </a>
          }

          <button #moreMenuTrigger
                  type="button"
                  class="nav-link more-trigger"
                  [class.nav-more-active]="moreMenuOpen() || isMoreRouteActive()"
                  [attr.aria-expanded]="moreMenuOpen()"
                  [attr.aria-controls]="moreMenuOpen() ? 'more-menu-panel' : null"
                  aria-label="Más secciones y acciones"
                  (click)="toggleMoreMenu()">
            <svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
              <circle cx="5" cy="12" r="1" />
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
            </svg>
            <span class="nav-label">Más</span>
            @if (unreadNotifications() > 0) {
              <span class="nav-badge" aria-label="Notificaciones sin leer">
                {{ unreadNotifications() > 9 ? '9+' : unreadNotifications() }}
              </span>
            }
          </button>
        </nav>

        @if (moreMenuOpen()) {
          <div class="more-menu-scrim" aria-hidden="true" (click)="closeMoreMenu()"></div>
          <section id="more-menu-panel" class="more-menu" role="region" aria-labelledby="more-menu-title">
            <header class="more-menu-heading">
              <div>
                <p class="more-menu-kicker">Tu espacio</p>
                <h2 id="more-menu-title">Más secciones</h2>
              </div>
              <button type="button" class="close-menu" aria-label="Cerrar menú" (click)="closeMoreMenu()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </header>

            <div class="more-menu-groups">
              @for (group of moreNavGroups(); track group.label) {
                @if (group.items.length > 0) {
                  <section class="more-group" [attr.aria-label]="group.label">
                    <h3>{{ group.label }}</h3>
                    <div class="more-links">
                      @for (item of group.items; track item.route) {
                        <a [routerLink]="isSubscriptionBlockedItem(item) ? null : item.route"
                           routerLinkActive="more-link-active"
                           [routerLinkActiveOptions]="{ exact: item.route === '/admin' }"
                           class="more-link"
                           [class.nav-locked]="isLocked(item)"
                           [class.nav-subscription-locked]="isSubscriptionBlockedItem(item)"
                           [attr.aria-disabled]="isSubscriptionBlockedItem(item) ? 'true' : null"
                           [attr.tabindex]="isSubscriptionBlockedItem(item) ? 0 : null"
                           [attr.title]="isSubscriptionBlockedItem(item) ? 'Disponible al activar tu suscripción' : null"
                           (click)="onNavClick(item, $event)">
                          <svg class="more-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path [attr.d]="item.iconPath" />
                          </svg>
                          <span>{{ item.label }}</span>
                          @if (item.route === '/admin/notifications' && unreadNotifications() > 0) {
                            <span class="more-badge" aria-label="Notificaciones sin leer">
                              {{ unreadNotifications() > 9 ? '9+' : unreadNotifications() }}
                            </span>
                          }
                          @if (isLocked(item)) {
                            <span class="more-lock" role="img" [attr.aria-label]="isSubscriptionBlockedItem(item) ? 'Bloqueado por suscripción' : 'Requiere plan ' + requiredPlan(item)">
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <rect x="5" y="10" width="14" height="11" rx="2" />
                                <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                              </svg>
                            </span>
                          }
                        </a>
                      }
                    </div>
                  </section>
                }
              }
            </div>

            <footer class="more-account-actions">
              <button type="button" class="account-action" (click)="closeMoreMenu(); logout()">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M10 17l5-5-5-5M15 12H3M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
                </svg>
                <span>Cerrar sesión</span>
              </button>
              @if (!isSubscriptionAccessRestricted()) {
                <button type="button" class="account-action delete-account-action" (click)="closeMoreMenu(); deleteAccount()">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m4 4v7m6-7v7" />
                  </svg>
                  <span>Eliminar cuenta</span>
                </button>
              }
            </footer>
          </section>
        }
      </div>

      @if (isSubscriptionAccessRestricted()) {
        <section class="subscription-lock-notice" role="status">
          <svg class="subscription-lock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="5" y="10" width="14" height="11" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <div class="subscription-lock-copy">
            @if (!bootstrap.accessCheckSettled()) {
              <strong>Verificando tu suscripción</strong>
              <span>El menú permanecerá bloqueado mientras confirmamos el estado de tu cuenta.</span>
            } @else if (bootstrap.isLocked()) {
              <strong>Tu cuenta está en pausa</strong>
              <span>Solo están disponibles Planes y Pagos. Activa un plan para volver al panel.</span>
            } @else {
              <strong>No pudimos verificar tu suscripción</strong>
              <span>Por seguridad, el panel sigue bloqueado. Revisa tu plan e inténtalo de nuevo.</span>
            }
          </div>
          <a routerLink="/admin/subscription" class="subscription-lock-link">Planes y pagos <span aria-hidden="true">→</span></a>
        </section>
      }

      @if (!isSubscriptionAccessRestricted()) {
        <app-subscription-banners />
      }

      <main class="page-content">
        <router-outlet />
      </main>
    </div>

    @if (!isSubscriptionAccessRestricted()) {
      <app-upsell-modal />
    }
  `,
  styles: [`
    :host {
      --app-ink: #66324f;
      --app-muted: #80546b;
      --app-faint: #a26f8e;
      --app-paper: #fffafd;
      --app-surface: #fff3f9;
      --app-pink: #c62e70;
      --app-pink-soft: #ffd5e8;
      --app-line: #f3cade;
      --app-focus: rgba(198, 46, 112, 0.2);
      --app-shadow: rgba(207, 137, 171, 0.22);
      --app-highlight: rgba(255, 255, 255, 0.96);
      display: block;
      min-height: 100svh;
      color-scheme: light;
      color: var(--app-ink);
      font-family: 'Quicksand', 'Poppins', sans-serif;
      -webkit-tap-highlight-color: transparent;
    }

    .app-shell {
      position: relative;
      display: flex;
      min-height: 100svh;
      min-height: 100dvh;
      flex-direction: column;
      overflow-x: clip;
      background:
        radial-gradient(circle at 8% 20%, rgba(255, 255, 255, 0.75) 0 4px, transparent 5px),
        radial-gradient(circle at 82% 72%, rgba(255, 255, 255, 0.7) 0 3px, transparent 4px),
        #fff0f7;
      background-size: 120px 120px, 155px 155px, auto;
    }

    .top-bar {
      display: flex;
      width: min(100%, 1480px);
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin: 0 auto;
      padding: 18px clamp(18px, 3vw, 42px) 13px;
    }

    .top-left,
    .brand-link,
    .top-right,
    .business-tools,
    .user-chip {
      display: flex;
      align-items: center;
    }

    .top-left { gap: 20px; min-width: 0; }
    .brand-link { gap: 11px; min-width: 0; color: inherit; text-decoration: none; }

    .brand-logo {
      display: grid;
      width: 48px;
      height: 48px;
      flex: 0 0 48px;
      place-items: center;
      overflow: hidden;
      border: 3px solid rgba(255, 255, 255, 0.92);
      border-radius: 18px;
      background: linear-gradient(145deg, #ff9bc5, #d990f2);
      box-shadow: 0 5px 0 rgba(217, 54, 125, 0.08), 3px 5px 12px var(--app-shadow);
    }

    .brand-logo img { width: 100%; height: 100%; object-fit: cover; }
    .brand-logo-fallback { display: grid; width: 100%; height: 100%; place-items: center; color: #fff; background: linear-gradient(110deg, #c62e70, #96345c); font-size: 1.15rem; font-weight: 800; }
    .brand-text { display: grid; gap: 1px; min-width: 0; }
    .brand-sub { color: var(--app-muted); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
    .brand-name { overflow: hidden; color: var(--app-ink); font-size: 0.95rem; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }

    .header-date {
      display: grid;
      gap: 3px;
      min-width: 0;
      padding-left: 19px;
      border-left: 1px solid var(--app-line);
    }

    .greeting { margin: 0; color: var(--app-muted); font-size: 0.75rem; font-weight: 700; line-height: 1.2; }
    .date-title { margin: 0; color: var(--app-ink); font-size: 0.95rem; font-weight: 800; line-height: 1.25; }
    .top-right { justify-content: flex-end; gap: 10px; min-width: 0; }
    .business-tools { gap: 8px; }

    .user-chip {
      gap: 9px;
      min-height: 48px;
      padding: 4px 14px 4px 5px;
      border: 1px solid rgba(255, 255, 255, 0.9);
      border-radius: 999px;
      background: var(--app-paper);
      box-shadow: 4px 4px 10px var(--app-shadow), -4px -4px 10px var(--app-highlight);
    }

    .user-avatar {
      display: grid;
      width: 38px;
      height: 38px;
      flex: 0 0 38px;
      place-items: center;
      border-radius: 50%;
      color: #fff;
      background: linear-gradient(145deg, #c62e70, #96345c);
      font-size: 0.9rem;
      font-weight: 800;
    }

    .user-info { display: grid; gap: 2px; min-width: 0; }
    .user-role { color: var(--app-muted); font-size: 0.59rem; font-weight: 800; letter-spacing: 0.08em; line-height: 1; text-transform: uppercase; }
    .user-name { max-width: 180px; overflow: hidden; color: var(--app-ink); font-size: 0.77rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }

    .nav-region {
      position: sticky;
      top: 0;
      z-index: 30;
      width: min(100%, 1480px);
      margin: 0 auto 13px;
      padding: 7px clamp(18px, 3vw, 42px);
      background: rgba(255, 240, 247, 0.96);
    }

    .primary-nav {
      display: flex;
      width: fit-content;
      max-width: 100%;
      align-items: center;
      gap: 5px;
      margin: 0 auto;
      padding: 5px;
      border: 1px solid rgba(243, 202, 222, 0.88);
      border-radius: 22px;
      background: var(--app-paper);
      box-shadow: 4px 5px 14px var(--app-shadow), -3px -3px 9px var(--app-highlight);
    }

    .nav-link {
      position: relative;
      display: inline-flex;
      min-width: 44px;
      min-height: 46px;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 14px;
      border: 1px solid transparent;
      border-radius: 16px;
      color: var(--app-muted);
      background: transparent;
      font: inherit;
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.15;
      text-decoration: none;
      white-space: nowrap;
      cursor: pointer;
      transition: color 180ms ease, background-color 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
    }

    .nav-link:hover,
    .more-link:hover,
    .account-action:hover,
    .close-menu:hover {
      color: var(--app-ink);
      background: #fff0f7;
    }

    .nav-link:focus-visible,
    .more-link:focus-visible,
    .account-action:focus-visible,
    .close-menu:focus-visible,
    .subscription-lock-link:focus-visible {
      outline: 3px solid var(--app-focus);
      outline-offset: 2px;
    }

    .nav-link.nav-active,
    .nav-link.nav-more-active {
      border-color: rgba(255, 255, 255, 0.2);
      color: #fff;
      background: linear-gradient(110deg, #c62e70, #96345c);
      box-shadow: 0 4px 0 #84264e, 0 7px 12px rgba(157, 23, 77, 0.16);
    }

    .nav-link.nav-subscription-locked { color: #805f72; background: #fff8fc; cursor: not-allowed; }
    .nav-link.nav-subscription-locked:hover { color: #805f72; background: #fff8fc; }
    .nav-link.nav-locked:not(.nav-subscription-locked) { color: #80546b; }
    .nav-icon { width: 20px; height: 20px; flex: 0 0 20px; }
    .nav-lock { width: 15px; height: 15px; flex: 0 0 15px; color: #80546b; }
    .nav-badge,
    .more-badge {
      display: inline-grid;
      min-width: 20px;
      height: 20px;
      place-items: center;
      padding: 0 5px;
      border: 1px solid rgba(255, 255, 255, 0.9);
      border-radius: 999px;
      color: var(--app-ink);
      background: #ffe49b;
      font-size: 0.65rem;
      font-weight: 800;
      line-height: 1;
    }

    .more-trigger { font-family: inherit; }
    .more-menu-scrim { position: fixed; z-index: 39; inset: 0; background: rgba(102, 50, 79, 0.24); }

    .more-menu {
      position: absolute;
      z-index: 40;
      top: calc(100% + 9px);
      right: clamp(18px, 3vw, 42px);
      width: min(720px, calc(100vw - 36px));
      max-height: min(72dvh, 660px);
      overflow-y: auto;
      padding: 21px;
      border: 3px solid rgba(255, 255, 255, 0.92);
      border-radius: 27px;
      color: var(--app-ink);
      background: var(--app-paper);
      box-shadow: 0 12px 0 rgba(217, 54, 125, 0.07), 0 22px 42px rgba(102, 50, 79, 0.2), 4px 5px 14px var(--app-shadow);
      scrollbar-color: #e6a7c3 #fff3f9;
      scrollbar-width: thin;
    }

    .more-menu-heading { display: flex; align-items: center; justify-content: space-between; gap: 14px; margin-bottom: 17px; }
    .more-menu-kicker { margin: 0 0 3px; color: var(--app-muted); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
    .more-menu-heading h2 { margin: 0; color: var(--app-ink); font-size: 1.15rem; font-weight: 800; line-height: 1.2; }

    .close-menu {
      display: grid;
      width: 44px;
      height: 44px;
      flex: 0 0 44px;
      place-items: center;
      border: 1px solid var(--app-line);
      border-radius: 15px;
      color: var(--app-ink);
      background: var(--app-surface);
      cursor: pointer;
    }
    .close-menu svg { width: 20px; height: 20px; }

    .more-menu-groups { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px 22px; }
    .more-group { min-width: 0; }
    .more-group h3 { margin: 0 0 7px 3px; color: var(--app-muted); font-size: 0.67rem; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; }
    .more-links { display: grid; gap: 5px; }

    .more-link {
      display: flex;
      min-width: 0;
      min-height: 46px;
      align-items: center;
      gap: 10px;
      padding: 6px 10px;
      border: 1px solid transparent;
      border-radius: 14px;
      color: var(--app-ink);
      background: transparent;
      font-size: 0.82rem;
      font-weight: 700;
      line-height: 1.25;
      text-decoration: none;
      transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease;
    }

    .more-link-active { border-color: var(--app-line); color: var(--app-pink); background: #fff0f7; }
    .more-link.nav-subscription-locked { color: #805f72; background: #fff8fc; cursor: not-allowed; }
    .more-link.nav-locked:not(.nav-subscription-locked) { color: #80546b; }
    .more-link-icon { width: 19px; height: 19px; flex: 0 0 19px; color: var(--app-pink); }
    .more-link > span:first-of-type { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .more-badge { margin-left: auto; }
    .more-lock { display: grid; width: 18px; height: 18px; flex: 0 0 18px; margin-left: auto; place-items: center; color: var(--app-muted); }
    .more-badge + .more-lock { margin-left: 0; }
    .more-lock svg { width: 16px; height: 16px; }

    .more-account-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 18px; padding-top: 13px; border-top: 1px solid var(--app-line); }
    .account-action {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 0 12px;
      border: 1px solid var(--app-line);
      border-radius: 14px;
      color: var(--app-ink);
      background: var(--app-surface);
      font: inherit;
      font-size: 0.75rem;
      font-weight: 700;
      cursor: pointer;
      transition: color 180ms ease, background-color 180ms ease, border-color 180ms ease;
    }
    .account-action svg { width: 18px; height: 18px; flex: 0 0 18px; }
    .delete-account-action { color: #8e315d; }

    .subscription-lock-notice {
      display: flex;
      width: min(calc(100% - 48px), 1396px);
      align-items: center;
      gap: 13px;
      margin: 0 auto 14px;
      padding: 14px 16px;
      border: 1px solid var(--app-line);
      border-radius: 19px;
      color: var(--app-ink);
      background: rgba(255, 250, 253, 0.96);
      box-shadow: 4px 5px 14px rgba(207, 137, 171, 0.15);
    }
    .subscription-lock-icon { width: 21px; height: 21px; flex: 0 0 21px; color: var(--app-pink); }
    .subscription-lock-copy { display: grid; gap: 2px; min-width: 0; }
    .subscription-lock-copy strong { font-size: 0.84rem; font-weight: 800; }
    .subscription-lock-copy span { color: var(--app-muted); font-size: 0.75rem; line-height: 1.4; }
    .subscription-lock-link { display: inline-flex; min-height: 44px; flex: 0 0 auto; align-items: center; gap: 7px; margin-left: auto; padding: 0 13px; border-radius: 14px; color: #fff; background: #96345c; font-size: 0.77rem; font-weight: 800; text-decoration: none; }
    .subscription-lock-link:hover { background: #84264e; }

    .page-content { width: min(100%, 1440px); flex: 1; margin: 0 auto; padding: 0 clamp(18px, 3vw, 42px) 30px; }

    @media (max-width: 900px) and (min-width: 761px) {
      .top-bar { align-items: flex-start; gap: 12px; }
      .top-left { gap: 12px; }
      .header-date { padding-left: 12px; }
      .greeting { max-width: 20ch; }
      .top-right { flex-wrap: wrap; }
      .user-info { display: none; }
      .user-chip { padding-right: 5px; }
      .nav-region { padding-right: 12px; padding-left: 12px; }
      .nav-link { gap: 6px; padding-right: 10px; padding-left: 10px; font-size: 0.76rem; }
    }

    @media (max-width: 760px) {
      .app-shell { padding-bottom: calc(82px + max(8px, env(safe-area-inset-bottom))); }
      .top-bar { flex-wrap: wrap; gap: 9px; padding: max(12px, env(safe-area-inset-top)) 14px 12px; }
      .top-left { flex: 1 1 auto; gap: 0; }
      .brand-logo { width: 42px; height: 42px; flex-basis: 42px; border-radius: 15px; }
      .brand-name { max-width: 35vw; font-size: 0.88rem; }
      .brand-sub { font-size: 0.56rem; }
      .header-date { display: none; }
      .top-right { flex: 0 1 auto; gap: 6px; }
      .business-tools { gap: 5px; }
      .user-chip { min-height: 44px; gap: 0; padding: 3px; }
      .user-avatar { width: 36px; height: 36px; flex-basis: 36px; }
      .user-info { display: none; }

      .nav-region { position: static; width: auto; margin: 0; padding: 0; background: none; }
      .primary-nav {
        position: fixed;
        z-index: 45;
        right: max(10px, env(safe-area-inset-right));
        bottom: max(8px, env(safe-area-inset-bottom));
        left: max(10px, env(safe-area-inset-left));
        display: grid;
        width: auto;
        max-width: 540px;
        min-height: 74px;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 3px;
        margin: 0 auto;
        padding: 5px;
        border-radius: 26px;
        background: rgba(255, 250, 253, 0.98);
        box-shadow: 0 8px 0 rgba(217, 54, 125, 0.06), 0 13px 28px rgba(102, 50, 79, 0.2), 2px 3px 10px var(--app-shadow);
        backdrop-filter: blur(12px);
      }

      .nav-link {
        min-width: 0;
        min-height: 62px;
        flex-direction: column;
        gap: 3px;
        padding: 5px 2px;
        border-radius: 19px;
        font-size: 0.65rem;
        font-weight: 800;
        white-space: normal;
      }
      .nav-link.nav-active,
      .nav-link.nav-more-active { box-shadow: 0 3px 0 #84264e, 0 5px 9px rgba(157, 23, 77, 0.14); }
      .nav-icon { width: 21px; height: 21px; flex-basis: 21px; }
      .nav-label { max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .nav-lock { position: absolute; top: 2px; right: 4px; width: 13px; height: 13px; padding: 1px; border-radius: 50%; color: var(--app-pink); background: var(--app-paper); }
      .nav-badge { position: absolute; top: 1px; right: 2px; min-width: 18px; height: 18px; font-size: 0.6rem; }
      .more-trigger { width: 100%; font-family: inherit; }

      .more-menu-scrim { z-index: 49; }
      .more-menu {
        position: fixed;
        z-index: 50;
        top: auto;
        right: max(10px, env(safe-area-inset-right));
        bottom: calc(91px + env(safe-area-inset-bottom));
        left: max(10px, env(safe-area-inset-left));
        width: auto;
        max-width: 540px;
        max-height: min(72dvh, 650px);
        margin: 0 auto;
        padding: 17px;
        border-radius: 25px;
      }

      .more-menu-heading { margin-bottom: 13px; }
      .more-menu-heading h2 { font-size: 1.05rem; }
      .more-menu-groups { grid-template-columns: 1fr; gap: 14px; }
      .more-group h3 { margin-bottom: 5px; }
      .more-links { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px; }
      .more-link { min-height: 48px; gap: 7px; padding: 6px 8px; font-size: 0.74rem; }
      .more-link-icon { width: 18px; height: 18px; flex-basis: 18px; }
      .more-account-actions { gap: 6px; margin-top: 14px; padding-top: 11px; }
      .account-action { flex: 1 1 130px; padding: 0 8px; font-size: 0.72rem; }

      .subscription-lock-notice { width: calc(100% - 28px); align-items: flex-start; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; padding: 13px; }
      .subscription-lock-copy { flex: 1 1 calc(100% - 38px); }
      .subscription-lock-link { margin-left: 31px; }
      .page-content { padding: 0 14px 28px; }
    }

    @media (max-width: 380px) {
      .top-bar { padding-right: 10px; padding-left: 10px; }
      .brand-name { max-width: 32vw; font-size: 0.82rem; }
      .top-right { gap: 4px; }
      .business-tools { gap: 3px; }
      .nav-link { font-size: 0.62rem; }
      .more-menu { padding: 14px; }
      .more-links { grid-template-columns: 1fr; }
      .account-action { flex-basis: 100%; }
      .subscription-lock-notice { width: calc(100% - 20px); }
      .page-content { padding-right: 10px; padding-left: 10px; }
    }

    @media (prefers-reduced-motion: reduce) {
      :host *,
      :host *::before,
      :host *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        scroll-behavior: auto !important;
        transition-duration: 0.01ms !important;
      }
    }
  `]
})
export class LayoutComponent implements OnInit {
  @ViewChild('moreMenuTrigger') private moreMenuTrigger?: ElementRef<HTMLButtonElement>;

  private auth = inject(AuthService);
  private api = inject(ApiService);
  private router = inject(Router);
  protected bootstrap = inject(BusinessBootstrapService);
  protected theme = inject(ThemeService);
  private upsell = inject(UpsellService);

  readonly unreadNotifications = signal(0);
  readonly moreMenuOpen = signal(false);

  protected readonly isSubscriptionAccessRestricted = computed(() =>
    (this.auth.currentRole() === 'Owner' || this.auth.currentRole() === 'Admin') && (
      !this.bootstrap.accessCheckSettled() ||
      this.bootstrap.isLocked() ||
      this.bootstrap.error() !== null
    ),
  );

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.moreMenuOpen()) this.closeMoreMenu();
  }

  ngOnInit(): void {
    this.bootstrap.load();
    if (
      this.auth.currentRole() !== 'Driver' &&
      this.bootstrap.loaded() &&
      !this.isSubscriptionAccessRestricted()
    ) {
      this.api.getUnreadNotificationsCount('seller').subscribe({
        next: count => this.unreadNotifications.set(count),
        error: () => { /* La navegación sigue disponible aunque la API no responda. */ },
      });
    }
  }

  protected brandInitial(): string {
    const name = this.theme.name() || this.auth.displayName();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  protected canShow(item: NavItem): boolean {
    if (this.isSubscriptionAccessRestricted()) return true;
    if (!item.featureKey) return true;
    if (this.bootstrap.hasFeature(item.featureKey)) return true;
    return !!item.showLocked;
  }

  protected isLocked(item: NavItem): boolean {
    if (this.isSubscriptionBlockedItem(item)) return true;
    return this.isFeatureLocked(item);
  }

  protected isSubscriptionBlockedItem(item: NavItem): boolean {
    return this.isSubscriptionAccessRestricted() && item.route !== '/admin/subscription';
  }

  private isFeatureLocked(item: NavItem): boolean {
    return !!item.featureKey && !this.bootstrap.hasFeature(item.featureKey);
  }

  protected requiredPlan(item: NavItem): PlanTierName {
    if (!item.featureKey) return 'Básico';
    const feat = this.bootstrap.featureCatalog().find(f => f.key === item.featureKey);
    return (feat?.requiredPlan as PlanTierName) ?? 'Pro';
  }

  protected onNavClick(item: NavItem, event: MouseEvent): void {
    if (this.isSubscriptionBlockedItem(item)) {
      event.preventDefault();
      return;
    }
    if (this.isFeatureLocked(item)) {
      event.preventDefault();
      this.closeMoreMenu();
      const label = item.featureKey ?? '';
      this.upsell.open(label, item.label, this.requiredPlan(item));
      return;
    }
    this.closeMoreMenu();
  }

  navItems = computed<NavItem[]>(() => {
    const role = this.auth.currentRole();
    const allItems: NavItem[] = [
      { label: 'Inicio', iconPath: 'M3 10.5 12 3l9 7.5M5 9v12h14V9M9 21v-7h6v7', route: '/admin', group: 'Ventas' },
      { label: 'Pedidos', iconPath: 'm12 3 9 5-9 5-9-5 9-5ZM3 8v8l9 5 9-5V8M12 13v8', route: '/admin/orders', group: 'Ventas' },
      { label: 'Capturar pedido', iconPath: 'M12 5v14M5 12h14', route: '/admin/capture', group: 'Ventas' },
      { label: 'Enviar enlaces', iconPath: 'M3 5h18v14H3zM3 6l9 7 9-7', route: '/admin/send-links', group: 'Ventas' },
      { label: 'Clientas', iconPath: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M17 11h6', route: '/admin/clients', group: 'Clientas' },
      { label: 'Rutas', iconPath: 'M12 21s-7-6.2-7-12a7 7 0 1 1 14 0c0 5.8-7 12-7 12ZM12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4M2 5h5M2 12h5M2 19h5', route: '/admin/routes', group: 'Operación' },
      { label: 'Inventario', iconPath: 'm12 3 9 5-9 5-9-5 9-5ZM3 8v8l9 5 9-5V8M12 13v8', route: '/admin/inventory', group: 'Operación', featureKey: 'LabelPrinting', showLocked: true },
      { label: 'Etiquetas', iconPath: 'm20 12-8 8-9-9V4h7l10 8ZM7.5 7.5h.01', route: '/admin/labels', group: 'Operación', featureKey: 'LabelPrinting', showLocked: true },
      { label: 'Tandas', iconPath: 'M20 7h-7V0M4 17h7v7M20 7a9 9 0 0 0-15-3L3 6M4 17a9 9 0 0 0 15 3l2-2', route: '/admin/tandas', group: 'Ventas', featureKey: 'TandasRaffles', showLocked: true },
      { label: 'Sorteos', iconPath: 'M20 12v9H4v-9M2 7h20v5H2zM12 7v14M12 7H8.5a2.5 2.5 0 1 1 2.5-2.5V7Zm0 0h3.5A2.5 2.5 0 1 0 13 4.5V7Z', route: '/admin/raffles', group: 'Ventas', featureKey: 'TandasRaffles', showLocked: true },
      { label: 'Proveedores', iconPath: 'M3 21h18M5 21V7l8-4v18M13 10h6v11M8 8h2M8 12h2M8 16h2M16 14h1M16 17h1', route: '/admin/suppliers', group: 'Operación' },
      { label: 'Reportes', iconPath: 'M4 19V5M4 19h17M8 16v-4M13 16V7M18 16v-7', route: '/admin/reports', group: 'Administración', featureKey: 'Exports', showLocked: true },
      { label: 'Notificaciones', iconPath: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4', route: '/admin/notifications', group: 'Administración' },
      { label: 'Mi plan', iconPath: 'm12 3 2.7 5.5 6 .9-4.3 4.2 1 5.9-5.4-2.8-5.4 2.8 1-5.9-4.3-4.2 6-.9L12 3Z', route: '/admin/subscription', group: 'Administración' }
    ];

    if (role === 'Driver' && !this.isSubscriptionAccessRestricted()) {
      return allItems.filter(i => i.route === '/admin/routes');
    }

    return allItems;
  });

  readonly primaryNavItems = computed<NavItem[]>(() =>
    this.navItems().filter(item => PRIMARY_NAV_ROUTES.includes(item.route) && this.canShow(item)),
  );

  readonly moreNavGroups = computed<NavGroup[]>(() => {
    const secondaryItems = this.navItems().filter(
      item => !PRIMARY_NAV_ROUTES.includes(item.route) && this.canShow(item),
    );

    return MORE_NAV_GROUPS
      .map(label => ({ label, items: secondaryItems.filter(item => item.group === label) }))
      .filter(group => group.items.length > 0);
  });

  protected toggleMoreMenu(): void {
    if (this.moreMenuOpen()) {
      this.closeMoreMenu();
      return;
    }
    this.moreMenuOpen.set(true);
  }

  protected closeMoreMenu(): void {
    if (!this.moreMenuOpen()) return;
    this.moreMenuOpen.set(false);
    queueMicrotask(() => this.moreMenuTrigger?.nativeElement.focus());
  }

  protected isMoreRouteActive(): boolean {
    const currentPath = this.router.url.split('?')[0].split('#')[0];
    return this.moreNavGroups().some(group =>
      group.items.some(item => currentPath === item.route || currentPath.startsWith(`${item.route}/`)),
    );
  }

  protected userRoleLabel(): string {
    const role = this.auth.currentRole();
    if (role === 'Driver') return 'Reparto';
    if (role === 'Scaner') return 'Escáner';
    return 'Administración';
  }

  protected homeRoute(): string {
    return this.auth.currentRole() === 'Driver' ? '/admin/routes' : '/admin';
  }

  protected userDisplayName(): string {
    return this.auth.displayName() || this.theme.name() || 'Mi negocio';
  }

  greeting(): string {
    const hour = new Date().getHours();
    const name = this.auth.displayName() || 'Hermosa';
    if (hour < 12) return `Buenos días, ${name}`;
    if (hour < 18) return `Buenas tardes, ${name}`;
    return `Buenas noches, ${name}`;
  }

  todayDate(): string {
    const date = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const text = date.toLocaleDateString('es-MX', options);
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  userInitial(): string {
    const name = this.auth.displayName();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  logout(): void {
    this.auth.logout();
  }

  deleteAccount(): void {
    const confirmed = window.confirm(
      'Esta acción elimina tu cuenta, cierra tus sesiones y borra tus datos personales. Los historiales operativos necesarios pueden conservarse anonimizados. ¿Deseas continuar?'
    );
    if (!confirmed) return;

    this.auth.deleteAccount().subscribe({
      error: (error: unknown) => {
        const response = error as { error?: { message?: unknown } };
        const message = typeof response.error?.message === 'string'
          ? response.error.message
          : 'No pudimos eliminar tu cuenta. Inténtalo nuevamente.';
        window.alert(message);
      },
    });
  }

}
