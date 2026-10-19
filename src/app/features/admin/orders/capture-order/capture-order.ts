import { Component, inject, signal, computed, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../../core/services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { ClientDto, ManualOrderRequest, OrderType, ExcelUploadResultDto, OrderSummaryDto, PagedResult, ORDER_STATUS_CSS, CommonProductDto } from '../../../../core/models';
import { normalizeOptionalAddress } from '../../../../core/utils/address.util';
import { buildOrderMessage } from '../../../../core/utils/order-message.util';
import {
  copyMessageToClipboard,
  MessageShareChannel,
  MessageShareRequest,
  openWhatsAppShare,
  shareMessageToMessenger
} from '../../../../core/utils/message-sharing.util';
import { ClientResolverComponent, ClientResolveResult } from './client-resolver/client-resolver.component';
import { MessageShareDialogComponent } from '../../../../shared/components/message-share-dialog/message-share-dialog.component';

interface TurboQueueItem {
  id: string;
  clientName: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  isExistingClient: boolean;
  /** ID de clienta resuelto por <app-client-resolver>. Cuando viene, el backend usa
   *  este ID directo y agrega el clientName como alias si difiere del canónico. */
  resolvedClientId?: number;
}

function normalizeForMatch(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/(as|es|os|a|o|s)$/, '');
}

@Component({
  selector: 'app-capture-order',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe, ClientResolverComponent, MessageShareDialogComponent],
  templateUrl: './capture-order.html',
  styleUrl: './capture-order.css'
})
export class CaptureOrderComponent implements OnInit {
  private api = inject(ApiService);
  private toast = inject(ToastService);

  mode = signal<'manual' | 'traditional' | 'excel'>('manual');
  uploading = signal(false);

  // ═════════════════ SHARING RESULTS ═════════════════
  result = signal<ExcelUploadResultDto | null>(null);
  error = signal<string>('');
  shareRequest = signal<MessageShareRequest | null>(null);
  private pendingShareOrderId: number | null = null;

  // ═════════════════ EXCEL MODE ═════════════════
  dragging = signal(false);
  selectedFile = signal<File | null>(null);
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  // ═════════════════ MANUAL MODE ═════════════════
  manualOrderType = 'Delivery';
  manualClient = signal('');
  manualAlternativeAddress = signal('');
  manualAddressOnlyForOrder = signal(false);
  manualScheduledDate = signal('');
  manualType = '';
  manualItems: { id: string; productName: string; quantity: number; unitPrice: number }[] = [];
  currentItem = { productName: '', quantity: 1, unitPrice: 0 };

  clients = signal<ClientDto[]>([]);
  showSuggestions = signal(false);
  autoDetected = signal(false);

  // Resolver multi-señal: ID de clienta confirmada (si la dueña usó el autocomplete o
  // confirmó la tarjeta del resolver). Cuando viene, se manda al backend en lugar de
  // hacer match por nombre, y el nombre tecleado se guarda como alias automáticamente.
  manualResolvedClientId = signal<number | null>(null);
  manualResolvedCanonicalName = signal<string>('');

  filteredClients = computed(() => {
    const s = this.manualClient().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    if (!s) return [];
    return this.clients().filter(c => {
      const clientName = c.name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
      return clientName.includes(s);
    }).slice(0, 8);
  });

  @ViewChild('manualQtyInput') manualQtyInput!: ElementRef<HTMLInputElement>;
  @ViewChild('manualPriceInput') manualPriceInput!: ElementRef<HTMLInputElement>;

  // ═════════════════ TURBO MODE ═════════════════
  turboInput = signal('');
  turboOrderType = 'Delivery';
  showTurboSuggestions = signal(false);
  pinnedProduct = signal<{ name: string; price: number } | null>(null);
  showPinForm = signal(false);
  pinProductName = '';
  pinProductPrice = 0;
  turboQueue = signal<TurboQueueItem[]>([]);
  lastAdded = signal<TurboQueueItem | null>(null);
  turboProgress = signal('');
  selectedSuggestionIdx = signal(-1);

  // Map: nombre de clienta (lowercase) → ID resuelto. Compartido entre items del mismo
  // grupo. Cuando la dueña confirma identidad de un grupo, todos sus items heredan.
  turboResolvedClients = signal<Map<string, number>>(new Map());

  turboSearchTerm = computed(() => {
    const input = this.turboInput().trim();
    if (!input) return '';
    if (this.pinnedProduct()) {
      return input.split(/\s+/)[0].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } else {
      return input.split(',')[0].trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }
  });

  turboFilteredClients = computed(() => {
    const s = this.turboSearchTerm();
    if (!s || s.length < 1) return [];
    return this.clients().filter(c => {
      const cn = c.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
      return cn.includes(s);
    }).slice(0, 6);
  });

  turboTotal = computed(() => this.turboQueue().reduce((sum, i) => sum + (i.unitPrice * i.quantity), 0));

  turboGroupedQueue = computed(() => {
    const grouped = new Map<string, { clientName: string; items: TurboQueueItem[]; total: number }>();
    // Iterate in reverse so newest items appear first in each group
    const queue = [...this.turboQueue()];
    for (const item of queue) {
      const key = item.clientName.toLowerCase().trim();
      if (!grouped.has(key)) {
        grouped.set(key, { clientName: item.clientName, items: [], total: 0 });
      }
      const g = grouped.get(key)!;
      g.items.push(item);
      g.total += item.unitPrice * item.quantity;
    }
    return Array.from(grouped.values());
  });

  turboClientCount = computed(() => this.turboGroupedQueue().length);

  // ═════════════════ INIT & DESTROY  // ═════════════════ INIT & DESTROY ═════════════════
  ngOnInit() {
    this.api.getClients().subscribe({
      next: (data) => this.clients.set(data),
      error: () => console.log('Error silenciado cargando clientas base')
    });
  }

  // ═════════════════ EXCEL METHODS  // ═════════════════ EXCEL METHODS ═════════════════
  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(true);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragging.set(false);
    if (event.dataTransfer?.files?.length) {
      this.selectedFile.set(event.dataTransfer.files[0]);
      this.result.set(null);
      this.error.set('');
    }
  }

  onFileSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile.set(file);
      this.result.set(null);
      this.error.set('');
    }
  }

  uploadExcel() {
    if (!this.selectedFile()) {
      this.toast.warning('Por favor selecciona un archivo Excel');
      return;
    }
    this.uploading.set(true);
    this.error.set('');
    this.result.set(null);

    this.api.uploadExcel(this.selectedFile()!).subscribe({
      next: (res) => {
        this.result.set(res);
        this.uploading.set(false);
        this.selectedFile.set(null);
        if (this.fileInput?.nativeElement) this.fileInput.nativeElement.value = '';
        this.toast.success(`¡Listo! ${res.ordersCreated} pedidos mágicamente creados ✨`);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Error desconocido al subir Excel 😿');
        this.uploading.set(false);
      }
    });
  }

  // ═════════════════ MANUAL METHODS ═════════════════
  onSearchClient() {
    this.showSuggestions.set(true);
    // If the input exactly matches a client (case insensitive & ignoring accents), auto-select it
    const searchVal = this.manualClient().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const exactMatch = this.clients().find(c => {
      const clientName = c.name?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
      return clientName === searchVal;
    });
    if (exactMatch) {
      this.autoDetected.set(true);
      this.manualType = (exactMatch.ordersCount && exactMatch.ordersCount >= 1) ? 'Frecuente' : 'Nueva';
      this.manualResolvedClientId.set(exactMatch.id);
      this.manualResolvedCanonicalName.set(exactMatch.name);
      this.manualAlternativeAddress.set(exactMatch.address ?? '');
      this.manualAddressOnlyForOrder.set(false);
    } else {
      this.autoDetected.set(false);
      this.manualType = ''; // Clear type if no exact match
      // El texto cambió y no es match exacto: la identidad confirmada deja de aplicar.
      if (this.manualResolvedCanonicalName() && this.manualResolvedCanonicalName().toLowerCase() !== this.manualClient().toLowerCase()) {
        this.manualResolvedClientId.set(null);
        this.manualResolvedCanonicalName.set('');
        this.manualAlternativeAddress.set('');
        this.manualAddressOnlyForOrder.set(false);
      }
    }
  }

  selectClient(client: ClientDto) {
    this.manualClient.set(client.name);
    this.showSuggestions.set(false);
    this.autoDetected.set(true);
    this.manualType = (client.ordersCount && client.ordersCount >= 1) ? 'Frecuente' : 'Nueva';
    // Confirmar identidad: el cliente elegido del autocomplete es la clienta canónica.
    this.manualResolvedClientId.set(client.id);
    this.manualResolvedCanonicalName.set(client.name);
    this.manualAlternativeAddress.set(client.address ?? '');
    this.manualAddressOnlyForOrder.set(false);

    // Auto-focus next field
    setTimeout(() => {
      const productInput = document.querySelector('input[placeholder="Ej. Tapete rosa"]') as HTMLInputElement;
      if (productInput) productInput.focus();
    }, 50);
  }

  /** Maneja la confirmación del resolver multi-señal en modo Tradicional. */
  onManualClientResolved(result: ClientResolveResult) {
    if (result.action === 'create' || !result.clientId) {
      this.manualResolvedClientId.set(null);
      this.manualResolvedCanonicalName.set('');
      this.autoDetected.set(false);
      return;
    }
    this.manualResolvedClientId.set(result.clientId);
    const canonical = result.matchedCandidate?.name ?? this.manualClient();
    this.manualResolvedCanonicalName.set(canonical);
    this.autoDetected.set(true);
    const candidate = result.matchedCandidate;
    if (candidate) {
      this.manualType = (candidate.ordersCount >= 1) ? 'Frecuente' : (candidate.type || 'Nueva');
      this.manualAlternativeAddress.set(candidate.address ?? '');
      this.manualAddressOnlyForOrder.set(false);
      this.toast.success(`Identificada: ${candidate.name} 💖`);
    }
  }

  hideSuggestionsWithDelay() {
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  addCurrentItem() {
    if (!this.currentItem.productName.trim() || this.currentItem.unitPrice <= 0 || this.currentItem.quantity <= 0) {
      this.toast.warning('Llena todos los datos del artículo (cantidad y precio > 0) 🌸');
      return;
    }

    this.manualItems.push({ id: crypto.randomUUID(), ...this.currentItem });
    this.currentItem = { productName: '', quantity: 1, unitPrice: 0 };

    // Focus back on product name for the next item easily
    setTimeout(() => {
      const productInput = document.querySelector('input[placeholder="Ej. Tapete rosa"]') as HTMLInputElement;
      if (productInput) productInput.focus();
    }, 50);
  }

  removeItem(id: string) {
    this.manualItems = this.manualItems.filter(item => item.id !== id);
  }

  focusManualField(field: 'qty' | 'price' | 'add') {
    if (field === 'qty') this.manualQtyInput?.nativeElement.focus();
    else if (field === 'price') this.manualPriceInput?.nativeElement.focus();
    else if (field === 'add') this.addCurrentItem();
  }

  getManualTotal(): number {
    return this.manualItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }

  createManual() {
    if (!this.manualClient().trim()) {
      this.toast.warning('¿A quién le vendemos? Falta la clienta 💁‍♀️');
      return;
    }
    if (!this.manualType) {
      this.toast.warning('¿Es nueva o frecuente? Selecciona su tipo 🎀');
      return;
    }
    if (this.manualItems.length === 0) {
      this.toast.warning('¡No hay artículos en el carrito! 🛒');
      return;
    }

    this.uploading.set(true);
    this.error.set('');

    const resolvedId = this.manualResolvedClientId();
    const deliveryAddress = normalizeOptionalAddress(this.manualAlternativeAddress());
    const req: ManualOrderRequest = {
      clientName: this.manualClient().trim(),
      ...(deliveryAddress && this.manualAddressOnlyForOrder()
        ? { alternativeAddress: deliveryAddress }
        : deliveryAddress
          ? { clientAddress: deliveryAddress }
          : {}),
      type: this.manualType || 'Nueva',
      orderType: this.manualOrderType,
      items: this.manualItems.map(i => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice })),
      scheduledDeliveryDate: this.manualScheduledDate() || undefined,
      clientId: resolvedId ?? undefined,
    };

    this.api.createManualOrder(req).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.toast.success(`Pedido creado para ${this.manualClient()} 💖`);

        // Reset manual form securely
        this.manualClient.set('');
        this.manualAlternativeAddress.set('');
        this.manualAddressOnlyForOrder.set(false);
        this.manualType = '';
        this.autoDetected.set(false);
        this.manualResolvedClientId.set(null);
        this.manualResolvedCanonicalName.set('');
        this.manualItems = [];
        this.currentItem = { productName: '', quantity: 1, unitPrice: 0 };
        this.manualOrderType = 'Delivery';
        this.manualScheduledDate.set('');

        // Set single result format if needed, but not strictly required by user flow
        // The original logic just showed a toast. If we want link preview:
        this.result.set({
          ordersCreated: 1, clientsCreated: req.type === 'Nueva' ? 1 : 0, warnings: [],
          orders: [{ id: res.id, clientName: res.clientName, total: res.total, orderType: res.orderType, link: res.link, items: res.items.map(i => ({ id: i.id, productName: i.productName, quantity: i.quantity })) }]
        });
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err.error?.message || 'Hubo un error al crear el pedido manual 🥺');
      }
    });
  }

  // ═════════════════ TURBO METHODS ═════════════════
  setPin() {
    if (!this.pinProductName.trim() || this.pinProductPrice <= 0) return;
    this.pinnedProduct.set({ name: this.pinProductName.trim(), price: this.pinProductPrice });
    this.showPinForm.set(false);
    this.pinProductName = '';
    this.pinProductPrice = 0;
    setTimeout(() => (document.querySelector('.turbo-input') as HTMLInputElement)?.focus(), 50);
  }

  clearPin() { this.pinnedProduct.set(null); }

  onTurboType() {
    this.showTurboSuggestions.set(true);
    this.lastAdded.set(null);
    this.selectedSuggestionIdx.set(-1);
  }

  onTurboKeydown(event: KeyboardEvent) {
    const suggestions = this.turboFilteredClients();
    const hasSuggestions = this.showTurboSuggestions() && suggestions.length > 0;

    // Ctrl+Enter = submit queue
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      this.submitTurboQueue();
      return;
    }

    // Escape = clear input or close suggestions
    if (event.key === 'Escape') {
      event.preventDefault();
      if (hasSuggestions) {
        this.showTurboSuggestions.set(false);
        this.selectedSuggestionIdx.set(-1);
      } else {
        this.turboInput.set('');
      }
      return;
    }

    // Arrow navigation in suggestions
    if (event.key === 'ArrowDown' && hasSuggestions) {
      event.preventDefault();
      this.selectedSuggestionIdx.update(i => (i + 1) % suggestions.length);
      return;
    }
    if (event.key === 'ArrowUp' && hasSuggestions) {
      event.preventDefault();
      this.selectedSuggestionIdx.update(i => i <= 0 ? suggestions.length - 1 : i - 1);
      return;
    }

    // Enter = select suggestion OR parse input
    if (event.key === 'Enter') {
      event.preventDefault();
      const idx = this.selectedSuggestionIdx();
      if (hasSuggestions && idx >= 0 && idx < suggestions.length) {
        this.selectTurboClient(suggestions[idx]);
        this.selectedSuggestionIdx.set(-1);
      } else {
        this.onTurboEnter();
      }
      return;
    }
  }

  hideTurboSuggestionsDelay() {
    setTimeout(() => { this.showTurboSuggestions.set(false); this.selectedSuggestionIdx.set(-1); }, 200);
  }

  selectTurboClient(client: ClientDto) {
    const pin = this.pinnedProduct();
    if (pin) {
      // Fill client name into input so user can type variant, then Enter to add
      this.turboInput.set(client.name + ', ');
      this.showTurboSuggestions.set(false);
    } else {
      const input = this.turboInput().trim();
      const commaIdx = input.indexOf(',');
      this.turboInput.set(commaIdx > -1 ? client.name + input.substring(commaIdx) : client.name + ', ');
      this.showTurboSuggestions.set(false);
    }
    setTimeout(() => (document.querySelector('.turbo-input') as HTMLInputElement)?.focus(), 50);
  }

  onTurboEnter() {
    const input = this.turboInput().trim();
    if (!input) return;
    const pin = this.pinnedProduct();

    if (pin) {
      let clientName: string;
      let variant = '';
      let isExisting = false;

      const commaIdx = input.indexOf(',');
      if (commaIdx > -1) {
        // Formato: Client Name, Variant
        clientName = this.capitalizeWords(input.substring(0, commaIdx).trim());
        variant = input.substring(commaIdx + 1).trim();
        const matched = this.findBestClientMatch(clientName);
        if (matched) {
          clientName = matched.name;
          isExisting = true;
        }
      } else {
        // No comma: take whole input as client name
        clientName = this.capitalizeWords(input);
        const matched = this.findBestClientMatch(clientName, true); // Strict match
        if (matched) {
          clientName = matched.name;
          isExisting = true;
        } else {
          isExisting = false;
        }
        variant = '';
      }

      const productName = variant ? `${pin.name} ${variant}` : pin.name;
      this.addItemToQueue(clientName, productName, 1, pin.price, isExisting);
    } else {
      const parsed = this.parseTurboFreeText(input);
      if (!parsed) { this.toast.warning('Formato: Nombre, Artículo, Precio 💡'); return; }
      const matched = this.findBestClientMatch(parsed.clientName);
      this.addItemToQueue(matched ? matched.name : parsed.clientName, parsed.productName, parsed.quantity, parsed.unitPrice, !!matched);
    }

    this.turboInput.set('');
    this.showTurboSuggestions.set(false);
    setTimeout(() => (document.querySelector('.turbo-input') as HTMLInputElement)?.focus(), 50);
  }

  private findBestClientMatch(input: string, exactOnly = false): ClientDto | null {
    const n = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    const sorted = [...this.clients()].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
    for (const c of sorted) {
      const cn = c.name?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || '';
      if (exactOnly) {
        if (n === cn) return c;
      } else {
        if (n.startsWith(cn + ' ') || n === cn) return c;
      }
    }
    return null;
  }

  private parseTurboFreeText(text: string): { clientName: string; productName: string; quantity: number; unitPrice: number } | null {
    const chunks = text.split(',').map(s => s.trim()).filter(Boolean);
    if (chunks.length >= 2) {
      let clientName = chunks[0];
      let price = 0;
      let quantity = 1;
      for (let i = chunks.length - 1; i >= 1; i--) {
        const nums = chunks[i].replace(/pesos?/gi, '').trim().match(/\d+(\.\d+)?/g);
        if (nums) {
          price = parseFloat(nums[nums.length - 1]);
          if (price > 0) {
            const qtyMatch = chunks[i].match(/^(\d+)\s+/);
            if (qtyMatch && parseInt(qtyMatch[1]) <= 20) quantity = parseInt(qtyMatch[1]);
            chunks.splice(i, 1);
            break;
          }
        }
      }
      const productName = chunks.slice(1).join(' ') || 'Artículo';
      clientName = this.capitalizeWords(clientName);
      if (price <= 0) return null;
      return { clientName, productName, quantity, unitPrice: price / quantity };
    }
    // Fallback: space-separated
    const words = text.split(/\s+/);
    let price = 0; let priceIdx = -1;
    for (let i = words.length - 1; i >= 0; i--) {
      const clean = words[i].replace(/pesos?/gi, '').trim();
      if (!isNaN(Number(clean)) && Number(clean) > 0) { price = Number(clean); priceIdx = i; break; }
    }
    if (price <= 0 || priceIdx < 1) return null;
    return { clientName: this.capitalizeWords(words[0]), productName: words.slice(1, priceIdx).join(' ') || 'Artículo', quantity: 1, unitPrice: price };
  }

  private capitalizeWords(t: string): string {
    return t.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  }

  private addItemToQueue(clientName: string, productName: string, quantity: number, unitPrice: number, isExisting: boolean) {
    // Si ya hay un ClientId resuelto para este nombre (por una confirmación previa del
    // resolver en la misma sesión), lo heredamos automáticamente.
    const resolvedId = this.turboResolvedClients().get(clientName.toLowerCase().trim());
    // Si es un match con cliente existente por nombre, también guardamos su Id.
    let inferredId = resolvedId;
    if (!inferredId && isExisting) {
      const matched = this.clients().find(c => c.name === clientName);
      if (matched) inferredId = matched.id;
    }
    const item: TurboQueueItem = {
      id: crypto.randomUUID(),
      clientName,
      productName,
      quantity,
      unitPrice,
      isExistingClient: isExisting || !!resolvedId,
      resolvedClientId: inferredId,
    };
    this.turboQueue.update(q => [item, ...q]);
    this.lastAdded.set(item);
    this.toast.success(`${clientName} → ${productName} ✨`);
    setTimeout(() => { if (this.lastAdded()?.id === item.id) this.lastAdded.set(null); }, 3000);
  }

  /**
   * Maneja la confirmación del resolver para un grupo en Turbo mode. Asigna el
   * resolvedClientId a todos los items del grupo y guarda el mapping para futuros
   * items con el mismo nombre.
   */
  onTurboClientResolved(clientName: string, result: ClientResolveResult) {
    const key = clientName.toLowerCase().trim();
    if (result.action === 'create' || !result.clientId) {
      // Limpiar mapping y items
      this.turboResolvedClients.update(m => {
        const next = new Map(m);
        next.delete(key);
        return next;
      });
      this.turboQueue.update(q => q.map(i =>
        i.clientName.toLowerCase().trim() === key
          ? { ...i, resolvedClientId: undefined, isExistingClient: false }
          : i
      ));
      return;
    }
    const cid = result.clientId;
    const canonicalName = result.matchedCandidate?.name ?? clientName;
    this.turboResolvedClients.update(m => {
      const next = new Map(m);
      next.set(key, cid);
      next.set(canonicalName.toLowerCase().trim(), cid);
      return next;
    });
    this.turboQueue.update(q => q.map(i =>
      i.clientName.toLowerCase().trim() === key
        ? { ...i, resolvedClientId: cid, isExistingClient: true, clientName: canonicalName }
        : i
    ));
    this.toast.success(`Grupo identificado: ${canonicalName} 💖`);
  }

  removeFromQueue(id: string) {
    this.turboQueue.update(q => q.filter(i => i.id !== id));
  }

  updateQueueItem(id: string, updates: Partial<TurboQueueItem>) {
    this.turboQueue.update(q => q.map(i => {
      if (i.id === id) {
        const updated = { ...i, ...updates };
        // If client name changed, re-check if it's an existing client
        if (updates.clientName) {
          const matched = this.findBestClientMatch(updates.clientName);
          updated.isExistingClient = !!matched;
          if (matched) updated.clientName = matched.name;
        }
        return updated;
      }
      return i;
    }));
  }

  updateGroupClientName(oldName: string, newName: string) {
    if (!newName.trim() || oldName === newName) return;
    const capitalized = this.capitalizeWords(newName);
    const matched = this.findBestClientMatch(capitalized);
    const finalName = matched ? matched.name : capitalized;
    
    this.turboQueue.update(q => q.map(i => 
      i.clientName.toLowerCase().trim() === oldName.toLowerCase().trim() 
        ? { ...i, clientName: finalName, isExistingClient: !!matched } 
        : i
    ));
  }

  submitTurboQueue() {
    const queue = this.turboQueue();
    if (queue.length === 0) return;

    const grouped = new Map<string, TurboQueueItem[]>();
    queue.forEach(item => {
      const key = item.clientName.toLowerCase().trim();
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    });

    const orders = Array.from(grouped.entries()).map(([_, items]) => ({
      clientName: items[0].clientName,
      resolvedClientId: items.find(i => i.resolvedClientId)?.resolvedClientId,
      items: items.map(i => ({ productName: i.productName, quantity: i.quantity, unitPrice: i.unitPrice }))
    }));

    this.uploading.set(true);
    let successCount = 0;
    const finalResults: any[] = [];

    const process = (idx: number) => {
      if (idx >= orders.length) {
        this.uploading.set(false);
        this.turboProgress.set('');
        this.toast.success(`¡${successCount} pedidos creados! 💖`);
        this.result.set({ ordersCreated: successCount, clientsCreated: 0, warnings: [], orders: finalResults });
        this.turboQueue.set([]);
        this.turboResolvedClients.set(new Map());
        this.lastAdded.set(null);
        return;
      }
      const o = orders[idx];
      this.turboProgress.set(`${o.clientName} (${idx + 1}/${orders.length})...`);

      // Determine client type dynamically instead of hardcoding 'Nueva'
      const matched = this.findBestClientMatch(o.clientName);
      const determinedType = (matched && matched.ordersCount && matched.ordersCount >= 1) ? 'Frecuente' : 'Nueva';

      const req: ManualOrderRequest = {
        clientName: o.clientName,
        type: determinedType,
        orderType: this.turboOrderType,
        items: o.items,
        clientId: o.resolvedClientId,
      };
      this.api.createManualOrder(req).subscribe({
        next: (res) => {
          successCount++;
          finalResults.push({ id: res.id, clientName: res.clientName, total: res.total, orderType: res.orderType, link: res.link, items: res.items.map(i => ({ id: i.id, productName: i.productName, quantity: i.quantity })) });
          process(idx + 1);
        },
        error: () => { this.toast.error(`Error con ${o.clientName} 😿`); process(idx + 1); }
      });
    };
    process(0);
  }

  // ═════════════════ RESULTS METHODS ═════════════════
  copyAllLinks() {
    if (!this.result()) return;
    const text = this.result()!.orders.map(order => `¡Hola bonita! Aquí está el ticket de tu pedido (total: $${order.total.toFixed(2)}): \n${order.link}`).join('\n\n');
    copyMessageToClipboard(text).then(
      () => this.toast.success('¡Todos los enlaces copiados! 📋'),
      () => this.toast.error('No pudimos copiar los enlaces.')
    );
  }

  copyLink(input: HTMLInputElement) {
    input.select();
    document.execCommand('copy');
    this.toast.success('Enlace copiado al portapapeles ✨');
  }

  shareOrder(order: ExcelUploadResultDto['orders'][number]): void {
    this.pendingShareOrderId = order.id;
    this.shareRequest.set({
      title: 'Compartir pedido',
      recipientName: order.clientName,
      message: buildOrderMessage({ clientName: order.clientName, publicLink: order.link })
    });
  }

  closeShareDialog(): void {
    this.pendingShareOrderId = null;
    this.shareRequest.set(null);
  }

  async shareOrderMessage(channel: MessageShareChannel): Promise<void> {
    const request = this.shareRequest();
    const orderId = this.pendingShareOrderId;
    if (!request || orderId === null) return;
    this.closeShareDialog();

    let prepared = false;
    try {
      if (channel === 'whatsapp') {
        openWhatsAppShare(undefined, request.message);
        prepared = true;
        this.toast.info('WhatsApp quedó listo con el enlace; elige a quién enviarlo.');
      } else if (channel === 'messenger') {
        const result = await shareMessageToMessenger(request.title, request.message);
        prepared = result !== 'cancelled';
        if (result === 'shared') this.toast.success('El mensaje se compartió desde las opciones del teléfono.');
        if (result === 'copied') this.toast.success('Mensaje copiado; pégalo en Messenger.');
      } else {
        await copyMessageToClipboard(request.message);
        prepared = true;
        this.toast.success(`Mensaje de ${request.recipientName} copiado 💬`);
      }
    } catch {
      this.toast.error('No pudimos preparar el pedido para compartir.');
    }

    if (prepared) {
      this.api.markOrderNotified(orderId, true).subscribe({
        error: () => this.toast.error('El enlace se compartió, pero no se pudo marcar como enviado.')
      });
    }
  }
}
