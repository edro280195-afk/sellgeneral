import { Injectable, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';

interface InstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

@Injectable({ providedIn: 'root' })
export class PwaInstallService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly deferredPrompt = signal<InstallPromptEvent | null>(null);
    private readonly installed = signal(false);

    readonly canInstall = computed(() => !!this.deferredPrompt() && !this.installed());

    constructor() {
        if (!isPlatformBrowser(this.platformId)) return;

        const standalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        this.installed.set(standalone);

        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            this.deferredPrompt.set(event as InstallPromptEvent);
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt.set(null);
            this.installed.set(true);
        });
    }

    async install(): Promise<void> {
        const prompt = this.deferredPrompt();
        if (!prompt) return;

        this.deferredPrompt.set(null);
        await prompt.prompt();
        await prompt.userChoice;
    }
}
