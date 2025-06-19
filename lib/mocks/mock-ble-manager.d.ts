export type State = 'Unknown' | 'Resetting' | 'Unsupported' | 'Unauthorized' | 'PoweredOff' | 'PoweredOn';
export type UUID = string;
export type DeviceId = string;
export type TransactionId = string | null;
export interface ScanOptions {
    allowDuplicates?: boolean;
}
export interface ConnectionOptions {
    autoConnect?: boolean;
    requestMTU?: number;
}
export interface MockDevice {
    id: string;
    name: string | null;
    rssi: number | null;
    mtu: number;
    manufacturerData: string | null;
    serviceData: Record<string, string> | null;
    serviceUUIDs: string[] | null;
    isConnectable?: boolean;
}
export interface Characteristic {
    uuid: UUID;
    serviceUUID: UUID;
    deviceID: DeviceId;
    value: string | null;
    isNotifiable: boolean;
    isIndicatable: boolean;
}
type StateChangeListener = (state: State) => void;
type Subscription = {
    remove: () => void;
};
type DeviceScanListener = (error: Error | null, device: MockDevice | null) => void;
type CharacteristicListener = (error: Error | null, characteristic: Characteristic | null) => void;
type MonitorSubscription = {
    remove: () => void;
};
type ConnectionListener = (error: Error | null, device: MockDevice | null) => void;
export declare class MockBleManager {
    private currentState;
    private stateListeners;
    private scanListener;
    private isScanning;
    private discoveredDevices;
    private scanOptions;
    private scanUUIDs;
    private scanInterval;
    private monitoredCharacteristics;
    private characteristicValues;
    private notificationIntervals;
    private readDelays;
    private readErrors;
    private writeWithResponseDelays;
    private writeWithoutResponseDelays;
    private writeWithResponseErrors;
    private writeWithoutResponseErrors;
    private writeListeners;
    private connectedDevices;
    private connectionListeners;
    private connectionDelays;
    private connectionErrors;
    private disconnectionErrors;
    state(): Promise<State>;
    setState(newState: State): void;
    onStateChange(listener: StateChangeListener, emitCurrentState?: boolean): Subscription;
    /**
     * Connect to a device
     */
    connectToDevice(deviceIdentifier: DeviceId, options?: ConnectionOptions): Promise<MockDevice>;
    /**
     * Disconnect from a device
     */
    cancelDeviceConnection(deviceIdentifier: DeviceId): Promise<MockDevice>;
    /**
     * Check if a device is connected
     */
    isDeviceConnected(deviceIdentifier: DeviceId): boolean;
    /**
     * Listen for connection state changes
     */
    onDeviceDisconnected(deviceIdentifier: DeviceId, listener: ConnectionListener): Subscription;
    /**
     * Simulate a device disconnection (e.g., out of range)
     */
    simulateDeviceDisconnection(deviceIdentifier: DeviceId, error?: Error): void;
    /**
     * Simulate a connection error
     */
    simulateConnectionError(deviceIdentifier: DeviceId, error: Error): void;
    /**
     * Clear connection error
     */
    clearConnectionError(deviceIdentifier: DeviceId): void;
    /**
     * Simulate a disconnection error
     */
    simulateDisconnectionError(deviceIdentifier: DeviceId, error: Error): void;
    /**
     * Clear disconnection error
     */
    clearDisconnectionError(deviceIdentifier: DeviceId): void;
    /**
     * Set connection delay
     */
    setConnectionDelay(deviceIdentifier: DeviceId, delayMs: number): void;
    /**
     * Notify connection listeners
     */
    private notifyConnectionListeners;
    addMockDevice(device: MockDevice): void;
    removeMockDevice(deviceId: string): void;
    clearMockDevices(): void;
    /**
     * Update a mock device's properties
     */
    updateMockDevice(deviceId: string, updates: Partial<MockDevice>): void;
    startDeviceScan(UUIDs: string[] | null, options: ScanOptions | null, listener: DeviceScanListener): void;
    stopDeviceScan(): void;
    private simulateDeviceDiscovery;
    readCharacteristicForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, transactionId?: TransactionId): Promise<Characteristic>;
    /**
     * Set mock characteristic value for reading
     */
    setCharacteristicValueForReading(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, value: string): void;
    /**
     * Simulate a read error for a characteristic
     */
    simulateCharacteristicReadError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, error: Error): void;
    /**
     * Clear simulated read error for a characteristic
     */
    clearCharacteristicReadError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID): void;
    /**
     * Set read delay for a characteristic (ms)
     */
    setCharacteristicReadDelay(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, delayMs: number): void;
    writeCharacteristicWithResponseForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, base64Value: string, transactionId?: TransactionId): Promise<Characteristic>;
    writeCharacteristicWithoutResponseForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, base64Value: string, transactionId?: TransactionId): Promise<Characteristic>;
    monitorCharacteristicForDevice(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, listener: CharacteristicListener, transactionId?: TransactionId): MonitorSubscription;
    setCharacteristicValue(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, value: string, options?: {
        notify: boolean;
    }): void;
    startSimulatedNotifications(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, intervalMs?: number): void;
    stopSimulatedNotifications(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID): void;
    private stopSimulatedNotificationsForKey;
    simulateCharacteristicError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, error: Error): void;
    private notifyCharacteristicChange;
    private getCharacteristicKey;
    /**
     * Simulate read operation with optional delay
     */
    private simulateReadOperation;
    /**
     * Simulate write operation with optional delay
     */
    private simulateWriteOperation;
    /**
     * Register a listener for write operations
     */
    onCharacteristicWrite(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, listener: (value: string) => void): {
        remove: () => void;
    };
    /**
     * Notify write listeners
     */
    private notifyWriteListeners;
    /**
     * Simulate write errors
     */
    simulateWriteWithResponseError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, error: Error): void;
    simulateWriteWithoutResponseError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, error: Error): void;
    /**
     * Clear write errors
     */
    clearWriteWithResponseError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID): void;
    clearWriteWithoutResponseError(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID): void;
    /**
     * Set write delays
     */
    setWriteWithResponseDelay(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, delayMs: number): void;
    setWriteWithoutResponseDelay(deviceIdentifier: DeviceId, serviceUUID: UUID, characteristicUUID: UUID, delayMs: number): void;
}
export {};
