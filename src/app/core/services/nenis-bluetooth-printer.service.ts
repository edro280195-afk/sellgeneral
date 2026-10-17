import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import { BleClient } from '@capacitor-community/bluetooth-le';

const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const WRITE_CHARACTERISTIC_UUID = '0000fff2-0000-1000-8000-00805f9b34fb';
const SAVED_DEVICE_ID_KEY = 'nenis_e40_ble_device_id';
const SAVED_DEVICE_NAME_KEY = 'nenis_e40_ble_device_name';
const DEFAULT_SCAN_MS = 5000;

@Injectable({ providedIn: 'root' })
export class NenisBluetoothPrinterService {
    private initialized = false;
    private connectedDeviceId: string | null = null;
    private jobQueue: Promise<void> = Promise.resolve();

    printCommands(commands: readonly Uint8Array[]): Promise<number> {
        const job = this.jobQueue.then(() => this.printCommandsOnce(commands));
        this.jobQueue = job.then(() => undefined, () => undefined);
        return job;
    }

    private async printCommandsOnce(commands: readonly Uint8Array[]): Promise<number> {
        if (!commands.length) return 0;
        if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'android') {
            throw new Error('La impresión térmica directa está disponible en la app Android.');
        }

        await this.ensureReady();
        const deviceId = await this.connectToE40();
        let sentBytes = 0;
        try {
            const mtu = await BleClient.getMtu(deviceId).catch(() => 185);
            const chunkSize = Math.min(512, Math.max(20, mtu - 3));
            for (const command of commands) {
                for (let offset = 0; offset < command.length; offset += chunkSize) {
                    const chunk = command.subarray(offset, Math.min(offset + chunkSize, command.length));
                    const value = new DataView(chunk.buffer, chunk.byteOffset, chunk.byteLength);
                    await BleClient.writeWithoutResponse(deviceId, SERVICE_UUID, WRITE_CHARACTERISTIC_UUID, value);
                    sentBytes += chunk.length;
                }
            }
            return sentBytes;
        } catch (error) {
            console.error('[NenisBluetoothPrinter] falló la transferencia BLE:', error);
            throw new Error('No pudimos enviar la etiqueta a la E40 por BLE. Revisa que esté encendida y cerca.');
        } finally {
            await this.disconnect(deviceId);
        }
    }

    private async ensureReady(): Promise<void> {
        if (!this.initialized) {
            await BleClient.initialize();
            this.initialized = true;
        }
        const enabled = await BleClient.isEnabled();
        if (!enabled) {
            if (Capacitor.getPlatform() !== 'android') {
                throw new Error('Activa Bluetooth para conectar la impresora.');
            }
            await BleClient.requestEnable();
        }
    }

    private async connectToE40(): Promise<string> {
        const savedDeviceId = localStorage.getItem(SAVED_DEVICE_ID_KEY)?.trim();
        if (savedDeviceId) {
            try {
                await this.connectAndValidate(savedDeviceId);
                return savedDeviceId;
            } catch {
                localStorage.removeItem(SAVED_DEVICE_ID_KEY);
                localStorage.removeItem(SAVED_DEVICE_NAME_KEY);
            }
        }

        const device = await this.scanForE40();
        if (!device) {
            throw new Error('No encontramos la AIYIN E40 Pro por Bluetooth. Enciéndela y acércala al teléfono.');
        }

        await this.connectAndValidate(device.deviceId);
        localStorage.setItem(SAVED_DEVICE_ID_KEY, device.deviceId);
        localStorage.setItem(SAVED_DEVICE_NAME_KEY, device.name);
        return device.deviceId;
    }

    private async connectAndValidate(deviceId: string): Promise<void> {
        if (this.connectedDeviceId === deviceId) return;
        try {
            await BleClient.connect(deviceId, disconnectedId => {
                if (this.connectedDeviceId === disconnectedId) this.connectedDeviceId = null;
            });
            this.connectedDeviceId = deviceId;
            const services = await BleClient.getServices(deviceId);
            const hasPrinterCharacteristic = services.some(service =>
                service.uuid.toLowerCase() === SERVICE_UUID &&
                service.characteristics.some(characteristic => characteristic.uuid.toLowerCase() === WRITE_CHARACTERISTIC_UUID)
            );
            if (!hasPrinterCharacteristic) {
                throw new Error('La impresora no expuso el canal BLE de impresión FFF0/FFF2.');
            }
        } catch (error) {
            await this.disconnect(deviceId);
            throw error;
        }
    }

    private async scanForE40(): Promise<{ deviceId: string; name: string } | null> {
        const found = new Map<string, { deviceId: string; name: string }>();
        try {
            await BleClient.requestLEScan({}, result => {
                const name = (result.device.name ?? result.localName ?? '').trim();
                if (name && /AIYIN|E40|_BLE/i.test(name)) {
                    found.set(result.device.deviceId, { deviceId: result.device.deviceId, name });
                }
            });
            await new Promise(resolve => setTimeout(resolve, DEFAULT_SCAN_MS));
        } finally {
            await BleClient.stopLEScan().catch(() => undefined);
        }
        const device = Array.from(found.values()).sort((left, right) => left.name.localeCompare(right.name))[0];
        return device ?? null;
    }

    private async disconnect(deviceId: string): Promise<void> {
        if (this.connectedDeviceId === deviceId) this.connectedDeviceId = null;
        try {
            await BleClient.disconnect(deviceId);
        } catch {
            // Puede haberse desconectado durante el envío.
        }
    }
}
