type SimulationParams = {
  posn: number;
  maxPosn: number;
  isFiring: boolean;
  isExploded: boolean;
};

const ASCII_BOX_INTERNAL_WIDTH = 11;
const ASCII_BOX_INTERNAL_HEIGHT = 21;

const NUM_MARKERS = 6;

const EXPLODED_INDICATOR = "<span class='inline-block w-0'>🔥</span>";
const ROCKET_INDICATOR = "<span class='inline-block w-0'>🚀</span>";

const getAsciiBox = ({
  posn,
  maxPosn,
  isFiring,
  isExploded,
}: SimulationParams) => {
  const rocketPos =
    ASCII_BOX_INTERNAL_HEIGHT -
    Math.ceil((posn / maxPosn) * (ASCII_BOX_INTERNAL_HEIGHT - 1)) -
    1;

  let asciiString = ``;

  asciiString += "┌";
  asciiString += "─".repeat(ASCII_BOX_INTERNAL_WIDTH);
  asciiString += "┐\n";

  for (let i = 0; i < ASCII_BOX_INTERNAL_HEIGHT; i += 1) {
    asciiString += "│";
    asciiString += " ".repeat(Math.floor((ASCII_BOX_INTERNAL_WIDTH - 1) / 2));

    if (i === rocketPos) {
      asciiString +=
        (isExploded ? EXPLODED_INDICATOR : ROCKET_INDICATOR) + "  ";
    } else if (i === rocketPos + 1 && isFiring) {
      asciiString += EXPLODED_INDICATOR + "  ";
    } else {
      asciiString += "  ";
    }

    asciiString += " ".repeat(
      Math.ceil((ASCII_BOX_INTERNAL_WIDTH - 1) / 2) - 1
    );
    asciiString += "│";

    const markerFrequency = Math.floor(
      (ASCII_BOX_INTERNAL_HEIGHT - 1) / (NUM_MARKERS - 1)
    );
    if (i % markerFrequency === 0) {
      asciiString += ` ${
        Math.floor(
          ((maxPosn * (NUM_MARKERS - 1 - i / markerFrequency)) /
            (NUM_MARKERS - 1)) *
            100
        ) / 100

        // maxPosn -
        // (i / markerFrequency) * Math.floor(maxPosn / (NUM_MARKERS - 1))
      }m`.padStart(`${maxPosn}`.length + 2, " ");
    }

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
