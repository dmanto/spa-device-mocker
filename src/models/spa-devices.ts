import { SpaDevice } from '../spa-device';
export class SpaDevices {
    private devices: Map<string, SpaDevice> = new Map();
    
    constructor() {}
    
    add(device: SpaDevice): void {
        this.devices.set(device.mac, device);
    }
    
    save(device: SpaDevice): void {
        this.devices.set(device.mac, device);
    }
    find(mac: string): SpaDevice | undefined {
        return this.devices.get(mac);
    }
    
    remove(mac: string): boolean {
        return this.devices.delete(mac);
    }
    
    all(): SpaDevice[] {
        return Array.from(this.devices.values());
    }
}
/*
 * You do not need to promisify them if you are only using in-memory storage.
 * However, if you want consistency with other Mojo models (which are async) or plan to switch to async storage later,
 * promisifying now can make future changes easier. Otherwise, keeping them synchronous is simpler and more efficient.
 */
declare module '@mojojs/core' {
    interface MojoModels {
        spaDevices: SpaDevices;
    }
}