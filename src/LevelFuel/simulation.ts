import { makeCancelableBatchSimulation, TICK_PER_MS, TICK_PER_SECOND } from "../util/cancelableBatchSimulation";

export type ShouldFireBooster = (
  args: {
    time: number;
    velo: number;
    posn: number;
  },
  constants: {
    GRAVITY_ACCEL: number;
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
  result: 'landed' | 'crashed' | 'timedout';
  resultTimeMS: number;
  resultSpeed: number;
  totalFireCount: number;
  posn: number
};

export const levelFuelSimulation = ({
  initialPosn,
  initialVelo,
  gravityAccel,
  dryMass,
  fuelMass,
  fuelConsumption,
  touchdownSpeedThreshold,
  shouldFireBooster,
  timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
}: {
  initialPosn: number;
  initialVelo: number;
  gravityAccel: number;
  dryMass: number;
  fuelMass: number;
  fuelConsumption: number;
  touchdownSpeedThreshold: number;
  shouldFireBooster: ShouldFireBooster;
  timeoutSeconds?: number;
}) => {
  const TIMEOUT_TICKS = TICK_PER_SECOND * timeoutSeconds;
  let posn = initialPosn;
  let velo = initialVelo;
  let fireCount = 0;

  let frameFireCount = 0;

  return makeCancelableBatchSimulation({
    simulateOneTick: ({ tick }) => {
      // velo += gravityAccel / TICK_PER_SECOND;

      // try {
      //   if (
      //     shouldFireBooster(
      //       { time: tick, posn, velo },
      //       { GRAVITY_ACCEL: gravityAccel, THRUST_ACCEL: thrustAccel }
      //     )
      //   ) {
      //     velo += thrustAccel / TICK_PER_SECOND;
      //     fireCount += 1;
      //     frameFireCount += 1;
      //   }
      // } catch (e) {
      //   console.error(e);
      // }

      // posn += velo / TICK_PER_SECOND;
    },
    checkForResult: ({ tick }) => {
      const roundedPosn = roundFPError(posn);
      const roundedVelo = roundFPError(velo);

      if (tick < TIMEOUT_TICKS && roundedPosn > 0) {
        return;
      }

      const result = (() => {
        if (tick >= TIMEOUT_TICKS) return "timedout";
        if (Math.abs(roundedVelo) <= touchdownSpeedThreshold) return "landed";
        return "crashed";
      })();

      const resultData: SimulationResultData = {
        result,
        resultTimeMS: tick / TICK_PER_MS,
        totalFireCount: fireCount,
        resultSpeed: Math.abs(roundedVelo),
        posn: roundedPosn,
      };

      return resultData;
    },
    getFrameData: ({ frameTick }) => {
      const isFiring = frameFireCount / frameTick > IS_FIRING_THRESHOLD;

      frameFireCount = 0;

      const frameData: SimulationFrameData = {
        posn,
        isFiring,
      };
      return frameData;
    },
  });
};
