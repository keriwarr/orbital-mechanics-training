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
      const { thrustx, thrusty } = (() => {
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
            return {
              thrustx: Math.cos(radians) * thrustAccel,
              thrusty: Math.sin(radians) * thrustAccel,
            };
          }
        } catch (e) {
          console.error(e);
        }
        return { thrustx: 0, thrusty: 0 };
      })();

      const getGravity = ({ px, py }: { px: number; py: number }) => {
        const distancex = planetPosn.x - px;
        const distancey = planetPosn.y - py;

        const distanceFromPlanetCenter = Math.sqrt(
          Math.abs(distancex) ** 2 + Math.abs(distancey) ** 2
        );
        const effectiveGravity =
          planetGravity * (planetRadius / distanceFromPlanetCenter) ** 2;

        if (distancey === 0) return { gravityx: effectiveGravity, gravityy: 0 };

        const distanceRatio = distancex / distancey;

        const gravityy = effectiveGravity / Math.sqrt(distanceRatio ** 2 + 1);
        const gravityx = distanceRatio * gravityy;
        return {
          gravityx: Math.sign(distancex) * Math.abs(gravityx),
          gravityy: Math.sign(distancey) * Math.abs(gravityy),
        };
      };

      const getAccel = ({ px, py }: { px: number; py: number }) => {
        const { gravityx, gravityy } = getGravity({ px, py });

        return {
          accelx: gravityx + thrustx,
          accely: gravityy + thrusty,
        };
      };

      const eulerMethod = getAccel;
      const midpointMethod = ({ px, py }: { px: number; py: number }) => {
        const k1 = getAccel({ px, py });

        const v1x = velox + k1.accelx / 2 / TICK_PER_SECOND;
        const v1y = veloy + k1.accely / 2 / TICK_PER_SECOND;

        const p1x = px + v1x / 2 / TICK_PER_SECOND;
        const p1y = py + v1y / 2 / TICK_PER_SECOND;

        return getAccel({ px: p1x, py: p1y });
      };
      const ralstonMethod = ({ px, py }: { px: number; py: number }) => {
        const k1 = getAccel({ px, py });

        const a2_1 = 2 / 3;

        const v1x = velox + (k1.accelx * a2_1) / TICK_PER_SECOND;
        const v1y = veloy + (k1.accely * a2_1) / TICK_PER_SECOND;

        const p1x = px + (v1x * a2_1) / TICK_PER_SECOND;
        const p1y = py + (v1y * a2_1) / TICK_PER_SECOND;

        const k2 = getAccel({ px: p1x, py: p1y });

        return {
          accelx: k1.accelx * (1 / 4) + k2.accelx * (3 / 4),
          accely: k1.accely * (1 / 4) + k2.accely * (3 / 4),
        };
      };
      const rk4Method = ({ px, py }: { px: number; py: number }) => {
        // const c1 = 0;
        const c2 = 1 / 2;
        const c3 = 1 / 2;
        const c4 = 1;
        const a2_1 = 1 / 2;
        const a3_2 = 1 / 2;
        const a4_3 = 1;
        const b1 = 1 / 6;
        const b2 = 1 / 3;
        const b3 = 1 / 3;
        const b4 = 1 / 6;

        const p1x = px;
        const p1y = py;
        const k1 = getAccel({ px: p1x, py: p1y });

        const p2x =
          px +
          (velox * c2) / TICK_PER_SECOND +
          (k1.accelx * a2_1) / TICK_PER_SECOND / TICK_PER_SECOND;
        const p2y =
          py +
          (veloy * c2) / TICK_PER_SECOND +
          (k1.accely * a2_1) / TICK_PER_SECOND / TICK_PER_SECOND;
        const k2 = getAccel({ px: p2x, py: p2y });

        const p3x =
          px +
          (velox * c3) / TICK_PER_SECOND +
          (k2.accelx * a3_2) / TICK_PER_SECOND / TICK_PER_SECOND;
        const p3y =
          py +
          (veloy * c3) / TICK_PER_SECOND +
          (k2.accely * a3_2) / TICK_PER_SECOND / TICK_PER_SECOND;
        const k3 = getAccel({ px: p3x, py: p3y });

        const p4x =
          px +
          (velox * c4) / TICK_PER_SECOND +
          (k3.accelx * a4_3) / TICK_PER_SECOND / TICK_PER_SECOND;
        const p4y =
          py +
          (veloy * c4) / TICK_PER_SECOND +
          (k3.accely * a4_3) / TICK_PER_SECOND / TICK_PER_SECOND;
        const k4 = getAccel({ px: p4x, py: p4y });

        return {
          accelx:
            k1.accelx * b1 + k2.accelx * b2 + k3.accelx * b3 + k4.accelx * b4,
          accely:
            k1.accely * b1 + k2.accely * b2 + k3.accely * b3 + k4.accely * b4,
        };
      };

      const e = eulerMethod({ px: posnx, py: posny });
      const m = midpointMethod({ px: posnx, py: posny });
      const r = ralstonMethod({ px: posnx, py: posny });
      const rk4 = rk4Method({ px: posnx, py: posny });

      const { accelx, accely } = e;

      velox += accelx / TICK_PER_SECOND;
      veloy += accely / TICK_PER_SECOND;

      posnx += velox / TICK_PER_SECOND;
      posny += veloy / TICK_PER_SECOND;

      const dx = planetPosn.x - posnx;
      const dy = planetPosn.y - posny;

      const dpc = Math.sqrt(Math.abs(dx) ** 2 + Math.abs(dy) ** 2);
      const eg = planetGravity * (planetRadius / dpc) ** 2;

      const kinetic = (1 / 2) * velox ** 2 * veloy ** 2;

      const { gravityx: gx, gravityy: gy } = getGravity({
        px: posnx,
        py: posny,
      });
      const potential = planetGravity * dpc;
      const sum = kinetic + potential;

      // g = =GM/r^2 (towards larger mass)
      // f = gMm/r^2
      // a = gM/r^2
      // e = gMm/r = r*f
      // e = a*r*m
      // e/m = a * r

      if (tick % 10 === 0) {
        console.table({
          tick,
          posnx,
          posny,
          velox,
          veloy,
          dx,
          dy,
          dpc,
          eg,
          gx,
          gy,
          kinetic,
          potential,
          sum,
          e,
          m,
          r,
          rk4,
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
