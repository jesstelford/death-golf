import { Vector } from "./404-bc-pinball/math/vector";
import { Settings } from "./404-bc-pinball/settings";
import { Body } from "./404-bc-pinball/physic/body";
import { Shape } from "./404-bc-pinball/math/shape";
import { collider } from "./404-bc-pinball/physic/collisionEngine";
import { Assets } from "./404-bc-pinball/assets";

// Detect key presses up & down.
// Modified from https://xem.github.io/codegolf/keyspressed.html
var keysDown = {},
  keysUp = {};
onkeydown = (e) => e.repeat || (keysDown[e.key] = e.type[5]);
onkeyup = (e) => (keysUp[e.key] = e.type[5]);

let dragPos = new Vector(0, 0);
let dragStartPos = new Vector(0, 0);
let dragEndPos = new Vector(0, 0);

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
  dragEndPos = getDragPos(evt);
  keysUp["drag"] = true;
};

const c = window.a.getContext("2d");

const player = new Body(Settings.ballMass);
player.pos = new Vector(340, 400);
player.velocity = new Vector(100, 0);
player.shape = Assets.colliders[`ball.collider`];
player.bounciness = Settings.ballBounciness;
// TODO: Don't hard code this
player.shape = Shape.fromSvgData(
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
player.applyField(new Vector(0, Settings.gravity / player.invMass));
player.staticFrictionCoefficient = Settings.ballStaticFriction;
player.dynamicFrictionCoefficient = Settings.ballDynamicFriction;

const wall = new Body(1);
wall.shape = new Shape([
  new Vector(0, 0),
  new Vector(0, 50),
  new Vector(400, 50),
  new Vector(400, 0),
]);
// Infinite mass == immobile
wall.invMass = 0;
wall.pos = new Vector(340, 520);
wall.isRigid = true;
wall.bounciness = Settings.wallBounciness;

let shotAngle: number = 0.48;
let shots: number = 0;
let dragging: boolean = false;

const objects = [{ body: player }, { body: wall }];

const targetFrameTimeMs = 1;
var accumFrameTimeMs = 0;
var lastFrameMs = performance.now();

const loop = (thisFrameMs: number) => {
  requestAnimationFrame(loop);

  // Input
  // Started a drag
  if (keysDown["drag"]) {
    dragging = true;
  }

  if (keysUp["drag"]) {
    dragging = false;
    shots++;
    player.velocity = dragStartPos.subtract(dragEndPos);
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
    c.translate(objects[i].body.pos.x, objects[i].body.pos.y);
    c.beginPath();
    let verts = objects[i].body.shape.vertices;
    c.moveTo(verts[0].x, verts[0].y);
    for (let t = 1; t < verts.length; t++) {
      c.lineTo(verts[t].x, verts[t].y);
    }
    c.closePath();
    c.stroke();
    c.restore();
  }

  c.save();
  c.font = "28px sans";
  c.fillText(`shots: ${shots} angle: ${shotAngle}`, 10, 50);
  c.fillText(
    `drag: ${dragPos.x} ${dragPos.y}, dragStart: ${dragStartPos.x} ${dragStartPos.y}, dragEnd: ${dragEndPos.x} ${dragEndPos.y}`,
    10,
    80
  );
  c.restore();

  // Reset the key input now that we've read it
  keysDown = {};
  keysUp = {};
};

requestAnimationFrame(loop);
