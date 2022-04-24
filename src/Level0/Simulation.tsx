type SimulationParams = {
  yPos: number;
  yMaxPos: number;
  isFiring: boolean;
  isExploded: boolean;
};

const ASCII_BOX_INTERNAL_WIDTH = 11;
const ASCII_BOX_INTERNAL_HEIGHT = 21;

const NUM_MARKERS = 6;

const getAsciiBox = ({
  yPos,
  yMaxPos,
  isFiring,
  isExploded,
}: SimulationParams) => {
  const rocketPos =
    ASCII_BOX_INTERNAL_HEIGHT -
    Math.ceil((yPos / yMaxPos) * (ASCII_BOX_INTERNAL_HEIGHT - 1)) -
    1;

  let asciiString = ``;

  asciiString += "┌";
  asciiString += "─".repeat(ASCII_BOX_INTERNAL_WIDTH);
  asciiString += "┐\n";

  for (let i = 0; i < ASCII_BOX_INTERNAL_HEIGHT; i += 1) {
    asciiString += "│";
    asciiString += " ".repeat(Math.floor((ASCII_BOX_INTERNAL_WIDTH - 1) / 2));

    if (i === rocketPos) {
      asciiString += isExploded ? "🔥" : "🚀";
    } else if (i === rocketPos + 1 && isFiring) {
      asciiString += "🔥";
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
        yMaxPos -
        (i / markerFrequency) * Math.floor(yMaxPos / (NUM_MARKERS - 1))
      }m`.padStart(`${yMaxPos}`.length + 2, " ");
    }

    asciiString += "\n";
  }

  asciiString += "└";
  asciiString += "─".repeat(ASCII_BOX_INTERNAL_WIDTH);
  asciiString += "┘";

  return asciiString;
};

export const Simulation = (simulationParams: SimulationParams) => {
  return (
    <div>
      <pre>{getAsciiBox(simulationParams)}</pre>
    </div>
  );
};
