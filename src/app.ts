import { Vector } from "./404-bc-pinball/math/vector";
import { Body } from "./404-bc-pinball/physic/body";
import { Shape } from "./404-bc-pinball/math/shape";
import { collider } from "./404-bc-pinball/physic/collisionEngine";

// Constants
const WALL_BOUNCINESS = 30000;
const BALL_MASS = 20;
const BALL_RADIUS = 10;
const BALL_BOUNCINESS = 0.6;
const BALL_STATIC_FRICTION = 0.04;
const BALL_DYNAMIC_FRICTION = 0.02;
const GRAVITY = 1000;

// Detect key presses up & down.
// Modified from https://xem.github.io/codegolf/keyspressed.html
var keysDown = {},
  keysUp = {};
onkeydown = (e) => e.repeat || (keysDown[e.key] = e.type[5]);
onkeyup = (e) => (keysUp[e.key] = e.type[5]);

let dragPos = new Vector(0, 0);
let dragStartPos = new Vector(0, 0);

const getDragPos = (evt) => {
  var rect = window.a.getBoundingClientRect();
  return new Vector(
    ((evt.clientX - rect.left) / (rect.right - rect.left)) * window.a.width,
    ((evt.clientY - rect.top) / (rect.bottom - rect.top)) * window.a.height
  );
};

// TODO: debounce this?
window.a.onmousemove = (evt) => {
  dragPos = getDragPos(evt);
};

window.a.onmousedown = (evt) => {
  dragStartPos = getDragPos(evt);
  keysDown["drag"] = true;
};

window.a.onmouseup = (evt) => {
  keysUp["drag"] = true;
};

const c = window.a.getContext("2d");

const player = new Body(BALL_MASS);
player.pos = new Vector(340, 400);
player.velocity = new Vector(100, 0);
player.bounciness = BALL_BOUNCINESS;
player.shape = new Shape(
  // An approximation of a circle in 32 points
  [...Array(32)].map(
    (r, i) => (
      (r = (i * 2 * Math.PI) / 32),
      new Vector(0, BALL_RADIUS).rotate(Math.cos(r), Math.sin(r))
    )
  )
);
player.applyField(new Vector(0, GRAVITY / player.invMass));
player.staticFrictionCoefficient = BALL_STATIC_FRICTION;
player.dynamicFrictionCoefficient = BALL_DYNAMIC_FRICTION;

// zero mass == immobile
const wall = new Body(0);
wall.shape = new Shape([
  new Vector(0, 0),
  new Vector(0, 50),
  new Vector(400, 50),
  new Vector(400, 0),
]);
wall.pos = new Vector(340, 520);
wall.isRigid = true;
wall.bounciness = WALL_BOUNCINESS;

let dragging: boolean = false;
let shots: number = 0;

// Measured in pixels
const minDragDistance = 20;
const maxDragDistance = 220;
let dragVector = new Vector(0, 0);

// Measured in meters/sec
const minShotSpeed = 20;
const maxShotSpeed = 820;
let shotSpeed: number = 0;

const updateShotFromDrag = () => {
  // The relative vector from start to end dragging positions (ie; mouse /
  // touch)
  dragVector = dragStartPos.subtract(dragPos);
  // The distance dragged, clamped to a maximum value
  const dragDistance = Math.min(dragVector.length(), maxDragDistance);
  if (dragDistance < minDragDistance) {
    // If the threshold wasn't reached, then no updates are necessary
    // This is to avoid accidental taps / clicks from firing a shot
    shotSpeed = 0;
  } else {
    shotSpeed =
      // Project the dragged distance onto the shot speed range. Ie; scale the
      // drag distance as a percentage of the shot speed range.
      (dragDistance / (maxDragDistance - minDragDistance)) *
        (maxShotSpeed - minShotSpeed) +
      // And add back in the minimum shot speed since we passed the threshold
      minShotSpeed;
  }
};

const objects = [player, wall];

const targetFrameTimeMs = 1;
var accumFrameTimeMs = 0;
var lastFrameMs = performance.now();

const loop = (thisFrameMs: number) => {
  requestAnimationFrame(loop);

  // Input
  // Started a drag
  if (keysDown["drag"]) {
    if (player.isResting()) {
      dragging = true;
    }
  }

  if (keysDown["k"]) {
    player.velocity = new Vector(0, -500);
  }

  if (dragging) {
    // The ball has started moving again since the drag started, so we cancel it
    if (!player.isResting()) {
      dragging = false;
    } else {
      updateShotFromDrag();
    }
  }

  if (keysUp["drag"]) {
    // Dragging can be virtually cancelled mid-drag (eg; by the ball being
    // knocked out of rest), so we have to check if dragging is still occuring
    // or not before allowing a shot.
    // NOTE: It's important we check dragging here, and not the player's resting
    // state because it could have become rested again while the user holds the
    // drag action. We want them to stop dragging and re-drag to setup a new
    // shot.
    if (dragging) {
      dragging = false;
      if (shotSpeed) {
        shots++;
        player.velocity = dragVector.normal().multiply(shotSpeed);
      }
    }
  }

  // Physics updates
  accumFrameTimeMs += thisFrameMs - lastFrameMs;
  lastFrameMs = thisFrameMs;
  while (accumFrameTimeMs > targetFrameTimeMs) {
    accumFrameTimeMs -= targetFrameTimeMs;
    // Do updates based on targetFrameTimeMs ms passing
    player.update(targetFrameTimeMs / 1000);
    collider(player, wall);
  }

  // Drawing
  window.a.width ^= 0;
  for (let i = objects.length; i--; ) {
    c.save();
    c.translate(objects[i].pos.x, objects[i].pos.y);
    c.beginPath();
    let verts = objects[i].shape.vertices;
    c.moveTo(verts[0].x, verts[0].y);
    for (let t = 1; t < verts.length; t++) {
      c.lineTo(verts[t].x, verts[t].y);
    }
    c.closePath();
    c.stroke();
    c.restore();
  }

  if (dragging) {
    const shot = dragVector.normal().multiply(shotSpeed);
    // Render the expected velocity vector
    c.save();
    c.translate(player.pos.x, player.pos.y);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(shot.x, shot.y);
    c.closePath();
    c.stroke();
    c.restore();
  }

  c.save();
  c.font = "28px sans";
  if (player.isResting()) {
    c.fillText(`resting`, 10, 20);
  }
  c.fillText(`shots: ${shots}`, 10, 50);
  if (dragging) {
    c.fillText(
      `drag: ${dragPos.x} ${dragPos.y}, dragStart: ${dragStartPos.x} ${dragStartPos.y}`,
      10,
      80
    );
  }
  c.restore();

  // Reset the key input now that we've read it
  keysDown = {};
  keysUp = {};
};

requestAnimationFrame(loop);
