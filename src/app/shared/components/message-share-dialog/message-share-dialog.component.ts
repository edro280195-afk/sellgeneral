import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { MessageShareChannel } from '../../../core/utils/message-sharing.util';

@Component({
  selector: 'app-message-share-dialog',
  standalone: true,
  imports: [A11yModule],
  template: `
    <div class="fixed inset-0 z-[5000] flex items-end justify-center bg-pink-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4"
         (click)="onBackdropClick($event)">
      <section role="dialog" aria-modal="true" aria-labelledby="message-share-title"
               aria-describedby="message-share-description"
               cdkTrapFocus [cdkTrapFocusAutoCapture]="true"
               class="max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[2rem] border border-pink-100 bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-[2rem] sm:p-6">
        <div class="mx-auto mb-4 h-1.5 w-10 rounded-full bg-pink-200 sm:hidden" aria-hidden="true"></div>

        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <h2 id="message-share-title" class="text-lg font-black text-pink-900">{{ title }}</h2>
            <p id="message-share-description" class="mt-1 text-sm leading-relaxed text-pink-600">
              Elige dónde preparar el mensaje{{ recipientName ? ' para ' + recipientName : '' }}.
            </p>
          </div>
          <button type="button" class="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-lg text-pink-600 hover:bg-pink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  aria-label="Cerrar opciones para compartir" (click)="closed.emit()">✕</button>
        </div>

        @if (message) {
          <p class="mt-4 max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-2xl border border-pink-100 bg-pink-50/60 p-3 text-xs leading-relaxed text-pink-800">{{ message }}</p>
        }

        <div class="mt-4 grid grid-cols-2 gap-2.5">
          <button type="button" class="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-3 text-sm font-black text-pink-800 transition-colors hover:bg-pink-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  (click)="channelSelected.emit('whatsapp')">
            <span aria-hidden="true">📱</span> WhatsApp
          </button>
          <button type="button" class="flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-white px-3 text-sm font-black text-pink-800 transition-colors hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                  (click)="channelSelected.emit('messenger')">
            <span aria-hidden="true">💬</span> Messenger
          </button>
        </div>

        <p class="mt-2 text-center text-[11px] leading-relaxed text-pink-500">
          En el teléfono elige Messenger en las opciones para compartir. Si no están disponibles, copiaremos el texto para pegarlo allí.
        </p>

        <button type="button" class="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-pink-100 px-3 text-sm font-bold text-pink-700 transition-colors hover:bg-pink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
                (click)="channelSelected.emit('copy')">
          <span aria-hidden="true">📋</span> Copiar mensaje
        </button>
      </section>
    </div>
  `
})
export class MessageShareDialogComponent {
  @Input() title = 'Enviar mensaje';
  @Input() recipientName = '';
  @Input() message = '';

  @Output() readonly channelSelected = new EventEmitter<MessageShareChannel>();
  @Output() readonly closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closed.emit();
  }
}
