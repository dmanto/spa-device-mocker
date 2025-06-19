import { MockBleManager, MockDevice } from './mock-ble-manager.js';
import { Buffer } from 'buffer';

const bleManager = new MockBleManager();

// Example 1: State Management
bleManager.state().then(state => console.log(`Initial state: ${state}`));
const stateSubscription = bleManager.onStateChange(
    state => console.log(`State changed: ${state}`),
    true
);

// Example 2: Device Scanning
const heartMonitor: MockDevice = {
    id: 'heart-monitor-123',
    name: 'Heart Monitor',
    rssi: -55,
    mtu: 128,
    manufacturerData: Buffer.from([0x48, 0x52]).toString('base64'),
    serviceData: null,
    serviceUUIDs: ['180D', '180F']
};

bleManager.addMockDevice(heartMonitor);
bleManager.startDeviceScan(
    ['180D'],
    { allowDuplicates: true },
    (error, device) => {
        if (error) console.error('Scan error:', error.message);
        else console.log(`Discovered device: ${device?.name}`);
    }
);

// Example 3: Characteristic Monitoring
bleManager.setCharacteristicValue(
    'heart-monitor-123',
    '180D',
    '2A37',
    Buffer.from([0x06, 0x48]).toString('base64')
);

const subscription = bleManager.monitorCharacteristicForDevice(
    'heart-monitor-123',
    '180D',
    '2A37',
    (error, char) => {
        if (error) console.error('Monitoring error:', error.message);
        else if (char?.value) {
            const value = Buffer.from(char.value, 'base64');
            console.log(`Characteristic value: ${value.toString('hex')}`);
        }
    }
);

// Clean up after 5 seconds
setTimeout(() => {
    stateSubscription.remove();
    bleManager.stopDeviceScan();
    subscription.remove();
    bleManager.stopSimulatedNotifications(
        'heart-monitor-123',
        '180D',
        '2A37'
    );
}, 5000);

// In ble-manager-example.ts

// Example 4: Characteristic Reading
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
        if (error instanceof Error) {
            console.error('Read failed:', error.message);
        } else {
            console.error('Read failed:', error);
        }
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
        if (error instanceof Error) {
            console.error('Read failed as expected:', error.message);
        } else {
            console.error('Read failed as expected:', error);
        }
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
        if (error instanceof Error) {
            console.error('Unexpected error:', error.message);
        } else {
            console.error('Unexpected error:', error);
        }
    }
}, 15000);

// In ble-manager-example.ts

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
    const result = await bleManager.writeCharacteristicWithResponseForDevice(
      deviceId,
      serviceUUID,
      characteristicUUID,
      Buffer.from([0x01, 0x02]).toString('base64')
    );
    console.log('Write with response successful');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Write with response failed:', error.message);
    } else {
      console.error('Write with response failed:', error);
    }
  }
  
  // Test write without response
  console.log('Writing without response...');
  try {
    const result = await bleManager.writeCharacteristicWithoutResponseForDevice(
      deviceId,
      serviceUUID,
      characteristicUUID,
      Buffer.from([0x03, 0x04]).toString('base64')
    );
    console.log('Write without response successful');
  } catch (error) {
    if (error instanceof Error) {
      console.error('Write without response failed:', error.message);
    } else {
      console.error('Write without response failed:', error);
    }
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
    if (error instanceof Error) {
      console.error('Write with response failed as expected:', error.message);
    } else {
      console.error('Write with response failed as expected:', error);
    }
  }
  
  // Clean up
  writeListener.remove();
}, 20000);