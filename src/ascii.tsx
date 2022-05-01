export function drawASCIICircle(radius: number, width: number) {
  // Plots a circle using the equation: x^2 + y^2
  var output = "";
  const expectedValue = radius ** 2;

  // imagine a graph with the centre of a circle right on point (0, 0)
  for (let y = -radius; y <= radius; y++) {
    // y first, because we go across before we go down (inner loop runs more often)
    for (let x = -radius; x <= radius; x++) {
      const computedValue = x ** 2 + y ** 2;
      // use radius to get a roughly single-thickness circle - double or halve this for corresponding results
      if (Math.abs(computedValue - expectedValue) <= (radius * width)) {
        output += "*";
      } else {
        output += " ";
      }
    }
    output += "\n";
  }
  return output;
};

export function drawASCIIElipse(a: number, b: number, width: number) {
  // Assumes h and k (ellipse position) are (0, 0). Calculates using the
  // equation: (x - h)^2/a^2 + (y - k)^2/b^2 = 1
  //
  // Simplified as: x^2/a^2 + y^2/b^2 = 1
  var output = "";
  // imagine a graph with the centre of a ellipse right on point (0, 0)
  for (let y = -b; y <= b; y++) {
    // y first, because we go across before we go down (inner loop runs more often)
    for (let x = -a; x <= a; x++) {
      // TODO: Factor out the upper / lower bound for a better equality?
      const lowerBound = (x * (1 - (1 / (2 * a)))) ** 2 / a ** 2 + (y * (1 - (1 / (2 * b)))) ** 2 / b ** 2;
      const upperBound = (x * (1 + (1 / (2 * a)))) ** 2 / a ** 2 + (y * (1 + (1 / (2 * b)))) ** 2 / b ** 2;

      if (lowerBound <= 1 && 1 <= upperBound) {
        output += "*";
      } else {
        output += " ";
      }
    }
    output += "\n";
  }
  return output;
};