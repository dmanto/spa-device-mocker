export class SpaDevices {
    constructor() {
        this.devices = new Map();
    }
    add(device) {
        this.devices.set(device.mac, device);
    }
    save(device) {
        this.devices.set(device.mac, device);
    }
    find(mac) {
        return this.devices.get(mac);
    }
    remove(mac) {
        return this.devices.delete(mac);
    }
    all() {
        return Array.from(this.devices.values());
    }
}
//# sourceMappingURL=spa-devices.js.map