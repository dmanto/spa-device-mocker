import { MockBleManager, MockDevice } from './mock-ble-manager.js';
import { Buffer } from 'buffer';

const bleManager = new MockBleManager();

// Helper function to safely get error message
function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}

// Example 1: State Management
console.log('==== STATE MANAGEMENT EXAMPLE ====');
bleManager.state().then(state => console.log(`Initial state: ${state}`));

const stateSubscription = bleManager.onStateChange(
    state => console.log(`State changed: ${state}`),
    true
);

// Simulate state changes
setTimeout(() => bleManager.setState('PoweredOff'), 1000);
setTimeout(() => bleManager.setState('PoweredOn'), 3000);
setTimeout(() => stateSubscription.remove(), 4000);

// Example 2: Device Scanning
setTimeout(() => {
    console.log('\n==== DEVICE SCANNING EXAMPLE ====');
    
    // Create mock devices
    const heartMonitor: MockDevice = {
        id: 'heart-monitor-123',
        name: 'Heart Monitor',
        rssi: -55,
        mtu: 128,
        manufacturerData: Buffer.from([0x48, 0x52]).toString('base64'),
        serviceData: null,
        serviceUUIDs: ['180D', '180F'],
        isConnectable: true
    };
    
    const smartThermometer: MockDevice = {
        id: 'thermo-456',
        name: 'Smart Thermometer',
        rssi: -72,
        mtu: 64,
        manufacturerData: Buffer.from([0x54, 0x48]).toString('base64'),
        serviceData: null,
        serviceUUIDs: ['1809'],
        isConnectable: true
    };
    
    // Add devices to manager
    bleManager.addMockDevice(heartMonitor);
    bleManager.addMockDevice(smartThermometer);
    
    // Set up services and characteristics for heart monitor
    bleManager.setDeviceServices('heart-monitor-123', [
        {
            uuid: '180D', // Heart Rate Service
            characteristics: [
                {
                    uuid: '2A37', // Heart Rate Measurement
                    isReadable: true,
                    isNotifiable: true
                },
                {
                    uuid: '2A38', // Body Sensor Location
                    isReadable: true
                }
            ]
        },
        {
            uuid: '180F', // Battery Service
            characteristics: [
                {
                    uuid: '2A19', // Battery Level
                    isReadable: true
                }
            ]
        }
    ]);
    
    // Start scanning
    console.log('Starting device scan...');
    bleManager.startDeviceScan(
        ['180D'], // Only look for heart rate services
        { allowDuplicates: true },
        (error, device) => {
            if (error) {
                console.error('Scan error:', getErrorMessage(error));
            } else {
                console.log(`Discovered device: ${device?.name} (RSSI: ${device?.rssi})`);
            }
        }
    );
    
    // Stop scanning after 5 seconds
    setTimeout(() => {
        console.log('Stopping device scan');
        bleManager.stopDeviceScan();
    }, 5000);
}, 5000);

// Example 3: Device Connection & Service Discovery
setTimeout(async () => {
    console.log('\n==== DEVICE CONNECTION & SERVICE DISCOVERY EXAMPLE ====');
    
    const deviceId = 'heart-monitor-123';
    
    // Connect to device
    console.log(`Connecting to ${deviceId}...`);
    try {
        const connectedDevice = await bleManager.connectToDevice(deviceId);
        console.log(`Connected to ${connectedDevice.name}`);
        
        // Discover services and characteristics
        console.log('Discovering services and characteristics...');
        await bleManager.discoverAllServicesAndCharacteristicsForDevice(deviceId);
        console.log('Discovery complete');
        
        // Get discovered services
        const services = await bleManager.servicesForDevice(deviceId);
        console.log('Discovered services:', services.map(s => s.uuid));
        
        // Get characteristics for a service
        const characteristics = await bleManager.characteristicsForService('180D', deviceId);
        console.log('Characteristics for service 180D:', characteristics.map(c => c.uuid));
        
    } catch (error) {
        console.error('Connection or discovery failed:', getErrorMessage(error));
    }
}, 11000);

// Example 4: Characteristic Monitoring
setTimeout( async () => {
    console.log('\n==== CHARACTERISTIC MONITORING EXAMPLE ====');
    
    const deviceId = 'heart-monitor-123';
    const serviceUUID = '180D'; // Heart Rate Service
    const characteristicUUID = '2A37'; // Heart Rate Measurement
    
    // Set initial characteristic value
    bleManager.setCharacteristicValueForReading(
        deviceId,
        serviceUUID,
        characteristicUUID,
        Buffer.from([0x06, 0x48]).toString('base64') // [Flags, Heart Rate]
    );
    
    // Monitor the characteristic
    console.log('Monitoring heart rate characteristic...');
    const subscription = bleManager.monitorCharacteristicForDevice(
        deviceId,
        serviceUUID,
        characteristicUUID,
        (error, characteristic) => {
            if (error) {
                console.error('Monitoring error:', getErrorMessage(error));
            } else if (characteristic?.value) {
                const data = Buffer.from(characteristic.value, 'base64');
                // First byte is flags, second is heart rate value
                const heartRate = data[1];
                console.log(`Heart rate update: ${heartRate} bpm`);
            }
        }
    );
    
    // Start simulated periodic notifications
    bleManager.startSimulatedNotifications(deviceId, serviceUUID, characteristicUUID, 1500);
    
    // Manually update the value after 4 seconds
    setTimeout(() => {
        console.log('Manually updating heart rate');
        bleManager.setCharacteristicValue(
            deviceId,
            serviceUUID,
            characteristicUUID,
            Buffer.from([0x06, 0x52]).toString('base64') // 82 bpm
        );
    }, 4000);
    
    // Simulate an error after 6 seconds
    setTimeout(() => {
        console.log('Simulating characteristic error');
        bleManager.simulateCharacteristicError(
            deviceId,
            serviceUUID,
            characteristicUUID,
            new Error('Connection lost')
        );
    }, 6000);
    
    // Clean up after 8 seconds
    setTimeout(() => {
        console.log('Stopping monitoring');
        subscription.remove();
        bleManager.stopSimulatedNotifications(deviceId, serviceUUID, characteristicUUID);
    }, 8000);
}, 11000);

// Example 5: Characteristic Reading
setTimeout(async () => {
    console.log('\n==== CHARACTERISTIC READING EXAMPLE ====');
    
    const deviceId = 'heart-monitor-123';
    const serviceUUID = '180D';
    const characteristicUUID = '2A37';
    
    // Set value to be read
    bleManager.setCharacteristicValueForReading(
        deviceId,
        serviceUUID,
        characteristicUUID,
        Buffer.from([0x06, 0x4B]).toString('base64') // 75 bpm
    );
    
    // Set read delay (500ms)
    bleManager.setCharacteristicReadDelay(deviceId, serviceUUID, characteristicUUID, 500);
    
    // Read characteristic
    console.log('Reading characteristic...');
    try {
        const characteristic = await bleManager.readCharacteristicForDevice(
            deviceId,
            serviceUUID,
            characteristicUUID
        );
        
        if (characteristic.value) {
            const data = Buffer.from(characteristic.value, 'base64');
            const heartRate = data[1];
            console.log(`Read heart rate: ${heartRate} bpm`);
        }
    } catch (error) {
        console.error('Read failed:', getErrorMessage(error));
    }
    
    // Simulate read error
    bleManager.simulateCharacteristicReadError(
        deviceId,
        serviceUUID,
        characteristicUUID,
        new Error('Read failed: Insufficient permissions')
    );
    
    console.log('Reading characteristic with simulated error...');
    try {
        await bleManager.readCharacteristicForDevice(deviceId, serviceUUID, characteristicUUID);
    } catch (error) {
        console.error('Read failed as expected:', getErrorMessage(error));
    }
    
    // Clear error and read again
    bleManager.clearCharacteristicReadError(deviceId, serviceUUID, characteristicUUID);
    bleManager.setCharacteristicReadDelay(deviceId, serviceUUID, characteristicUUID, 0);
    
    console.log('Reading characteristic after clearing error...');
    try {
        const characteristic = await bleManager.readCharacteristicForDevice(
            deviceId,
            serviceUUID,
            characteristicUUID
        );
        console.log('Read successful after clearing error');
    } catch (error) {
        console.error('Unexpected error:', getErrorMessage(error));
    }
}, 17000);

// Example 5: Characteristic Writing
setTimeout(async () => {
    console.log('\n==== CHARACTERISTIC WRITING EXAMPLE ====');
    
    const deviceId = 'heart-monitor-123';
    const serviceUUID = '180D';
    const characteristicUUID = '2A37';
    
    // Register write listener
    const writeListener = bleManager.onCharacteristicWrite(
        deviceId,
        serviceUUID,
        characteristicUUID,
        value => {
            console.log(`Write operation: ${Buffer.from(value, 'base64').toString('hex')}`);
        }
    );
    
    // Test write with response
    console.log('Writing with response...');
    try {
        await bleManager.writeCharacteristicWithResponseForDevice(
            deviceId,
            serviceUUID,
            characteristicUUID,
            Buffer.from([0x01, 0x02]).toString('base64')
        );
        console.log('Write with response successful');
    } catch (error) {
        console.error('Write with response failed:', getErrorMessage(error));
    }
    
    // Test write without response
    console.log('Writing without response...');
    try {
        await bleManager.writeCharacteristicWithoutResponseForDevice(
            deviceId,
            serviceUUID,
            characteristicUUID,
            Buffer.from([0x03, 0x04]).toString('base64')
        );
        console.log('Write without response successful');
    } catch (error) {
        console.error('Write without response failed:', getErrorMessage(error));
    }
    
    // Simulate write with response error
    bleManager.simulateWriteWithResponseError(
        deviceId,
        serviceUUID,
        characteristicUUID,
        new Error('Write failed: Device not connected')
    );
    
    console.log('Writing with response (simulated error)...');
    try {
        await bleManager.writeCharacteristicWithResponseForDevice(
            deviceId,
            serviceUUID,
            characteristicUUID,
            Buffer.from([0x05, 0x06]).toString('base64')
        );
    } catch (error) {
        console.error('Write with response failed as expected:', getErrorMessage(error));
    }
    
    // Clean up
    writeListener.remove();
}, 23000);

// Example 6: Device Connection
setTimeout(async () => {
    console.log('\n==== DEVICE CONNECTION EXAMPLE ====');
    
    const deviceId = 'heart-monitor-123';
    
    // Listen for disconnections
    const disconnectionSubscription = bleManager.onDeviceDisconnected(
        deviceId,
        (error, device) => {
            if (error) {
                console.error(`Disconnected with error: ${getErrorMessage(error)}`);
            } else {
                console.log(`Disconnected from ${device?.name}`);
            }
        }
    );
    
    // Connect to device
    console.log(`Connecting to ${deviceId}...`);
    try {
        const connectedDevice = await bleManager.connectToDevice(deviceId, {
            requestMTU: 150
        });
        console.log(`Connected to ${connectedDevice.name} (MTU: ${connectedDevice.mtu})`);
        
        // Now we can perform operations
        console.log('Reading characteristic...');
        try {
            const char = await bleManager.readCharacteristicForDevice(
                deviceId,
                '180D',
                '2A37'
            );
            console.log('Read successful');
        } catch (error) {
            console.error('Read failed:', getErrorMessage(error));
        }
        
    } catch (error) {
        console.error('Connection failed:', getErrorMessage(error));
    }
    
    // Simulate unexpected disconnection after 3 seconds
    setTimeout(() => {
        console.log('Simulating unexpected disconnection...');
        bleManager.simulateDeviceDisconnection(deviceId);
    }, 3000);
    
    // Connect again with simulated error
    setTimeout(async () => {
        bleManager.simulateConnectionError(
            deviceId,
            new Error('Connection failed: Device unreachable')
        );
        
        console.log('Connecting with simulated error...');
        try {
            await bleManager.connectToDevice(deviceId);
        } catch (error) {
            console.error('Connection failed as expected:', getErrorMessage(error));
        }
        
        // Clear error and connect again
        bleManager.clearConnectionError(deviceId);
        console.log('Connecting after clearing error...');
        try {
            await bleManager.connectToDevice(deviceId);
            console.log('Connected successfully after clearing error');
        } catch (error) {
            console.error('Unexpected error:', getErrorMessage(error));
        }
        
        // Disconnect properly
        setTimeout(async () => {
            console.log('Disconnecting...');
            try {
                await bleManager.cancelDeviceConnection(deviceId);
                console.log('Disconnected successfully');
            } catch (error) {
                console.error('Disconnection failed:', getErrorMessage(error));
            }
            
            // Clean up
            disconnectionSubscription.remove();
        }, 2000);
    }, 5000);
}, 29000);

// Clean up after all examples
setTimeout(() => {
    console.log('\n==== ALL EXAMPLES COMPLETED ====');
}, 45000);

// Example 7: MTU Negotiation
setTimeout(async () => {
    console.log('\n==== MTU NEGOTIATION EXAMPLE ====');
    
    const deviceId = 'heart-monitor-123';
    
    // Set device's maximum supported MTU
    bleManager.setDeviceMaxMTU(deviceId, 150);
    
    // Listen for MTU changes
    const mtuSubscription = bleManager.onMTUChanged(
        deviceId,
        mtu => console.log(`MTU changed to: ${mtu}`)
    );
    
    // Connect and request MTU
    console.log('Connecting with MTU request...');
    try {
        const connectedDevice = await bleManager.connectToDevice(deviceId, {
            requestMTU: 200 // Request more than device supports
        });
        console.log(`Connected with MTU: ${connectedDevice.mtu}`); // Should be 150 (the device max)
    } catch (error) {
        console.error('Connection failed:', getErrorMessage(error));
    }
    
    // Request MTU change after connection
    console.log('Requesting MTU change to 100...');
    try {
        const device = await bleManager.requestMTUForDevice(deviceId, 100);
        console.log(`MTU changed to: ${device.mtu}`);
    } catch (error) {
        console.error('MTU change failed:', getErrorMessage(error));
    }
    
    // Clean up
    mtuSubscription.remove();
}, 35000);