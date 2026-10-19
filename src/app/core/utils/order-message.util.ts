const DAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

function formatSpanishDate(isoDate?: string | null): string | null {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return null;
    return `${DAYS[date.getDay()]} ${date.getDate()} de ${MONTHS[date.getMonth()]}`;
}

export interface OrderMessageData {
    clientName: string;
    publicLink: string;
    scheduledDeliveryDate?: string | null;
    expiresAt?: string | null;
}

export function buildOrderMessage(data: OrderMessageData): string {
    const name = data.clientName.trim() || 'bonita';
    let deliveryIso = data.scheduledDeliveryDate ?? null;
    if (!deliveryIso && data.expiresAt) {
        const date = new Date(data.expiresAt);
        date.setDate(date.getDate() - 1);
        deliveryIso = date.toISOString();
    }

    let pickupLimitIso: string | null = null;
    if (deliveryIso) {
        const date = new Date(deliveryIso);
        date.setDate(date.getDate() - 1);
        pickupLimitIso = date.toISOString();
    }

    const deliveryDate = formatSpanishDate(deliveryIso);
    const pickupLimit = formatSpanishDate(pickupLimitIso);
    const lines = [
        `Hola ${name}, aquí te dejo tu total de compras ✅🛍️`,
        `Consulta tu pedido y su estado aquí: ${data.publicLink}`,
        ''
    ];

    if (deliveryDate) lines.push(`Fecha de entrega es el ${deliveryDate}.`);
    if (pickupLimit) lines.push(`Fecha límite para pasar a recoger tu pedido: ${pickupLimit}.`);

    lines.push('', 'Cualquier duda quedamos al pendiente. ❤️✨');
    return lines.join('\n');
}

export function buildPaymentReminderMessage(
    clientName: string,
    balanceDue: number,
    publicLink: string
): string {
    const name = clientName.trim() || 'bonita';
    const balance = balanceDue.toLocaleString('es-MX', {
        style: 'currency',
        currency: 'MXN'
    });
    return [
        `Hola ${name} 💕`,
        `Te recuerdo que tu pedido tiene un saldo pendiente de ${balance}.`,
        '',
        'Consulta tu pedido y paga desde este enlace:',
        publicLink,
        '',
        '¿Cómo te gustaría pagarlo? Quedo al pendiente ✨🛍️'
    ].join('\n');
}
