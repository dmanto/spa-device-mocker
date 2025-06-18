import { SpaDevice } from '../spa-device';
export declare class SpaDevices {
    private devices;
    constructor();
    add(device: SpaDevice): void;
    save(device: SpaDevice): void;
    find(mac: string): SpaDevice | undefined;
    remove(mac: string): boolean;
    all(): SpaDevice[];
}
declare module '@mojojs/core' {
    interface MojoModels {
        spaDevices: SpaDevices;
    }
}
