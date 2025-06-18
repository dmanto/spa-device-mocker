export class SpaDevices {
    constructor(mac, area = 'default', rssi = -70) {
        this.devices = new Map();
        this.mac = mac;
        this.area = area;
        this.rssi = rssi;
        this.state = {
            mode: 'F',
            connectionState: 'advertising',
            operationalState: 'idle',
            characteristics: {
                MMODE: 'F',
                MCODE: '',
                BTNAME: `Spa_${mac.substring(9)}`,
                TEMPERATURE: '20',
                TIME: '00:00',
                SESSION: '0',
                WIFICREDS: '',
                VERSION: '{"v":"1.0.0"}',
                WIFIMAC: mac.replace(/:/g, '')
            },
            storedMcode: null,
            partialWrite: {
                characteristic: null,
                buffer: '',
                position: 0
            }
        };
    }
    // Reset partial write state
    resetPartialWrite() {
        this.state.partialWrite = {
            characteristic: null,
            buffer: '',
            position: 0
        };
    }
    // State transition methods
    connect() {
        if (this.state.connectionState === 'advertising') {
            this.state.connectionState = 'connected';
            this.state.characteristics.MMODE = 'F';
            this.state.characteristics.MCODE = '';
            this.resetPartialWrite(); // Reset partial writes on connect
        }
    }
    disconnect() {
        this.state.connectionState = 'advertising';
        this.state.mode = 'F';
        this.resetPartialWrite(); // Reset partial writes on disconnect
    }
    handleWrite(characteristic, value) {
        // Handle partial writes (chunked messages)
        if (this.handlePartialWrite(characteristic, value)) {
            return;
        }
        // ... rest of handleWrite implementation
    }
    handlePartialWrite(characteristic, value) {
        const pw = this.state.partialWrite;
        // New partial write (start flag '0')
        if (value[0] === '0' && pw.characteristic === null) {
            pw.characteristic = characteristic;
            pw.buffer = value.substring(1);
            pw.position = value.length - 1;
            return true;
        }
        // Continue partial write (continue flag '2')
        if (pw.characteristic === characteristic && value[0] === '2') {
            pw.buffer += value.substring(1);
            pw.position += value.length - 1;
            return true;
        }
        // Finalize partial write (end flag '9')
        if (pw.characteristic === characteristic && value[0] === '9') {
            const fullValue = pw.buffer + value.substring(1);
            this.handleWrite(characteristic, fullValue);
            this.resetPartialWrite(); // Reset after completing write
            return true;
        }
        return false;
    }
}
//# sourceMappingURL=spa-device.js.map