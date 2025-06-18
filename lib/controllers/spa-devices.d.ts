import type { MojoContext } from '@mojojs/core';
export default class SpaDevicesController {
    index(ctx: MojoContext): Promise<void>;
    remove(ctx: MojoContext): Promise<void>;
    show(ctx: MojoContext): Promise<void>;
    store(ctx: MojoContext): Promise<void | boolean>;
    update(ctx: MojoContext): Promise<void | boolean>;
}
import { SpaDevice } from '../spa-device';
export declare class MockBLEServer {
    private devices;
    private server;
    private port;
    constructor(port?: number);
    addDevice(device: SpaDevice): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    private setupRoutes;
    private handleWebSocketMessage;
    broadcastStateChange(device: SpaDevice, characteristic: Characteristic): void;
}
