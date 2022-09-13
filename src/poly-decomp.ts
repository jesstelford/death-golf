// Code in this file is a modified form of (MIT):
// https://github.com/schteppe/poly-decomp.js/blob/42e6224520150b78dd89f26c02bc997be17e9d0c/src/index.js
// Which is originally from:
// https://mpen.ca/406/bayazit

type Vertex = [number, number];

/**
 * Checks if two line segments intersects.
 * @method segmentsIntersect
 * @param {Array} p1 The start vertex of the first line segment.
 * @param {Array} p2 The end vertex of the first line segment.
 * @param {Array} q1 The start vertex of the second line segment.
 * @param {Array} q2 The end vertex of the second line segment.
 * @return {Boolean} True if the two line segments intersect
 */
function lineSegmentsIntersect(
  p1: Vertex,
  p2: Vertex,
  q1: Vertex,
  q2: Vertex
): Boolean {
  var dx = p2[0] - p1[0];
  var dy = p2[1] - p1[1];
  var da = q2[0] - q1[0];
  var db = q2[1] - q1[1];

  // segments are parallel
  if (da * dy - db * dx === 0) {
    return false;
  }

  var s = (dx * (q1[1] - p1[1]) + dy * (p1[0] - q1[0])) / (da * dy - db * dx);
  var t = (da * (p1[1] - q1[1]) + db * (q1[0] - p1[0])) / (db * dx - da * dy);

  return s >= 0 && s <= 1 && t >= 0 && t <= 1;
}

/**
 * Get the area of a triangle spanned by the three given points. Note that the area will be negative if the points are not given in counter-clockwise order.
 * @static
 * @method area
 * @param  {Array} a
 * @param  {Array} b
 * @param  {Array} c
 * @return {Number}
 */
function triangleArea(a: Vertex, b: Vertex, c: Vertex): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
}

function isLeft(a: Vertex, b: Vertex, c: Vertex) {
  return triangleArea(a, b, c) > 0;
}

function isLeftOn(a: Vertex, b: Vertex, c: Vertex) {
  return triangleArea(a, b, c) >= 0;
}

function isRight(a: Vertex, b: Vertex, c: Vertex) {
  return triangleArea(a, b, c) < 0;
}

function isRightOn(a: Vertex, b: Vertex, c: Vertex) {
  return triangleArea(a, b, c) <= 0;
}

function sqdist(a: Vertex, b: Vertex) {
  var dx = b[0] - a[0];
  var dy = b[1] - a[1];
  return dx * dx + dy * dy;
}

/**
 * Get a vertex at position i. It does not matter if i is out of bounds, this function will just cycle.
 * @method at
 * @param  {Number} i
 * @return {Array}
 */
function polygonAt(polygon: Array<Vertex>, i: number): Vertex {
  var s = polygon.length;
  return polygon[i < 0 ? (i % s) + s : i % s];
}

/**
 * Append points "from" to "to"-1 from an other polygon "poly" onto this one.
 * @method append
 * @param {Polygon} poly The polygon to get points from.
 * @param {Number}  from The vertex index in "poly".
 * @param {Number}  to The end vertex index in "poly". Note that this vertex is NOT included when appending.
 * @return {Array}
 */
function polygonAppend(
  polygon: Array<Vertex>,
  poly: Array<Vertex>,
  from: number,
  to: number
): void {
  for (var i = from; i < to; i++) {
    polygon.push(poly[i]);
  }
}

/**
 * Make sure that the polygon vertices are ordered counter-clockwise.
 * @method makeCCW
 */
export function makeCCW(polygon: Array<Vertex>) {
  var br = 0,
    v = polygon;

  // find bottom right point
  for (var i = 1; i < polygon.length; ++i) {
    if (v[i][1] < v[br][1] || (v[i][1] === v[br][1] && v[i][0] > v[br][0])) {
      br = i;
    }
  }

  // reverse poly if clockwise
  if (
    !isLeft(
      polygonAt(polygon, br - 1),
      polygonAt(polygon, br),
      polygonAt(polygon, br + 1)
    )
  ) {
    polygonReverse(polygon);
    return true;
  } else {
    return false;
  }
}

/**
 * Reverse the vertices in the polygon
 * @method reverse
 */
function polygonReverse(polygon: Array<Vertex>) {
  var tmp = [];
  var N = polygon.length;
  for (var i = 0; i !== N; i++) {
    tmp.push(polygon.pop());
  }
  for (var i = 0; i !== N; i++) {
    polygon[i] = tmp[i];
  }
}

/**
 * Check if a point in the polygon is a reflex point
 * @method isReflex
 * @param  {Number}  i
 * @return {Boolean}
 */
function polygonIsReflex(polygon: Array<Vertex>, i: number): Boolean {
  return isRight(
    polygonAt(polygon, i - 1),
    polygonAt(polygon, i),
    polygonAt(polygon, i + 1)
  );
}

/**
 * Check if two vertices in the polygon can see each other
 * @method canSee2
 * @param  {Number} a Vertex index 1
 * @param  {Number} b Vertex index 2
 * @return {Boolean}
 */
function polygonCanSee2(polygon: Array<Vertex>, a: number, b: number): Boolean {
  // for each edge
  for (var i = 0; i !== polygon.length; ++i) {
    // ignore incident edges
    if (
      i === a ||
      i === b ||
      (i + 1) % polygon.length === a ||
      (i + 1) % polygon.length === b
    ) {
      continue;
    }
    if (
      lineSegmentsIntersect(
        polygonAt(polygon, a),
        polygonAt(polygon, b),
        polygonAt(polygon, i),
        polygonAt(polygon, i + 1)
      )
    ) {
      return false;
    }
  }
  return true;
}

/**
 * Checks that the line segments of this polygon do not intersect each other.
 * @method isSimple
 * @param  {Array} polygon An array of vertices e.g. [[0,0],[0,1],...]
 * @return {Boolean}
 * @todo Should it check all segments with all others?
 */
export function isSimple(polygon: Array<[number, number]>): Boolean {
  var path = polygon,
    i: number;
  // Check
  for (i = 0; i < path.length - 1; i++) {
    for (var j = 0; j < i - 1; j++) {
      if (lineSegmentsIntersect(path[i], path[i + 1], path[j], path[j + 1])) {
        return false;
      }
    }
  }

  // Check the segment between the last and the first point to all others
  for (i = 1; i < path.length - 2; i++) {
    if (
      lineSegmentsIntersect(
        path[0],
        path[path.length - 1],
        path[i],
        path[i + 1]
      )
    ) {
      return false;
    }
  }

  return true;
}

function getIntersectionPoint(
  p1: Vertex,
  p2: Vertex,
  q1: Vertex,
  q2: Vertex,
  delta: number = 0
): Vertex {
  var a1 = p2[1] - p1[1];
  var b1 = p1[0] - p2[0];
  var c1 = a1 * p1[0] + b1 * p1[1];
  var a2 = q2[1] - q1[1];
  var b2 = q1[0] - q2[0];
  var c2 = a2 * q1[0] + b2 * q1[1];
  var det = a1 * b2 - a2 * b1;

  if (!scalar_eq(det, 0, delta)) {
    return [(b2 * c1 - b1 * c2) / det, (a1 * c2 - a2 * c1) / det];
  } else {
    return [0, 0];
  }
}

/**
 * Quickly decompose the Polygon into convex sub-polygons.
 * @method quickDecomp
 * @param  {Array} result
 * @param  {Array} [reflexVertices]
 * @param  {Array} [steinerPoints]
 * @param  {Number} [delta]
 * @param  {Number} [maxlevel]
 * @param  {Number} [level]
 * @return {Array}
 */
export function quickDecomp(
  polygon: Array<Vertex>,
  result: Array<Array<Vertex>> = [],
  reflexVertices: Array<Vertex> = [],
  steinerPoints: Array<Vertex> = [],
  delta: number = 25,
  maxlevel: number = 500,
  level: number = 0
): Array<Array<Vertex>> {
  var upperInt = [0, 0],
    lowerInt = [0, 0],
    p: Vertex = [0, 0]; // Points
  var upperDist = 0,
    lowerDist = 0,
    d = 0,
    closestDist = 0; // scalars
  var upperIndex = 0,
    lowerIndex = 0,
    closestIndex = 0; // Integers
  var lowerPoly = [],
    upperPoly = []; // polygons
  var poly = polygon,
    v = polygon;

  if (v.length < 3) {
    return result;
  }

  level++;
  if (level > maxlevel) {
    console.warn("quickDecomp: max level (" + maxlevel + ") reached.");
    return result;
  }

  for (var i = 0; i < polygon.length; ++i) {
    if (polygonIsReflex(poly, i)) {
      reflexVertices.push(poly[i]);
      upperDist = lowerDist = Number.MAX_VALUE;

      for (var j = 0; j < polygon.length; ++j) {
        if (
          isLeft(
            polygonAt(poly, i - 1),
            polygonAt(poly, i),
            polygonAt(poly, j)
          ) &&
          isRightOn(
            polygonAt(poly, i - 1),
            polygonAt(poly, i),
            polygonAt(poly, j - 1)
          )
        ) {
          // if line intersects with an edge
          p = getIntersectionPoint(
            polygonAt(poly, i - 1),
            polygonAt(poly, i),
            polygonAt(poly, j),
            polygonAt(poly, j - 1)
          ); // find the point of intersection
          if (isRight(polygonAt(poly, i + 1), polygonAt(poly, i), p)) {
            // make sure it's inside the poly
            d = sqdist(poly[i], p);
            if (d < lowerDist) {
              // keep only the closest intersection
              lowerDist = d;
              lowerInt = p;
              lowerIndex = j;
            }
          }
        }
        if (
          isLeft(
            polygonAt(poly, i + 1),
            polygonAt(poly, i),
            polygonAt(poly, j + 1)
          ) &&
          isRightOn(
            polygonAt(poly, i + 1),
            polygonAt(poly, i),
            polygonAt(poly, j)
          )
        ) {
          p = getIntersectionPoint(
            polygonAt(poly, i + 1),
            polygonAt(poly, i),
            polygonAt(poly, j),
            polygonAt(poly, j + 1)
          );
          if (isLeft(polygonAt(poly, i - 1), polygonAt(poly, i), p)) {
            d = sqdist(poly[i], p);
            if (d < upperDist) {
              upperDist = d;
              upperInt = p;
              upperIndex = j;
            }
          }
        }
      }

      // if there are no vertices to connect to, choose a point in the middle
      if (lowerIndex === (upperIndex + 1) % polygon.length) {
        //console.log("Case 1: Vertex("+i+"), lowerIndex("+lowerIndex+"), upperIndex("+upperIndex+"), poly.size("+polygon.length+")");
        p[0] = (lowerInt[0] + upperInt[0]) / 2;
        p[1] = (lowerInt[1] + upperInt[1]) / 2;
        steinerPoints.push(p);

        if (i < upperIndex) {
          //lowerPoly.insert(lowerPoly.end(), poly.begin() + i, poly.begin() + upperIndex + 1);
          polygonAppend(lowerPoly, poly, i, upperIndex + 1);
          lowerPoly.push(p);
          upperPoly.push(p);
          if (lowerIndex !== 0) {
            //upperPoly.insert(upperPoly.end(), poly.begin() + lowerIndex, poly.end());
            polygonAppend(upperPoly, poly, lowerIndex, poly.length);
          }
          //upperPoly.insert(upperPoly.end(), poly.begin(), poly.begin() + i + 1);
          polygonAppend(upperPoly, poly, 0, i + 1);
        } else {
          if (i !== 0) {
            //lowerPoly.insert(lowerPoly.end(), poly.begin() + i, poly.end());
            polygonAppend(lowerPoly, poly, i, poly.length);
          }
          //lowerPoly.insert(lowerPoly.end(), poly.begin(), poly.begin() + upperIndex + 1);
          polygonAppend(lowerPoly, poly, 0, upperIndex + 1);
          lowerPoly.push(p);
          upperPoly.push(p);
          //upperPoly.insert(upperPoly.end(), poly.begin() + lowerIndex, poly.begin() + i + 1);
          polygonAppend(upperPoly, poly, lowerIndex, i + 1);
        }
      } else {
        // connect to the closest point within the triangle
        //console.log("Case 2: Vertex("+i+"), closestIndex("+closestIndex+"), poly.size("+polygon.length+")\n");

        if (lowerIndex > upperIndex) {
          upperIndex += polygon.length;
        }
        closestDist = Number.MAX_VALUE;

        if (upperIndex < lowerIndex) {
          return result;
        }

        for (var j = lowerIndex; j <= upperIndex; ++j) {
          if (
            isLeftOn(
              polygonAt(poly, i - 1),
              polygonAt(poly, i),
              polygonAt(poly, j)
            ) &&
            isRightOn(
              polygonAt(poly, i + 1),
              polygonAt(poly, i),
              polygonAt(poly, j)
            )
          ) {
            d = sqdist(polygonAt(poly, i), polygonAt(poly, j));
            if (d < closestDist && polygonCanSee2(poly, i, j)) {
              closestDist = d;
              closestIndex = j % polygon.length;
            }
          }
        }

        if (i < closestIndex) {
          polygonAppend(lowerPoly, poly, i, closestIndex + 1);
          if (closestIndex !== 0) {
            polygonAppend(upperPoly, poly, closestIndex, v.length);
          }
          polygonAppend(upperPoly, poly, 0, i + 1);
        } else {
          if (i !== 0) {
            polygonAppend(lowerPoly, poly, i, v.length);
          }
          polygonAppend(lowerPoly, poly, 0, closestIndex + 1);
          polygonAppend(upperPoly, poly, closestIndex, i + 1);
        }
      }

      // solve smallest poly first
      if (lowerPoly.length < upperPoly.length) {
        quickDecomp(
          lowerPoly,
          result,
          reflexVertices,
          steinerPoints,
          delta,
          maxlevel,
          level
        );
        quickDecomp(
          upperPoly,
          result,
          reflexVertices,
          steinerPoints,
          delta,
          maxlevel,
          level
        );
      } else {
        quickDecomp(
          upperPoly,
          result,
          reflexVertices,
          steinerPoints,
          delta,
          maxlevel,
          level
        );
        quickDecomp(
          lowerPoly,
          result,
          reflexVertices,
          steinerPoints,
          delta,
          maxlevel,
          level
        );
      }

      return result;
    }
  }
  result.push(polygon);

  return result;
}

/**
 * Check if two scalars are equal
 * @static
 * @method eq
 * @param  {Number} a
 * @param  {Number} b
 * @param  {Number} [precision]
 * @return {Boolean}
 */
function scalar_eq(a: number, b: number, precision: number): Boolean {
  precision = precision || 0;
  return Math.abs(a - b) <= precision;
}
