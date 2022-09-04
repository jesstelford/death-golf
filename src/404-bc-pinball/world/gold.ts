import { Settings } from "../settings";
import { Phase1 } from "./phase1";
import { Effects } from "../sounds";
import { Gui } from "./gui";
import { Entity } from "./entity";
import { Vector } from "../math/vector";

export class Gold extends Entity {

    jackpot: boolean;

    constructor(position: Vector) {
        super('gold', position);
        this.body.isRigid = false;
        this.jackpot = false;
    }

    render(context: CanvasRenderingContext2D) {
        super.render(context);
        if (Settings.debug) return;
        if (!this.jackpot) {
            context.fillStyle = "rgba(0, 0, 0, 0.5)";
            context.fillRect(this.body.pos.x, this.body.pos.y, this.spriteBounds.width, this.spriteBounds.height);
        }
    }
}
