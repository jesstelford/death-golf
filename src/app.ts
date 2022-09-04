import { Ball } from "./404-bc-pinball/world/ball";
//import { StaticElement } from "./404-bc-pinball/world/staticElement";
import { Vector } from "./404-bc-pinball/math/vector";
import { Settings } from "./404-bc-pinball/settings";
import { Body } from "./404-bc-pinball/physic/body";
import { Shape } from "./404-bc-pinball/math/shape";
import { collider } from "./404-bc-pinball/physic/collisionEngine";

const c = window.a.getContext("2d");

const player = new Ball();
player.body.pos = new Vector(340, 400);
player.body.velocity = new Vector(100, 0);

const wall = new Body(1);

const objects = [player, { body: wall }];

wall.shape = new Shape([
  new Vector(0, 0),
  new Vector(0, 50),
  new Vector(400, 50),
  new Vector(400, 0),
]);
// Infinite mass == immobile
wall.invMass = 0;
wall.pos = new Vector(340, 720);
wall.isRigid = true;
wall.bounciness = Settings.wallBounciness;

const targetFrameTimeMs = 1;
var accumFrameTimeMs = 0;
var lastFrameMs = performance.now();

const loop = (thisFrameMs: number) => {
  requestAnimationFrame(loop);

  accumFrameTimeMs += thisFrameMs - lastFrameMs;
  lastFrameMs = thisFrameMs;

  while (accumFrameTimeMs > targetFrameTimeMs) {
    accumFrameTimeMs -= targetFrameTimeMs;
    // Do updates based on targetFrameTimeMs ms passing
    player.up(targetFrameTimeMs / 1000);
    collider(player.body, wall);
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
};

requestAnimationFrame(loop);
