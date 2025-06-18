export type DeviceMode = 'F' | 'M' | 'N' | 'B';
export type MModeCommand = 'S' | 'C' | 'W' | 'Z' | 'D' | 'R';
export type Characteristic = 'MMODE' | 'MCODE' | 'BTNAME' | 'TEMPERATURE' | 'TIME' | 'SESSION' | 'WIFICREDS' | 'VERSION' | 'WIFIMAC';
export interface DeviceState {
    mode: DeviceMode;
    connectionState: 'advertising' | 'connected' | 'disconnected';
    operationalState: 'idle' | 'temperature_set' | 'time_set' | 'session_set' | 'wifi_config';
    characteristics: Record<Characteristic, string>;
    storedMcode: string | null;
    partialWrite: {
        characteristic: Characteristic | null;
        buffer: string;
        position: number;
    };
}
export interface SpaDeviceConfig {
    mac: string;
    area: string;
    rssi: number;
    state: DeviceState;
}
export interface ControlCommand {
    device: string;
    characteristic: Characteristic;
    value: string;
}
export interface WebSocketMessage {
    event: 'state_change' | 'command' | 'notification';
    device: string;
    characteristic?: Characteristic;
    value?: string;
    timestamp: number;
}
