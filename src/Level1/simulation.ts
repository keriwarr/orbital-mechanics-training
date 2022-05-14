import {
  makeCancelableBatchSimulation,
  TICK_PER_MS,
  TICK_PER_SECOND,
} from "../util/cancelableBatchSimulation";

export type ShouldFireBooster = (
  args: {
    time: number;
    velo: { x: number; y: number };
    posn: { x: number; y: number };
  },
  constants: {
    THRUST_ACCEL: number;
  }
) => unknown;

export const DEFAULT_TIMEOUT_SECONDS = 60;
const IS_FIRING_THRESHOLD = 0.5; // what portion of 'fires' per frame should display a fire emojus?

const FPErrorThreshold = 10 ** 6;
function roundFPError(posn: number) {
  return Math.floor(posn * FPErrorThreshold) / FPErrorThreshold;
}

export type SimulationFrameData = {
  posn: number;
  isFiring: boolean;
};

export type SimulationResultData = {
  result: "landed" | "crashed" | "timedout";
  resultTimeMS: number;
  resultSpeed: number;
  totalFireCount: number;
  posn: number;
};

export const level1Simulation = ({
  initialPosn,
  initialVelo,
  planetPosn,
  planetRadius,
  planetGravity,
  thrustAccel,
  touchdownSpeedThreshold,
  shouldFireBooster,
  timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
}: {
  initialPosn: { x: number; y: number };
  initialVelo: { x: number; y: number };
  planetPosn: { x: number; y: number };
  planetRadius: number;
  planetGravity: number; // what are the units??
  thrustAccel: number;
  touchdownSpeedThreshold: number;
  shouldFireBooster: ShouldFireBooster;
  timeoutSeconds?: number;
}) => {
  const TIMEOUT_TICKS = TICK_PER_SECOND * timeoutSeconds;
  let posnx = initialPosn.x;
  let posny = initialPosn.y;
  let velox = initialVelo.x;
  let veloy = initialVelo.y;

  return makeCancelableBatchSimulation({
    simulateOneTick: ({ tick }) => {
      const distancex = planetPosn.x - posnx;
      const distancey = planetPosn.y - posny;

      const distanceFromPlanetCenter = Math.sqrt(
        Math.abs(distancex) ** 2 + Math.abs(distancey) ** 2
      );
      const effectiveGravity =
        planetGravity * (planetRadius / distanceFromPlanetCenter) ** 2;

      const { gravityx, gravityy } = (() => {
        if (distancey === 0) return { gravityx: effectiveGravity, gravityy: 0 };

        const distanceRatio = distancex / distancey;

        const gravityy = effectiveGravity / Math.sqrt(distanceRatio ** 2 + 1);
        const gravityx = distanceRatio * gravityy;
        return {
          gravityx: Math.sign(distancex) * Math.abs(gravityx),
          gravityy: Math.sign(distancey) * Math.abs(gravityy),
        };
      })();

      velox += gravityx / TICK_PER_SECOND;
      veloy += gravityy / TICK_PER_SECOND;

      try {
        const radians = shouldFireBooster(
          {
            time: tick,
            posn: { x: posnx, y: posny },
            velo: { x: velox, y: veloy },
          },
          { THRUST_ACCEL: thrustAccel }
        );
        if (typeof radians === "number") {
          velox += (Math.cos(radians) * thrustAccel) / TICK_PER_SECOND;
          veloy += (Math.sin(radians) * thrustAccel) / TICK_PER_SECOND;
        }
      } catch (e) {
        console.error(e);
      }

      posnx += velox / TICK_PER_SECOND;
      posny += veloy / TICK_PER_SECOND;

      if (tick % 1000 === 0) {
        console.table({
          tick,
          distancex,
          distancey,
          distanceFromPlanetCenter,
          effectiveGravity,
          gravityx,
          gravityy,
          velox,
          veloy,
        });
      }
    },
    checkForResult: ({ tick }) => {
      if (tick >= TIMEOUT_TICKS) {
        return {
          result: "timedout",
        };
      }
    },
    getFrameData: ({ frameTick }) => {
      return {
        posnx,
        posny,
      };
    },
  });
};
