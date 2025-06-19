import type { MojoContext } from '@mojojs/core';
import { WebSocketMessage, ControlCommand } from '../types';
import { SpaDevice } from '../spa-device';

export default class SpaDevicesController {
    async index(ctx: MojoContext): Promise<void> {
        ctx.stash.spaDevices = ctx.models.spaDevices.all();
        if (ctx.stash.ext === 'json') {
            await ctx.render({ json: ctx.stash.spaDevices });
        } else {
            await ctx.render();
        }
    }

    async remove(ctx: MojoContext): Promise<void> {
        ctx.models.spaDevices.remove(ctx.stash.mac);
        if (ctx.stash.ext === 'json') {
            await ctx.render({ json: { removed: true } });
        } else {
            await ctx.redirectTo('spa_devices');
        }
    }

    async show(ctx: MojoContext): Promise<void> {
        ctx.stash.spaDevice = ctx.models.spaDevices.find(ctx.stash.mac);
        if (ctx.stash.ext === 'json') {
            await ctx.render({ json: ctx.stash.spaDevice });
        } else {
            await ctx.render();
        }
    }

    async store(ctx: MojoContext): Promise<void | boolean> {
        const spaDevice: SpaDevice = ctx.stash.ext === 'json'
            ? await ctx.req.json()
            : (await ctx.params()).toObject();

        if (_validate(ctx, spaDevice) === false) {
            if (ctx.stash.ext === 'json') {
                await ctx.render({ json: { error: 'Validation failed' }, status: 400 });
            } else {
                return ctx.render({ view: 'spa-devices/create' }, { spaDevice });
            }
            return;
        }

        const { mac } = spaDevice;
        ctx.models.spaDevices.add(spaDevice);
        if (ctx.stash.ext === 'json') {
            await ctx.render({ json: spaDevice, status: 201 });
        } else {
            await ctx.redirectTo('show_spa_device', { values: { mac } });
        }
    }

    async update(ctx: MojoContext): Promise<void | boolean> {
        const spaDevice: SpaDevice = ctx.stash.ext === 'json'
            ? await ctx.req.json()
            : (await ctx.params()).toObject();

        if (_validate(ctx, spaDevice) === false) {
            if (ctx.stash.ext === 'json') {
                await ctx.render({ json: { error: 'Validation failed' }, status: 400 });
            } else {
                return ctx.render({ view: 'spa-devices/edit' }, { spaDevice });
            }
            return;
        }

        const mac = ctx.stash.mac;
        ctx.models.spaDevices.save(spaDevice);
        if (ctx.stash.ext === 'json') {
            await ctx.render({ json: spaDevice });
        } else {
            await ctx.redirectTo('show_spa_device', { values: { mac } });
        }
    }
}

function _validate(ctx: MojoContext, spaDevice: any): boolean {
    const validate = ctx.schema({
        $id: 'spaDeviceForm',
        type: 'object',
        properties: {
            mac: { type: 'string', minLength: 1 },
            area: { type: 'string' },
            rssi: { type: 'number' }
        },
        required: ['mac']
    });
    return validate(spaDevice).isValid;
}



// // MockBLEServer.ts
// import { Server } from '@mojojs/core';
// import { SpaDevice } from '../spa-device';

// export class MockBLEServer {
//     private devices: Map<string, SpaDevice> = new Map();
//     private server: Server;
//     private port: number;

//     constructor(port: number = 3001) {
//         this.port = port;
//         this.server = new Server();
//         this.setupRoutes();
//     }

//     addDevice(device: SpaDevice): void {
//         this.devices.set(device.mac, device);
//     }

//     async start(): Promise<void> {
//         await this.server.start({ port: this.port });
//         console.log(`Mock BLE Server running on port ${this.port}`);
//     }

//     async stop(): Promise<void> {
//         await this.server.stop();
//     }

//     private setupRoutes(): void {
//         const router = this.server.router;

//         // Create a new device
//         router.post('/devices', async ctx => {
//             const { mac, area, rssi } = await ctx.req.json();
//             if (!mac) {
//                 return ctx.res.status(400).json({ error: 'MAC address is required' });
//             }

//             const device = new SpaDevice(mac, area, rssi);
//             this.devices.set(mac, device);
//             ctx.res.status(201).json({ message: `Device ${mac} created` });
//         });

//         // Get all devices
//         router.get('/devices', async ctx => {
//             const devices = Array.from(this.devices.values()).map(d => ({
//                 mac: d.mac,
//                 area: d.area,
//                 rssi: d.rssi,
//                 state: d.state
//             }));
//             ctx.res.json(devices);
//         });

//         // Send command to device
//         router.post('/devices/:mac/command', async ctx => {
//             const mac = ctx.req.params.get('mac');
//             const command: ControlCommand = await ctx.req.json();

//             if (!this.devices.has(mac)) {
//                 return ctx.res.status(404).json({ error: 'Device not found' });
//             }

//             const device = this.devices.get(mac)!;

//             try {
//                 // Handle connection commands
//                 if (command.characteristic === 'CONNECT') {
//                     device.connect();
//                 } else if (command.characteristic === 'DISCONNECT') {
//                     device.disconnect();
//                 }
//                 // Handle characteristic writes
//                 else {
//                     device.handleWrite(command.characteristic, command.value);
//                 }

//                 ctx.res.json({ message: 'Command executed' });
//             } catch (error) {
//                 ctx.res.status(400).json({ error: 'Invalid command' });
//             }
//         });

//         // Reset device
//         router.post('/devices/:mac/reset', async ctx => {
//             const mac = ctx.req.params.get('mac');

//             if (!this.devices.has(mac)) {
//                 return ctx.res.status(404).json({ error: 'Device not found' });
//             }

//             const device = this.devices.get(mac)!;
//             const { area, rssi } = device;
//             this.devices.set(mac, new SpaDevice(mac, area, rssi));
//             ctx.res.json({ message: 'Device reset' });
//         });

//         // WebSocket endpoint
//         router.websocket('/ws', async ctx => {
//             const ws = await ctx.ws();
//             console.log('WebSocket client connected');

//             // Send initial state
//             const devices = Array.from(this.devices.values()).map(d => ({
//                 mac: d.mac,
//                 area: d.area,
//                 rssi: d.rssi,
//                 state: d.state
//             }));

//             ws.send(JSON.stringify({
//                 event: 'initial_state',
//                 devices,
//                 timestamp: Date.now()
//             }));

//             // Handle messages
//             ws.on('message', (data) => {
//                 try {
//                     const message: WebSocketMessage = JSON.parse(data.toString());
//                     this.handleWebSocketMessage(message, ws);
//                 } catch (error) {
//                     console.error('Invalid WebSocket message:', error);
//                 }
//             });

//             ws.on('close', () => {
//                 console.log('WebSocket client disconnected');
//             });
//         });
//     }

//     private handleWebSocketMessage(message: WebSocketMessage, ws: WebSocket): void {
//         if (message.event === 'command') {
//             if (!message.device || !message.characteristic || message.value === undefined) {
//                 console.warn('Invalid command message');
//                 return;
//             }

//             const device = this.devices.get(message.device);
//             if (!device) {
//                 console.warn(`Device not found: ${message.device}`);
//                 return;
//             }

//             // Handle connection commands
//             if (message.characteristic === 'CONNECT') {
//                 device.connect();
//             } else if (message.characteristic === 'DISCONNECT') {
//                 device.disconnect();
//             }
//             // Handle characteristic writes
//             else {
//                 device.handleWrite(message.characteristic, message.value);
//             }

//             // Broadcast state change
//             this.broadcastStateChange(device, message.characteristic);
//         }
//     }

//     // Broadcast state changes to all WebSocket clients
//     broadcastStateChange(device: SpaDevice, characteristic: Characteristic): void {
//         const message: WebSocketMessage = {
//             event: 'state_change',
//             device: device.mac,
//             characteristic,
//             value: device.state.characteristics[characteristic],
//             timestamp: Date.now()
//         };

//         this.server.clients.forEach(client => {
//             if (client.readyState === WebSocket.OPEN) {
//                 client.send(JSON.stringify(message));
//             }
//         });
//     }
// }