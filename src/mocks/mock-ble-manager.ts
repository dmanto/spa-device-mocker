export type State =
    | 'Unknown'
    | 'Resetting'
    | 'Unsupported'
    | 'Unauthorized'
    | 'PoweredOff'
    | 'PoweredOn';

export type UUID = string;
export type DeviceId = string;
export type TransactionId = string | null;

export interface ScanOptions {
    allowDuplicates?: boolean;
}

export interface MockDevice {
    id: string;
    name: string | null;
    rssi: number | null;
    mtu: number;
    manufacturerData: string | null;
    serviceData: Record<string, string> | null;
    serviceUUIDs: string[] | null;
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
type Subscription = { remove: () => void };
type DeviceScanListener = (error: Error | null, device: MockDevice | null) => void;
type CharacteristicListener = (error: Error | null, characteristic: Characteristic | null) => void;
type MonitorSubscription = { remove: () => void };

export class MockBleManager {
    // State management
    private currentState: State = 'PoweredOn';
    private stateListeners: StateChangeListener[] = [];

    // Scanning
    private scanListener: DeviceScanListener | null = null;
    private isScanning = false;
    private discoveredDevices: Map<string, MockDevice> = new Map();
    private scanOptions: ScanOptions = {};
    private scanUUIDs: string[] | null = null;
    private scanInterval: NodeJS.Timeout | null = null;

    // Characteristic monitoring
    private monitoredCharacteristics: Map<string, CharacteristicListener[]> = new Map();
    private characteristicValues: Map<string, string> = new Map();
    private notificationIntervals: Map<string, NodeJS.Timeout> = new Map();

    // properties for read operations
    private readDelays: Map<string, number> = new Map();
    private readErrors: Map<string, Error> = new Map();

    // properties for write operations
    private writeWithResponseDelays: Map<string, number> = new Map();
    private writeWithoutResponseDelays: Map<string, number> = new Map();
    private writeWithResponseErrors: Map<string, Error> = new Map();
    private writeWithoutResponseErrors: Map<string, Error> = new Map();
    private writeListeners: Map<string, (value: string) => void> = new Map();

    /**
     * Set mock characteristic value for reading
     */
    setCharacteristicValueForReading(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        value: string
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.characteristicValues.set(key, value);
    }

    /**
     * Simulate a read error for a characteristic
     */
    simulateCharacteristicReadError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        error: Error
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readErrors.set(key, error);
    }

    /**
     * Clear simulated read error for a characteristic
     */
    clearCharacteristicReadError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readErrors.delete(key);
    }

    /**
     * Set read delay for a characteristic (ms)
     */
    setCharacteristicReadDelay(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        delayMs: number
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readDelays.set(key, delayMs);
    }

    // ... existing methods ...


    // ======================
    // State Management
    // ======================
    async state(): Promise<State> {
        return this.currentState;
    }

    setState(newState: State) {
        this.currentState = newState;
        this.stateListeners.forEach(listener => listener(newState));

        // Automatically stop scanning when not powered on
        if (newState !== 'PoweredOn' && this.isScanning) {
            this.stopDeviceScan();
        }
    }

    onStateChange(
        listener: StateChangeListener,
        emitCurrentState: boolean = false
    ): Subscription {
        this.stateListeners.push(listener);

        if (emitCurrentState) {
            setTimeout(() => listener(this.currentState), 0);
        }

        return {
            remove: () => {
                this.stateListeners = this.stateListeners.filter(l => l !== listener);
            }
        };
    }

    // ======================
    // Device Scanning
    // ======================
    addMockDevice(device: MockDevice) {
        this.discoveredDevices.set(device.id, device);
    }

    removeMockDevice(deviceId: string) {
        this.discoveredDevices.delete(deviceId);
    }

    clearMockDevices() {
        this.discoveredDevices.clear();
    }

    startDeviceScan(
        UUIDs: string[] | null,
        options: ScanOptions | null,
        listener: DeviceScanListener
    ) {
        if (this.isScanning) {
            throw new Error('Scan already in progress');
        }

        this.isScanning = true;
        this.scanListener = listener;
        this.scanOptions = options || {};
        this.scanUUIDs = UUIDs;

        this.simulateDeviceDiscovery();
    }

    stopDeviceScan() {
        this.isScanning = false;
        this.scanListener = null;

        if (this.scanInterval) {
            clearInterval(this.scanInterval);
            this.scanInterval = null;
        }
    }

    // ======================
    // Characteristic Reading
    // ======================
    async readCharacteristicForDevice(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        transactionId: TransactionId = null
    ): Promise<Characteristic> {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);

        // Check if we should simulate an error for this characteristic
        if (this.readErrors.has(key)) {
            const error = this.readErrors.get(key)!;
            return this.simulateReadOperation(key, () => Promise.reject(error));
        }

        // Get the current value
        const value = this.characteristicValues.get(key) || null;

        return this.simulateReadOperation(key, () => Promise.resolve({
            uuid: characteristicUUID,
            serviceUUID,
            deviceID: deviceIdentifier,
            value,
            isNotifiable: true,
            isIndicatable: false
        }));
    }
  // ======================
  // Characteristic Writing
  // ======================

  // Write with response (acknowledged write)
  async writeCharacteristicWithResponseForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    base64Value: string,
    transactionId: TransactionId = null
  ): Promise<Characteristic> {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    
    // Check for simulated error
    if (this.writeWithResponseErrors.has(key)) {
      const error = this.writeWithResponseErrors.get(key)!;
      return this.simulateWriteOperation(key, true, () => Promise.reject(error));
    }

    // Update the characteristic value
    this.characteristicValues.set(key, base64Value);
    this.notifyWriteListeners(key, base64Value);

    return this.simulateWriteOperation(key, true, () => Promise.resolve({
      uuid: characteristicUUID,
      serviceUUID,
      deviceID: deviceIdentifier,
      value: base64Value,
      isNotifiable: true,
      isIndicatable: false
    }));
  }

  // Write without response (unacknowledged write)
  async writeCharacteristicWithoutResponseForDevice(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    base64Value: string,
    transactionId: TransactionId = null
  ): Promise<Characteristic> {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    
    // Check for simulated error
    if (this.writeWithoutResponseErrors.has(key)) {
      const error = this.writeWithoutResponseErrors.get(key)!;
      return this.simulateWriteOperation(key, false, () => Promise.reject(error));
    }

    // Update the characteristic value
    this.characteristicValues.set(key, base64Value);
    this.notifyWriteListeners(key, base64Value);

    return this.simulateWriteOperation(key, false, () => Promise.resolve({
      uuid: characteristicUUID,
      serviceUUID,
      deviceID: deviceIdentifier,
      value: base64Value,
      isNotifiable: true,
      isIndicatable: false
    }));
  }

    private simulateDeviceDiscovery() {
        // Get filtered devices
        const devices = Array.from(this.discoveredDevices.values()).filter(device => {
            if (!this.scanUUIDs || this.scanUUIDs.length === 0) return true;
            return device.serviceUUIDs?.some(uuid => this.scanUUIDs?.includes(uuid));
        });

        // Send initial devices
        devices.forEach(device => {
            if (this.scanListener) {
                this.scanListener(null, device);
            }
        });

        // Simulate ongoing discovery
        this.scanInterval = setInterval(() => {
            if (!this.isScanning || !this.scanListener) return;

            // Send random device (with duplicates allowed)
            if (this.discoveredDevices.size > 0) {
                const randomIndex = Math.floor(Math.random() * this.discoveredDevices.size);
                const randomDevice = Array.from(this.discoveredDevices.values())[randomIndex];

                if (this.scanOptions.allowDuplicates || Math.random() > 0.7) {
                    this.scanListener(null, randomDevice);
                }
            }

            // Simulate occasional errors
            if (Math.random() > 0.9) {
                this.scanListener(new Error('Simulated scan error'), null);
            }
        }, 800);
    }

    // ======================
    // Characteristic Monitoring
    // ======================
    monitorCharacteristicForDevice(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        listener: CharacteristicListener,
        transactionId: TransactionId = null
    ): MonitorSubscription {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);

        if (!this.monitoredCharacteristics.has(key)) {
            this.monitoredCharacteristics.set(key, []);
        }

        const listeners = this.monitoredCharacteristics.get(key)!;
        listeners.push(listener);

        // Return current value immediately
        const currentValue = this.characteristicValues.get(key) || null;
        if (currentValue) {
            setTimeout(() => listener(null, {
                uuid: characteristicUUID,
                serviceUUID,
                deviceID: deviceIdentifier,
                value: currentValue,
                isNotifiable: true,
                isIndicatable: false
            }), 0);
        }

        return {
            remove: () => {
                const updatedListeners = listeners.filter(l => l !== listener);
                if (updatedListeners.length === 0) {
                    this.monitoredCharacteristics.delete(key);
                    this.stopSimulatedNotificationsForKey(key);
                } else {
                    this.monitoredCharacteristics.set(key, updatedListeners);
                }
            }
        };
    }

    setCharacteristicValue(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        value: string,
        options: { notify: boolean } = { notify: true }
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.characteristicValues.set(key, value);

        if (options.notify) {
            this.notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID);
        }
    }

    startSimulatedNotifications(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        intervalMs: number = 1000
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.stopSimulatedNotificationsForKey(key);

        const interval = setInterval(() => {
            this.notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID);
        }, intervalMs);

        this.notificationIntervals.set(key, interval);
    }

    stopSimulatedNotifications(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.stopSimulatedNotificationsForKey(key);
    }

    private stopSimulatedNotificationsForKey(key: string) {
        const interval = this.notificationIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            this.notificationIntervals.delete(key);
        }
    }

    simulateCharacteristicError(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID,
        error: Error
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        const listeners = this.monitoredCharacteristics.get(key) || [];
        listeners.forEach(listener => listener(error, null));
    }

    // ======================
    // Helper Methods
    // ======================
    private notifyCharacteristicChange(
        deviceIdentifier: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        const value = this.characteristicValues.get(key) || null;
        const listeners = this.monitoredCharacteristics.get(key) || [];

        if (value && listeners.length > 0) {
            const characteristic: Characteristic = {
                uuid: characteristicUUID,
                serviceUUID,
                deviceID: deviceIdentifier,
                value,
                isNotifiable: true,
                isIndicatable: false
            };

            listeners.forEach(listener => listener(null, characteristic));
        }
    }

    private getCharacteristicKey(
        deviceId: DeviceId,
        serviceUUID: UUID,
        characteristicUUID: UUID
    ): string {
        return `${deviceId}|${serviceUUID}|${characteristicUUID}`;
    }

    /**
     * Simulate read operation with optional delay
     */
    private async simulateReadOperation<T>(key: string, operation: () => Promise<T>): Promise<T> {
        const delay = this.readDelays.get(key) || 0;

        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }

        return operation();
    }
  /**
   * Simulate write operation with optional delay
   */
  private async simulateWriteOperation<T>(
    key: string,
    withResponse: boolean,
    operation: () => Promise<T>
  ): Promise<T> {
    const delay = withResponse 
      ? this.writeWithResponseDelays.get(key) || 0
      : this.writeWithoutResponseDelays.get(key) || 0;
    
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    return operation();
  }

  /**
   * Register a listener for write operations
   */
  onCharacteristicWrite(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    listener: (value: string) => void
  ): { remove: () => void } {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeListeners.set(key, listener);
    
    return {
      remove: () => this.writeListeners.delete(key)
    };
  }

  /**
   * Notify write listeners
   */
  private notifyWriteListeners(key: string, value: string) {
    const listener = this.writeListeners.get(key);
    if (listener) {
      listener(value);
    }
  }

  /**
   * Simulate write errors
   */
  simulateWriteWithResponseError(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    error: Error
  ) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithResponseErrors.set(key, error);
  }

  simulateWriteWithoutResponseError(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    error: Error
  ) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithoutResponseErrors.set(key, error);
  }

  /**
   * Clear write errors
   */
  clearWriteWithResponseError(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID
  ) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithResponseErrors.delete(key);
  }

  clearWriteWithoutResponseError(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID
  ) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithoutResponseErrors.delete(key);
  }

  /**
   * Set write delays
   */
  setWriteWithResponseDelay(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    delayMs: number
  ) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithResponseDelays.set(key, delayMs);
  }

  setWriteWithoutResponseDelay(
    deviceIdentifier: DeviceId,
    serviceUUID: UUID,
    characteristicUUID: UUID,
    delayMs: number
  ) {
    const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
    this.writeWithoutResponseDelays.set(key, delayMs);
  }

}