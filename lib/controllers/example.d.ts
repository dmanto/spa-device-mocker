import type { MojoContext } from '@mojojs/core';
export default class Controller {
    welcome(ctx: MojoContext): Promise<void>;
}
