import { Vector } from "./404-bc-pinball/math/vector";
import { Body } from "./404-bc-pinball/physic/body";
import { collider } from "./404-bc-pinball/physic/collisionEngine";
import { simplify } from "./poly-simplify";
import { quickDecomp, makeCCW } from "./poly-decomp";

// Constants
const BALL_RADIUS = 5;
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

const setCanvasDimensions = () => {
  var canvasWidth = window.innerWidth;
  var canvasHeight = window.innerHeight;
  canvas.width = canvasWidth * window.devicePixelRatio;
  canvas.height = canvasHeight * window.devicePixelRatio;
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";
  c.scale(window.devicePixelRatio, window.devicePixelRatio);
};
setCanvasDimensions();
window.addEventListener("resize", setCanvasDimensions);

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

function fillRenderer(c: CanvasRenderingContext2D) {
  c.beginPath();
  let verts = this.getVertices();
  c.moveTo(verts[0].x, verts[0].y);
  for (let t = 1; t < verts.length; t++) {
    c.lineTo(verts[t].x, verts[t].y);
  }
  c.closePath();
  c.fill();
  c.lineJoin = "bevel";
  c.stroke();
}

function svgToVertices(el: SVGGeometryElement) {
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

  // Create a set of vertices per convex thingo
  return quickDecomp(simplifiedLine.map(({ x, y }) => [x, y])).map(
    (convexVerts) => convexVerts.map(([x, y]) => new Vector(x, y))
  );
}

const defaultsByKind = {
  wall: {
    mass: 0,
    bounciness: 3,
    staticFriction: 1,
    dynamicFriction: 1,
  },
  ball: {
    mass: 20,
    bounciness: 0.3,
    staticFriction: 0.3,
    dynamicFriction: 0.2,
  },
  hole: {
    mass: 0,
    bounciness: 0,
    staticFriction: 1,
    dynamicFriction: 1,
  },
};

function loadFromSVG(selector) {
  const bodies = Array.from(
    document.querySelectorAll(`${selector} > *`)
  ).flatMap((el) =>
    svgToVertices(el).map((verts) => {
      const body = new Body(verts);
      const kind = el.dataset.kind ?? "wall";
      const config = Object.assign({}, defaultsByKind[kind], el.dataset);
      if (+config.mass) {
        body.setMass(+config.mass);
        body.applyField(new Vector(0, GRAVITY / body.invMass));
      }
      body.bounciness = +config.bounciness;
      body.staticFrictionCoefficient = +config.staticFriction;
      body.dynamicFrictionCoefficient = +config.dynamicFriction;
      body.render = fillRenderer;
      body.kind = kind;
      return body;
    })
  );

  const holeIndex = bodies.findIndex(({ kind }) => kind === "hole");
  if (holeIndex === -1) {
    throw new Error(`Couldn't detect kind="hole" in level`);
  }
  const hole = bodies.splice(holeIndex, 1)[0];
  hole.render = strokeRenderer;

  const playerIndex = bodies.findIndex(({ kind }) => kind === "ball");
  if (playerIndex === -1) {
    throw new Error(`Couldn't detect kind="ball" in level`);
  }
  const player = bodies.splice(playerIndex, 1)[0];
  player.render = strokeRenderer;
  player.onCollision = (otherBody: Body) => {
    if (otherBody.kind === "hole") {
      console.log("collided with hole");
    }
  };

  return [player, hole, bodies];
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
const shotRange = maxShotSpeed - minShotSpeed;
let shotSpeed: number = 0;
let shotAngle: number = 0;

const updateShotFromDrag = () => {
  // The relative vector from start to end dragging positions (ie; mouse /
  // touch)
  dragVector = dragStartPos.subtract(dragPos);

  // Yes, y comes first: https://mdn.io/math.atan2
  shotAngle = Math.atan2(dragVector.y, dragVector.x);

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
      (dragDistance / (maxDragDistance - minDragDistance)) * shotRange +
      // And add back in the minimum shot speed since we passed the threshold
      minShotSpeed;
  }
};

// TODO: level based selector
const [player, hole, bodies] = loadFromSVG("svg");

// TODO: Do we want to treat the hole separately?
bodies.push(hole);

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

function renderShotMeter(size, angle, radius) {
  const scaleFactor = 8;
  const scaledSize = size / scaleFactor;
  // Render the expected velocity vector
  c.save();
  c.translate(player.pos.x, player.pos.y);
  c.rotate(angle - Math.PI / 2);
  c.beginPath();
  c.moveTo(0, -scaledSize);
  const arcAngle = Math.acos(radius / scaledSize);
  c.arc(0, 0, radius, arcAngle - Math.PI / 2, -arcAngle - Math.PI / 2);
  c.lineTo(0, -scaledSize);
  c.closePath();
  const gradient = c.createLinearGradient(0, 0, 0, maxShotSpeed / -scaleFactor);
  gradient.addColorStop(0, "white");
  gradient.addColorStop(1, "red");
  c.fillStyle = gradient;
  c.fill();
  c.stroke();
  c.restore();
}

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
    for (let i = bodies.length; i--; ) {
      collider(player, bodies[i]);
    }
  }

  // Drawing
  // -------
  clearCanvas(c);

  c.save();

  // avoid antialiasing by drawing directly in the middle of pixels
  c.translate(0.5, 0.5);

  // Draw all the objects in the world
  for (let i = bodies.length; i--; ) {
    c.save();
    bodies[i].render(c);
    c.restore();
  }

  if (dragging && shotSpeed) {
    renderShotMeter(shotSpeed, shotAngle, BALL_RADIUS * 2);
  }

  // Player should be drawn on top of everything
  c.save();
  player.render(c);
  c.restore();

  c.save();
  c.font = "28px sans";
  if (player.isResting()) {
    c.fillText(`resting`, 10, 20);
  }
  c.fillText(`shots: ${shots}`, 10, 50);
  c.restore();
  c.restore();

  // Reset the key input now that we've read it
  keysDown = {};
  keysUp = {};
};

requestAnimationFrame(loop);
