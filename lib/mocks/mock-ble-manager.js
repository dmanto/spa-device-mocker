// Static store for restored state
const restoredStateStore = new Map();
export class MockBleManager {
    constructor(options) {
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
        // Connection management
        this.connectedDevices = new Set();
        this.connectionListeners = new Map();
        this.connectionDelays = new Map();
        this.connectionErrors = new Map();
        this.disconnectionErrors = new Map();
        // MTU management
        this.mtuListeners = new Map();
        this.deviceMaxMTUs = new Map();
        // Service discovery
        this.deviceServicesMetadata = new Map();
        this.discoveredServices = new Map();
        if (options) {
            this.restoreStateIdentifier = options.restoreStateIdentifier;
            this.restoreStateFunction = options.restoreStateFunction;
            if (this.restoreStateIdentifier && this.restoreStateFunction) {
                // Simulate iOS state restoration
                setTimeout(() => {
                    const restoredState = restoredStateStore.get(this.restoreStateIdentifier);
                    this.restoreStateFunction(restoredState || null);
                }, 100);
            }
        }
    }
    /**
     * Simulate iOS state restoration by saving connected devices
     */
    saveRestorationState() {
        if (!this.restoreStateIdentifier)
            return;
        const connectedDevices = Array.from(this.connectedDevices).map(id => {
            const device = this.discoveredDevices.get(id);
            return { ...device }; // Return a copy
        });
        restoredStateStore.set(this.restoreStateIdentifier, {
            connectedPeripherals: connectedDevices
        });
    }
    // ======================
    // MTU Negotiation
    // ======================
    /**
     * Set the maximum MTU a device can support
     */
    setDeviceMaxMTU(deviceId, maxMTU) {
        this.deviceMaxMTUs.set(deviceId, maxMTU);
    }
    /**
     * Request MTU change during connection
     */
    async requestMTUForDevice(deviceIdentifier, mtu) {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error('Device not connected');
        }
        const device = this.discoveredDevices.get(deviceIdentifier);
        if (!device) {
            throw new Error('Device not found');
        }
        // Get device's maximum supported MTU
        const maxMTU = this.deviceMaxMTUs.get(deviceIdentifier) || 512;
        // Determine actual MTU (minimum of requested and max supported)
        const actualMTU = Math.min(mtu, maxMTU);
        // Update device MTU
        device.mtu = actualMTU;
        // Notify MTU listeners
        this.notifyMTUChange(deviceIdentifier, actualMTU);
        return device;
    }
    /**
     * Listen for MTU changes
     */
    onMTUChanged(deviceIdentifier, listener) {
        if (!this.mtuListeners.has(deviceIdentifier)) {
            this.mtuListeners.set(deviceIdentifier, []);
        }
        const listeners = this.mtuListeners.get(deviceIdentifier);
        listeners.push(listener);
        return {
            remove: () => {
                const updatedListeners = listeners.filter(l => l !== listener);
                if (updatedListeners.length === 0) {
                    this.mtuListeners.delete(deviceIdentifier);
                }
                else {
                    this.mtuListeners.set(deviceIdentifier, updatedListeners);
                }
            }
        };
    }
    /**
     * Notify MTU listeners
     */
    notifyMTUChange(deviceId, mtu) {
        const listeners = this.mtuListeners.get(deviceId) || [];
        listeners.forEach(listener => listener(mtu));
    }
    // ======================
    // Service Discovery
    // ======================
    /**
     * Set services and characteristics metadata for a device
     */
    setDeviceServices(deviceId, services) {
        this.deviceServicesMetadata.set(deviceId, services);
    }
    /**
     * Discover all services and characteristics for a device
     */
    async discoverAllServicesAndCharacteristicsForDevice(deviceIdentifier) {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error('Device not connected');
        }
        const device = this.discoveredDevices.get(deviceIdentifier);
        if (!device) {
            throw new Error('Device not found');
        }
        // Get services metadata
        const servicesMetadata = this.deviceServicesMetadata.get(deviceIdentifier) || [];
        // Create service objects
        const services = servicesMetadata.map(service => ({
            uuid: service.uuid,
            deviceID: deviceIdentifier
        }));
        // Store discovered services
        this.discoveredServices.set(deviceIdentifier, services);
        return device;
    }
    /**
     * Get discovered services for a device
     */
    async servicesForDevice(deviceIdentifier) {
        if (!this.discoveredServices.has(deviceIdentifier)) {
            throw new Error('Services not discovered for device');
        }
        return this.discoveredServices.get(deviceIdentifier) || [];
    }
    /**
     * Get characteristics for a service
     */
    async characteristicsForService(serviceUUID, deviceIdentifier) {
        const servicesMetadata = this.deviceServicesMetadata.get(deviceIdentifier) || [];
        const service = servicesMetadata.find(s => s.uuid === serviceUUID);
        if (!service) {
            throw new Error(`Service ${serviceUUID} not found`);
        }
        return service.characteristics;
    }
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
        // Disconnect all devices when Bluetooth is powered off
        if (newState === 'PoweredOff') {
            Array.from(this.connectedDevices).forEach(deviceId => {
                this.simulateDeviceDisconnection(deviceId, new Error('Bluetooth powered off'));
            });
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
    // Connection Management
    // ======================
    /**
     * Connect to a device
     */
    async connectToDevice(deviceIdentifier, options) {
        // Ensure Bluetooth is on
        if (this.currentState !== 'PoweredOn') {
            throw new Error('Bluetooth is not powered on');
        }
        const device = this.discoveredDevices.get(deviceIdentifier);
        if (!device) {
            throw new Error(`Device ${deviceIdentifier} not found`);
        }
        if (device.isConnectable === false) {
            throw new Error(`Device ${deviceIdentifier} is not connectable`);
        }
        // Check for simulated connection error
        if (this.connectionErrors.has(deviceIdentifier)) {
            const error = this.connectionErrors.get(deviceIdentifier);
            throw error;
        }
        // Get connection delay
        const delay = this.connectionDelays.get(deviceIdentifier) || 0;
        // Simulate connection time
        if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        // Update MTU if requested
        if (options?.requestMTU) {
            // Get device's maximum supported MTU
            const maxMTU = this.deviceMaxMTUs.get(deviceIdentifier) || 512;
            // Determine actual MTU (minimum of requested and max supported)
            const actualMTU = Math.min(options.requestMTU, maxMTU);
            // Update device MTU
            device.mtu = actualMTU;
            // Notify MTU listeners
            this.notifyMTUChange(deviceIdentifier, actualMTU);
        }
        // Mark device as connected
        this.connectedDevices.add(deviceIdentifier);
        // Notify connection listeners
        this.notifyConnectionListeners(deviceIdentifier, null, device);
        // Save restoration state
        this.saveRestorationState();
        return device;
    }
    /**
     * Disconnect from a device
     */
    async cancelDeviceConnection(deviceIdentifier) {
        const device = this.discoveredDevices.get(deviceIdentifier);
        if (!device) {
            throw new Error(`Device ${deviceIdentifier} not found`);
        }
        // Check if device is connected
        if (!this.connectedDevices.has(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }
        // Remove from connected devices
        this.connectedDevices.delete(deviceIdentifier);
        // Notify disconnection listeners
        this.notifyConnectionListeners(deviceIdentifier, this.disconnectionErrors.get(deviceIdentifier) || null, device);
        // Clear discovered services
        this.discoveredServices.delete(deviceIdentifier);
        // Save restoration state
        this.saveRestorationState();
        return device;
    }
    /**
     * Check if a device is connected
     */
    isDeviceConnected(deviceIdentifier) {
        return this.connectedDevices.has(deviceIdentifier);
    }
    /**
     * Listen for connection state changes
     */
    onDeviceDisconnected(deviceIdentifier, listener) {
        if (!this.connectionListeners.has(deviceIdentifier)) {
            this.connectionListeners.set(deviceIdentifier, []);
        }
        const listeners = this.connectionListeners.get(deviceIdentifier);
        listeners.push(listener);
        return {
            remove: () => {
                const updatedListeners = listeners.filter(l => l !== listener);
                if (updatedListeners.length === 0) {
                    this.connectionListeners.delete(deviceIdentifier);
                }
                else {
                    this.connectionListeners.set(deviceIdentifier, updatedListeners);
                }
            }
        };
    }
    /**
     * Simulate a device disconnection (e.g., out of range)
     */
    simulateDeviceDisconnection(deviceIdentifier, error) {
        if (this.connectedDevices.has(deviceIdentifier)) {
            this.connectedDevices.delete(deviceIdentifier);
            // Clear discovered services
            this.discoveredServices.delete(deviceIdentifier);
            const device = this.discoveredDevices.get(deviceIdentifier);
            this.notifyConnectionListeners(deviceIdentifier, error || new Error('Simulated disconnection'), device || null);
        }
    }
    /**
     * Simulate a connection error
     */
    simulateConnectionError(deviceIdentifier, error) {
        this.connectionErrors.set(deviceIdentifier, error);
    }
    /**
     * Clear connection error
     */
    clearConnectionError(deviceIdentifier) {
        this.connectionErrors.delete(deviceIdentifier);
    }
    /**
     * Simulate a disconnection error
     */
    simulateDisconnectionError(deviceIdentifier, error) {
        this.disconnectionErrors.set(deviceIdentifier, error);
    }
    /**
     * Clear disconnection error
     */
    clearDisconnectionError(deviceIdentifier) {
        this.disconnectionErrors.delete(deviceIdentifier);
    }
    /**
     * Set connection delay
     */
    setConnectionDelay(deviceIdentifier, delayMs) {
        this.connectionDelays.set(deviceIdentifier, delayMs);
    }
    /**
     * Notify connection listeners
     */
    notifyConnectionListeners(deviceIdentifier, error, device) {
        const listeners = this.connectionListeners.get(deviceIdentifier) || [];
        listeners.forEach(listener => listener(error, device));
    }
    // ======================
    // Device Scanning
    // ======================
    addMockDevice(device) {
        // Default to connectable if not specified
        if (device.isConnectable === undefined) {
            device.isConnectable = true;
        }
        this.discoveredDevices.set(device.id, device);
    }
    removeMockDevice(deviceId) {
        this.discoveredDevices.delete(deviceId);
    }
    clearMockDevices() {
        this.discoveredDevices.clear();
    }
    /**
     * Update a mock device's properties
     */
    updateMockDevice(deviceId, updates) {
        const device = this.discoveredDevices.get(deviceId);
        if (device) {
            this.discoveredDevices.set(deviceId, { ...device, ...updates });
        }
        else {
            throw new Error(`Device ${deviceId} not found`);
        }
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
    // Characteristic Reading
    // ======================
    async readCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, transactionId = null) {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }
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
    // ======================
    // Characteristic Writing
    // ======================
    // Write with response (acknowledged write)
    async writeCharacteristicWithResponseForDevice(deviceIdentifier, serviceUUID, characteristicUUID, base64Value, transactionId = null) {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }
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
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }
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
    // ======================
    // Characteristic Monitoring
    // ======================
    monitorCharacteristicForDevice(deviceIdentifier, serviceUUID, characteristicUUID, listener, transactionId = null) {
        // Ensure device is connected
        if (!this.isDeviceConnected(deviceIdentifier)) {
            throw new Error(`Device ${deviceIdentifier} is not connected`);
        }
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