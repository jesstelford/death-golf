import { Vector } from "./vector";

var computeAxes = (shape: Shape, i?) => {
  // normal of each face toward outside of shape
  for (i = 0; i < shape.vertices.length; i++) {
    shape.axes[i] = shape.vertices[(i + 1) % shape.vertices.length]
      .subtract(shape.vertices[i])
      .normal()
      .tangent();
  }
};

export class Shape {
  vertices: Vector[] = [];

  // Separating axes.
  // Ie; Normal of each face toward outside of shape.
  // NOTE: Must be updated when vertices are updated so that their positions
  // relative to eachother change (such as rotated)
  // NOTE2: Doesn't need to be updated when translated (the axes are based on
  // position of vertices relative to eachother)
  axes: Vector[] = [];

  constructor(vertices: Vector[]) {
    this.vertices = vertices;
    computeAxes(this);
  }

  project(vector: Vector) {
    return this.vertices.reduce(
      (minMax, vertice) => {
        const value = vertice.dot(vector);
        if (value < minMax.min) minMax.min = value;
        if (value > minMax.max) minMax.max = value;
        return minMax;
      },
      { min: Infinity, max: -Infinity }
    );
  }

  translate(vector: Vector) {
    this.vertices = this.vertices.map((vertex) => vertex.add(vector));
  }

  rotate(center: Vector, angle: number) {
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    this.vertices = this.vertices.map((vertex) => vertex.rotate(c, s, center));
    computeAxes(this);
  }

  hFlip(axe: number) {
    const vertices = [];
    for (const vertex of this.vertices) {
      vertices.push(new Vector(vertex.x + 2 * (axe - vertex.x), vertex.y));
    }
    return new Shape(vertices);
  }
}

export function shapeFromSvgData(data: string, bBox: SVGRect) {
  let dataArray = data.split("");
  let res = "";
  const one_numb = ["v", "h", "V", "H", "z"];
  const two_numb = ["m", "M", "l", "L", "c", "z"];
  let type_data = 0;
  let count = 0;
  let point = false;
  let coords = ["", ""];
  for (const i in dataArray) {
    let force_print = false;
    const c = dataArray[i];
    if (one_numb.includes(c) || two_numb.includes(c)) {
      force_print = true;
    } else if (c === "-") {
      point = false;
      if (coords[0] !== "") {
        count += 1;
        if (count < 2) {
          coords[count] = coords[count] + c;
        }
      } else {
        coords[count] = c;
      }
    } else if (c === ".") {
      if (!point) {
        point = true;
        coords[count] = coords[count] + c;
      } else {
        count += 1;
        coords[count] = coords[count] + c;
      }
    } else if (c !== " ") {
      coords[count] = coords[count] + c;
    } else {
      point = false;
      count += 1;
    }
    if (count === type_data || force_print) {
      point = false;
      if (type_data === 2 && coords[0] !== "") {
        res = res + coords[0] + "," + coords[1] + " ";
      } else if (type_data === 1 && coords[0] !== "") {
        res = res + coords[0] + " ";
      }
      if (force_print) {
        if (one_numb.includes(c)) {
          type_data = 1;
        } else if (two_numb.includes(c)) {
          type_data = 2;
        }
        res = res + c;
        if (c !== "z") {
          res = res + " ";
        }
      }
      coords = ["", ""];
      if (c === "-") {
        coords[0] = "-";
      }
      count = 0;
    }
  }
  let lastPosition = new Vector(0, 0);
  let lastCommand = null;
  const sequence = res.split(" ");
  const vertices: Vector[] = [];
  for (const element of sequence) {
    switch (element) {
      case "m":
      case "M":
      case "v":
      case "V":
      case "h":
      case "H":
      case "l":
      case "L":
      case "z":
      case "Z":
        lastCommand = element;
        break;
      default:
        const coordinates = element.split(",").map((c) => Number.parseFloat(c));
        let vertex = lastPosition;
        switch (lastCommand) {
          case "m":
            vertex = lastPosition.add(
              new Vector(coordinates[0], coordinates[1])
            );
            break;
          case "M":
            vertex = new Vector(coordinates[0], coordinates[1]);
            break;
          case "v":
            vertex = lastPosition.add(new Vector(0, coordinates[0]));
            break;
          case "V":
            vertex = new Vector(lastPosition.x, coordinates[0]);
            break;
          case "h":
            vertex = lastPosition.add(new Vector(coordinates[0], 0));
            break;
          case "H":
            vertex = new Vector(coordinates[0], lastPosition.y);
            break;
          case "l":
            vertex = lastPosition.add(
              new Vector(coordinates[0], coordinates[1])
            );
            break;
          case "L":
            vertex = new Vector(coordinates[0], coordinates[1]);
            break;
          case "z":
          case "Z":
            break;
        }
        vertices.push(vertex);
        lastPosition = vertex;
        break;
    }
  }
  for (const vertex of vertices) {
    vertex.x -= bBox.x;
    vertex.y -= bBox.y;
  }
  return new Shape(vertices);
}
