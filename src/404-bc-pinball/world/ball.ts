import { Vector } from "../math/vector";
import { Shape } from "../math/shape";
import { Settings } from "../settings";
import { Entity } from "./entity";

export class Ball extends Entity {
  initialPosition: Vector;

  constructor() {
    super(
      "ball",
      // TODO: Don't hard code this
      new Vector(560, 600),
      Settings.ballBounciness,
      Settings.ballMass
    );
    // TODO: Don't hard code this
    this.body.shape = Shape.fromSvgData(
      "l-3 3-3 2.2-3 1.3-4 .3-4-.6-3-1.6-3-2.5-3-3.1-1-3.6v-7.6l2-3.4 2-3 4-2.2 3-1.3 4-.3 4 .6 3 1.6 3 2.5 2 3.1 2 3.6v3.8l-1 3.8z",
      {
        x: 0,
        y: 0,
        height: 0,
        width: 0,
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        toJSON: () => "",
      }
    );
    this.initialPosition = this.body.pos;
    this.body.isStatic = false;
    this.body.applyField(new Vector(0, this.body.mass * Settings.gravity));
  }

  reset() {
    this.body.pos = this.initialPosition;
  }

  up(delta: number) {
    this.body.update(delta);
  }
}
