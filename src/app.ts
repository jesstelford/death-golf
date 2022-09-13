import { Vector } from "./404-bc-pinball/math/vector";
import { Body } from "./404-bc-pinball/physic/body";
import { collider } from "./404-bc-pinball/physic/collisionEngine";
import { simplify } from "./poly-simplify";
import { quickDecomp, makeCCW } from "./poly-decomp";

// Constants
const WALL_BOUNCINESS = 3;
const HOLE_DETECTOR_BOUNCINESS = 0;
const BALL_MASS = 20;
const BALL_RADIUS = 5;
const BALL_BOUNCINESS = 0.3;
const BALL_STATIC_FRICTION = 0.3;
const BALL_DYNAMIC_FRICTION = 0.2;
const GRAVITY = 980; // 9.8m2/s

const canvas = window.a;

// Detect key presses up & down.
// Modified from https://xem.github.io/codegolf/keyspressed.html
var keysDown = {},
  keysUp = {};
onkeydown = (e) => e.repeat || (keysDown[e.key] = e.type[5]);
onkeyup = (e) => (keysUp[e.key] = e.type[5]);

let dragPos = new Vector(0, 0);
let dragStartPos = new Vector(0, 0);

const getDragPos = (evt) => {
  var rect = canvas.getBoundingClientRect();
  return new Vector(
    ((evt.clientX - rect.left) / (rect.right - rect.left)) * canvas.width,
    ((evt.clientY - rect.top) / (rect.bottom - rect.top)) * canvas.height
  );
};

// TODO: debounce this?
canvas.onmousemove = (evt) => {
  dragPos = getDragPos(evt);
};

canvas.onmousedown = (evt) => {
  dragStartPos = getDragPos(evt);
  keysDown["drag"] = true;
};

canvas.onmouseup = (evt) => {
  keysUp["drag"] = true;
};

const c = canvas.getContext("2d");
if (window.devicePixelRatio > 1) {
  var canvasWidth = canvas.width;
  var canvasHeight = canvas.height;

  canvas.width = canvasWidth * window.devicePixelRatio;
  canvas.height = canvasHeight * window.devicePixelRatio;
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";

  c.scale(window.devicePixelRatio, window.devicePixelRatio);
}

function strokeRenderer(c: CanvasRenderingContext2D) {
  c.beginPath();
  let verts = this.getVertices();
  c.moveTo(verts[0].x, verts[0].y);
  for (let t = 1; t < verts.length; t++) {
    c.lineTo(verts[t].x, verts[t].y);
  }
  c.closePath();
  c.stroke();
}

const player = new Body(
  BALL_MASS,
  // An approximation of a circle in 32 points
  [...Array(32)].map(
    (r, i) => (
      // anti-clockwise
      (r = (-i * 2 * Math.PI) / 32),
      new Vector(0, BALL_RADIUS).rotate(Math.cos(r), Math.sin(r))
    )
  )
);
player.onCollision = (otherBody: Body) => {
  if (otherBody.kind === "holeDetector") {
    console.log("collided with hole");
  }
};
player.render = strokeRenderer;
player.pos = new Vector(140, 40);
player.velocity = new Vector(100, 0);
player.bounciness = BALL_BOUNCINESS;
player.applyField(new Vector(0, GRAVITY / player.invMass));
player.staticFrictionCoefficient = BALL_STATIC_FRICTION;
player.dynamicFrictionCoefficient = BALL_DYNAMIC_FRICTION;
player.kind = "player";

// zero mass == immobile
const wall = new Body(
  0,
  // anti-clockwise
  [new Vector(0, 0), new Vector(0, 50), new Vector(400, 50), new Vector(400, 0)]
);
wall.pos = new Vector(340, 520);
wall.bounciness = WALL_BOUNCINESS;
wall.render = strokeRenderer;
wall.kind = "wall";

function createHoleDetector() {
  // TODO: Needs to be a hole with sides, etc
  const hole = new Body(
    0,
    // anti-clockwise
    [
      new Vector(0, 0),
      new Vector(0, 200),
      new Vector(20, 200),
      new Vector(20, 0),
    ]
  );
  hole.pos = new Vector(540, 315);
  hole.bounciness = HOLE_DETECTOR_BOUNCINESS;
  hole.render = strokeRenderer;
  hole.kind = "holeDetector";
  return hole;
}
const holeDetector = createHoleDetector();

function createFromSVG() {
  let player;
  // For each child of the svg
  return {
    player,
    objects: Array.from(document.querySelectorAll("svg > *")).flatMap(
      (el: SVGGeometryElement) => {
        let verts: Array<{ x: number; y: number }> = [
          ...Array(Math.ceil(el.getTotalLength())),
        ].map(
          // Grab the coordinates of the point from the browser (relative to the
          // svg's viewBox, I think)
          (_, i) => el.getPointAtLength(i)
        );

        // The collision geometry is a simplified version
        const simplifiedLine = simplify(
          verts,
          // Because we scale the canvas, we want our threshold to be small enough
          // that it matches real display pixels, not "world" pixels
          1 / window.devicePixelRatio
        );

        //const path2D = new Path2D(el.getAttribute("d"));

        // Create a new shape per convex thingo
        return quickDecomp(simplifiedLine.map(({ x, y }) => [x, y])).map(
          (convexVerts) => {
            const body = new Body(
              0,
              // anti-clockwise
              convexVerts.map(([x, y]) => new Vector(x, y))
            );
            body.bounciness = WALL_BOUNCINESS;
            body.render = strokeRenderer;
            body.kind = "convex-decomp";
            return body;
          }
        );
      }
    ),
  };
}

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

const svgObjects = createFromSVG();
const objects = [wall, holeDetector, ...svgObjects.objects];

const targetFrameTimeMs = 1;
var accumFrameTimeMs = 0;
var lastFrameMs = performance.now();

const clearCanvas = (c: CanvasRenderingContext2D) => {
  // Clear the canvas: https://stackoverflow.com/a/6722031
  // Store the current transformation matrix, so we can clear the whole thing
  // without worrying about any transforms, etc, that have been applied
  c.save();

  // Use the identity matrix while clearing the canvas
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.clearRect(0, 0, canvas.width, canvas.height);

  // Restore the transform
  c.restore();
};

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
    for (let i = objects.length; i--; ) {
      collider(player, objects[i]);
    }
  }

  // Drawing
  // -------
  clearCanvas(c);

  c.save();

  // avoid antialiasing by drawing directly in the middle of pixels
  c.translate(0.5, 0.5);

  // Draw all the objects in the world
  c.save();
  player.render(c);
  c.restore();

  for (let i = objects.length; i--; ) {
    c.save();
    objects[i].render(c);
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
  c.restore();

  // Reset the key input now that we've read it
  keysDown = {};
  keysUp = {};
};

requestAnimationFrame(loop);
