import type { Body } from "../physic/body";
import type { Shape } from "../math/shape";
import type { Vector } from "../math/vector";

function resolveWithFriction(
  A: Body,
  B: Body,
  normal: Vector,
  distance: number
) {
  normal = normal.multiply(-1);

  // ---
  // Floating Point / "Sinking objects" correctionn
  // ---
  // correct positions to stop objects sinking into each other
  // .8 = poscorrectionrate = percentage of separation to project objects
  // .01 = "slop" which prevents objects jittering back and forth from constant
  // correction. Any penetration below this is considered "ok" and ignored
  const correctionAmount = normal.multiply(
    (Math.max(distance - 0.01, 0) / (A.invMass + B.invMass)) * 0.8
  );

  A.translate(correctionAmount.multiply(-A.invMass));
  B.translate(correctionAmount.multiply(B.invMass));

  // ---
  // Collision resolution via Impulse
  // ---

  // Calculate relative velocity
  let relativeVelocity = B.velocity.subtract(A.velocity);

  // Calculate relative velocity in terms of the normal direction
  const velAlongNormal = relativeVelocity.dot(normal);

  //console.log({ mtv: normal, rv: relativeVelocity, normal, velAlongNormal });

  // Do not resolve if velocities are separating
  if (velAlongNormal > 0) {
    return;
  }

  // Calculate restitution
  const e = Math.min(A.bounciness, B.bounciness);

  // Calculate impulse scalar
  const impulseMagnitude =
    (-(1 + e) * velAlongNormal) / (A.invMass + B.invMass);

  const velocityBefore = A.velocity;

  // Apply impulse
  let impulse = normal.multiply(impulseMagnitude);
  A.velocity = A.velocity.subtract(impulse.multiply(A.invMass));
  B.velocity = B.velocity.add(impulse.multiply(B.invMass));

  // ---
  // Friction
  // ---
  relativeVelocity = B.velocity.subtract(A.velocity);

  // Solve for the tangent vector
  const tangentDirection = relativeVelocity.subtract(
    normal.multiply(relativeVelocity.dot(normal))
  );

  // When two objects are colliding head-on, there's no friction, only
  // separating impulse.
  if (!tangentDirection.length()) {
    return distance;
  }

  const tangent = tangentDirection.normal();

  // Solve for magnitude to apply along the friction vector
  let impulseTangentMagnitude =
    relativeVelocity.dot(tangent) / (A.invMass + B.invMass);

  // By Coulomb's Law, static friction applies until the threshold of
  // staticFrictionCoefficient * jN is met. At that point (traction),
  // dynamic friction takes over, which is a smaller coefficient, and uses a
  // slightly different algorithm.
  // NOTE: We're comparing magnitudes here, so need to Math.abs(jT) so we've
  // got a positive number to compare to the positive jN value.
  // NOTE2: A coefficient of static friction must be chosen. Here, we naively
  // pick the smallest. Another option is to pick a pythagorian average:
  // Math.sqrt(s1.s * s1.s + s2.s * s2.s).
  if (
    impulseTangentMagnitude >=
    impulseMagnitude *
      Math.min(A.staticFrictionCoefficient, B.staticFrictionCoefficient)
  ) {
    // NOTE: A coefficient of dynamic friction must be chosen. Here, we
    // naively pick the smallest. Another option is to pick a pythagorian
    // average:
    // Math.sqrt(s1.F * s1.F + s2.F * s2.F).
    impulseTangentMagnitude =
      impulseMagnitude *
      Math.min(A.dynamicFrictionCoefficient, B.dynamicFrictionCoefficient);
  }

  // impulse is from s1 to s2 (in opposite direction of velocity)
  impulse = tangent.multiply(-impulseTangentMagnitude);
  A.velocity = A.velocity.subtract(impulse.multiply(A.invMass));
  B.velocity = B.velocity.add(impulse.multiply(B.invMass));

  /*
  console.log({
    e,
    j: impulseMagnitude,
    impulse,
    invMass: A.invMass,
    velocityBefore,
    velocity: A.velocity,
  });
  */

  return distance;
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
      return [];
    }
  }
  return [minVector, minOverlap];
}

export function collider(body1: Body, body2: Body) {
  if (body2.ignoreCollision) return;
  const [normal, distance] = satCollide(body1.getShape(), body2.getShape());
  if (normal != null) {
    if (body2.onCollision != undefined)
      body2.onCollision(normal.multiply(distance));
    if (body2.isRigid) {
      const speed = resolveWithFriction(body1, body2, normal, distance);
      if (body2.onCollisionResolved != undefined)
        body2.onCollisionResolved(speed);
    }
  }
}
