import { ShouldFireBooster } from "./Level0";

// CONFIGURABLE
const TICK_PER_MS = 1;
export const FRAME_PER_SECOND = 60;

export const DEFAULT_TIMEOUT_SECONDS = 60;

const SIMULATION_CHUNK_MS = 10; // simulate for 10ms at a time
const SIMULATION_CHUNK_INTERAL_MS = 5; // take a 5ms break between each chunk

const IS_FIRING_THRESHOLD = 0.5; // what portion of 'fires' per frame should display a fire emojus?

// DERIVATIVE
export const TICK_PER_SECOND = TICK_PER_MS * 1000;
const TICK_PER_FRAME = TICK_PER_SECOND / FRAME_PER_SECOND;

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
export const runSimulation = ({
  params: {
    initialPosn, // meters
    initialVelo, // meters per second
    gravityAccel, // meters per second per second
    thrustAccel, // meters per second per second
    touchdownSpeedThreshold, // meters per second
    shouldFireBooster,
    timeoutSeconds = DEFAULT_TIMEOUT_SECONDS,
  },
  handleFrameData,
  handleResult,
  cancelSignal,
}: {
  params: {
    initialPosn: number,
    initialVelo: number,
    gravityAccel: number,
    thrustAccel: number,
    touchdownSpeedThreshold: number,
    shouldFireBooster: ShouldFireBooster
    timeoutSeconds?: number
  },
  handleFrameData?: (args: SimulationFrameData) => void,
  handleResult: (args: SimulationResultData) => void,
  cancelSignal?: Promise<void>
}) => {
  const TIMEOUT_TICKS = TICK_PER_SECOND * timeoutSeconds;

  let posn = initialPosn;
  let velo = initialVelo;
  let tick = 0;
  let fireCount = 0;
  let frameCount = 1; // represents the pre-rendered initial condition

  // these are reset every "frame"
  let frameTick = 0;
  let frameFireCount = 0;

  const simulateOneTick = () => {
    velo += gravityAccel / TICK_PER_SECOND;
    try {
      if (
        shouldFireBooster(
          { time: tick, posn, velo },
          { GRAVITY_ACCEL: gravityAccel, THRUST_ACCEL: thrustAccel }
        )
      ) {
        velo += thrustAccel / TICK_PER_SECOND;
        fireCount += 1;
        frameFireCount += 1;
      }
    } catch (e) {
      console.error(e)
    }

    posn += velo / TICK_PER_SECOND;
    tick += 1;
    frameTick += 1;
  };

  let timeoutHandle: number | null = null;

  const simulateForMs = () => {
    const startTimeMs = performance.now();

    while (true) {
      simulateOneTick();

      const roundedPosn = Math.floor(posn * 10 ** 6) / 10 ** 6;
      const roundedVelo = Math.floor(velo * 10 ** 6) / 10 ** 6;

      if (tick >= TIMEOUT_TICKS || roundedPosn <= 0) {
        // eslint-disable-next-line no-loop-func
        const result = (() => {
          if (tick >= TIMEOUT_TICKS) return 'timedout';
          if (Math.abs(roundedVelo) <= touchdownSpeedThreshold) return 'landed';
          return 'crashed';
        })();

        handleResult({
          result,
          resultTimeMS: tick / TICK_PER_MS,
          totalFireCount: fireCount,
          resultSpeed: Math.abs(roundedVelo),
          posn: roundedPosn,
        })
        return;
      }

      if (handleFrameData && tick > frameCount * TICK_PER_FRAME) {
        const isFiring = frameFireCount / frameTick > IS_FIRING_THRESHOLD;

        frameTick = 0;
        frameFireCount = 0;

        frameCount += 1;

        handleFrameData({
          posn,
          isFiring
        });
      }

      if (tick % 100 === 0) {
        if (performance.now() - startTimeMs > SIMULATION_CHUNK_MS) {
          break;
        }
      }
    }


    if (timeoutHandle !== null) {
      timeoutHandle = window.setTimeout(simulateForMs, SIMULATION_CHUNK_INTERAL_MS);
    }
  }

  timeoutHandle = window.setTimeout(simulateForMs, 0);

  cancelSignal?.then(() => {
    if (timeoutHandle !== null) {
      window.clearTimeout(timeoutHandle)
    }
  });
}
