import type { MojoContext } from '@mojojs/core';
export default class SpaDevicesController {
    index(ctx: MojoContext): Promise<void>;
    remove(ctx: MojoContext): Promise<void>;
    show(ctx: MojoContext): Promise<void>;
    store(ctx: MojoContext): Promise<void | boolean>;
    update(ctx: MojoContext): Promise<void | boolean>;
}
