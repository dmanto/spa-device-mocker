import { DeviceState, Characteristic } from '../types';
export declare class SpaDevices {
    mac: string;
    area: string;
    rssi: number;
    state: DeviceState;
    private devices;
    constructor(mac: string, area?: string, rssi?: number);
    resetPartialWrite(): void;
    connect(): void;
    disconnect(): void;
    handleWrite(characteristic: Characteristic, value: string): void;
    private handlePartialWrite;
}
