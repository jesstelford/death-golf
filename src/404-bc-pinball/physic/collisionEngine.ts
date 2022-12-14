import type { Body } from "../physic/body";
import type { Vector } from "../math/vector";

type Resolution = { translate: Vector; impulse?: Vector };

function calculateCollisionResolutionWithFriction(
  A: Body,
  B: Body,
  normal: Vector,
  distance: number
): [Resolution, Resolution] {
  normal = normal.multiply(-1);

  // ---
  // Floating Point / "Sinking objects" correction
  // ---
  // correct positions to stop objects sinking into each other
  // .8 = poscorrectionrate = percentage of separation to project objects
  // .01 = "slop" which prevents objects jittering back and forth from constant
  // correction. Any penetration below this is considered "ok" and ignored
  const correctionAmount = normal.multiply(
    (Math.max(distance - 0.01, 0) / (A.invMass + B.invMass)) * 0.8
  );

  const resultA: Resolution = {
    translate: correctionAmount.multiply(-A.invMass),
  };
  const resultB: Resolution = {
    translate: correctionAmount.multiply(B.invMass),
  };

  // ---
  // Collision resolution via Impulse
  // ---

  // Calculate relative velocity
  let relativeVelocity = B.velocity.subtract(A.velocity);

  // Calculate relative velocity in terms of the normal direction
  const velAlongNormal = relativeVelocity.dot(normal);

  // No impulse if velocities are separating
  if (velAlongNormal > 0) {
    return [resultA, resultB];
  }

  // Calculate restitution
  const e = Math.min(A.bounciness, B.bounciness);

  // Calculate impulse scalar
  const impulseMagnitude =
    (-(1 + e) * velAlongNormal) / (A.invMass + B.invMass);

  // Calculate impulse
  let impulse = normal.multiply(impulseMagnitude);
  resultA.impulse = impulse.multiply(-A.invMass);
  resultB.impulse = impulse.multiply(B.invMass);

  const newVelA = A.velocity.add(resultA.impulse);
  const newVelB = B.velocity.add(resultB.impulse);

  // ---
  // Friction
  // ---
  // Calculate the relative velociy _after_ collision resolution impulses have
  // been applied, which allows us to calculate friction of the two objects
  // which are now separated / just touching.
  relativeVelocity = newVelB.subtract(newVelA);

  // Solve for the tangent vector
  const tangentDirection = relativeVelocity.subtract(
    normal.multiply(relativeVelocity.dot(normal))
  );

  // When two objects are colliding head-on, there's no friction, only
  // separating impulse.
  if (tangentDirection.length()) {
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

    resultA.impulse = resultA.impulse.add(impulse.multiply(-A.invMass));
    resultB.impulse = resultB.impulse.add(impulse.multiply(B.invMass));
  }

  return [resultA, resultB];
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

function satCollide(body1: Body, body2: Body): [Vector?, number?] {
  const axes = body1.axes.concat(body2.axes);
  let minVector: Vector = null;
  let minOverlap = -Infinity;
  for (let axe of axes) {
    const overlap = getOverlap(body1.project(axe), body2.project(axe));
    if (overlap == null) {
      return [];
    }
    if (Math.abs(overlap) < Math.abs(minOverlap)) {
      minOverlap = overlap;
      minVector = axe;
    }
  }
  if (Math.sign(minOverlap) === -1) {
    minOverlap *= -1;
    minVector = minVector.multiply(-1);
  }
  return [minVector, minOverlap];
}

export function collider(body1: Body, body2: Body) {
  const [normal, distance] = satCollide(body1, body2);
  if (normal != null) {
    const [resolution1, resolution2] = calculateCollisionResolutionWithFriction(
      body1,
      body2,
      normal,
      distance
    );

    body1.translate(resolution1.translate);
    body2.translate(resolution2.translate);

    if (resolution1.impulse || resolution2.impulse) {
      body1.velocity = body1.velocity.add(resolution1.impulse);
      body2.velocity = body2.velocity.add(resolution2.impulse);
      body1.onCollision(body2, distance);
    }
  }
}
