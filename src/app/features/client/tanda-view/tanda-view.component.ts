import { Component, inject, signal, OnInit, OnDestroy, HostListener, computed, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { TandaService } from '../../../core/services/tanda.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApiService } from '../../../core/services/api.service';
import { gsap } from 'gsap';

@Component({
  selector: 'app-tanda-view',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tv-root" (scroll)="onScroll($event)">

      <!-- ░░ ORBS DE FONDO ░░ -->
      <div class="tv-bg-orbs" aria-hidden="true">
        <div class="tv-orb tv-orb--1"></div>
        <div class="tv-orb tv-orb--2"></div>
        <div class="tv-orb tv-orb--3"></div>
      </div>

      <!-- ░░ CONTENEDOR PRINCIPAL ░░ -->
      <div class="tv-container">

        <!-- ── LOADING ── -->
        @if (loading()) {
          <div class="tv-loader">
            <div class="tv-spinner"></div>
            <p class="tv-loader__text">Cargando tu tanda...</p>
          </div>
        }

        <!-- ── ERROR ── -->
        @else if (error()) {
          <div class="tv-error">
            <div class="tv-error__icon">🔍</div>
            <h2 class="tv-error__title">Tanda no encontrada</h2>
            <p class="tv-error__desc">Verifica que el enlace sea correcto.</p>
          </div>
        }

        <!-- ── CONTENIDO PRINCIPAL ── -->
        @else if (tanda(); as t) {

          <!-- ══ HERO SECTION ══ -->
          <header class="tv-hero">
            <div class="tv-hero__badge">TANDA ACTIVA</div>
            <h1 class="tv-hero__name">{{ t.name }}</h1>
            <p class="tv-hero__tagline">Ahorrando juntas, creciendo juntas</p>

            <!-- KPI Strip -->
            <div class="tv-kpi-strip">
              <div class="tv-kpi">
                <span class="tv-kpi__val">{{ t.currentWeek }}</span>
                <span class="tv-kpi__label">Semana actual</span>
              </div>
              <div class="tv-kpi-divider"></div>
              <div class="tv-kpi">
                <span class="tv-kpi__val">{{ t.totalWeeks }}</span>
                <span class="tv-kpi__label">Total semanas</span>
              </div>
              <div class="tv-kpi-divider"></div>
              <div class="tv-kpi">
                <span class="tv-kpi__val">{{ t.weeklyAmount | currency:'MXN':'symbol-narrow':'1.0-0' }}</span>
                <span class="tv-kpi__label">Abono semanal</span>
              </div>
            </div>

            <!-- Progress Bar -->
            <div class="tv-progress-wrap">
              <div class="tv-progress-bar">
                <div class="tv-progress-fill"
                     [style.width]="(t.currentWeek / t.totalWeeks * 100) + '%'">
                  <div class="tv-progress-glow"></div>
                </div>
              </div>
              <div class="tv-progress-labels">
                <span>Inicio</span>
                <span>{{ (t.currentWeek / t.totalWeeks * 100) | number:'1.0-0' }}% completado</span>
                <span>Final</span>
              </div>
            </div>

            <!-- Semana dots -->
            <div class="tv-weeks-dots">
              @for (w of weeksArray(); track w) {
                <div class="tv-week-dot"
                     [class.tv-week-dot--done]="w < t.currentWeek"
                     [class.tv-week-dot--current]="w === t.currentWeek"
                     [title]="'Semana ' + w">
                </div>
              }
            </div>
          </header>

          <!-- ══ BANNER APP (compacto) ══ -->
          <div class="tv-app-banner">
            <div class="tv-app-banner__left">
              <span class="tv-app-banner__icon">📲</span>
              <div>
                <p class="tv-app-banner__title">Neni's App Clientas</p>
                <p class="tv-app-banner__sub">Notificaciones y pagos en 1 toque</p>
              </div>
            </div>
            <div class="tv-app-banner__btns">
              <a href="https://nenisapp.com/download" target="_blank" class="tv-app-btn tv-app-btn--solid">iOS</a>
              <a href="https://nenisapp.com/download" target="_blank" class="tv-app-btn tv-app-btn--outline">Android</a>
            </div>
          </div>

          <!-- ══ TABS ══ -->
          <div class="tv-tabs sticky-tabs" id="nav-tabs">
            <button class="tv-tab" id="tab-summary"
                    [class.tv-tab--active]="activeTab() === 'summary'"
                    (click)="activeTab.set('summary')">
              <svg class="tv-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
              Mi Tanda
            </button>
            <button class="tv-tab" id="tab-transparency"
                    [class.tv-tab--active]="activeTab() === 'transparency'"
                    (click)="activeTab.set('transparency')">
              <svg class="tv-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              Grupo
            </button>
          </div>

          <!-- ══════════════════════════════════════════ -->
          <!-- TAB: MI TANDA                             -->
          <!-- ══════════════════════════════════════════ -->
          @if (activeTab() === 'summary') {
            <div class="tv-tab-content tv-anim-in">

              <!-- Tu turno (ganadora) -->
              @if (isWinnerThisWeek()) {
                <div class="tv-winner-card">
                  <div class="tv-winner-card__glow"></div>
                  <span class="tv-winner-card__crown">👑</span>
                  <h3 class="tv-winner-card__title">¡Es tu semana!</h3>
                  <p class="tv-winner-card__desc">El producto de esta semana es para ti. ¡Felicidades!</p>
                </div>
              }

              <!-- ── MÉTODOS DE PAGO ── -->
              <section class="tv-section">
                <div class="tv-section__header">
                  <h2 class="tv-section__title">Formas de pago</h2>
                  <span class="tv-section__hint">Toca los datos para copiar</span>
                </div>

                <!-- Payment tabs -->
                <div class="tv-pay-tabs">
                  @if (tanda()?.mercadoPagoPublicKey) {
                    <button class="tv-pay-tab" id="pay-tab-card"
                            [class.tv-pay-tab--active]="paymentTab() === 'card'"
                            (click)="setPaymentTab('card')">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tv-pay-tab__icon">
                        <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      Tarjeta
                    </button>
                  }
                  <button class="tv-pay-tab" id="pay-tab-transfer"
                          [class.tv-pay-tab--active]="paymentTab() === 'transfer'"
                          (click)="setPaymentTab('transfer')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tv-pay-tab__icon">
                      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                      <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                    Transfer
                  </button>
                  <button class="tv-pay-tab" id="pay-tab-oxxo"
                          [class.tv-pay-tab--active]="paymentTab() === 'oxxo'"
                          (click)="setPaymentTab('oxxo')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tv-pay-tab__icon">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    OXXO
                  </button>
                  <button class="tv-pay-tab" id="pay-tab-cash"
                          [class.tv-pay-tab--active]="paymentTab() === 'cash'"
                          (click)="setPaymentTab('cash')">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="tv-pay-tab__icon">
                      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                    </svg>
                    Efectivo
                  </button>
                </div>

                <!-- Payment content -->
                <div class="tv-pay-content">
                  @switch (paymentTab()) {

                    @case ('card') {
                      <div class="tv-pay-card tv-anim-in">
                        <div class="tv-pay-card__header">
                          <div class="tv-pay-card__logo tv-pay-card__logo--mp"></div>
                          <span class="tv-pay-card__provider">MercadoPago</span>
                        </div>
                        @if (!mpResult()) {
                          <div class="space-y-4">
                            <div class="tv-field-wrap">
                              <label class="tv-field-label">¿Quién eres?</label>
                              <select class="tv-field-select" [(ngModel)]="selectedParticipantId">
                                <option [value]="null" disabled>Selecciona tu nombre...</option>
                                @for (p of t.participants; track p.id) {
                                  <option [value]="p.id">{{ p.name }} — Semana {{ p.assignedTurn }}</option>
                                }
                              </select>
                            </div>
                            <form id="mp-card-form" class="space-y-3">
                              <div id="mp-cardNumber" class="tv-mp-field"></div>
                              <div class="tv-mp-row">
                                <div id="mp-expirationDate" class="tv-mp-field"></div>
                                <div id="mp-securityCode" class="tv-mp-field"></div>
                              </div>
                              <input type="text" id="mp-cardholderName" class="tv-field-input" placeholder="Nombre en la tarjeta">
                              <select id="mp-issuer" class="hidden"></select>
                              <select id="mp-installments" class="hidden"></select>
                              <input type="email" id="mp-cardholderEmail" class="tv-field-input" placeholder="Correo electrónico" autocomplete="email">
                              @if (mpFetching()) {
                                <div class="tv-mp-fetching">
                                  <div class="tv-spinner tv-spinner--sm"></div>
                                  <span>Identificando tarjeta...</span>
                                </div>
                              }
                              <button type="submit" class="tv-btn tv-btn--primary tv-btn--full"
                                      [disabled]="mpProcessing() || !selectedParticipantId()">
                                {{ mpProcessing() ? 'Procesando...' : 'Pagar mi semana' }}
                              </button>
                            </form>
                            <p class="tv-pay-card__shield">🛡️ Protegido por MercadoPago</p>
                          </div>
                        } @else {
                          <div class="tv-pay-result tv-anim-in">
                            @if (mpResult()?.status === 'approved') {
                              <div class="tv-pay-result__icon tv-pay-result__icon--ok">✓</div>
                              <h4 class="tv-pay-result__title">¡Abono realizado!</h4>
                              <p class="tv-pay-result__desc">Tu pago de la semana {{ t.currentWeek }} fue registrado con éxito.</p>
                              <a [href]="messengerUrl" target="_blank" rel="noopener" class="tv-btn tv-btn--messenger tv-btn--full">
                                <svg class="tv-btn__icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.672V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.1l3.131 3.26 5.887-3.26-6.559 6.863z"/></svg>
                                Avisar por Messenger
                              </a>
                            } @else {
                              <div class="tv-pay-result__icon tv-pay-result__icon--err">✕</div>
                              <h4 class="tv-pay-result__title">Pago no procesado</h4>
                              <p class="tv-pay-result__desc">{{ mpResult()?.message || 'Hubo un problema. Intenta de nuevo.' }}</p>
                              <button (click)="retryCardPayment()" class="tv-btn tv-btn--ghost">Reintentar</button>
                            }
                          </div>
                        }
                      </div>
                    }

                    @case ('transfer') {
                      <div class="tv-pay-card tv-pay-card--transfer tv-anim-in">
                        <div class="tv-pay-card__header">
                          <div class="tv-pay-card__icon-wrap tv-pay-card__icon-wrap--blue">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                          </div>
                          <div>
                            <span class="tv-pay-card__provider">Transferencia</span>
                            <span class="tv-pay-card__sub">MercadoPago</span>
                          </div>
                        </div>

                        <div class="tv-copy-field" (click)="copyText('722969017661718376')" role="button" tabindex="0">
                          <div class="tv-copy-field__body">
                            <span class="tv-copy-field__label">Cuenta CLABE</span>
                            <span class="tv-copy-field__value">7229 6901 7661 7183 76</span>
                          </div>
                          <div class="tv-copy-field__action">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Copiar
                          </div>
                        </div>

                        <div class="tv-pay-card__owner">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                          A nombre de: <strong>Yazmin Vara</strong>
                        </div>
                      </div>
                    }

                    @case ('oxxo') {
                      <div class="tv-pay-card tv-pay-card--oxxo tv-anim-in">
                        <div class="tv-pay-card__header">
                          <div class="tv-pay-card__icon-wrap tv-pay-card__icon-wrap--orange">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                          </div>
                          <div>
                            <span class="tv-pay-card__provider">OXXO / BBVA</span>
                            <span class="tv-pay-card__sub">Depósito en efectivo</span>
                          </div>
                        </div>

                        <div class="tv-copy-field" (click)="copyText('4152314496671333')" role="button" tabindex="0">
                          <div class="tv-copy-field__body">
                            <span class="tv-copy-field__label">Número de tarjeta</span>
                            <span class="tv-copy-field__value">4152 3144 9667 1333</span>
                          </div>
                          <div class="tv-copy-field__action">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            Copiar
                          </div>
                        </div>

                        <div class="tv-info-note">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                          Envía foto de tu ticket por Messenger después de pagar
                        </div>
                      </div>
                    }

                    @case ('cash') {
                      <div class="tv-pay-card tv-pay-card--cash tv-anim-in">
                        <div class="tv-pay-card__header">
                          <div class="tv-pay-card__icon-wrap tv-pay-card__icon-wrap--green">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                          </div>
                          <div>
                            <span class="tv-pay-card__provider">Pago en efectivo</span>
                            <span class="tv-pay-card__sub">Presencial</span>
                          </div>
                        </div>
                        <div class="tv-cash-info">
                          <div class="tv-cash-info__item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                            <span>Viernes y sábados</span>
                          </div>
                          <div class="tv-cash-info__item">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            <span>Directamente en el bazar</span>
                          </div>
                        </div>
                      </div>
                    }

                  }
                </div>

                <!-- Contact CTA -->
                <a [href]="messengerUrl" target="_blank" rel="noopener" class="tv-btn tv-btn--messenger tv-btn--full tv-contact-cta">
                  <svg class="tv-btn__icon" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.672V24l4.088-2.242c1.092.301 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8.1l3.131 3.26 5.887-3.26-6.559 6.863z"/></svg>
                  ¿Dudas o comprobantes? Escríbenos
                </a>
              </section>

              <!-- ── POLÍTICAS ── -->
              <section class="tv-section">
                <div class="tv-policy-card">
                  <div class="tv-policy-card__icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                  </div>
                  <div>
                    <h4 class="tv-policy-card__title">Políticas de la tanda</h4>
                    <p class="tv-policy-card__text">Entregas los <strong>Domingos</strong> a la ganadora de la semana.</p>
                  </div>
                </div>
              </section>

            </div>
          }

          <!-- ══════════════════════════════════════════ -->
          <!-- TAB: GRUPO (TRANSPARENCIA)                -->
          <!-- ══════════════════════════════════════════ -->
          @if (activeTab() === 'transparency') {
            <div class="tv-tab-content tv-anim-in">

              <section class="tv-section">
                <div class="tv-section__header">
                  <h2 class="tv-section__title">Transparencia del grupo</h2>
                  <span class="tv-section__hint">{{ t.participants.length }} participantes</span>
                </div>

                <div class="tv-timeline" id="transparency-timeline">
                  @for (p of t.participants; track p.assignedTurn) {
                    <div class="tv-tl-item" [class.tv-tl-item--current]="p.assignedTurn === t.currentWeek">

                      <!-- Número de turno -->
                      <div class="tv-tl-turn"
                           [class.tv-tl-turn--done]="p.assignedTurn < t.currentWeek"
                           [class.tv-tl-turn--current]="p.assignedTurn === t.currentWeek"
                           [class.tv-tl-turn--pending]="p.assignedTurn > t.currentWeek">
                        @if (p.assignedTurn < t.currentWeek && p.isDelivered) {
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                        } @else {
                          {{ p.assignedTurn }}
                        }
                      </div>

                      <!-- Línea conectora (no en el último) -->
                      @if (!$last) {
                        <div class="tv-tl-line"></div>
                      }

                      <!-- Card del participante -->
                      <div class="tv-tl-card">
                        <div class="tv-tl-card__top">
                          <div class="tv-tl-card__info">
                            <p class="tv-tl-card__name">{{ p.name }}</p>
                            <div class="tv-tl-card__meta">
                              @if (p.variant) {
                                <span class="tv-tl-badge tv-tl-badge--variant">{{ p.variant }}</span>
                              }
                              <span class="tv-tl-badge">📅 {{ getDeliveryDate(t.startDate, p.assignedTurn) | date:'EEE d MMM' : '' : 'es-MX' | uppercase }}</span>
                            </div>
                          </div>

                          <!-- Delivery badge -->
                          @if (p.assignedTurn <= t.currentWeek) {
                            <div class="tv-tl-delivery"
                                 [class.tv-tl-delivery--done]="p.isDelivered"
                                 [class.tv-tl-delivery--pending]="!p.isDelivered">
                              @if (p.isDelivered) {
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                                <span>Entregado</span>
                              } @else {
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                                <span>En ruta</span>
                              }
                            </div>
                          }
                        </div>

                        <!-- Barra de abonos -->
                        <div class="tv-tl-card__progress">
                          <div class="tv-tl-weeks">
                            @for (week of weeksArray(); track week) {
                              <div class="tv-tl-week-chip"
                                   [class.tv-tl-week-chip--paid]="p.paidWeeks.includes(week)"
                                   [class.tv-tl-week-chip--current]="week === t.currentWeek"
                                   [title]="'Semana ' + week + (p.paidWeeks.includes(week) ? ' — Pagado' : ' — Pendiente')">
                              </div>
                            }
                          </div>
                          <span class="tv-tl-card__progress-label">
                            {{ p.paidWeeks.length }}/{{ t.totalWeeks }} abonos
                          </span>
                        </div>

                        <div class="tv-tl-bar">
                          <div class="tv-tl-bar__fill"
                               [style.width]="(p.paidWeeks.length / t.totalWeeks * 100) + '%'"
                               [class.tv-tl-bar__fill--complete]="p.paidWeeks.length === t.totalWeeks">
                          </div>
                        </div>
                      </div>

                    </div>
                  }
                </div>
              </section>

            </div>
          }

        }
      </div>

      <!-- ░░ ASSISTANT WIDGET ░░ -->
      @if (tanda() && !loading()) {
        <div class="tv-assistant">
          @if (showAssistantBubble()) {
            <div class="tv-assistant__bubble tv-anim-in">
              <button class="tv-assistant__close" (click)="showAssistantBubble.set(false)" aria-label="Cerrar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
              <p class="tv-assistant__label">Asistente</p>
              <p class="tv-assistant__text">¿Tienes dudas sobre tu pago? Escríbenos, estamos para ayudarte.</p>
            </div>
          }
          <button class="tv-assistant__btn" (click)="showAssistantBubble.set(!showAssistantBubble())" aria-label="Abrir asistente">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      }

      <!-- ░░ TOAST ░░ -->
      @if (toastVisible()) {
        <div class="tv-toast tv-anim-in">
          <svg class="tv-toast__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          <span>{{ toastMessage() }}</span>
          <button class="tv-toast__close" (click)="toastVisible.set(false)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
      }

    </div>
  `,
  styles: [`
    /* ═══════════════════════════════════════════════
       TANDA VIEW — PREMIUM DARK REDESIGN
       Design System: Deep violet + amber gold accent
    ═══════════════════════════════════════════════ */

    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');

    /* ── Body override when tanda-view is active ── */
    body.tv-dark-mode {
      background: #0a0812 !important;
      color: #f0edf8 !important;
      cursor: auto !important;
    }
    body.tv-dark-mode a,
    body.tv-dark-mode button,
    body.tv-dark-mode [role="button"] {
      cursor: pointer !important;
    }

    /* ── Root ── */
    .tv-root {
      min-height: 100dvh;
      background: #0a0812;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      color: #f0edf8;
      position: relative;
      overflow-x: hidden;
      padding-bottom: 6rem;
    }

    /* ── BG Orbs ── */
    .tv-bg-orbs { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
    .tv-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: 0.25;
    }
    .tv-orb--1 {
      width: 500px; height: 500px;
      background: radial-gradient(circle, #7c3aed, transparent 70%);
      top: -100px; left: -100px;
      animation: orbFloat 12s ease-in-out infinite;
    }
    .tv-orb--2 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, #db2777, transparent 70%);
      bottom: 20%; right: -100px;
      animation: orbFloat 10s ease-in-out infinite reverse;
    }
    .tv-orb--3 {
      width: 300px; height: 300px;
      background: radial-gradient(circle, #d97706, transparent 70%);
      top: 50%; left: 30%;
      opacity: 0.15;
      animation: orbFloat 15s ease-in-out infinite;
    }
    @keyframes orbFloat {
      0%, 100% { transform: translate(0,0) scale(1); }
      33%       { transform: translate(20px,-30px) scale(1.05); }
      66%       { transform: translate(-15px,20px) scale(0.95); }
    }

    /* ── Container ── */
    .tv-container {
      position: relative; z-index: 10;
      max-width: 480px;
      margin: 0 auto;
      padding: 1.5rem 1rem;
    }

    /* ── Loading ── */
    .tv-loader {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 70vh; gap: 1rem;
    }
    .tv-loader__text { color: #a78bfa; font-weight: 600; font-size: 0.875rem; }

    /* ── Error ── */
    .tv-error {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: 70vh; text-align: center; gap: 0.75rem;
    }
    .tv-error__icon { font-size: 3.5rem; }
    .tv-error__title { font-size: 1.5rem; font-weight: 800; color: #f0edf8; }
    .tv-error__desc { color: #9ca3af; font-size: 0.875rem; }

    /* ── Spinner ── */
    .tv-spinner {
      width: 2.5rem; height: 2.5rem;
      border: 3px solid #2d2040;
      border-top-color: #a78bfa;
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .tv-spinner--sm { width: 1rem; height: 1rem; border-width: 2px; }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* ── HERO ── */
    .tv-hero {
      text-align: center;
      padding: 2.5rem 1rem 2rem;
      background: linear-gradient(180deg, rgba(124,58,237,0.12) 0%, transparent 100%);
      border-bottom: 1px solid rgba(255,255,255,0.06);
      margin-bottom: 1.5rem;
    }
    .tv-hero__badge {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed, #db2777);
      color: #fff;
      font-size: 0.6rem;
      font-weight: 800;
      letter-spacing: 0.2em;
      padding: 0.35rem 0.85rem;
      border-radius: 100px;
      margin-bottom: 1rem;
      text-transform: uppercase;
    }
    .tv-hero__name {
      font-size: 2rem;
      font-weight: 900;
      letter-spacing: -0.04em;
      color: #fff;
      margin: 0 0 0.4rem;
      line-height: 1.1;
    }
    .tv-hero__tagline {
      font-size: 0.8rem;
      color: #9d8dc0;
      margin: 0 0 1.75rem;
      font-weight: 500;
    }

    /* KPI Strip */
    .tv-kpi-strip {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.25rem;
      padding: 1rem;
      margin-bottom: 1.5rem;
      backdrop-filter: blur(16px);
    }
    .tv-kpi { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 0.2rem; }
    .tv-kpi__val {
      font-size: 1.6rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: -0.04em;
      line-height: 1;
    }
    .tv-kpi__label { font-size: 0.6rem; font-weight: 600; color: #6d5fa0; text-transform: uppercase; letter-spacing: 0.08em; }
    .tv-kpi-divider { width: 1px; height: 40px; background: rgba(255,255,255,0.08); margin: 0 0.5rem; }

    /* Progress bar */
    .tv-progress-wrap { margin-bottom: 1.25rem; }
    .tv-progress-bar {
      height: 8px;
      background: rgba(255,255,255,0.08);
      border-radius: 100px;
      overflow: hidden;
      position: relative;
    }
    .tv-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #7c3aed, #db2777, #f59e0b);
      border-radius: 100px;
      position: relative;
      transition: width 1s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .tv-progress-glow {
      position: absolute;
      right: 0; top: 50%;
      transform: translateY(-50%);
      width: 12px; height: 12px;
      background: #f59e0b;
      border-radius: 50%;
      box-shadow: 0 0 12px 4px rgba(245,158,11,0.6);
    }
    .tv-progress-labels {
      display: flex; justify-content: space-between;
      margin-top: 0.4rem;
      font-size: 0.6rem; color: #6d5fa0; font-weight: 600;
    }

    /* Week dots */
    .tv-weeks-dots {
      display: flex; flex-wrap: wrap; justify-content: center;
      gap: 0.35rem; margin-top: 0.5rem;
    }
    .tv-week-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
      transition: all 0.3s;
    }
    .tv-week-dot--done { background: #7c3aed; border-color: #7c3aed; }
    .tv-week-dot--current {
      background: #f59e0b;
      border-color: #f59e0b;
      box-shadow: 0 0 8px rgba(245,158,11,0.7);
      transform: scale(1.4);
    }

    /* ── App Banner ── */
    .tv-app-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1rem;
      padding: 0.85rem 1rem;
      margin-bottom: 1.5rem;
    }
    .tv-app-banner__left { display: flex; align-items: center; gap: 0.75rem; }
    .tv-app-banner__icon { font-size: 1.4rem; }
    .tv-app-banner__title { font-size: 0.75rem; font-weight: 700; color: #e2d8ff; margin: 0; }
    .tv-app-banner__sub { font-size: 0.6rem; color: #6d5fa0; margin: 0; }
    .tv-app-banner__btns { display: flex; gap: 0.4rem; flex-shrink: 0; }
    .tv-app-btn {
      font-size: 0.65rem; font-weight: 700;
      padding: 0.35rem 0.7rem; border-radius: 0.5rem;
      text-decoration: none;
      transition: all 0.2s;
    }
    .tv-app-btn--solid {
      background: #fff; color: #0a0812;
    }
    .tv-app-btn--outline {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.2);
      color: #e2d8ff;
    }
    .tv-app-btn:hover { opacity: 0.85; }

    /* ── TABS ── */
    .tv-tabs {
      display: flex; gap: 0.375rem;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1rem;
      padding: 0.375rem;
      margin-bottom: 1.75rem;
    }
    .sticky-tabs {
      position: sticky;
      top: 0.75rem;
      z-index: 30;
      backdrop-filter: blur(24px);
    }
    .tv-tab {
      flex: 1;
      display: flex; align-items: center; justify-content: center; gap: 0.5rem;
      padding: 0.65rem 0.5rem;
      border-radius: 0.75rem;
      border: none;
      background: transparent;
      color: #6d5fa0;
      font-size: 0.72rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.25s;
      letter-spacing: 0.01em;
    }
    .tv-tab__icon { width: 1rem; height: 1rem; }
    .tv-tab--active {
      background: rgba(124,58,237,0.2);
      color: #c4b5fd;
      border: 1px solid rgba(124,58,237,0.35);
    }
    .tv-tab:hover:not(.tv-tab--active) { color: #a78bfa; background: rgba(255,255,255,0.04); }

    /* ── Tab Content ── */
    .tv-tab-content { animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; }

    /* ── Winner Card ── */
    .tv-winner-card {
      position: relative;
      text-align: center;
      background: linear-gradient(135deg, #d97706, #f59e0b);
      border-radius: 1.5rem;
      padding: 2rem 1.5rem;
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .tv-winner-card__glow {
      position: absolute; inset: 0;
      background: radial-gradient(ellipse at center, rgba(255,255,255,0.15) 0%, transparent 70%);
    }
    .tv-winner-card__crown { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; position: relative; }
    .tv-winner-card__title { font-size: 1.25rem; font-weight: 900; color: #fff; margin: 0 0 0.35rem; position: relative; }
    .tv-winner-card__desc { font-size: 0.78rem; color: rgba(255,255,255,0.85); margin: 0; position: relative; }

    /* ── Section ── */
    .tv-section { margin-bottom: 1.5rem; }
    .tv-section__header {
      display: flex; align-items: baseline; justify-content: space-between;
      margin-bottom: 0.85rem;
    }
    .tv-section__title { font-size: 1rem; font-weight: 800; color: #f0edf8; margin: 0; }
    .tv-section__hint { font-size: 0.65rem; color: #6d5fa0; font-weight: 600; }

    /* ── Payment Tabs ── */
    .tv-pay-tabs {
      display: flex; gap: 0.25rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 0.85rem;
      padding: 0.25rem;
      margin-bottom: 1rem;
    }
    .tv-pay-tab {
      flex: 1;
      display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
      padding: 0.6rem 0.25rem;
      border: none; background: transparent;
      color: #6d5fa0;
      font-size: 0.6rem; font-weight: 700;
      cursor: pointer; border-radius: 0.65rem;
      transition: all 0.2s;
      letter-spacing: 0.02em;
    }
    .tv-pay-tab__icon { width: 1.1rem; height: 1.1rem; }
    .tv-pay-tab--active { background: rgba(124,58,237,0.15); color: #c4b5fd; }
    .tv-pay-tab:hover:not(.tv-pay-tab--active) { color: #a78bfa; }

    /* ── Pay Cards ── */
    .tv-pay-content { min-height: 160px; }
    .tv-pay-card {
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 1.25rem;
      padding: 1.25rem;
    }
    .tv-pay-card--transfer { border-color: rgba(99,102,241,0.3); background: rgba(99,102,241,0.06); }
    .tv-pay-card--oxxo    { border-color: rgba(234,88,12,0.3);  background: rgba(234,88,12,0.06);  }
    .tv-pay-card--cash    { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.06); }

    .tv-pay-card__header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
    .tv-pay-card__icon-wrap {
      width: 2.5rem; height: 2.5rem; border-radius: 0.75rem;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .tv-pay-card__icon-wrap svg { width: 1.2rem; height: 1.2rem; }
    .tv-pay-card__icon-wrap--blue   { background: rgba(99,102,241,0.2); color: #818cf8; }
    .tv-pay-card__icon-wrap--orange { background: rgba(234,88,12,0.2);  color: #fb923c; }
    .tv-pay-card__icon-wrap--green  { background: rgba(16,185,129,0.2); color: #34d399; }
    .tv-pay-card__logo { width: 2rem; height: 2rem; background: #00b1ea; border-radius: 0.5rem; }
    .tv-pay-card__logo--mp { background: linear-gradient(135deg, #00b1ea, #0070e0); }
    .tv-pay-card__provider { font-size: 0.8rem; font-weight: 700; color: #e2d8ff; display: block; }
    .tv-pay-card__sub { font-size: 0.65rem; color: #6d5fa0; }
    .tv-pay-card__owner {
      display: flex; align-items: center; gap: 0.4rem;
      font-size: 0.7rem; color: #9d8dc0; margin-top: 0.75rem;
    }
    .tv-pay-card__owner svg { width: 0.875rem; height: 0.875rem; flex-shrink: 0; }
    .tv-pay-card__owner strong { color: #c4b5fd; }
    .tv-pay-card__shield { font-size: 0.65rem; color: #6d5fa0; text-align: center; margin-top: 0.75rem; }

    /* Copy field */
    .tv-copy-field {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.875rem;
      padding: 0.875rem 1rem;
      cursor: pointer;
      transition: all 0.2s;
      gap: 0.75rem;
      user-select: none;
    }
    .tv-copy-field:hover { background: rgba(255,255,255,0.09); border-color: rgba(124,58,237,0.4); }
    .tv-copy-field:active { transform: scale(0.98); }
    .tv-copy-field__body { display: flex; flex-direction: column; gap: 0.2rem; }
    .tv-copy-field__label { font-size: 0.6rem; font-weight: 700; color: #6d5fa0; text-transform: uppercase; letter-spacing: 0.08em; }
    .tv-copy-field__value { font-family: 'Courier New', monospace; font-size: 0.85rem; font-weight: 700; color: #f0edf8; letter-spacing: 0.05em; }
    .tv-copy-field__action {
      display: flex; flex-direction: column; align-items: center; gap: 0.2rem;
      font-size: 0.55rem; font-weight: 700; color: #a78bfa; text-transform: uppercase;
      flex-shrink: 0;
    }
    .tv-copy-field__action svg { width: 1rem; height: 1rem; }

    /* Info note */
    .tv-info-note {
      display: flex; align-items: center; gap: 0.5rem;
      font-size: 0.7rem; color: #9d8dc0;
      background: rgba(255,255,255,0.04);
      border-radius: 0.75rem;
      padding: 0.65rem 0.875rem;
      margin-top: 0.75rem;
    }
    .tv-info-note svg { width: 0.875rem; height: 0.875rem; flex-shrink: 0; color: #fb923c; }

    /* Cash info */
    .tv-cash-info { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 0.25rem; }
    .tv-cash-info__item {
      display: flex; align-items: center; gap: 0.6rem;
      font-size: 0.8rem; font-weight: 600; color: #e2d8ff;
    }
    .tv-cash-info__item svg { width: 1.1rem; height: 1.1rem; color: #34d399; flex-shrink: 0; }

    /* MP Fields */
    .tv-mp-field {
      height: 3rem;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.75rem;
      padding: 0 1rem;
      display: flex; align-items: center;
    }
    .tv-mp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

    /* Form fields */
    .tv-field-wrap { display: flex; flex-direction: column; gap: 0.35rem; }
    .tv-field-label { font-size: 0.65rem; font-weight: 700; color: #6d5fa0; text-transform: uppercase; letter-spacing: 0.08em; }
    .tv-field-select, .tv-field-input {
      width: 100%;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 0.75rem;
      padding: 0.75rem 1rem;
      font-size: 0.85rem; font-weight: 600;
      color: #f0edf8;
      outline: none;
      transition: border-color 0.2s;
    }
    .tv-field-select:focus, .tv-field-input:focus { border-color: rgba(124,58,237,0.5); }
    .tv-field-input::placeholder { color: #4a3d6b; }

    /* MP fetching */
    .tv-mp-fetching { display: flex; align-items: center; gap: 0.5rem; font-size: 0.7rem; color: #a78bfa; justify-content: center; }

    /* Pay result */
    .tv-pay-result { text-align: center; padding: 1.5rem 0; }
    .tv-pay-result__icon {
      width: 3.5rem; height: 3.5rem; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.5rem; font-weight: 900; margin: 0 auto 1rem;
    }
    .tv-pay-result__icon--ok { background: rgba(16,185,129,0.2); color: #34d399; border: 2px solid rgba(16,185,129,0.4); }
    .tv-pay-result__icon--err { background: rgba(239,68,68,0.2); color: #f87171; border: 2px solid rgba(239,68,68,0.4); }
    .tv-pay-result__title { font-size: 1.1rem; font-weight: 800; color: #f0edf8; margin: 0 0 0.4rem; }
    .tv-pay-result__desc { font-size: 0.78rem; color: #9d8dc0; margin: 0 0 1.25rem; }

    /* ── Buttons ── */
    .tv-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
      font-size: 0.8rem; font-weight: 700;
      padding: 0.85rem 1.25rem; border-radius: 0.875rem;
      border: none; cursor: pointer;
      transition: all 0.2s;
      text-decoration: none;
      letter-spacing: 0.02em;
    }
    .tv-btn--full { width: 100%; }
    .tv-btn--primary {
      background: linear-gradient(135deg, #7c3aed, #db2777);
      color: #fff;
      box-shadow: 0 8px 24px rgba(124,58,237,0.3);
    }
    .tv-btn--primary:hover { opacity: 0.9; transform: translateY(-1px); }
    .tv-btn--primary:active { transform: scale(0.97); }
    .tv-btn--primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
    .tv-btn--messenger {
      background: #0084ff;
      color: #fff;
      box-shadow: 0 8px 24px rgba(0,132,255,0.3);
    }
    .tv-btn--messenger:hover { background: #0073e6; }
    .tv-btn--ghost {
      background: transparent;
      border: 1px solid rgba(255,255,255,0.15);
      color: #a78bfa;
    }
    .tv-btn__icon { width: 1.1rem; height: 1.1rem; flex-shrink: 0; }

    /* Contact CTA */
    .tv-contact-cta { margin-top: 1.25rem; }

    /* ── Policy Card ── */
    .tv-policy-card {
      display: flex; align-items: flex-start; gap: 1rem;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 1rem;
      padding: 1rem 1.1rem;
    }
    .tv-policy-card__icon {
      width: 2.25rem; height: 2.25rem; flex-shrink: 0;
      background: rgba(124,58,237,0.15);
      border-radius: 0.625rem;
      display: flex; align-items: center; justify-content: center;
      color: #a78bfa;
    }
    .tv-policy-card__icon svg { width: 1rem; height: 1rem; }
    .tv-policy-card__title { font-size: 0.72rem; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.08em; margin: 0 0 0.25rem; }
    .tv-policy-card__text { font-size: 0.78rem; color: #9d8dc0; margin: 0; line-height: 1.5; }
    .tv-policy-card__text strong { color: #c4b5fd; }

    /* ── TIMELINE (Grupo) ── */
    .tv-timeline { display: flex; flex-direction: column; }
    .tv-tl-item {
      display: grid;
      grid-template-columns: 2.25rem 1fr;
      grid-template-rows: auto 1fr;
      gap: 0 0.875rem;
      position: relative;
    }
    .tv-tl-item--current .tv-tl-card {
      background: rgba(124,58,237,0.08);
      border-color: rgba(124,58,237,0.3);
    }

    /* Turn circle */
    .tv-tl-turn {
      width: 2.25rem; height: 2.25rem;
      border-radius: 0.625rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 0.7rem; font-weight: 800;
      grid-column: 1; grid-row: 1;
      flex-shrink: 0;
      z-index: 1;
    }
    .tv-tl-turn svg { width: 0.9rem; height: 0.9rem; }
    .tv-tl-turn--done    { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.3); }
    .tv-tl-turn--current { background: linear-gradient(135deg, #7c3aed, #db2777); color: #fff; box-shadow: 0 4px 16px rgba(124,58,237,0.4); }
    .tv-tl-turn--pending { background: rgba(255,255,255,0.04); color: #4a3d6b; border: 1px solid rgba(255,255,255,0.08); }

    /* Connector line */
    .tv-tl-line {
      width: 2px;
      background: rgba(255,255,255,0.06);
      margin: 0.35rem auto 0;
      min-height: 1rem;
      grid-column: 1; grid-row: 2;
      justify-self: center;
    }

    /* Participant card */
    .tv-tl-card {
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 1rem;
      padding: 0.875rem 1rem;
      margin-bottom: 0.625rem;
      grid-column: 2; grid-row: 1 / span 2;
    }
    .tv-tl-card__top { display: flex; justify-content: space-between; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.75rem; }
    .tv-tl-card__info { flex: 1; min-width: 0; }
    .tv-tl-card__name { font-size: 0.875rem; font-weight: 700; color: #f0edf8; margin: 0 0 0.3rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tv-tl-card__meta { display: flex; flex-wrap: wrap; gap: 0.3rem; }
    .tv-tl-badge {
      font-size: 0.55rem; font-weight: 700; letter-spacing: 0.06em;
      background: rgba(255,255,255,0.06); color: #9d8dc0;
      padding: 0.2rem 0.5rem; border-radius: 100px;
      text-transform: uppercase;
    }
    .tv-tl-badge--variant { background: rgba(124,58,237,0.15); color: #a78bfa; }

    /* Delivery badge */
    .tv-tl-delivery {
      display: flex; flex-direction: column; align-items: center;
      gap: 0.2rem; flex-shrink: 0;
      border-radius: 0.625rem;
      padding: 0.4rem 0.5rem;
      font-size: 0.55rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
    }
    .tv-tl-delivery svg { width: 0.875rem; height: 0.875rem; }
    .tv-tl-delivery--done { background: rgba(16,185,129,0.15); color: #34d399; border: 1px solid rgba(16,185,129,0.25); }
    .tv-tl-delivery--pending { background: rgba(245,158,11,0.1); color: #fbbf24; border: 1px solid rgba(245,158,11,0.2); }

    /* Week chips */
    .tv-tl-card__progress { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-bottom: 0.5rem; }
    .tv-tl-weeks { display: flex; flex-wrap: wrap; gap: 0.2rem; flex: 1; }
    .tv-tl-week-chip {
      width: 0.9rem; height: 0.55rem; border-radius: 100px;
      background: rgba(255,255,255,0.07);
      border: 1px solid rgba(255,255,255,0.08);
      transition: all 0.3s;
    }
    .tv-tl-week-chip--paid { background: #7c3aed; border-color: #7c3aed; }
    .tv-tl-week-chip--current.tv-tl-week-chip--paid { background: #f59e0b; border-color: #f59e0b; box-shadow: 0 0 6px rgba(245,158,11,0.5); }
    .tv-tl-card__progress-label { font-size: 0.6rem; font-weight: 700; color: #6d5fa0; white-space: nowrap; }

    /* Participant bar */
    .tv-tl-bar { height: 3px; background: rgba(255,255,255,0.06); border-radius: 100px; overflow: hidden; }
    .tv-tl-bar__fill { height: 100%; background: linear-gradient(90deg, #7c3aed, #db2777); border-radius: 100px; transition: width 0.8s cubic-bezier(0.16,1,0.3,1); }
    .tv-tl-bar__fill--complete { background: linear-gradient(90deg, #10b981, #34d399); }

    /* ── ASSISTANT ── */
    .tv-assistant {
      position: fixed; bottom: 1.5rem; right: 1.25rem;
      z-index: 40; display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem;
    }
    .tv-assistant__bubble {
      background: rgba(15,10,30,0.92);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(124,58,237,0.3);
      border-radius: 1.1rem;
      padding: 0.875rem 1rem;
      max-width: 200px;
      position: relative;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .tv-assistant__close {
      position: absolute; top: -0.5rem; right: -0.5rem;
      width: 1.5rem; height: 1.5rem;
      background: rgba(124,58,237,0.6); color: #fff;
      border: none; border-radius: 50%; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .tv-assistant__close svg { width: 0.7rem; height: 0.7rem; }
    .tv-assistant__label { font-size: 0.6rem; font-weight: 700; color: #a78bfa; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 0.3rem; }
    .tv-assistant__text { font-size: 0.72rem; color: #c4b5fd; margin: 0; line-height: 1.4; }
    .tv-assistant__btn {
      width: 3.25rem; height: 3.25rem; border-radius: 50%;
      background: linear-gradient(135deg, #7c3aed, #db2777);
      border: none; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #fff;
      box-shadow: 0 8px 24px rgba(124,58,237,0.4);
      transition: all 0.2s;
      animation: assistantPulse 3s ease-in-out infinite;
    }
    .tv-assistant__btn:hover { transform: scale(1.1); }
    .tv-assistant__btn svg { width: 1.25rem; height: 1.25rem; }
    @keyframes assistantPulse {
      0%, 100% { box-shadow: 0 8px 24px rgba(124,58,237,0.4); }
      50%       { box-shadow: 0 8px 32px rgba(124,58,237,0.7); }
    }

    /* ── TOAST ── */
    .tv-toast {
      position: fixed;
      bottom: 5.5rem;
      left: 50%; transform: translateX(-50%);
      z-index: 100;
      display: flex; align-items: center; gap: 0.625rem;
      background: rgba(15,10,30,0.92);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(16,185,129,0.4);
      border-radius: 100px;
      padding: 0.75rem 1rem 0.75rem 0.875rem;
      color: #f0edf8;
      font-size: 0.75rem; font-weight: 700;
      box-shadow: 0 16px 40px rgba(0,0,0,0.5);
      white-space: nowrap;
    }
    .tv-toast__icon { width: 1.1rem; height: 1.1rem; color: #34d399; flex-shrink: 0; }
    .tv-toast__close {
      background: rgba(255,255,255,0.1); border: none; border-radius: 50%;
      width: 1.25rem; height: 1.25rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      color: #9d8dc0;
    }
    .tv-toast__close svg { width: 0.65rem; height: 0.65rem; }

    /* ── ANIMATIONS ── */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .tv-anim-in { animation: fadeUp 0.45s cubic-bezier(0.16, 1, 0.3, 1) both; }

    /* ── UTILITIES ── */
    .hidden { display: none !important; }
    .space-y-4 > * + * { margin-top: 1rem; }
    .space-y-3 > * + * { margin-top: 0.75rem; }
  `]
})
export class TandaViewComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private tandaService = inject(TandaService);
  private api = inject(ApiService);

  tanda = signal<any | null>(null);
  loading = signal(true);
  error = signal(false);
  scrollY = signal(0);
  accessToken: string = '';

  activeTab = signal<'summary' | 'transparency'>('summary');
  paymentTab = signal<'transfer' | 'cash' | 'oxxo' | 'card'>('transfer');

  // Mercado Pago Signals
  mp: any;
  cardFormInstance: any;
  mpSdkLoaded = signal(false);
  mpProcessing = signal(false);
  mpResult = signal<{ status: string; message: string } | null>(null);
  mpFetching = signal(false);
  selectedParticipantId = signal<string | null>(null);
  showAssistantBubble = signal(true);
  private bubbleTimeout: any;

  get messengerUrl() {
    const t = this.tanda();
    if (!t) return '';

    const baseUrl = t.businessMessengerUrl || 'https://m.me/';
    let ref = `tanda_${t.id}`;

    const pId = this.selectedParticipantId();
    if (pId) {
      const p = t.participants.find((x: any) => x.id === pId);
      if (p) ref += `_cli_${p.name.replace(/\s/g, '_')}`;
    }

    return `${baseUrl}?ref=${ref}`;
  }

  toastVisible = signal(false);
  toastMessage = signal('');
  private toastTimeout: any;

  isWinnerThisWeek = computed(() => {
    const t = this.tanda();
    if (!t) return false;
    return false;
  });

  @HostListener('window:scroll', ['$event'])
  onScroll(event?: any) {
    this.scrollY.set(window.scrollY);
  }

  copyText(val: string) {
    navigator.clipboard.writeText(val).then(() => {
      this.showToast('Copiado al portapapeles');
    });
  }

  showToast(msg: string) {
    this.toastMessage.set(msg);
    this.toastVisible.set(true);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => this.toastVisible.set(false), 3000);
  }

  ngOnInit() {
    // Apply dark mode override to body
    document.body.classList.add('tv-dark-mode');

    this.route.params.subscribe(params => {
      this.accessToken = params['token'];
      if (this.accessToken) this.loadTanda(this.accessToken);
    });

    // Auto-dismiss assistant after 10 seconds
    this.bubbleTimeout = setTimeout(() => {
      this.showAssistantBubble.set(false);
    }, 10000);
  }

  ngOnDestroy() {
    // Remove dark mode override when leaving this page
    document.body.classList.remove('tv-dark-mode');
    if (this.bubbleTimeout) clearTimeout(this.bubbleTimeout);
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }

  setPaymentTab(tab: 'transfer' | 'cash' | 'oxxo' | 'card') {
    if (this.paymentTab() === 'card' && tab !== 'card') {
      this.unmountCardForm();
      this.mpResult.set(null);
    }
    this.paymentTab.set(tab);
    if (tab === 'card') {
      this.onCardTabSelected();
    }
  }

  private loadMpScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as any).MercadoPago) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://sdk.mercadopago.com/js/v2';
      script.crossOrigin = 'anonymous';
      script.onload = () => {
        console.log('✅ MP SDK Loaded Successfully');
        resolve();
      };
      script.onerror = (e) => {
        console.error('❌ MP SDK Load Failed:', e);
        reject(new Error('MP SDK script error or blocked by adblocker'));
      };
      document.body.appendChild(script);
    });
  }

  private async onCardTabSelected() {
    const publicKey = this.tanda()?.mercadoPagoPublicKey;
    if (!publicKey) {
      this.paymentTab.set('transfer');
      this.showToast('Esta tienda no tiene pagos con tarjeta configurados.');
      return;
    }

    if (!this.mpSdkLoaded()) {
      try {
        await this.loadMpScript();
        if ((window as any).MercadoPago) {
          this.mp = new (window as any).MercadoPago(publicKey, { locale: 'es-MX' });
          this.mpSdkLoaded.set(true);
        } else {
          throw new Error('MercadoPago object not found after script load');
        }
      } catch (err: any) {
        console.error('🛑 MP Initialization Error:', err);
        this.showToast('Error al cargar pagos con tarjeta');
        return;
      }
    }

    setTimeout(() => {
      const formEl = document.getElementById('mp-card-form');
      if (formEl) {
        try {
          this.mountCardForm();
        } catch (mountErr: any) {
          console.error('🛑 MP Mounting Error:', mountErr);
        }
      } else {
        setTimeout(() => this.mountCardForm(), 300);
      }
    }, 200);
  }

  private mountCardForm() {
    if (!this.mp || this.cardFormInstance) return;

    const formEl = document.getElementById('mp-card-form');
    if (!formEl) return;

    try {
      this.cardFormInstance = this.mp.cardForm({
        amount: String(this.tanda()?.weeklyAmount || '0'),
        iframe: true,
        form: {
          id: 'mp-card-form',
          cardNumber: { id: 'mp-cardNumber', placeholder: 'Número de tarjeta' },
          expirationDate: { id: 'mp-expirationDate', placeholder: 'MM/AA' },
          securityCode: { id: 'mp-securityCode', placeholder: 'CVV' },
          cardholderName: { id: 'mp-cardholderName', placeholder: 'Nombre' },
          issuer: { id: 'mp-issuer' },
          installments: { id: 'mp-installments' },
          cardholderEmail: { id: 'mp-cardholderEmail' }
        },
        callbacks: {
          onFormMounted: (error: any) => {
            if (error) return console.warn('Form Mounted Error:', error);
            console.log('✅ MP Form Mounted');
          },
          onSubmit: (event: Event) => {
            event.preventDefault();
            this.submitCardPayment();
          },
          onFetching: (resource: string) => {
            this.mpFetching.set(true);
            setTimeout(() => this.mpFetching.set(false), 2000);
          }
        }
      });
    } catch (e: any) {
      console.error('🛑 MP cardForm Initialization Error:', JSON.stringify(e));
    }
  }

  private unmountCardForm() {
    if (this.cardFormInstance) {
      this.cardFormInstance.unmount();
      this.cardFormInstance = null;
    }
  }

  private submitCardPayment() {
    const participantId = this.selectedParticipantId();
    const t = this.tanda();
    if (!participantId || !t) return;

    const data = this.cardFormInstance.getCardFormData();
    if (!data.token) {
      this.showToast('Completa los datos de tu tarjeta');
      return;
    }

    this.mpProcessing.set(true);

    this.api.publicTandaCardPayment(this.accessToken, {
      participantId: participantId,
      weekNumber: t.currentWeek,
      cardToken: data.token,
      paymentMethodId: data.paymentMethodId
    }).subscribe({
      next: (res) => {
        this.mpProcessing.set(false);
        this.mpResult.set({ status: res.status, message: 'Pago aprobado' });
        if (res.status === 'approved') {
          this.showToast('¡Pago realizado!');
          this.loadTanda(this.accessToken);
        }
        this.unmountCardForm();
      },
      error: (err) => {
        this.mpProcessing.set(false);
        this.mpResult.set({ status: 'error', message: err.error?.message || 'Error al procesar el pago' });
      }
    });
  }

  retryCardPayment() {
    this.mpResult.set(null);
    setTimeout(() => this.mountCardForm(), 150);
  }

  loadTanda(token: string) {
    this.loading.set(true);
    this.tandaService.getPublicTanda(token).subscribe({
      next: (data) => {
        this.tanda.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set(true);
      }
    });
  }

  weeksArray = computed(() => {
    const t = this.tanda();
    if (!t) return [];
    return Array.from({ length: t.totalWeeks }, (_, i) => i + 1);
  });

  getDeliveryDate(startDate: string, turn: number): Date {
    if (!startDate) return new Date();

    const datePart = startDate.split('T')[0];
    const parts = datePart.split('-');

    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);

    const date = new Date(year, month, day, 12, 0, 0);
    date.setDate(date.getDate() + (turn - 1) * 7);

    const dayOfWeek = date.getDay();
    if (dayOfWeek !== 0) {
      date.setDate(date.getDate() + (7 - dayOfWeek) % 7);
    }

    return date;
  }
}
