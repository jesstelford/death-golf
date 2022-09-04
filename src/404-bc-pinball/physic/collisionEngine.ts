import { Body } from "../physic/body";
import { Shape } from "../math/shape";
import { Vector } from "../math/vector";

function resolve(body1: Body, body2: Body, mtv: Vector) {
  const normal = mtv.normal();
  const reaction1 = normal.dot(
    body1.speed.multiply(body1.bounciness * body2.bounciness)
  );
  const reaction2 = body2.isStatic
    ? 0
    : normal.dot(body2.speed.multiply(body1.bounciness * body2.bounciness));
  const reaction = reaction1 - reaction2;
  if (reaction < 0) {
    body1.applyImpulse(normal.multiply(-reaction));
    body1.translate(mtv);
  }
  return mtv.length();
}

function getSeparatingAxes(shape: Shape) {
  let axes = [];
  for (let i = 0; i < shape.vertices.length; i++) {
    const v1 = shape.vertices[i];
    const v2 = shape.vertices[(i + 1) % shape.vertices.length];
    const edge = v2.subtract(v1).normal();
    axes[i] = edge.tangent();
  }
  return axes;
}

function getOverlap(
  projection1: { min: number; max: number },
  projection2: { min: number; max: number }
) {
  if (projection1.max < projection2.min || projection2.max < projection1.min)
    return null;
  const min = Math.max(projection1.min, projection2.min);
  const max = Math.min(projection1.max, projection2.max);
  let sign = Math.sign(projection1.min - projection2.min);
  if (sign == 0) sign = Math.sign(projection1.max - projection2.max);
  return sign * (max - min);
}

function satCollide(shape1: Shape, shape2: Shape) {
  const axes = getSeparatingAxes(shape1).concat(getSeparatingAxes(shape2));
  let minVector: Vector = null;
  let minOverlap = null;
  for (let axe of axes) {
    const overlap = getOverlap(shape1.project(axe), shape2.project(axe));
    if (overlap != null) {
      if (minOverlap == null || Math.abs(overlap) < Math.abs(minOverlap)) {
        minOverlap = overlap;
        minVector = axe;
      }
    } else {
      return null;
    }
  }
  return minVector.multiply(minOverlap);
}

export class CollisionEngine {
  previousOverlap: { body1: any; body2: any };

  constructor() {
    this.previousOverlap = { body1: null, body2: null };
  }

  update(body1: Body, body2: Body) {
    if (body2.ignoreCollision) return;
    const normal = satCollide(body1.getShape(), body2.getShape());
    if (normal != null) {
      if (body2.onCollision != undefined) body2.onCollision(normal);
      if (body2.isRigid) {
        const speed = resolve(body1, body2, normal);
        if (body2.onCollisionResolved != undefined)
          body2.onCollisionResolved(speed);
      } else {
        if (
          this.previousOverlap.body1 == null &&
          this.previousOverlap.body2 == null &&
          body2.onAreaEnter
        ) {
          body2.onAreaEnter();
        }
        this.previousOverlap.body1 = body1;
        this.previousOverlap.body2 = body2;
      }
    }
    if (
      normal == null &&
      this.previousOverlap.body1 == body1 &&
      this.previousOverlap.body2 == body2
    ) {
      if (body2.onAreaExit) body2.onAreaExit();
      this.previousOverlap.body1 = null;
      this.previousOverlap.body2 = null;
    }
  }
}
