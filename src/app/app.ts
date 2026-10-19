import { Component, inject, NgZone, OnInit } from '@angular/core';
import { RouterOutlet, Router } from '@angular/router';
import { App as CapacitorApp } from '@capacitor/app';
import { ToastComponent } from './shared/components/toast/toast.component';

import { PwaUpdateService } from './core/services/pwa-update.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastComponent],
  template: `
    <router-outlet />
    <app-toast />
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100svh;
      min-height: 100dvh;
      min-width: 0;
    }
  `]
})
export class App implements OnInit {
  private pwaUpdate = inject(PwaUpdateService);
  private router = inject(Router);
  private zone = inject(NgZone);

  ngOnInit() {
    CapacitorApp.addListener('appUrlOpen', data => {
      try {
        const urlObj = new URL(data.url);
        const path = urlObj.pathname;
        if (path.startsWith('/repartidor/')) {
          this.zone.run(() => {
            this.router.navigateByUrl(path);
          });
        }
      } catch (_) {}
    });
  }

}
