import { Component, OnInit, OnDestroy, signal, computed, ElementRef, ViewChild, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { BackgroundGeolocationPlugin } from '@capacitor-community/background-geolocation';
const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>('BackgroundGeolocation');
import { ApiService } from '../../../core/services/api.service';
import { SignalRService } from '../../../core/services/signalr.service';
import { PushNotificationService } from '../../../core/services/push-notification.service';
import { GpsService } from '../../../core/services/gps.service';
import { DriverRouteDto, ORDER_STATUS_LABELS, RouteDeliveryDto } from '../../../core/models';
import { effect } from '@angular/core';

declare const google: any;

/** GPS key for localStorage persistence */
const GPS_KEY = 'regi_gps_granted';

@Component({
    selector: 'app-route-view',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './route-view.component.html',
    styleUrl: './route-view.component.css'
})
export class RouteViewComponent implements OnInit, OnDestroy {
    @ViewChild('mapContainer') mapEl?: ElementRef;
    @ViewChild('clientChatScroll') clientChatScroll?: ElementRef;

    private routeParam = inject(ActivatedRoute);
    private api = inject(ApiService);
    private signalr = inject(SignalRService);
    private push = inject(PushNotificationService);
    public gps = inject(GpsService);

    route = signal<DriverRouteDto | null>(null);
    loading = signal(true);
    errorMessage = signal('');
    gpsActive = this.gps.active;
    expandedId = signal(0);
    toastMsg = signal('');

    deliveredCount = computed(() => this.route()?.deliveries.filter(delivery => delivery.status === 'Delivered').length ?? 0);
    failedCount = computed(() => this.route()?.deliveries.filter(delivery => delivery.status === 'NotDelivered').length ?? 0);
    failedDeliveries = computed(() => this.route()?.deliveries.filter(delivery => delivery.status === 'NotDelivered') ?? []);
    resolvedCount = computed(() => this.route()?.deliveries.filter(delivery =>
        delivery.status === 'Delivered' || delivery.status === 'NotDelivered').length ?? 0);
    progressPercent = computed(() => {
        const r = this.route();
        if (!r || !r.deliveries.length) return 0;
        return (this.resolvedCount() / r.deliveries.length) * 100;
    });
    totalCobrado = computed(() => {
        const r = this.route();
        if (!r) return 0;
        return r.deliveries.reduce((routeTotal, delivery) => {
            if (delivery.status !== 'Delivered') return routeTotal;
            const collected = (delivery.payments ?? [])
                .filter(payment => (payment.registeredBy ?? '').trim().toLowerCase() === 'driver')
                .reduce((paymentTotal, payment) => paymentTotal + payment.amount, 0);
            return routeTotal + collected;
        }, 0);
    });

    activeChatDelivery = signal<RouteDeliveryDto | null>(null);
    clientChatMessages = signal<any[]>([]);
    newClientMessage = '';

    isDelivering = signal(false);
    isReportingFailure = signal(false);

    isCardExpanded = signal(true);
    failureDelivery = computed(() => this.route()?.deliveries.find(delivery => delivery.deliveryId === this.failModalId()) ?? null);

    nextDelivery = computed(() => {
        const r = this.route();
        if (!r) return null;
        return r.deliveries.find(delivery => delivery.status === 'Pending' || delivery.status === 'InTransit') ?? null;
    });

    showExpenseModal = signal(false);
    showReorderModal = signal(false);
    submittingExpense = signal(false);
    failModalId = signal(0);
    selectedReason = signal('');
    customReason = '';
    failReasons = ['No estaba 🏠', 'Dirección incorrecta 📍', 'No contestó 📱', 'Rechazó pedido ❌'];

    deliveryNotes: Record<number, string> = {};
    paymentMethods: Record<number, string> = {};
    photos: Record<number, { file: File; preview: string }[]> = {};

    // ── Signature pad ──
    signatures: Record<number, { svg: string; name?: string }> = {};
    signatureModalId = signal(0);
    signatureName = '';
    private sigCtx: CanvasRenderingContext2D | null = null;
    private sigDrawing = false;
    private sigHasInk = false;
    @ViewChild('signatureCanvas') signatureCanvasRef?: ElementRef<HTMLCanvasElement>;
    expenseForm = { type: 'Gasolina', amount: null as number | null, notes: '', photo: null as File | null };

    private token = '';
    mapInitialized = false;
    map: any;
    routePolyline: any;
    fullRoutePolyline: any;
    markers: any[] = [];

    // Navigation Overlay Signals
    navEta = signal<string>('');
    navDistance = signal<string>('');
    navNextAddress = signal<string>('');
    navNextClient = signal<string>('');
    private lastRouteCalcLat = 0;
    private lastRouteCalcLng = 0;
    private lastRouteCalcDestId = 0;
    private driverMarker: any;
    private clientMsgIds = new Set<number | string>();

    constructor() {
        // React to GPS position changes globally from the service
        effect(() => {
            const pos = this.gps.lastPosition();
            if (pos && this.map) {
                this.updateDriverMarker(pos.lat, pos.lng);
                this.updateRouteDirection();
            }
        });
    }

    ngOnInit(): void {
        this.token = this.routeParam.snapshot.paramMap.get('token') || '';
        this.loadRoute();

        this.signalr.clientChatUpdate$.subscribe(msg => {
            if (this.clientMsgIds.has(msg.id)) return;
            this.clientMsgIds.add(msg.id);
            if (this.activeChatDelivery()?.deliveryId === msg.deliveryId) {
                this.clientChatMessages.update(msgs => [...msgs, msg]);
                this.scrollTo('client');
            } else {
                this.showToast('🌸 Mensaje de clienta');
            }
        });

        this.signalr.routeUpdated$.subscribe(() => {
            this.showToast('🔄 ¡Ruta actualizada por la base!');
            this.loadRoute();
        });

        this.initPush();
    }

    private initPush(): void {
        this.push.requestPermission().then(granted => {
            if (granted) this.push.subscribeToNotifications('driver', { routeToken: this.token });
        });
    }

    ngOnDestroy(): void {
        // No desconectar SignalR aquí — GpsService sigue corriendo en background
        // y necesita SignalR para reportar ubicación. GpsService.stop() lo maneja.
    }

    // ═══ REORDER (↑/↓ buttons — mobile friendly) ═══
    moveDelivery(index: number, dir: 1 | -1): void {
        const r = this.route();
        if (!r) return;
        const newIndex = index + dir;
        if (newIndex < 0 || newIndex >= r.deliveries.length) return;
        moveItemInArray(r.deliveries, index, newIndex);
        r.deliveries.forEach((d: any, i: number) => d.sortOrder = i + 1);
        this.route.set({ ...r });
    }

    saveReorder(): void {
        const r = this.route();
        if (!r) return;
        const ids = r.deliveries.map(delivery => delivery.deliveryId);
        this.api.driverReorderRouteDeliveries(this.token, ids).subscribe({
            next: () => { this.showToast('✅ Orden guardado'); this.closeReorderModal(); this.loadRoute(); },
            error: () => { this.showToast('Error al guardar 😿'); this.loadRoute(); }
        });
    }

    toggleCard(): void {
        this.isCardExpanded.update(v => !v);
    }

    private loadRoute(): void {
        this.loading.set(true);
        this.errorMessage.set('');
        this.api.getDriverRoute(this.token).subscribe({
            next: (r: DriverRouteDto) => {
                r.deliveries.sort((a, b) => a.sortOrder - b.sortOrder);
                this.route.set(r);
                this.loading.set(false);
                this.signalr.connect().then(() => this.signalr.joinRoute(this.token));
                setTimeout(() => this.initMap(r), 150);
                this.startGps();
            },
            error: () => {
                this.route.set(null);
                this.errorMessage.set('No encontramos la ruta o el enlace ya no está activo. Revisa el enlace que recibiste de la tienda.');
                this.loading.set(false);
            }
        });
    }

    retryRoute(): void {
        this.loadRoute();
    }

    // ═══ GPS ═══
    startGps(): void {
        this.gps.start(this.token);
    }

    centerOnMe(): void {
        const pos = this.gps.lastPosition();
        if (pos && this.map) { 
            this.map.panTo({ lat: pos.lat, lng: pos.lng }); 
            this.map.setZoom(16); 
        }
    }

    private updateDriverMarker(lat: number, lng: number): void {
        const pos = { lat, lng };
        if (!this.driverMarker) {
            this.driverMarker = new google.maps.Marker({
                position: pos, map: this.map,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 10, fillColor: '#3B82F6', fillOpacity: 1, strokeColor: 'white', strokeWeight: 3 },
                zIndex: 1000
            });
        } else { this.driverMarker.setPosition(pos); }
    }

    // Haversine distance in meters
    private getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3;
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private formatMeters(meters: number): string {
        return meters < 1000
            ? `${Math.round(meters)} m aprox.`
            : `${(meters / 1000).toFixed(1)} km aprox.`;
    }

    private formatApproxEta(meters: number): string {
        const minutes = Math.max(1, Math.round((meters / 1000) / 25 * 60));
        return `${minutes} min aprox.`;
    }

    // Dibuja una ruta aproximada sin pedir rutas reales en cada movimiento.
    private updateRouteDirection(forceCalc = false): void {
        const r = this.route();
        const pos = this.gps.lastPosition();
        if (!pos || !this.map || !r) return;
        const pending = r.deliveries.filter(d =>
            d.status !== 'Delivered' && d.status !== 'NotDelivered' && d.latitude != null && d.longitude != null);
        if (!pending.length) {
            this.routePolyline?.setMap(null);
            this.fullRoutePolyline?.setMap(null);
            return;
        }

        const origin = { lat: pos.lat, lng: pos.lng };
        const nextStop = pending[0];
        if (nextStop.latitude == null || nextStop.longitude == null) return;
        const dest = { lat: nextStop.latitude, lng: nextStop.longitude };

        // Update Overlay UI
        this.navNextAddress.set(nextStop.alternativeAddress || nextStop.clientAddress || 'Sin dirección');
        this.navNextClient.set(nextStop.clientName);

        // SMART AUTO-CENTERING
        // We removed the aggressive fitBounds to ensure the driver stays centered in the view, 
        // as watchPosition already calls map.panTo(driverLocation) every second.

        const distMoved = this.getDistance(pos.lat, pos.lng, this.lastRouteCalcLat, this.lastRouteCalcLng);
        if (!forceCalc && nextStop.deliveryId === this.lastRouteCalcDestId && distMoved < 50) return;

        this.lastRouteCalcLat = pos.lat;
        this.lastRouteCalcLng = pos.lng;
        this.lastRouteCalcDestId = nextStop.deliveryId;

        const metersToNext = this.getDistance(origin.lat, origin.lng, dest.lat, dest.lng);
        this.navDistance.set(this.formatMeters(metersToNext));
        this.navEta.set(this.formatApproxEta(metersToNext));
        this.routePolyline?.setMap(null);
        this.routePolyline = new google.maps.Polyline({
            path: [origin, dest],
            map: this.map,
            strokeColor: '#f472b6',
            strokeWeight: 6,
            strokeOpacity: 0.9
        });

        if (pending.length > 1) {
            const fullPath = [
                origin,
                ...pending.slice(0, 21).map(d => ({ lat: d.latitude!, lng: d.longitude! }))
            ];
            this.fullRoutePolyline?.setMap(null);
            this.fullRoutePolyline = new google.maps.Polyline({
                path: fullPath,
                map: this.map,
                strokeColor: '#a1a1aa',
                strokeWeight: 3,
                strokeOpacity: 0.4
            });
        } else {
            this.fullRoutePolyline?.setMap(null);
        }
    }

    // ═══ MAP ═══
    private async initMap(route: DriverRouteDto): Promise<void> {
        if (!this.mapEl?.nativeElement || typeof google === 'undefined') return;
        // Create the map only once — subsequent loadRoute() calls must not recreate it
        if (!this.map) {
            this.map = new google.maps.Map(this.mapEl.nativeElement, {
                center: { lat: 27.48, lng: -99.50 }, zoom: 13, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy'
            });
        }
        this.plotRoute(route);
        this.updateRouteDirection(true);
    }

    // Geocodes delivery addresses that are missing lat/lng using the Google Geocoder API.
    // Results are stored directly on the delivery objects (in-memory only).
    private geocodeDeliveries(route: DriverRouteDto): Promise<void> {
        if (typeof google === 'undefined') return Promise.resolve();
        const geocoder = new google.maps.Geocoder();
        const needsGeocode = route.deliveries.filter(d =>
            d.latitude == null && (d.alternativeAddress || d.clientAddress));
        if (!needsGeocode.length) return Promise.resolve();

        const tasks = needsGeocode.map(d => {
            const raw = (d.alternativeAddress || d.clientAddress || '').trim();
            if (!raw) return Promise.resolve();
            const full = raw.toLowerCase().includes('nuevo laredo')
                ? `${raw}, Tamaulipas, México`
                : `${raw}, Nuevo Laredo, Tamaulipas, México`;
            return new Promise<void>(resolve => {
                geocoder.geocode({ address: full, region: 'mx' }, (results: any, status: string) => {
                    if (status === 'OK' && results?.[0]) {
                        d.latitude = results[0].geometry.location.lat();
                        d.longitude = results[0].geometry.location.lng();
                    } else {
                        console.warn(`[RouteView] Geocode failed for "${raw}":`, status);
                    }
                    resolve();
                });
            });
        });
        return Promise.all(tasks).then(() => { });
    }

    private plotRoute(route: DriverRouteDto): void {
        if (!this.map) return;
        this.markers.forEach((m: any) => m.setMap(null));
        this.markers = [];
        const bounds = new google.maps.LatLngBounds();

        route.deliveries.forEach(d => {
            if (d.latitude == null || d.longitude == null) return;
            const pos = { lat: d.latitude, lng: d.longitude };
            bounds.extend(pos);
            let fillColor = '#ec4899';
            if (d.status === 'InTransit') fillColor = '#3B82F6';
            else if (d.status === 'Delivered') fillColor = '#059669';
            else if (d.status === 'NotDelivered') fillColor = '#dc2626';
            const marker = new google.maps.Marker({
                position: pos, map: this.map,
                label: { text: d.sortOrder.toString(), color: 'white', fontWeight: 'bold', fontSize: '11px' },
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 14, fillColor, fillOpacity: 1, strokeColor: 'white', strokeWeight: 2 },
                zIndex: d.status === 'InTransit' ? 10 : 5
            });
            this.markers.push(marker);
        });
        if (!bounds.isEmpty()) this.map.fitBounds(bounds, 40);
    }

    // ═══ ROUTE ACTIONS ═══
    startRoute(): void {
        this.api.startRoute(this.token).subscribe(() => { this.showToast('🚀 ¡Ruta Iniciada!'); this.loadRoute(); });
    }
    markInTransit(id: number): void {
        this.api.markInTransit(this.token, id).subscribe(() => { this.showToast('🏃 En camino'); this.loadRoute(); });
    }
    markDelivered(deliveryId: number): void {
        if (this.isDelivering() || this.isReportingFailure()) return;
        this.isDelivering.set(true);
        const notes = this.deliveryNotes[deliveryId] || '';
        const photoFiles = (this.photos[deliveryId] || []).map(photo => photo.file);
        const method = this.paymentMethods[deliveryId];
        const delivery = this.route()?.deliveries.find(item => item.deliveryId === deliveryId);
        const due = delivery?.balanceDue ?? delivery?.total ?? 0;
        const payments = method && due > 0 ? [{ amount: due, method }] : undefined;
        const sig = this.signatures[deliveryId];
        const signature = sig ? { svg: sig.svg, signedByName: sig.name } : undefined;
        this.api.markDelivered(this.token, deliveryId, notes, photoFiles, payments, signature).subscribe({
            next: () => {
                this.showToast(`¡${ORDER_STATUS_LABELS[2]}! ✨`);
                this.photos[deliveryId] = []; this.deliveryNotes[deliveryId] = '';
                delete this.signatures[deliveryId];
                this.isDelivering.set(false);
                this.loadRoute();
            },
            error: () => { this.isDelivering.set(false); }
        });
    }

    // ── Signature pad methods ──
    openSignaturePad(deliveryId: number): void {
        this.signatureModalId.set(deliveryId);
        this.signatureName = '';
        this.sigHasInk = false;
        setTimeout(() => this.initSignaturePad(), 50);
    }

    closeSignaturePad(): void {
        this.signatureModalId.set(0);
        this.sigCtx = null;
    }

    private initSignaturePad(): void {
        const canvas = this.signatureCanvasRef?.nativeElement;
        if (!canvas) return;
        // Ajustar al tamaño real del display (mejora definición en retina)
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = '#831843';
        ctx.lineWidth = 2.2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this.sigCtx = ctx;
    }

    onSignatureStart(ev: PointerEvent): void {
        if (!this.sigCtx) return;
        ev.preventDefault();
        const canvas = this.signatureCanvasRef!.nativeElement;
        const rect = canvas.getBoundingClientRect();
        this.sigCtx.beginPath();
        this.sigCtx.moveTo(ev.clientX - rect.left, ev.clientY - rect.top);
        this.sigDrawing = true;
        try { canvas.setPointerCapture(ev.pointerId); } catch {}
    }

    onSignatureMove(ev: PointerEvent): void {
        if (!this.sigCtx || !this.sigDrawing) return;
        ev.preventDefault();
        const canvas = this.signatureCanvasRef!.nativeElement;
        const rect = canvas.getBoundingClientRect();
        this.sigCtx.lineTo(ev.clientX - rect.left, ev.clientY - rect.top);
        this.sigCtx.stroke();
        this.sigHasInk = true;
    }

    onSignatureEnd(): void {
        this.sigDrawing = false;
    }

    clearSignaturePad(): void {
        const canvas = this.signatureCanvasRef?.nativeElement;
        if (canvas && this.sigCtx) this.sigCtx.clearRect(0, 0, canvas.width, canvas.height);
        this.sigHasInk = false;
    }

    signatureHasInk(): boolean { return this.sigHasInk; }

    saveSignaturePad(): void {
        const id = this.signatureModalId();
        if (!id || !this.signatureCanvasRef?.nativeElement) return;
        const svg = this.canvasToSvg(this.signatureCanvasRef.nativeElement);
        this.signatures[id] = { svg, name: this.signatureName.trim() || undefined };
        this.closeSignaturePad();
        this.showToast('✍️ Firma guardada');
    }

    skipSignaturePad(): void {
        // No se guarda nada; el botón "Entregar" seguirá funcionando sin firma.
        this.closeSignaturePad();
    }

    private canvasToSvg(canvas: HTMLCanvasElement): string {
        const rect = canvas.getBoundingClientRect();
        const w = rect.width;
        const h = rect.height;
        // Para una entrega real se podría vectorizar; aquí usamos la imagen del
        // canvas dentro de un <foreignObject> para fidelidad total con un SVG
        // pequeño (~2-5 KB).
        const dataUrl = canvas.toDataURL('image/png');
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><foreignObject width="100%" height="100%"><img xmlns="http://www.w3.org/1999/xhtml" src="${dataUrl}" style="width:100%;height:100%"/></foreignObject></svg>`;
    }

    // ═══ FAIL ═══
    showFailModalFn(deliveryId: number): void {
        if (this.isReportingFailure()) return;
        this.failModalId.set(deliveryId);
        this.selectedReason.set('');
        this.customReason = '';
    }

    cancelFail(): void {
        if (this.isReportingFailure()) return;
        this.failModalId.set(0);
    }

    confirmFail(): void {
        const deliveryId = this.failModalId();
        const selectedReason = this.selectedReason();
        const details = this.customReason.trim();
        const reason = selectedReason || details;
        if (!deliveryId || !reason || this.isReportingFailure()) return;

        this.isReportingFailure.set(true);
        const photoFiles = (this.photos[deliveryId] || []).map(photo => photo.file);
        this.api.markFailed(this.token, deliveryId, reason, selectedReason ? details : '', photoFiles).subscribe({
            next: () => {
                this.photos[deliveryId] = [];
                this.deliveryNotes[deliveryId] = '';
                this.customReason = '';
                this.isReportingFailure.set(false);
                this.failModalId.set(0);
                this.showToast('No entregada registrada. La siguiente parada sigue en ruta.');
                this.loadRoute();
            },
            error: () => {
                this.isReportingFailure.set(false);
                this.showToast('No se pudo registrar la falla. Revisa tu conexión e inténtalo de nuevo.');
            }
        });
    }

    // ═══ EXPENSES ═══
    openExpenseModal(): void { this.showExpenseModal.set(true); }
    closeExpenseModal(): void { this.showExpenseModal.set(false); this.expenseForm = { type: 'Gasolina', amount: null, notes: '', photo: null }; }
    
    openReorderModal(): void { this.showReorderModal.set(true); }
    closeReorderModal(): void { this.showReorderModal.set(false); }

    onExpensePhoto(e: Event): void { this.expenseForm.photo = (e.target as HTMLInputElement).files?.[0] || null; }
    submitExpense(): void {
        if (!this.expenseForm.amount) return;
        this.submittingExpense.set(true);
        this.api.addDriverExpense(this.token, this.expenseForm).subscribe({
            next: () => { this.showToast('💰 Gasto registrado'); this.closeExpenseModal(); this.submittingExpense.set(false); },
            error: () => { this.showToast('Error al registrar gasto'); this.submittingExpense.set(false); }
        });
    }

    // ═══ CLIENT CHAT ═══
    openClientChat(delivery: RouteDeliveryDto, event: Event): void {
        event.stopPropagation(); this.activeChatDelivery.set(delivery); this.newClientMessage = '';
        this.api.getDriverClientChat(this.token, delivery.deliveryId).subscribe(msgs => {
            this.clientMsgIds.clear(); msgs.forEach((m: any) => this.clientMsgIds.add(m.id));
            this.clientChatMessages.set(msgs); this.scrollTo('client');
        });
    }
    closeClientChat(): void { this.activeChatDelivery.set(null); this.clientChatMessages.set([]); this.clientMsgIds.clear(); }
    sendClientChat(): void {
        const delivery = this.activeChatDelivery(); const text = this.newClientMessage.trim();
        if (!text || !delivery) return; this.newClientMessage = '';
        this.api.sendDriverClientMessage(this.token, delivery.deliveryId, text).subscribe(msg => {
            if (!this.clientMsgIds.has(msg.id)) { this.clientMsgIds.add(msg.id); this.clientChatMessages.update(m => [...m, msg]); }
            this.scrollTo('client');
        });
    }

    // ═══ HELPERS ═══
    toggleExpand(id: number): void { this.expandedId.set(this.expandedId() === id ? 0 : id); }
    formatTime(d: string): string { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    showToast(m: string): void { this.toastMsg.set(m); setTimeout(() => this.toastMsg.set(''), 3000); }
    getPhotos(id: number): { file: File; preview: string }[] { return this.photos[id] || []; }
    removePhoto(id: number, i: number): void { if (this.photos[id]) this.photos[id].splice(i, 1); }

    onPhotoCapture(e: Event, deliveryId: number): void {
        const file = (e.target as HTMLInputElement).files?.[0]; if (!file) return;
        if ((this.photos[deliveryId]?.length ?? 0) >= 5) {
            this.showToast('Puedes adjuntar hasta 5 fotos por parada.');
            (e.target as HTMLInputElement).value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (re) => {
            const img = new Image(); img.src = re.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX = 1000; let w = img.width, h = img.height;
                if (w > MAX) { h = h * (MAX / w); w = MAX; }
                canvas.width = w; canvas.height = h;
                canvas.getContext('2d')?.drawImage(img, 0, 0, w, h);
                canvas.toBlob(blob => {
                    if (!blob) return;
                    const cf = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), { type: 'image/jpeg' });
                    if (!this.photos[deliveryId]) this.photos[deliveryId] = [];
                    this.photos[deliveryId].push({ file: cf, preview: canvas.toDataURL('image/jpeg', 0.8) });
                }, 'image/jpeg', 0.8);
            };
        };
        reader.readAsDataURL(file);
        (e.target as HTMLInputElement).value = '';
    }

    navigateTo(d: RouteDeliveryDto): void {
        const url = d.latitude && d.longitude
            ? `https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}`
            : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent((d.alternativeAddress || d.clientAddress || '') + ', Nuevo Laredo, Tamaulipas, México')}`;
        window.open(url, '_blank');
    }

    openGoogleRoute(r: DriverRouteDto): void {
        const pending = r.deliveries.filter(d => d.status !== 'Delivered' && d.status !== 'NotDelivered');
        if (pending.length === 0) {
            this.showToast('No hay entregas pendientes');
            return;
        }

        // Trazar ruta turn-by-turn EXCLUSIVAMENTE a la siguiente parada (Posición 1 en la cola actual)
        const nextDelivery = pending[0];
        if (nextDelivery.latitude && nextDelivery.longitude) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${nextDelivery.latitude},${nextDelivery.longitude}&travelmode=driving`, '_blank');
        } else {
            // Fallback por texto si no hay coords precisas
            const addr = nextDelivery.alternativeAddress || nextDelivery.clientAddress;
            if (addr) window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(addr)}&travelmode=driving`, '_blank');
            else this.showToast('La siguiente entrega no tiene dirección válida');
        }
    }


    private scrollTo(chat: 'client'): void {
        setTimeout(() => {
            const el = this.clientChatScroll;
            if (el?.nativeElement) el.nativeElement.scrollTop = el.nativeElement.scrollHeight;
        }, 60);
    }

    @HostListener('document:visibilitychange')
    onVisibilityChange(): void { if (document.visibilityState === 'visible') this.loadRoute(); }
}
