export class Vector {
  x: number;
  y: number;
  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  // dot
  dot(vector: Vector) {
    return this.x * vector.x + this.y * vector.y;
  }

  // tangent?
  tangent() {
    return new Vector(this.y, -this.x);
  }

  // subtract
  subtract(vector: Vector) {
    return new Vector(this.x - vector.x, this.y - vector.y);
  }

  // length
  length() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }

  // multiply
  multiply(scalar: number) {
    return new Vector(this.x * scalar, this.y * scalar);
  }

  // normal
  normal() {
    return this.multiply(1 / this.length());
  }

  // add
  add(vector: Vector) {
    return new Vector(this.x + vector.x, this.y + vector.y);
  }

  // zero
  static z() {
    return new Vector(0, 0);
  }
}
