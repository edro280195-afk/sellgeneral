// ── Enums ──

export enum OrderStatus {
    Pending = 0,
    InRoute = 1,
    Delivered = 2,
    NotDelivered = 3,
    Canceled = 4,
    Postponed = 5,
    Confirmed = 6,
    Shipped = 7
}

export enum OrderType {
    Delivery = 0,
    PickUp = 1
}

export enum ClientTag {
    None = 0,
    RisingStar = 1,
    Vip = 2,
    Blacklist = 3
}

export enum RouteStatus {
    Pending = 0,
    Active = 1,
    Completed = 2,
    Canceled = 3
}

export enum DeliveryStatus {
    Pending = 0,
    Delivered = 1,
    NotDelivered = 2,
    InTransit = 3
}

export enum RaffleStatus {
    Draft = 'Draft',
    Active = 'Active',
    Completed = 'Completed',
    Cancelled = 'Cancelled'
}

export enum RaffleAnimationType {
    Roulette = 'roulette',
    Slot = 'slot',
    Confetti = 'confetti'
}

// ── Helpers ──

export const ORDER_STATUS_LABELS: Record<number, string> = {
    0: '⏳ Pendiente',
    1: '🚗 En Camino',
    2: '✅ Entregada',
    3: '❌ No Entregada',
    4: '🚫 Cancelada',
    5: '📅 Pospuesta',
    6: '💖 Confirmada',
    7: '📦 Enviada'
};

export const ORDER_STATUS_EMOJI: Record<number, string> = {
    0: '⏳',
    1: '🚗',
    2: '✅',
    3: '❌',
    4: '🚫',
    5: '📅',
    6: '💖',
    7: '📦'
};

export const ORDER_STATUS_CSS: Record<string, string> = {
    'Pending': 'badge-pending',
    'InRoute': 'badge-inroute',
    'Delivered': 'badge-delivered',
    'NotDelivered': 'badge-notdelivered',
    'Canceled': 'badge-canceled',
    'Postponed': 'badge-postponed',
    'Confirmed': 'badge-confirmed',
    'Shipped': 'badge-shipped'
};

export const CLIENT_TAG_LABELS: Record<string, string> = {
    'None': 'Normal',
    'RisingStar': 'En Ascenso 🚀',
    'Vip': 'Consentida 👑',
    'Blacklist': 'Lista Negra 🚫'
};

export const ROUTE_STATUS_LABELS: Record<number, string> = {
    0: 'Pendiente',
    1: 'Activa',
    2: 'Completada',
    3: 'Cancelada'
};

// ── Interfaces ──

export interface OrderItemDto {
    id: number;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    originalClientName?: string | null;
}

export interface OrderPaymentDto {
    id: number;
    orderId: number;
    amount: number;
    method: string;
    date: string;
    registeredBy: string;
    notes?: string;
}

export interface OrderSummaryDto {
    id: number;
    clientName: string;
    status: string;
    total: number;
    link: string;
    itemsCount: number;
    orderType: string;
    createdAt: string;
    type: string;
    clientPhone?: string;
    clientAddress?: string;
    postponedAt?: string;
    postponedNote?: string;
    subtotal: number;
    shippingCost: number;
    accessToken: string;
    expiresAt: string;
    items: OrderItemDto[];
    payments: OrderPaymentDto[];
    amountPaid: number;
    balanceDue: number;
    advancePayment: number;
    packageCount?: number;
    paymentMethod?: string;
    clientId?: number;
    tags?: string[];
    deliveryInstructions?: string;
    discountAmount?: number;
    alternativeAddress?: string;
    deliveryRouteId?: number;
    scheduledDeliveryDate?: string;
    notifiedAt?: string;
    salesPeriodId?: number | null;
    salesPeriodName?: string | null;
    mergedIntoOrderId?: number | null;
    mergedAt?: string | null;
    orderNumber?: number;
    mergedIntoOrderNumber?: number | null;
    clientPoints?: number;
    clientLatitude?: number | null;
    clientLongitude?: number | null;
    /** Evidencia de entrega (fotos). Solo si status = Delivered. */
    evidenceUrls?: string[];
    /** Firma digital de quien recibió (SVG). */
    signatureSvg?: string;
    /** Nombre de quien firmó. */
    signedByName?: string;
    /** Fecha/hora de la firma. */
    signedAt?: string;
    /** Motivo de no entrega. Solo si status = NotDelivered. */
    failureReason?: string;
    /** Fecha/hora de entrega real. */
    deliveredAt?: string;
    /** Evidencia de no-entrega (fotos del intento fallido). */
    nonDeliveryEvidenceUrls?: string[];
}

export interface PagedResult<T> {
    items: T[];
    totalCount: number;
    currentPage: number;
    pageSize: number;
}

export interface SalesPeriodDto {
    id: number;
    name: string;
    startDate: string;
    endDate: string;
    isActive: boolean;
    createdAt: string;
}

export interface MergeOrdersRequest {
    sourceOrderId: number;
}

export interface ExcelUploadResultDto {
    ordersCreated: number;
    clientsCreated: number;
    warnings: string[];
    // Represents a quick summary to show the links immediately
    orders: {
        id: number;
        clientName: string;
        total: number;
        orderType: string;
        link: string;
        items: { id: number; productName: string; quantity: number }[];
    }[];
}

export interface ClientDto {
    id: number;
    name: string;
    phone?: string;
    address?: string;
    tag: string;
    ordersCount: number;
    totalSpent: number;
    type?: string;
    deliveryInstructions?: string;
    latitude?: number | null;
    longitude?: number | null;
    aliases?: string[];
}

export interface CreateClientRequest {
    name: string;
    phone?: string;
    address?: string;
    tag?: string;
    type?: string;
    deliveryInstructions?: string;
}

// ── Resolver multi-señal de clientas ──

export interface ResolveClientRequest {
    name: string;
    phone?: string;
    address?: string;
}

export interface ResolveCandidateDto {
    clientId: number;
    name: string;
    phone?: string;
    address?: string;
    tag: string;
    type: string;
    ordersCount: number;
    totalSpent: number;
    aliases: string[];
    balanceDue: number;
    score: number;
    matchedBy: 'alias' | 'phone' | 'name-fuzzy' | 'alias-fuzzy' | 'address-fuzzy' | string;
}

export type ResolveSuggestedAction = 'use' | 'choose' | 'create';

export interface ResolveClientResponse {
    candidates: ResolveCandidateDto[];
    suggestedAction: ResolveSuggestedAction;
}

// ── RegiPuntos (canje) ──

export type LoyaltyRewardType = 'FixedDiscount' | 'FreeShipping' | 'Gift';

export interface LoyaltyRewardDto {
    id: number;
    name: string;
    description?: string;
    pointsCost: number;
    type: LoyaltyRewardType | string;
    value: number;
    icon?: string;
}

export type ClientAliasSource =
    | 'Unknown'
    | 'ManualConfirm'
    | 'Merge'
    | 'Import';

export interface ClientAliasDto {
    id: number;
    alias: string;
    source: ClientAliasSource | string;
    timesSeen: number;
    createdAt: string;
}

export interface AddAliasRequest {
    alias: string;
    source?: ClientAliasSource;
}

export interface MergeClientsRequest {
    sourceId: number;
    targetId: number;
}

export interface DuplicateSuggestionDto {
    leftClientId: number;
    leftName: string;
    leftOrdersCount: number;
    rightClientId: number;
    rightName: string;
    rightOrdersCount: number;
    reason: 'same-phone' | 'similar-name' | 'similar-address' | string;
    confidence: number;
}

export interface ClientMergeAuditDto {
    id: number;
    sourceClientId: number;
    sourceName: string;
    targetClientId: number;
    targetName: string;
    mode: 'Manual' | 'Auto';
    reason?: string;
    confidence: number;
    ordersMoved: number;
    aliasesMoved: number;
    mergedAt: string;
}

export interface MonthlySalesDto {
    month: string;
    sales: number;
}

export interface ActivePeriodSummaryDto {
    id: number;
    name: string;
    totalSales: number;
    totalInvested: number;
    netProfit: number;
    collectedAmount: number;
}

export interface DashboardDto {
    totalClients: number;
    totalOrders: number;
    pendingOrders: number;
    deliveredOrders: number;
    notDeliveredOrders: number;
    activeRoutes: number;
    totalRevenue: number;
    revenueMonth: number;
    revenueToday: number;
    totalInvestment: number;
    totalCashOrders: number;
    totalCashAmount: number;
    totalTransferOrders: number;
    totalTransferAmount: number;
    totalDepositOrders: number;
    totalDepositAmount: number;
    salesByMonth: MonthlySalesDto[];
    clientsNueva: number;
    clientsFrecuente: number;
    ordersDelivery: number;
    ordersPickUp: number;
    activePeriod?: ActivePeriodSummaryDto;
    pendingAmount: number;
    recentOrders?: OrderSummaryDto[];
}

export interface TopProductDto {
    name: string;
    quantity: number;
    revenue: number;
}

export interface DailyCountDto {
    date: string;
    count: number;
    amount: number;
}

export interface TopClientDto {
    name: string;
    orders: number;
    totalSpent: number;
}

export interface SupplierSummaryDto {
    name: string;
    totalInvested: number;
    investmentCount: number;
}

export interface ReportDto {
    totalRevenue: number;      // Billed (Delivered total)
    totalCollected: number;    // Actually paid (OrderPayments)
    totalInvestment: number;
    totalExpenses: number;     // DriverExpenses
    netProfit: number;         // TotalRevenue - TotalInvestment - TotalExpenses
    cashBalance: number;       // TotalCollected - TotalInvestment - TotalExpenses
    totalOrders: number;
    pendingOrders: number;
    inRouteOrders: number;
    deliveredOrders: number;
    notDeliveredOrders: number;
    canceledOrders: number;
    deliveryOrders: number;
    pickUpOrders: number;
    avgTicket: number;
    topProducts: TopProductDto[];
    ordersByDay: DailyCountDto[];
    totalRoutes: number;
    completedRoutes: number;
    successRate: number;
    totalDriverExpenses: number;
    newClients: number;
    frequentClients: number;
    activeClients: number;
    topClients: TopClientDto[];
    cashOrders: number;
    cashAmount: number;
    transferOrders: number;
    transferAmount: number;
    depositOrders: number;
    depositAmount: number;
    unassignedPaymentOrders: number;
    unassignedPaymentAmount: number;
    supplierSummaries: SupplierSummaryDto[];
    avgDeliveryTimeMinutes: number;
    avgRouteTimeMinutes: number;
    avgDoorTimeMinutes: number;
    // Comparativa
    prevPeriodRevenue: number;
    prevPeriodOrders: number;
}

export interface RouteDeliveryDto {
    deliveryId: number;
    orderId?: number;
    sortOrder: number;
    clientName: string;
    clientAddress?: string;
    latitude?: number;
    longitude?: number;
    status: string;
    total: number;
    deliveredAt?: string;
    notes?: string;
    failureReason?: string;
    evidenceUrls: string[];
    clientPhone?: string;
    paymentMethod?: string;
    payments?: OrderPaymentDto[];
    amountPaid: number;
    balanceDue: number;
    deliveryInstructions?: string;
    items?: OrderItemDto[];
    arrivedAt?: string;
    alternativeAddress?: string;
    clientTag?: string;
    clientType?: string;
    // ── Tanda ──
    kind?: 'Order' | 'Tanda';
    tandaParticipantId?: string;
    tandaId?: string;
    tandaName?: string;
    tandaProductName?: string;
    tandaWeek?: number;
    tandaTotalWeeks?: number;
    tandaVariant?: string;
}

export interface AvailableTandaDto {
    tandaParticipantId: string;
    tandaId: string;
    tandaName: string;
    tandaProductName?: string;
    week: number;
    totalWeeks: number;
    variant?: string;
    clientId: number;
    clientName: string;
    clientAddress?: string;
    clientPhone?: string;
    clientLatitude?: number;
    clientLongitude?: number;
    deliveryInstructions?: string;
}

export interface SkippedStopDto {
    kind: 'Order' | 'Tanda';
    id: string;
    name: string;
    reason: string;
}

export interface CreateRouteResponse {
    route: RouteDto;
    skipped: SkippedStopDto[];
}

export interface PreviewStopDto {
    kind: 'Order' | 'Tanda';
    orderId?: number;
    tandaParticipantId?: string;
    sortOrder: number;
    clientName: string;
    clientAddress?: string;
    latitude?: number;
    longitude?: number;
    total: number;
    hasCoords: boolean;
    tandaName?: string;
    tandaWeek?: number;
}

export interface PreviewRouteResponse {
    stops: PreviewStopDto[];
    totalDistanceMeters: number;
    totalDurationSeconds: number;
    optimizerSource: string;
    skipped: SkippedStopDto[];
    stopsWithoutCoords: number;
    polylineEncoded?: string;
    depotLatitude?: number;
    depotLongitude?: number;
}

export interface RecomposeRouteRequest {
    orderIds: number[];
    tandaParticipantIds?: string[];
}

export interface RecomposeRouteResponse {
    route: RouteDto;
    skipped: SkippedStopDto[];
}

export interface BulkGeocodeResultDto {
    clientId: number;
    success: boolean;
    latitude?: number;
    longitude?: number;
    formattedAddress?: string;
    error?: string;
}

export interface DriverExpenseDto {
    id: number;
    driverRouteId?: number;
    driverName?: string;
    amount: number;
    expenseType: string;
    date: string;
    notes?: string;
    evidenceUrl?: string;
    createdAt: string;
}

export interface RouteDto {
    id: number;
    driverToken: string;
    driverLink: string;
    status: string;
    createdAt: string;
    startedAt?: string;
    liquidatedAt?: string | null;
    deliveries: RouteDeliveryDto[];
    expenses?: DriverExpenseDto[];
}

export interface DriverRouteDto {
    id: number;
    name?: string;
    status: string;
    startedAt?: string | null;
    deliveries: RouteDeliveryDto[];
}

export interface SupplierDto {
    id: number;
    name: string;
    contactName?: string;
    phone?: string;
    notes?: string;
    createdAt: string;
    totalInvested: number;
}

export interface InvestmentDto {
    id: number;
    supplierId: number;
    amount: number;
    date: string;
    notes?: string;
    createdAt: string;
    currency: string;
    exchangeRate: number;
    totalMXN: number;
}

export interface OrderStatsDto {
    total: number;
    pending: number;
    pendingAmount: number;
    collectedToday: number;
}

export interface ManualOrderRequest {
    clientName: string;
    clientPhone?: string;
    clientAddress?: string;
    type?: string;
    orderType: string;
    items: { productName: string; quantity: number; unitPrice: number }[];
    postponedAt?: string;
    postponedNote?: string;
    status?: string;
    deliveryInstructions?: string;
    alternativeAddress?: string;
    scheduledDeliveryDate?: string;
    /** ID de clienta ya resuelto vía el resolver multi-señal. Si viene, el backend
     *  salta el lookup por nombre y usa este ID, agregando el clientName tecleado
     *  como alias automáticamente si difiere del nombre canónico. */
    clientId?: number;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    name: string;
    email: string;
    password: string;
    acceptedLegal: boolean;
    legalVersion: string;
}

export interface WebPhoneRegisterRequest {
    name: string;
    phone: string;
    password: string;
    acceptedLegal: boolean;
    legalVersion: string;
}

export interface PhonePasswordLoginRequest {
    phone: string;
    password: string;
}

export interface PhoneOtpRequest {
    phone: string;
}

export interface PhoneOtpVerifyRequest {
    phone: string;
    code: string;
}

export interface AuthMembershipDto {
    businessId: number;
    businessName: string;
    role: string;
}

export interface LoginResponse {
    token: string;
    name: string;
    role: string;
    expiresAt: string;
    accountId: number;
    memberships: AuthMembershipDto[];
}

export interface PhoneOtpResponse {
    phone: string;
    otpRequired: boolean;
    providerConfigured: boolean;
    devMode: boolean;
    message: string;
}

// ── Bootstrap del panel (negocio + suscripcion + features) ──

export interface BrandDto {
    logoUrl: string | null;
    bannerUrl: string | null;
    brandPrimaryColor: string;
    brandAccentColor: string | null;
}

export interface SubscriptionSummaryDto {
    effectivePlan: string;
    subscriptionStatus: string;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    isLocked: boolean;
    daysLeft: number;
    pastDueGraceDays: number;
}

export interface BusinessMeDto {
    id: number;
    name: string;
    slug: string;
    city: string | null;
    brand: BrandDto;
    subscription: SubscriptionSummaryDto;
    features: string[];
}

// ── Suscripción de plataforma (FE-3) ──

export type SubscriptionStatusName =
    | 'Active'
    | 'Trialing'
    | 'PastDue'
    | 'Expired'
    | 'Canceled';

export type PlanTierName = 'Básico' | 'Pro' | 'Elite' | 'Bloqueado';

export type PeriodicityName = 'monthly' | 'quarterly' | 'annual';

export interface SubscriptionAccountStateDto {
    effectivePlan: PlanTierName;
    planTier: PlanTierName;
    subscriptionStatus: SubscriptionStatusName;
    trialEndsAt: string | null;
    currentPeriodEndsAt: string | null;
    pendingPlanTier: PlanTierName | null;
    pendingPlanEffectiveAt: string | null;
    isLocked: boolean;
    daysLeft: number;
    pastDueGraceDays: number;
}

export interface BusinessOnboardingResponse {
    businessId: number;
    name: string;
    slug: string;
    role: string;
    subscription: SubscriptionAccountStateDto;
}

export interface SubscriptionPlanPriceDto {
    planTier: PlanTierName;
    monthlyPrice: number;
    quarterlyPrice: number;
    annualPrice: number;
    quarterlyDiscountPct: number;
    annualDiscountPct: number;
    currency: string;
}

export interface SubscriptionPricingDto {
    plans: SubscriptionPlanPriceDto[];
    currency: string;
}

export interface CreatePreapprovalRequest {
    planTier: PlanTierName;
    periodicity: PeriodicityName;
    payerEmail: string;
    cardTokenId?: string | null;
}

export interface UpdatePreapprovalRequest {
    planTier: PlanTierName;
    periodicity: PeriodicityName;
}

export interface PreapprovalSummaryDto {
    preapprovalId: string;
    planTier: PlanTierName;
    periodicity: PeriodicityName;
    amount: number;
    currency: string;
    status: string;
    nextPaymentDate: string | null;
    currentPeriodEndsAt: string | null;
    cancellationEffectiveAt: string | null;
    initPoint: string | null;
}

export interface PlatformMpPublicKeyDto {
    publicKey: string;
}

export interface CommonProductDto {
    name: string;
    count: number;
    typicalPrice: number;
}

export interface AddPaymentRequest {
    amount: number;
    method: string;
    registeredBy?: string;
    notes?: string;
    /** Fecha real del pago (ISO string). Si no se manda, la API usa la fecha actual. */
    paymentDate?: string;
}

export interface CreateSupplierRequest {
    name: string;
    contactName?: string;
    phone?: string;
    notes?: string;
}

export interface CreateInvestmentRequest {
    amount: number;
    date: string;
    notes?: string;
    currency: string;
    exchangeRate?: number;
}

export interface UpdateOrderDetailsRequest {
    status?: string;
    orderType?: string;
    postponedAt?: string;
    postponedNote?: string;
    clientName?: string;
    clientAddress?: string;
    clientPhone?: string;
    type?: string;
    tags?: string[];
    deliveryTime?: string;
    pickupDate?: string;
    shippingCost?: number;
    advancePayment?: number;
    deliveryInstructions?: string;
    alternativeAddress?: string;
    scheduledDeliveryDate?: string;
}

export interface CreateAdminExpenseRequest {
    amount: number;
    expenseType: string;
    date: string;
    notes?: string;
    deliveryRouteId?: number;
}

export interface OrderPackageDto {
    id: string; // Guid
    packageNumber: number;
    qrCodeValue: string;
    status: string;
    createdAt: string;
    loadedAt?: string;
    deliveredAt?: string;
    returnedAt?: string;
    mediaSize?: string;
}

export interface GeneratePackagesRequest {
    count: number;
}

export interface LabelTemplateVersionEditorDto {
    id: string;
    versionNumber: number;
    status: string;
    revision: number;
    designJson: string;
    createdAt: string;
    publishedAt: string | null;
}

export interface LabelTemplateVersionHistoryDto {
    id: string;
    versionNumber: number;
    status: string;
    createdAt: string;
    publishedAt: string | null;
}

export interface LabelTemplateEditorDto {
    id: string;
    name: string;
    description: string | null;
    kind: string;
    mediaSize: string;
    isDefault: boolean;
    publishedVersion: LabelTemplateVersionEditorDto | null;
    draftVersion: LabelTemplateVersionEditorDto;
    history: LabelTemplateVersionHistoryDto[];
}

export interface LabelAssetDto {
    id: string;
    name: string;
    originalFileName: string;
    contentType: string;
    url: string;
    sizeBytes: number;
    uploadedAt: string;
}

export interface LabelTemplateSaveDraftRequest {
    designJson: string;
    expectedRevision: number;
}

export interface LabelPrintPayloadDto {
    businessName: string;
    order: {
        id: number;
        clientName: string;
        phone: string | null;
        address: string | null;
        itemSummary: string;
        deliveryInstructions: string | null;
    };
    package: {
        id: string;
        number: number;
        total: number;
        qrCodeValue: string;
    };
}

export interface LabelPrintJobItemDto {
    id: string;
    orderPackageId: string;
    sequence: number;
    packageQrCodeValue: string;
    payload: LabelPrintPayloadDto;
}

export interface LabelPrintJobDto {
    id: string;
    status: string;
    mediaSize: string;
    output: string;
    copies: number;
    requestedAt: string;
    handedOffAt: string | null;
    failureReason: string | null;
    templateVersion: {
        id: string;
        versionNumber: number;
        designJson: string;
        publishedAt: string;
    };
    assets: { id: string; url: string }[];
    items: LabelPrintJobItemDto[];
}

export interface CreateLabelPrintJobRequest {
    packageIds: string[];
    mediaSize: string;
    copies?: number;
    output?: string;
}

export interface AvailableLabelPackageDto {
    id: string;
    orderId: number;
    clientName: string;
    packageNumber: number;
    totalPackages: number;
    status: string;
    mediaSize: string;
    createdAt: string;
}

export interface UpdateLabelPrintJobStatusRequest {
    status: string;
    failureReason?: string;
    output?: string;
}

export interface AiInsight {
    category: 'Finanzas' | 'Ventas' | 'Clientas' | 'Riesgo' | 'Operación';
    title: string;
    description: string;
    actionableAdvice: string;
    icon: string;
}

export interface AiRouteSelectionRequest {
    voiceCommand: string;
    availableOrders: OrderSummaryDto[];
}

export interface AiRouteSelectionResponse {
    selectedOrderIds: number[];
    aiConfirmationMessage: string;
    audioBase64?: string;
}

// ── Tandas ──
export interface TandaProductDto {
    id: string;
    name: string;
    description?: string;
    basePrice: number;
    isActive: boolean;
    createdAt: string;
}

export interface TandaDto {
    id: string;
    productId: string;
    name: string;
    totalWeeks: number;
    weeklyAmount: number;
    penaltyAmount: number;
    startDate: string;
    status: string; // Draft, Active, Completed, Cancelled
    createdAt: string;
    accessToken?: string;
    product?: TandaProductDto;
    participants?: TandaParticipantDto[];
}

export interface TandaParticipantDto {
    id: string;
    tandaId: string;
    customerId: number;
    customerName?: string;
    assignedTurn: number;
    weeklyAmount?: number;
    isDelivered: boolean;
    deliveryDate?: string;
    status: string; // Active, Delinquent, Completed
    variant?: string;
    payments?: TandaPaymentDto[];
}

export interface TandaWhatsAppReminderDto {
    participantId: string;
    customerName: string;
    phone: string;
    weekNumber: number;
    weeklyAmount: number;
    turnNumber: number;
    hasPaidWeek: boolean;
    isWinnerThisWeek: boolean;
    messageText: string;
    whatsAppUrl: string;
}

export interface TandaPaymentDto {
    id: string;
    participantId: string;
    weekNumber: number;
    amountPaid: number;
    penaltyPaid: number;
    paymentDate: string;
    isVerified: boolean;
    notes?: string;
}

export interface TandaViewDto {
    id: string;
    name: string;
    productName: string;
    totalWeeks: number;
    weeklyAmount: number;
    startDate: string;
    currentWeek: number;
    mercadoPagoPublicKey?: string | null;
    participants: TandaParticipantViewDto[];
}

export interface MercadoPagoPaymentSettingsDto {
    publicKey?: string | null;
    hasAccessToken: boolean;
    isConfigured: boolean;
}

export interface UpdateMercadoPagoPaymentSettingsRequest {
    publicKey?: string | null;
    accessToken?: string | null;
    clearAccessToken?: boolean;
}

export interface TandaParticipantViewDto {
    id: string;
    name: string;
    assignedTurn: number;
    weeklyAmount?: number;
    hasPaidCurrentWeek: boolean;
    paidWeeks: number[];
    isWinnerThisWeek: boolean;
    isDelivered: boolean;
    variant?: string;
}

export interface CreateTandaDto {
    productId: string;
    name: string;
    totalWeeks: number;
    weeklyAmount: number;
    penaltyAmount: number;
    startDate: string;
    participants: CreateTandaParticipantDto[];
}

export interface UpdateTandaDto {
    name: string;
    totalWeeks: number;
    weeklyAmount: number;
    penaltyAmount: number;
    startDate: string;
    status?: string;
}

export interface CreateTandaParticipantDto {
    customerId?: number;
    customerName?: string;
    assignedTurn: number;
    variant?: string;
    weeklyAmount?: number;
}

export interface AddParticipantDto {
    tandaId: string;
    customerId?: number;
    customerName?: string;
    assignedTurn: number;
    variant?: string;
    weeklyAmount?: number;
}


export interface RegisterPaymentDto {
    participantId: string;
    weekNumber: number;
    amountPaid: number;
    penaltyPaid?: number;
    paymentDate?: string;
    isVerified?: boolean;
    notes?: string;
}

export interface UpdateTandaPaymentDto {
    weekNumber: number;
    amountPaid: number;
    penaltyPaid: number;
    paymentDate: string;
    isVerified: boolean;
    notes?: string;
}

// ── Raffle Models ──

export interface CreateRaffleDto {
    name: string;
    description?: string;
    imageUrl?: string;
    socialShareImageUrl?: string;
    animationType: string;
    prizeType?: string;
    prizeDetails?: string;
    eligibilityRule?: string;
    clientSegmentFilter?: string;
    vipOnly?: boolean;
    blacklistExcluded?: boolean;
    preselectedWinnerIds?: string;
    minOrderTotal?: number;
    maxEntriesPerClient?: number;
    dateRangeStart?: string;
    dateRangeEnd?: string;
    requiredPurchases: number;
    newClientsOnly: boolean;
    frequentClientsOnly: boolean;
    useWeightedRandom?: boolean;
    weightedRandomCriteria?: string;
    winnerCount?: number;
    raffleDate: string;
}

export interface UpdateRaffleDto {
    name?: string;
    description?: string;
    imageUrl?: string;
    socialShareImageUrl?: string;
    animationType?: string;
    prizeType?: string;
    prizeDetails?: string;
    eligibilityRule?: string;
    clientSegmentFilter?: string;
    vipOnly?: boolean;
    blacklistExcluded?: boolean;
    preselectedWinnerIds?: string;
    minOrderTotal?: number;
    maxEntriesPerClient?: number;
    dateRangeStart?: string;
    dateRangeEnd?: string;
    requiredPurchases?: number;
    newClientsOnly?: boolean;
    frequentClientsOnly?: boolean;
    useWeightedRandom?: boolean;
    weightedRandomCriteria?: string;
    winnerCount?: number;
    raffleDate?: string;
    status?: string;
}

export interface RaffleDto {
    id: string;
    name: string;
    description?: string;
    imageUrl?: string;
    socialShareImageUrl?: string;
    animationType: string;
    prizeType?: string;
    prizeDetails?: string;
    eligibilityRule?: string;
    clientSegmentFilter?: string;
    vipOnly?: boolean;
    blacklistExcluded?: boolean;
    preselectedWinnerIds?: string;
    minOrderTotal?: number;
    maxEntriesPerClient?: number;
    dateRangeStart?: string;
    dateRangeEnd?: string;
    requiredPurchases: number;
    newClientsOnly: boolean;
    frequentClientsOnly: boolean;
    useWeightedRandom?: boolean;
    weightedRandomCriteria?: string;
    winnerCount: number;
    raffleDate: string;
    status: string;
    shuffleTandaTurns?: boolean;
    tandaId?: string;
    winnerId?: number;
    winner?: ClientDto;
    announcedAt?: string;
    createdAt: string;
    updatedAt: string;
    participantCount: number;
    entryCount: number;
}

export interface RaffleDetailDto extends RaffleDto {
    participants: RaffleParticipantDto[];
    entries: RaffleEntryDto[];
    draws: RaffleDrawDto[];
}

export interface RaffleParticipantDto {
    id: string;
    raffleId: string;
    clientId: number;
    client: ClientDto;
    qualificationDate: string;
    qualifyingOrders: number;
    isWinner: boolean;
    notified: boolean;
    notifiedAt?: string;
}

export interface RaffleEntryDto {
    id: string;
    raffleId: string;
    clientId: number;
    client: ClientDto;
    orderId: number;
    order: OrderSummaryDto;
    enteredAt: string;
}

export interface RaffleDrawDto {
    id: string;
    raffleId: string;
    drawDate: string;
    winnerId: number;
    winner: ClientDto;
    selectionMethod: string;
    notes?: string;
}

export interface SelectWinnerDto {
    selectionMethod: string;
    manualWinnerClientId?: number;
    notes?: string;
    count?: number;
}

export interface RaffleEvaluationResultDto {
    raffleId: string;
    totalQualified: number;
    qualifiedParticipants: RaffleParticipantDto[];
    newEntries: RaffleEntryDto[];
}

export interface RaffleSummaryDto {
    id: string;
    name: string;
    imageUrl?: string;
    raffleDate: string;
    status: string;
    animationType: string;
    participantCount: number;
    winnerCount: number;
    winnerId?: number;
    winnerName?: string;
    winnerNames?: string[];
    announcedAt?: string;
}

export interface TandaTurnAssignmentDto {
    clientId: number;
    clientName: string;
    previousTurn: number;
    newTurn: number;
}

export interface TandaShuffleResultDto {
    raffleId: string;
    tandaId: string;
    tandaName: string;
    participantsShuffled: number;
    turnAssignments: TandaTurnAssignmentDto[];
    shuffleDate: string;
}

// ── Inventario y etiquetas ──

export interface InventoryBoxSummaryDto {
    id: string;
    code: string;
    name: string;
    location?: string | null;
    isNfcBound: boolean;
    articleTypesCount: number;
    totalUnits: number;
    updatedAt: string;
}

export interface InventoryItemDto {
    id: string;
    name: string;
    variant?: string | null;
    barcode?: string | null;
    labelCode: string;
    quantity: number;
    updatedAt: string;
}

export interface InventoryMovementDto {
    id: string;
    inventoryItemId?: string | null;
    itemName?: string | null;
    type: string;
    quantityDelta: number;
    quantityAfter: number;
    note?: string | null;
    performedBy: string;
    occurredAt: string;
}

export interface InventoryMovementPageDto {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
    items: InventoryMovementDto[];
}

export interface InventoryBoxDto extends InventoryBoxSummaryDto {
    nfcTagUid?: string | null;
    nfcUrl: string;
    movementCount: number;
    items: InventoryItemDto[];
    movements: InventoryMovementDto[];
    createdAt: string;
}

export interface InventoryLabelPrintDto {
    id: string;
    kind: string;
    targetId: string;
    status: string;
    mediaSize: string;
    output: string;
    copies: number;
    requestedAt: string;
    handedOffAt?: string | null;
    failureReason?: string | null;
    templateVersion: unknown;
    assets: unknown[];
    data: Record<string, string>;
}

export interface BuyerNotificationDto {
    id: string;
    businessId: number;
    businessName: string;
    brandPrimaryColor: string;
    title: string;
    message: string;
    tag: string;
    url?: string | null;
    orderId?: number | null;
    createdAt: string;
    readAt?: string | null;
    audience?: 'Buyer' | 'Seller' | string;
}
