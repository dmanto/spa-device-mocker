export class MockBleManager {
    constructor() {
        // State management
        this.currentState = 'PoweredOn';
        this.stateListeners = [];
        // Scanning
        this.scanListener = null;
        this.isScanning = false;
        this.discoveredDevices = new Map();
        this.scanOptions = {};
        this.scanUUIDs = null;
        this.scanInterval = null;
        // Characteristic monitoring
        this.monitoredCharacteristics = new Map();
        this.characteristicValues = new Map();
        this.notificationIntervals = new Map();
        // properties for read operations
        this.readDelays = new Map();
        this.readErrors = new Map();
        // properties for write operations
        this.writeWithResponseDelays = new Map();
        this.writeWithoutResponseDelays = new Map();
        this.writeWithResponseErrors = new Map();
        this.writeWithoutResponseErrors = new Map();
        this.writeListeners = new Map();
    }
    /**
     * Set mock characteristic value for reading
     */
    setCharacteristicValueForReading(deviceIdentifier, serviceUUID, characteristicUUID, value) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.characteristicValues.set(key, value);
    }
    /**
     * Simulate a read error for a characteristic
     */
    simulateCharacteristicReadError(deviceIdentifier, serviceUUID, characteristicUUID, error) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readErrors.set(key, error);
    }
    /**
     * Clear simulated read error for a characteristic
     */
    clearCharacteristicReadError(deviceIdentifier, serviceUUID, characteristicUUID) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readErrors.delete(key);
    }
    /**
     * Set read delay for a characteristic (ms)
     */
    setCharacteristicReadDelay(deviceIdentifier, serviceUUID, characteristicUUID, delayMs) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.readDelays.set(key, delayMs);
    }
    // ... existing methods ...
    // ======================
    // State Management
    // ======================
    async state() {
        return this.currentState;
    }
    setState(newState) {
        this.currentState = newState;
        this.stateListeners.forEach(listener => listener(newState));
        // Automatically stop scanning when not powered on
        if (newState !== 'PoweredOn' && this.isScanning) {
            this.stopDeviceScan();
        }
    }
    onStateChange(listener, emitCurrentState = false) {
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
    addMockDevice(device) {
        this.discoveredDevices.set(device.id, device);
    }
    removeMockDevice(deviceId) {
        this.discoveredDevices.delete(deviceId);
    }
    clearMockDevices() {
        this.discoveredDevices.clear();
    }
    startDeviceScan(UUIDs, options, listener) {
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
    async readCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, transactionId = null) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        // Check if we should simulate an error for this characteristic
        if (this.readErrors.has(key)) {
            const error = this.readErrors.get(key);
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
    async writeCharacteristicWithResponseForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, transactionId = null) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        // Check for simulated error
        if (this.writeWithResponseErrors.has(key)) {
            const error = this.writeWithResponseErrors.get(key);
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
    async writeCharacteristicWithoutResponseForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, transactionId = null) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        // Check for simulated error
        if (this.writeWithoutResponseErrors.has(key)) {
            const error = this.writeWithoutResponseErrors.get(key);
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
    simulateDeviceDiscovery() {
        // Get filtered devices
        const devices = Array.from(this.discoveredDevices.values()).filter(device => {
            if (!this.scanUUIDs || this.scanUUIDs.length === 0)
                return true;
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
            if (!this.isScanning || !this.scanListener)
                return;
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
    monitorCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, listener, transactionId = null) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        if (!this.monitoredCharacteristics.has(key)) {
            this.monitoredCharacteristics.set(key, []);
        }
        const listeners = this.monitoredCharacteristics.get(key);
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
                }
                else {
                    this.monitoredCharacteristics.set(key, updatedListeners);
                }
            }
        };
    }
    setCharacteristicValue(deviceIdentifier, serviceUUID, characteristicUUID, value, options = { notify: true }) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.characteristicValues.set(key, value);
        if (options.notify) {
            this.notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID);
        }
    }
    startSimulatedNotifications(deviceIdentifier, serviceUUID, characteristicUUID, intervalMs = 1000) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.stopSimulatedNotificationsForKey(key);
        const interval = setInterval(() => {
            this.notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID);
        }, intervalMs);
        this.notificationIntervals.set(key, interval);
    }
    stopSimulatedNotifications(deviceIdentifier, serviceUUID, characteristicUUID) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.stopSimulatedNotificationsForKey(key);
    }
    stopSimulatedNotificationsForKey(key) {
        const interval = this.notificationIntervals.get(key);
        if (interval) {
            clearInterval(interval);
            this.notificationIntervals.delete(key);
        }
    }
    simulateCharacteristicError(deviceIdentifier, serviceUUID, characteristicUUID, error) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        const listeners = this.monitoredCharacteristics.get(key) || [];
        listeners.forEach(listener => listener(error, null));
    }
    // ======================
    // Helper Methods
    // ======================
    notifyCharacteristicChange(deviceIdentifier, serviceUUID, characteristicUUID) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        const value = this.characteristicValues.get(key) || null;
        const listeners = this.monitoredCharacteristics.get(key) || [];
        if (value && listeners.length > 0) {
            const characteristic = {
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
    getCharacteristicKey(deviceId, serviceUUID, characteristicUUID) {
        return `${deviceId}|${serviceUUID}|${characteristicUUID}`;
    }
    /**
     * Simulate read operation with optional delay
     */
    async simulateReadOperation(key, operation) {
        const delay = this.readDelays.get(key) || 0;
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        return operation();
    }
    /**
     * Simulate write operation with optional delay
     */
    async simulateWriteOperation(key, withResponse, operation) {
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
    onCharacteristicWrite(deviceIdentifier, serviceUUID, characteristicUUID, listener) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeListeners.set(key, listener);
        return {
            remove: () => this.writeListeners.delete(key)
        };
    }
    /**
     * Notify write listeners
     */
    notifyWriteListeners(key, value) {
        const listener = this.writeListeners.get(key);
        if (listener) {
            listener(value);
        }
    }
    /**
     * Simulate write errors
     */
    simulateWriteWithResponseError(deviceIdentifier, serviceUUID, characteristicUUID, error) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithResponseErrors.set(key, error);
    }
    simulateWriteWithoutResponseError(deviceIdentifier, serviceUUID, characteristicUUID, error) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithoutResponseErrors.set(key, error);
    }
    /**
     * Clear write errors
     */
    clearWriteWithResponseError(deviceIdentifier, serviceUUID, characteristicUUID) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithResponseErrors.delete(key);
    }
    clearWriteWithoutResponseError(deviceIdentifier, serviceUUID, characteristicUUID) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithoutResponseErrors.delete(key);
    }
    /**
     * Set write delays
     */
    setWriteWithResponseDelay(deviceIdentifier, serviceUUID, characteristicUUID, delayMs) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithResponseDelays.set(key, delayMs);
    }
    setWriteWithoutResponseDelay(deviceIdentifier, serviceUUID, characteristicUUID, delayMs) {
        const key = this.getCharacteristicKey(deviceIdentifier, serviceUUID, characteristicUUID);
        this.writeWithoutResponseDelays.set(key, delayMs);
    }
}
//# sourceMappingURL=mock-ble-manager.js.map