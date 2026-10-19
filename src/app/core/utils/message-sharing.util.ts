export type MessageShareChannel = 'whatsapp' | 'messenger' | 'copy';

export type MessengerShareResult = 'shared' | 'copied' | 'cancelled';

export interface MessageShareRequest {
  title: string;
  recipientName: string;
  phone?: string | null;
  message: string;
}

export function buildWhatsAppShareUrl(phone: string | null | undefined, message: string): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const normalizedPhone = normalizeMexicanPhone(digits);
  const baseUrl = normalizedPhone ? `https://wa.me/${normalizedPhone}` : 'https://wa.me/';
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppShare(phone: string | null | undefined, message: string): void {
  window.open(buildWhatsAppShareUrl(phone, message), '_blank', 'noopener,noreferrer');
}

export async function shareMessageToMessenger(title: string, message: string): Promise<MessengerShareResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text: message });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled';
      await copyMessageToClipboard(message);
      return 'copied';
    }
  }

  // Messenger no admite texto precargado en su enlace web. En navegadores sin
  // menú nativo de compartir, dejamos el mensaje copiado y abrimos su bandeja.
  window.open('https://www.messenger.com/', '_blank', 'noopener,noreferrer');
  await copyMessageToClipboard(message);
  return 'copied';
}

export async function copyMessageToClipboard(message: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(message);
    return;
  }

  if (typeof document === 'undefined') throw new Error('El portapapeles no está disponible.');

  const input = document.createElement('textarea');
  input.value = message;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('No se pudo copiar el mensaje.');
}

function normalizeMexicanPhone(digits: string): string {
  if (digits.length === 10) return `52${digits}`;
  if (digits.length === 13 && digits.startsWith('521')) return `52${digits.slice(3)}`;
  if (digits.length === 12 && digits.startsWith('52')) return digits;
  return digits;
}
