import { Vector } from "../math/vector";

var computeAxes = (vertices: Vector[], i?) => {
  let output = [];
  // normal of each face toward outside of shape
  for (i = 0; i < vertices.length; i++) {
    output[i] = vertices[(i + 1) % vertices.length]
      .subtract(vertices[i])
      .normal()
      .tangent();
  }
  return output;
};

// Must be "resting" for this many update calls.
const restedFramesMask = 0b1111111111111111111111111111;

// From: https://stackoverflow.com/a/69761527
function calculatePolygonCentroid(points: Vector[]) {
  //Correction for very small polygons:
  const x0 = points[0].x,
    y0 = points[0].y;

  let x = 0,
    y = 0,
    twiceArea = 0;

  let prev = points[points.length - 1];
  for (const next of points) {
    const x1 = prev.x - x0,
      y1 = prev.y - y0,
      x2 = next.x - x0,
      y2 = next.y - y0,
      a = x1 * y2 - x2 * y1;

    twiceArea += a;
    x += (x1 + x2) * a;
    y += (y1 + y2) * a;

    prev = next;
  }

  const factor = 3 * twiceArea; // 6 * twiceArea/2
  x /= factor;
  y /= factor;

  return new Vector(x + x0, y + y0);
}

export class Body {
  // variables
  pos: Vector;
  velocity: Vector;
  field: Vector;

  // constants
  invMass: number;
  // Separating axes.
  // Ie; Normal of each face toward outside of shape.
  // NOTE: Must be updated when vertices are updated so that their positions
  // relative to eachother change (such as rotated)
  // NOTE2: Doesn't need to be updated when translated (the axes are based on
  // position of vertices relative to eachother)
  axes: Vector[] = [];
  vertices: Vector[] = [];
  centerOfMass: Vector;
  drag: number;
  bounciness: number;
  staticFrictionCoefficient: number;
  dynamicFrictionCoefficient: number;
  restThreshold: number;
  kind: string;

  _restFrames: number;

  onCollision: (otherBody: Body, speed?: number) => void;

  render: (context: CanvasRenderingContext2D) => void;

  constructor(mass: number, vertices: Vector[]) {
    this.velocity = Vector.z();
    this.invMass = mass === 0 ? 0 : 1 / mass;
    this.pos = calculatePolygonCentroid(vertices);
    this.vertices = vertices.map((v) => v.subtract(this.pos));
    this.axes = computeAxes(this.getVertices());
    this.field = Vector.z();
    this.bounciness = 1;
    this.drag = 0.05;
    this.staticFrictionCoefficient = 1;
    this.dynamicFrictionCoefficient = 1;
    this.restThreshold = 2;
    this.onCollision = (_, __) => {};
    this.render = (_) => {};

    this._restFrames = 0;
  }

  applyField(force: Vector) {
    this.field = this.field.add(force);
  }

  project(vector: Vector) {
    return this.getVertices().reduce(
      (minMax, vertice) => {
        const value = vertice.dot(vector);
        if (value < minMax.min) minMax.min = value;
        if (value > minMax.max) minMax.max = value;
        return minMax;
      },
      { min: Infinity, max: -Infinity }
    );
  }

  rotate(center: Vector, angle: number) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    this.vertices = this.vertices.map((vertex) => vertex.rotate(c, s, center));
    this.axes = computeAxes(this.getVertices());
  }

  translate(vector: Vector) {
    this.pos = this.pos.add(vector);
    this.axes = computeAxes(this.getVertices());
  }

  getVertices() {
    return this.vertices.map((v) => v.add(this.pos));
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
