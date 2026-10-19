import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
    DashboardDto, OrderSummaryDto, PagedResult, ReportDto, ClientDto, CreateClientRequest,
    RouteDto, SupplierDto, InvestmentDto,
    DriverExpenseDto, ManualOrderRequest, OrderStatsDto,
    AddPaymentRequest, CreateSupplierRequest, CreateInvestmentRequest,
    UpdateOrderDetailsRequest, CreateAdminExpenseRequest,
    CommonProductDto, OrderPaymentDto, OrderPackageDto, GeneratePackagesRequest,
    AiInsight,
    AiRouteSelectionRequest, AiRouteSelectionResponse,
    AvailableTandaDto, CreateRouteResponse, PreviewRouteResponse, BulkGeocodeResultDto,
    RecomposeRouteResponse,
    ResolveClientRequest, ResolveClientResponse,
    ClientAliasDto, AddAliasRequest, MergeClientsRequest, DuplicateSuggestionDto,
    ClientMergeAuditDto,
    LoyaltyRewardDto,
    LabelTemplateEditorDto, LabelTemplateSaveDraftRequest, LabelAssetDto,
    CreateLabelPrintJobRequest, LabelPrintJobDto, UpdateLabelPrintJobStatusRequest, AvailableLabelPackageDto,
    InventoryBoxSummaryDto, InventoryBoxDto, InventoryMovementPageDto,
    InventoryLabelPrintDto, BuyerNotificationDto, SalesPeriodDto, MergeOrdersRequest
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApiService {
    private readonly base = environment.apiUrl;

    constructor(private http: HttpClient) { }

    getApiUrl(): string {
        return this.base;
    }

    // ── Dashboard ──
    getDashboard(): Observable<DashboardDto> {
        return this.http.get<DashboardDto>(`${this.base}/orders/dashboard`);
    }

    // ── Orders ──
    getOrders(): Observable<OrderSummaryDto[]> {
        return this.http.get<OrderSummaryDto[]>(`${this.base}/orders`);
    }

    getOrdersPaged(page: number, size: number, status?: string, search?: string, orderType?: string, startDate?: string, endDate?: string, type?: string, salesPeriodId?: number): Observable<PagedResult<OrderSummaryDto>> {
        let params = new HttpParams()
            .set('page', page.toString())
            .set('pageSize', size.toString());
        if (status) params = params.set('status', status);
        if (search) params = params.set('search', search);
        if (orderType) params = params.set('orderType', orderType);
        if (type) params = params.set('type', type);
        if (startDate) params = params.set('dateFrom', startDate);
        if (endDate) params = params.set('dateTo', endDate);
        if (salesPeriodId != null) params = params.set('salesPeriodId', salesPeriodId.toString());
        return this.http.get<PagedResult<OrderSummaryDto>>(`${this.base}/orders/paged`, { params });
    }

    getClientOrdersPaged(clientId: number, page: number, size: number): Observable<PagedResult<OrderSummaryDto>> {
        const params = new HttpParams()
            .set('clientId', clientId.toString())
            .set('page', page.toString())
            .set('pageSize', size.toString())
            .set('sortBy', 'date')
            .set('sortDir', 'desc');
        return this.http.get<PagedResult<OrderSummaryDto>>(`${this.base}/orders/paged`, { params });
    }

    getOrderMergeCandidates(targetOrderId: number, page: number, size: number, search: string): Observable<PagedResult<OrderSummaryDto>> {
        const params = new HttpParams()
            .set('targetOrderId', targetOrderId.toString())
            .set('page', page.toString())
            .set('pageSize', size.toString())
            .set('search', search);
        return this.http.get<PagedResult<OrderSummaryDto>>(`${this.base}/orders/merge-candidates`, { params });
    }

    mergeOrders(targetOrderId: number, request: MergeOrdersRequest): Observable<OrderSummaryDto> {
        return this.http.post<OrderSummaryDto>(`${this.base}/orders/${targetOrderId}/merge`, request);
    }

    getSalesPeriods(): Observable<SalesPeriodDto[]> {
        return this.http.get<SalesPeriodDto[]>(`${this.base}/salesperiods`);
    }

    markOrderNotified(id: number, notified: boolean): Observable<OrderSummaryDto> {
        return this.http.patch<OrderSummaryDto>(`${this.base}/orders/${id}/notified`, { notified });
    }

    getUnpaidOrders(): Observable<OrderSummaryDto[]> {
        return this.http.get<OrderSummaryDto[]>(`${this.base}/orders/unpaid`);
    }

    getOrderStats(): Observable<OrderStatsDto> {
        return this.http.get<OrderStatsDto>(`${this.base}/orders/stats`);
    }

    createManualOrder(order: ManualOrderRequest): Observable<OrderSummaryDto> {
        return this.http.post<OrderSummaryDto>(`${this.base}/orders/manual`, order);
    }

    applyBirthdayDiscount(id: number): Observable<OrderSummaryDto> {
        return this.http.post<OrderSummaryDto>(`${this.base}/orders/${id}/apply-birthday-discount`, {});
    }

    updateOrderDetails(id: number, data: UpdateOrderDetailsRequest): Observable<any> {
        return this.http.put(`${this.base}/orders/${id}`, data);
    }

    updateOrderStatus(id: number, data: { status?: string; orderType?: string; postponedAt?: string; postponedNote?: string }): Observable<any> {
        return this.http.patch(`${this.base}/orders/${id}/status`, data);
    }

    deleteOrder(id: number): Observable<any> {
        return this.http.delete(`${this.base}/orders/${id}`);
    }

    getPackages(orderId: number): Observable<OrderPackageDto[]> {
        return this.http.get<OrderPackageDto[]>(`${this.base}/orders/${orderId}/packages`);
    }

    generatePackages(orderId: number, data: GeneratePackagesRequest): Observable<OrderPackageDto[]> {
        return this.http.post<OrderPackageDto[]>(`${this.base}/orders/${orderId}/packages/generate`, data);
    }

    getOrderLabelTemplate(mediaSize: string): Observable<LabelTemplateEditorDto> {
        return this.http.get<LabelTemplateEditorDto>(this.base + '/label-templates/order-package/default', {
            params: { mediaSize }
        });
    }

    saveLabelTemplateDraft(id: string, request: LabelTemplateSaveDraftRequest): Observable<LabelTemplateEditorDto> {
        return this.http.put<LabelTemplateEditorDto>(this.base + '/label-templates/' + id + '/draft', request);
    }

    publishLabelTemplate(id: string): Observable<LabelTemplateEditorDto> {
        return this.http.post<LabelTemplateEditorDto>(this.base + '/label-templates/' + id + '/publish', {});
    }

    resetLabelTemplateDraft(id: string): Observable<LabelTemplateEditorDto> {
        return this.http.post<LabelTemplateEditorDto>(this.base + '/label-templates/' + id + '/draft/reset', {});
    }

    getLabelAssets(): Observable<LabelAssetDto[]> {
        return this.http.get<LabelAssetDto[]>(this.base + '/label-templates/assets');
    }

    uploadLabelAsset(file: File, name: string): Observable<LabelAssetDto> {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('name', name);
        return this.http.post<LabelAssetDto>(this.base + '/label-templates/assets', formData);
    }

    createLabelPrintJob(request: CreateLabelPrintJobRequest): Observable<LabelPrintJobDto> {
        return this.http.post<LabelPrintJobDto>(this.base + '/label-print-jobs', request);
    }

    updateLabelPrintJobStatus(id: string, request: UpdateLabelPrintJobStatusRequest): Observable<LabelPrintJobDto> {
        return this.http.put<LabelPrintJobDto>(this.base + '/label-print-jobs/' + id + '/status', request);
    }

    getAvailableLabelPackages(take = 100): Observable<AvailableLabelPackageDto[]> {
        return this.http.get<AvailableLabelPackageDto[]>(this.base + '/label-print-jobs/available-packages', {
            params: new HttpParams().set('take', take)
        });
    }

    addPayment(orderId: number, payment: AddPaymentRequest): Observable<OrderPaymentDto> {
        return this.http.post<OrderPaymentDto>(`${this.base}/orders/${orderId}/payments`, payment);
    }

    deletePayment(orderId: number, paymentId: number): Observable<any> {
        return this.http.delete(`${this.base}/orders/${orderId}/payments/${paymentId}`);
    }

    addOrderItem(orderId: number, item: { productName: string; quantity: number; unitPrice: number }): Observable<any> {
        return this.http.post(`${this.base}/orders/${orderId}/items`, item);
    }

    updateOrderItem(orderId: number, itemId: number, item: { productName: string; quantity: number; unitPrice: number }): Observable<any> {
        return this.http.put(`${this.base}/orders/${orderId}/items/${itemId}`, item);
    }

    removeOrderItem(orderId: number, itemId: number): Observable<any> {
        return this.http.delete(`${this.base}/orders/${orderId}/items/${itemId}`);
    }

    uploadExcel(file: File): Observable<any> {
        const fd = new FormData();
        fd.append('file', file);
        return this.http.post(`${this.base}/orders/upload-excel`, fd);
    }

    getCommonProducts(): Observable<CommonProductDto[]> {
        return this.http.get<CommonProductDto[]>(`${this.base}/orders/common-products`);
    }

    // ── Reports ──
    getReports(start: string, end: string): Observable<ReportDto> {
        return this.http.get<ReportDto>(`${this.base}/orders/reports`, {
            params: new HttpParams().set('start', start).set('end', end)
        });
    }

    getReportInsights(report: ReportDto): Observable<AiInsight[]> {
        return this.http.post<AiInsight[]>(`${this.base}/reports/ai-insights`, report);
    }

    // ── Clients ──
    getClients(): Observable<ClientDto[]> {
        return this.http.get<ClientDto[]>(`${this.base}/clients`);
    }

    getClient(id: number): Observable<ClientDto> {
        return this.http.get<ClientDto>(`${this.base}/clients/${id}`);
    }

    createClient(request: CreateClientRequest): Observable<ClientDto> {
        return this.http.post<ClientDto>(`${this.base}/clients`, request);
    }

    updateClient(id: number, data: { name: string; phone?: string; address?: string; tag: string; type: string; deliveryInstructions?: string }): Observable<any> {
        return this.http.put(`${this.base}/clients/${id}`, data);
    }

    deleteClient(id: number): Observable<any> {
        return this.http.delete(`${this.base}/clients/${id}`);
    }

    // ── Resolver multi-señal de clientas ──
    resolveClient(req: ResolveClientRequest): Observable<ResolveClientResponse> {
        return this.http.post<ResolveClientResponse>(`${this.base}/clients/resolve`, req);
    }

    getClientAliases(clientId: number): Observable<ClientAliasDto[]> {
        return this.http.get<ClientAliasDto[]>(`${this.base}/clients/${clientId}/aliases`);
    }

    addClientAlias(clientId: number, req: AddAliasRequest): Observable<ClientAliasDto> {
        return this.http.post<ClientAliasDto>(`${this.base}/clients/${clientId}/aliases`, req);
    }

    deleteClientAlias(aliasId: number): Observable<any> {
        return this.http.delete(`${this.base}/clients/aliases/${aliasId}`);
    }

    mergeClients(req: MergeClientsRequest): Observable<any> {
        return this.http.post(`${this.base}/clients/merge`, req);
    }

    getDuplicateSuggestions(limit: number = 50): Observable<DuplicateSuggestionDto[]> {
        const params = new HttpParams().set('limit', limit.toString());
        return this.http.get<DuplicateSuggestionDto[]>(`${this.base}/clients/duplicate-suggestions`, { params });
    }

    getClientMergeAudits(take: number = 50): Observable<ClientMergeAuditDto[]> {
        return this.http.get<ClientMergeAuditDto[]>(`${this.base}/clients/merge-audits?take=${take}`);
    }

    // ── Routes ──
    getRoutes(): Observable<RouteDto[]> {
        return this.http.get<RouteDto[]>(`${this.base}/routes`);
    }

    getRoute(id: number): Observable<RouteDto> {
        return this.http.get<RouteDto>(`${this.base}/routes/${id}`);
    }

    createRoute(orderIds: number[], force: boolean = false, tandaParticipantIds?: string[], preOptimized: boolean = false): Observable<CreateRouteResponse> {
        return this.http.post<CreateRouteResponse>(`${this.base}/routes`, { orderIds, force, tandaParticipantIds, preOptimized });
    }

    previewRoute(orderIds: number[], tandaParticipantIds: string[], startLat?: number, startLng?: number): Observable<PreviewRouteResponse> {
        return this.http.post<PreviewRouteResponse>(`${this.base}/routes/preview`, {
            orderIds, tandaParticipantIds, startLat, startLng
        });
    }

    getAvailableTandas(): Observable<AvailableTandaDto[]> {
        return this.http.get<AvailableTandaDto[]>(`${this.base}/routes/available-tandas`);
    }

    bulkGeocodeClients(clientIds: number[]): Observable<BulkGeocodeResultDto[]> {
        return this.http.post<BulkGeocodeResultDto[]>(`${this.base}/clients/bulk-geocode`, { clientIds });
    }

    setClientCoordinates(
        clientId: number,
        latitude: number,
        longitude: number,
        address?: string,
        deliveryInstructions?: string
    ): Observable<void> {
        return this.http.post<void>(`${this.base}/clients/${clientId}/set-coordinates`, {
            latitude,
            longitude,
            address,
            deliveryInstructions
        });
    }

    deleteRoute(id: number): Observable<any> {
        return this.http.delete(`${this.base}/routes/${id}`);
    }

    liquidateRoute(id: number): Observable<any> {
        return this.http.post(`${this.base}/routes/${id}/liquidate`, {});
    }

    // ── Admin Delivery Chat ──
    getDeliveryChat(routeId: number, deliveryId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/routes/${routeId}/deliveries/${deliveryId}/chat`);
    }

    sendAdminDeliveryMessage(routeId: number, deliveryId: number, text: string): Observable<any> {
        return this.http.post<any>(`${this.base}/routes/${routeId}/deliveries/${deliveryId}/chat`, { text });
    }

    // ── Suppliers ──
    getSuppliers(): Observable<SupplierDto[]> {
        return this.http.get<SupplierDto[]>(`${this.base}/suppliers`);
    }

    createSupplier(data: CreateSupplierRequest): Observable<SupplierDto> {
        return this.http.post<SupplierDto>(`${this.base}/suppliers`, data);
    }

    updateSupplier(id: number, data: CreateSupplierRequest): Observable<SupplierDto> {
        return this.http.put<SupplierDto>(`${this.base}/suppliers/${id}`, data);
    }

    deleteSupplier(id: number): Observable<any> {
        return this.http.delete(`${this.base}/suppliers/${id}`);
    }

    getInvestments(supplierId: number): Observable<InvestmentDto[]> {
        return this.http.get<InvestmentDto[]>(`${this.base}/suppliers/${supplierId}/investments`);
    }

    addInvestment(supplierId: number, data: CreateInvestmentRequest): Observable<InvestmentDto> {
        return this.http.post<InvestmentDto>(`${this.base}/suppliers/${supplierId}/investments`, data);
    }

    deleteInvestment(supplierId: number, investmentId: number): Observable<any> {
        return this.http.delete(`${this.base}/suppliers/${supplierId}/investments/${investmentId}`);
    }

    getExpenses(period?: string): Observable<DriverExpenseDto[]> {
        let params = new HttpParams();
        if (period) params = params.set('period', period);
        return this.http.get<DriverExpenseDto[]>(`${this.base}/admin/expenses`, { params });
    }

    createExpense(data: CreateAdminExpenseRequest): Observable<DriverExpenseDto> {
        return this.http.post<DriverExpenseDto>(`${this.base}/admin/expenses`, data);
    }

    deleteExpense(id: number): Observable<any> {
        return this.http.delete(`${this.base}/admin/expenses/${id}`);
    }

    // ── Loyalty ──
    getLoyaltySummary(clientId: number): Observable<any> {
        return this.http.get(`${this.base}/loyalty/${clientId}`);
    }

    getLoyaltyHistory(clientId: number): Observable<any> {
        return this.http.get(`${this.base}/loyalty/${clientId}/history`);
    }

    adjustPoints(data: { clientId: number; points: number; reason: string }): Observable<any> {
        return this.http.post(`${this.base}/loyalty/adjust`, data);
    }

    getLoyaltyRewards(): Observable<LoyaltyRewardDto[]> {
        return this.http.get<LoyaltyRewardDto[]>(`${this.base}/loyalty/rewards`);
    }

    redeemLoyaltyReward(clientId: number, orderId: number, rewardId: number): Observable<OrderSummaryDto> {
        return this.http.post<OrderSummaryDto>(`${this.base}/loyalty/redeem`, { clientId, orderId, rewardId });
    }

    // ── Public Tracking (Client-Facing) ──
    publicGetOrder(accessToken: string): Observable<any> {
        return this.http.get(`${this.base}/pedido/${accessToken}`);
    }

    publicConfirmOrder(accessToken: string): Observable<any> {
        return this.http.post(`${this.base}/pedido/${accessToken}/confirm`, {});
    }

    publicGetChat(accessToken: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/pedido/${accessToken}/chat`);
    }

    publicSendChatMessage(accessToken: string, text: string): Observable<any> {
        return this.http.post(`${this.base}/pedido/${accessToken}/chat`, { text });
    }
    
    publicUpdateInstructions(accessToken: string, instructions: string): Observable<any> {
        return this.http.patch(`${this.base}/pedido/${accessToken}/instructions`, { instructions });
    }

    publicCardPayment(accessToken: string, body: {
        cardToken: string;
        paymentMethodId: string;
        issuerId: string | null;
        installments: number;
    }): Observable<{ status: string; statusDetail: string; amount: number; message: string; paymentId?: number }> {
        return this.http.post<{ status: string; statusDetail: string; amount: number; message: string; paymentId?: number }>(
            `${this.base}/pedido/${accessToken}/payment/card`, body);
    }

    publicTandaCardPayment(token: string, body: {
        participantId: string;
        weekNumber: number;
        cardToken: string;
        paymentMethodId: string;
    }): Observable<{ status: string; statusDetail: string; paymentId?: number }> {
        return this.http.post<{ status: string; statusDetail: string; paymentId?: number }>(
            `${this.base}/public-tanda/${token}/payment/card`, body);
    }

    // ── AI Voice Routes ──
    getAiRouteSelection(voiceCommand: string, availableOrders: OrderSummaryDto[]): Observable<AiRouteSelectionResponse> {
        return this.http.post<AiRouteSelectionResponse>(`${this.base}/routes/ai-select`, {
            voiceCommand,
            availableOrders
        });
    }

    // ── Driver (Repartidor) ──
    getDriverRoute(driverToken: string): Observable<any> {
        return this.http.get(`${this.base}/driver/${driverToken}`);
    }

    startRoute(driverToken: string): Observable<any> {
        return this.http.post(`${this.base}/driver/${driverToken}/start`, {});
    }

    updateLocation(driverToken: string, lat: number, lng: number): Observable<any> {
        return this.http.post(`${this.base}/driver/${driverToken}/location`, { latitude: lat, longitude: lng });
    }

    driverReorderRouteDeliveries(driverToken: string, orderedDeliveryIds: number[]): Observable<any> {
        return this.http.put(`${this.base}/driver/${driverToken}/reorder`, orderedDeliveryIds);
    }

    markInTransit(driverToken: string, deliveryId: number): Observable<any> {
        return this.http.post(`${this.base}/driver/${driverToken}/transit/${deliveryId}`, {});
    }

    markDelivered(driverToken: string, deliveryId: number, notes: string, photos: File[], payments?: { amount: number; method: string; notes?: string }[], signature?: { svg: string; signedByName?: string }): Observable<any> {
        const fd = new FormData();
        fd.append('notes', notes);
        photos.forEach(p => fd.append('photos', p));
        if (payments) fd.append('payments', JSON.stringify(payments));
        if (signature?.svg) {
            fd.append('signatureSvg', signature.svg);
            if (signature.signedByName) fd.append('signedByName', signature.signedByName);
        }
        return this.http.post(`${this.base}/driver/${driverToken}/deliver/${deliveryId}`, fd);
    }

    markFailed(driverToken: string, deliveryId: number, reason: string, notes: string, photos: File[]): Observable<any> {
        const fd = new FormData();
        fd.append('reason', reason);
        fd.append('notes', notes);
        photos.forEach(p => fd.append('photos', p));
        return this.http.post(`${this.base}/driver/${driverToken}/fail/${deliveryId}`, fd);
    }

    // ── Driver Chat (Admin ↔ Driver) ──
    getDriverChat(driverToken: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/driver/${driverToken}/chat`);
    }

    sendDriverMessage(driverToken: string, text: string): Observable<any> {
        return this.http.post<any>(`${this.base}/driver/${driverToken}/chat`, { text });
    }

    // ── Driver Chat (Driver ↔ Client) ──
    getDriverClientChat(driverToken: string, deliveryId: number): Observable<any[]> {
        return this.http.get<any[]>(`${this.base}/driver/${driverToken}/deliver/${deliveryId}/chat`);
    }

    sendDriverClientMessage(driverToken: string, deliveryId: number, text: string): Observable<any> {
        return this.http.post<any>(`${this.base}/driver/${driverToken}/deliver/${deliveryId}/chat`, { text });
    }

    // ── Driver Expenses ──
    addDriverExpense(driverToken: string, data: any): Observable<any> {
        const fd = new FormData();
        fd.append('expenseType', data.type);
        fd.append('amount', data.amount.toString());
        if (data.notes) fd.append('notes', data.notes);
        if (data.photo) fd.append('photo', data.photo);
        return this.http.post(`${this.base}/driver/${driverToken}/expenses`, fd);
    }

    // ── Route Mutation ──
    addOrderToRoute(routeId: number, orderId: number, lat?: number, lng?: number): Observable<any> {
        let params = new HttpParams();
        if (lat !== undefined) params = params.set('lat', lat.toString());
        if (lng !== undefined) params = params.set('lng', lng.toString());
        return this.http.post(`${this.base}/routes/${routeId}/add-order`, orderId, { params });
    }

    removeOrderFromRoute(routeId: number, orderId: number): Observable<any> {
        return this.http.delete(`${this.base}/routes/${routeId}/remove-order/${orderId}`);
    }

    addTandaToRoute(routeId: number, tandaParticipantId: string, lat?: number, lng?: number): Observable<any> {
        let params = new HttpParams();
        if (lat !== undefined) params = params.set('lat', lat.toString());
        if (lng !== undefined) params = params.set('lng', lng.toString());
        return this.http.post(`${this.base}/routes/${routeId}/add-tanda`, JSON.stringify(tandaParticipantId), {
            params,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    removeTandaFromRoute(routeId: number, tandaParticipantId: string): Observable<any> {
        return this.http.delete(`${this.base}/routes/${routeId}/remove-tanda/${tandaParticipantId}`);
    }

    recomposeRoute(routeId: number, orderIds: number[], tandaParticipantIds?: string[]): Observable<RecomposeRouteResponse> {
        return this.http.put<RecomposeRouteResponse>(`${this.base}/routes/${routeId}/recompose`, {
            orderIds,
            tandaParticipantIds: tandaParticipantIds ?? []
        });
    }

    // ── Route Reorder ──
    reorderRouteDeliveries(routeId: number, deliveryIds: number[]): Observable<any> {
        return this.http.put<any>(`${this.base}/routes/${routeId}/reorder`, deliveryIds);
    }

    optimizeRoute(routeId: number, lat?: number, lng?: number): Observable<any> {
        let params = new HttpParams();
        if (lat !== undefined) params = params.set('lat', lat.toString());
        if (lng !== undefined) params = params.set('lng', lng.toString());
        return this.http.post(`${this.base}/routes/${routeId}/optimize`, {}, { params });
    }

    // ── Inventario ──
    getInventoryBoxes(search?: string): Observable<InventoryBoxSummaryDto[]> {
        let params = new HttpParams();
        if (search?.trim()) params = params.set('search', search.trim());
        return this.http.get<InventoryBoxSummaryDto[]>(`${this.base}/inventory/boxes`, { params });
    }

    getInventoryBox(id: string): Observable<InventoryBoxDto> {
        return this.http.get<InventoryBoxDto>(`${this.base}/inventory/boxes/${id}`);
    }

    createInventoryBox(data: { code: string; name: string; location?: string }): Observable<InventoryBoxDto> {
        return this.http.post<InventoryBoxDto>(`${this.base}/inventory/boxes`, data);
    }

    updateInventoryBox(id: string, data: { code: string; name: string; location?: string }): Observable<InventoryBoxDto> {
        return this.http.put<InventoryBoxDto>(`${this.base}/inventory/boxes/${id}`, data);
    }

    bindInventoryNfc(id: string, tagUid: string): Observable<InventoryBoxDto> {
        return this.http.post<InventoryBoxDto>(`${this.base}/inventory/boxes/${id}/bind-nfc`, { tagUid });
    }

    addInventoryItem(id: string, data: { name: string; variant?: string; barcode?: string; quantity: number; note?: string }): Observable<InventoryBoxDto> {
        return this.http.post<InventoryBoxDto>(`${this.base}/inventory/boxes/${id}/items`, data);
    }

    adjustInventoryItem(id: string, quantityDelta: number, note?: string): Observable<InventoryBoxDto> {
        return this.http.post<InventoryBoxDto>(`${this.base}/inventory/items/${id}/adjust`, { quantityDelta, note });
    }

    completeInventoryCount(id: string, items: Array<{ inventoryItemId: string; actualQuantity: number }>, note?: string): Observable<InventoryBoxDto> {
        return this.http.post<InventoryBoxDto>(`${this.base}/inventory/boxes/${id}/counts`, { items, note });
    }

    getInventoryMovements(id: string, page = 1, pageSize = 30): Observable<InventoryMovementPageDto> {
        return this.http.get<InventoryMovementPageDto>(`${this.base}/inventory/boxes/${id}/movements`, {
            params: new HttpParams().set('page', page).set('pageSize', pageSize)
        });
    }

    createInventoryLabelPrint(request: { kind: string; targetId: string; mediaSize: string; copies?: number; output?: string }): Observable<InventoryLabelPrintDto> {
        return this.http.post<InventoryLabelPrintDto>(`${this.base}/inventory/label-prints`, request);
    }

    updateInventoryLabelPrintStatus(id: string, status: string, failureReason?: string, output?: string): Observable<InventoryLabelPrintDto> {
        return this.http.put<InventoryLabelPrintDto>(`${this.base}/inventory/label-prints/${id}/status`, { status, failureReason, output });
    }

    // ── Notificaciones de la cuenta ──
    getNotifications(audience: 'buyer' | 'seller' = 'seller'): Observable<BuyerNotificationDto[]> {
        return this.http.get<BuyerNotificationDto[]>(`${this.base}/me/notifications`, { params: { audience } });
    }

    markNotificationRead(id: string): Observable<void> {
        return this.http.post<void>(`${this.base}/me/notifications/${id}/read`, {});
    }

    markAllNotificationsRead(audience: 'buyer' | 'seller' = 'seller'): Observable<{ updated: number }> {
        return this.http.post<{ updated: number }>(`${this.base}/me/notifications/read-all`, {}, { params: { audience } });
    }

    getUnreadNotificationsCount(audience: 'buyer' | 'seller' = 'seller'): Observable<number> {
        return this.http.get<number>(`${this.base}/me/notifications/unread-count`, { params: { audience } });
    }
}
