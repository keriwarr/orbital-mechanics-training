type SimulationParams = {
  posn: { x: number; y: number };
  bounds: { x1: number; x2: number; y1: number; y2: number };
  planetPosn: { x: number; y: number };
  planetRadius: number;
};

const ASCII_BOX_INTERNAL_WIDTH = 81;
const ASCII_BOX_INTERNAL_HEIGHT = 31;

const EXPLODED_INDICATOR = "<span class='inline-block w-0'>🔥</span>";
const ROCKET_INDICATOR = "<span class='inline-block w-0'>🚀</span>";

const getAsciiBox = ({
  posn: { x: posnx, y: posny },
  bounds: { x1, x2, y1, y2 },
  planetPosn: { x: planetx, y: planety },
  planetRadius,
}: SimulationParams) => {
  const rocketPosnx = Math.ceil(
    ((posnx - x1) / (x2 - x1)) * (ASCII_BOX_INTERNAL_WIDTH - 1)
  );
  const rocketPosny =
    ASCII_BOX_INTERNAL_HEIGHT -
    Math.ceil(((posny - y1) / (y2 - y1)) * (ASCII_BOX_INTERNAL_HEIGHT - 1)) -
    1;

  const planetPosnx = Math.ceil(
    ((planetx - x1) / (x2 - x1)) * (ASCII_BOX_INTERNAL_WIDTH - 1)
  );
  const planetPosny =
    ASCII_BOX_INTERNAL_HEIGHT -
    Math.ceil(((planety - y1) / (y2 - y1)) * (ASCII_BOX_INTERNAL_HEIGHT - 1)) -
    1;

  let asciiString = ``;

  asciiString += "┌";
  asciiString += "─".repeat(ASCII_BOX_INTERNAL_WIDTH);
  asciiString += "┐\n";

  for (let i = 0; i < ASCII_BOX_INTERNAL_HEIGHT; i += 1) {
    asciiString += "│";

    for (let j = 0; j < ASCII_BOX_INTERNAL_WIDTH; j += 1) {
      if (j === rocketPosnx && i === rocketPosny) {
        asciiString += ROCKET_INDICATOR;
      } else if (j === planetPosnx && i === planetPosny) {
        asciiString += "<span class='inline-block w-0'>🪐</span>";
      }

      // const distanceToPlanet = Math.sqrt(
      //   Math.abs(distancex) ** 2 + Math.abs(distancey) ** 2
      // );
      asciiString += " ";
    }
    asciiString += "│";
    // asciiString += " ".repeat(Math.floor((ASCII_BOX_INTERNAL_WIDTH - 1) / 2));

    // if (i === rocketPos) {
    //   asciiString +=
    //     (isExploded ? EXPLODED_INDICATOR : ROCKET_INDICATOR) + "  ";
    // } else if (i === rocketPos + 1 && isFiring) {
    //   asciiString += EXPLODED_INDICATOR + "  ";
    // } else {
    //   asciiString += "  ";
    // }

    // asciiString += " ".repeat(
    //   Math.ceil((ASCII_BOX_INTERNAL_WIDTH - 1) / 2) - 1
    // );
    // asciiString += "│";

    // const markerFrequency = Math.floor(
    //   (ASCII_BOX_INTERNAL_HEIGHT - 1) / (NUM_MARKERS - 1)
    // );
    // if (i % markerFrequency === 0) {
    //   asciiString += ` ${
    //     Math.floor(
    //       ((maxPosn * (NUM_MARKERS - 1 - i / markerFrequency)) /
    //         (NUM_MARKERS - 1)) *
    //         100
    //     ) / 100

    //     // maxPosn -
    //     // (i / markerFrequency) * Math.floor(maxPosn / (NUM_MARKERS - 1))
    //   }m`.padStart(`${maxPosn}`.length + 2, " ");
    // }

    asciiString += "\n";
  }

  asciiString += "└";
  asciiString += "─".repeat(ASCII_BOX_INTERNAL_WIDTH);
  asciiString += "┘";

  return asciiString;
};

export const Simulation = (simulationParams: SimulationParams) => {
  const ascii = getAsciiBox(simulationParams);

  return (
    <div>
      <pre dangerouslySetInnerHTML={{ __html: ascii }}></pre>
    </div>
  );
};
