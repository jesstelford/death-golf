import { Vector } from "../math/vector";
import { Shape } from "../math/shape";

const restedFramesMask = 0b11111;

export class Body {
  // variables
  pos: Vector;
  velocity: Vector;
  field: Vector;

  // constants
  invMass: number;
  shape: Shape;
  drag: number;
  bounciness: number;
  staticFrictionCoefficient: number;
  dynamicFrictionCoefficient: number;
  restThreshold: number;

  _restFrames: number;

  onCollision: (mtv: Vector) => void;
  onCollisionResolved: (speed: number) => void;

  constructor(mass: number) {
    this.pos = Vector.z();
    this.velocity = Vector.z();
    this.invMass = mass === 0 ? 0 : 1 / mass;
    this.shape = null;
    this.field = Vector.z();
    this.bounciness = 1;
    this.drag = 0.05;
    this.staticFrictionCoefficient = 0.04;
    this.dynamicFrictionCoefficient = 0.02;
    this.restThreshold = 1;

    this._restFrames = 0;
  }

  hFlip(axe: number) {
    this.shape = this.shape.hFlip(axe);
  }

  applyField(force: Vector) {
    this.field = this.field.add(force);
  }

  rotate(center: Vector, angle: number) {
    this.shape.rotate(center, angle);
  }

  translate(vector: Vector) {
    this.pos = this.pos.add(vector);
  }

  getShape() {
    return new Shape(this.shape.vertices.map((v) => v.add(this.pos)));
  }

  isResting() {
    // Apply the bit mask (to remove any old "frame" bits).
    // Then check to see if all the bits are set.
    // If so, then it counts as having reached "rest"
    return (this._restFrames & restedFramesMask) === restedFramesMask;
  }

  update(delta: number) {
    this.velocity = this.velocity.add(
      this.field.multiply(this.invMass * delta)
    );
    this.translate(this.velocity.multiply(delta));
    // Apply linear damping to simulate air friction
    this.velocity = this.velocity.multiply(1 / (1 + this.drag * delta));

    // Left shift by 1 per update
    this._restFrames <<= 1;
    if (this.velocity.length() < this.restThreshold) {
      // Set the lowest bit to represent that it's resting this frame
      this._restFrames += 1;
    }
  }
}
