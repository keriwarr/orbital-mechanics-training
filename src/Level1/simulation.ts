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

type Vector = { x: number; y: number };

const add = (v1: Vector, v2: Vector): Vector => ({
  x: v1.x + v2.x,
  y: v1.y + v2.y,
});
const sub = (v1: Vector, v2: Vector): Vector => ({
  x: v1.x - v2.x,
  y: v1.y - v2.y,
});
const scale = (v: Vector, scalar: number) => ({
  x: v.x * scalar,
  y: v.y * scalar,
});
const dotProduct = (v1: Vector, v2: Vector) => v1.x * v2.x + v1.y * v2.y;
const projection = (v: Vector, onto: Vector) =>
  scale(onto, dotProduct(v, onto) / dotProduct(onto, onto));
const perpendicular = (v: Vector, onto: Vector) => sub(v, projection(v, onto));
const length = (v: Vector) => Math.sqrt(dotProduct(v, v));
const rescale = (v: Vector, magnitude: number) =>
  scale(v, magnitude / length(v));
const angle = (v1: Vector, v2: Vector) =>
  Math.acos(dotProduct(v1, v2) / (length(v1) * length(v2)));
const rotate = (v: Vector, theta: number) => ({
  x: v.x * Math.cos(theta) - v.y * Math.sin(theta),
  y: v.x * Math.sin(theta) + v.y * Math.cos(theta),
});

const boundAngle = (theta: number) =>
  theta - 2 * Math.PI * Math.floor(theta / (2 * Math.PI));

const getEccentricAnomaly = ({
  meanAnomaly,
  eccentricity,
}: {
  meanAnomaly: number;
  eccentricity: number;
}) => {
  if (isNaN(meanAnomaly)) return null;
  let eccentricAnomaly = meanAnomaly;
  for (let i = 0; i < 50; i += 1) {
    const error =
      (eccentricAnomaly -
        eccentricity * Math.sin(eccentricAnomaly) -
        meanAnomaly) /
      (1 - eccentricity * Math.cos(eccentricAnomaly));
    if (Math.abs(error) < 1e-14) {
      return eccentricAnomaly;
    }
    eccentricAnomaly -= error;
  }
  console.warn("Maxed out at 50 iterations calculating eccentric anomaly");
  return eccentricAnomaly;
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
  let posn = initialPosn;
  let velo = initialVelo;
  let pvelo: Vector | null = null;
  let ppvelo: Vector | null = null;

  return makeCancelableBatchSimulation({
    simulateOneTick: ({ tick }) => {
      const thrust = (() => {
        try {
          const radians = shouldFireBooster(
            {
              time: tick,
              posn,
              velo,
            },
            { THRUST_ACCEL: thrustAccel }
          );
          if (typeof radians === "number") {
            return {
              x: Math.cos(radians) * thrustAccel,
              y: Math.sin(radians) * thrustAccel,
            };
          }
        } catch (e) {
          console.error(e);
        }
        return { x: 0, y: 0 };
      })();

      const getGravity = (p: Vector, log: boolean) => {
        const relativePosition = sub(p, planetPosn);

        const distance = length(relativePosition);
        const speed = length(velo);
        const orbitalVelocity = perpendicular(velo, relativePosition);
        const orbitalSpeed = length(orbitalVelocity);

        const effectiveGravity = planetGravity * (planetRadius / distance) ** 2;

        if (log) {
          const LOG_INTERVAL = 500;
          // const GRAVITATIONAL_CONSTANT = 0.000_000_000_066_74;

          const standardGravitationalParameter =
            planetGravity * planetRadius ** 2;

          // const impliedMass =
          //   standardGravitationalParameter / GRAVITATIONAL_CONSTANT;

          const specificOrbitalEnergy =
            speed ** 2 / 2 - standardGravitationalParameter / distance;

          const specificAngularMomentum = orbitalSpeed * distance;

          const eccentricity = Math.sqrt(
            1 +
              (2 * specificOrbitalEnergy * specificAngularMomentum ** 2) /
                standardGravitationalParameter ** 2
          );

          const semiMajorAxis =
            -standardGravitationalParameter / (2 * specificOrbitalEnergy);

          // const periapsis = semiMajorAxis * (1 - eccentricity);
          // const apoapsis = semiMajorAxis * (1 + eccentricity);

          const meanMotion = Math.sqrt(
            standardGravitationalParameter / semiMajorAxis ** 3
          ); // units: s^-1

          const meanAnomalyDelta =
            meanMotion / (TICK_PER_SECOND / LOG_INTERVAL);

          // const orbitalPeriod =
          //   2 *
          //   Math.PI *
          //   Math.sqrt(semiMajorAxis ** 3 / standardGravitationalParameter);

          const eccentricityVector = sub(
            scale(
              relativePosition,
              dotProduct(velo, velo) / standardGravitationalParameter -
                1 / length(relativePosition)
            ),
            scale(
              velo,
              dotProduct(relativePosition, velo) /
                standardGravitationalParameter
            )
          );
          // const eccentricityVectorLength = length(eccentricityVector);

          // const relativEmptyFocusPosition = scale(
          //   eccentricityVector,
          //   -2 * semiMajorAxis
          // );

          // const constant =
          //   length(sub(relativEmptyFocusPosition, relativePosition)) +
          //   length(relativePosition); // calculate ellpise as the points where this = 2a

          const rawTrueAnomaly = angle(eccentricityVector, relativePosition);
          const rdotv = dotProduct(relativePosition, velo);
          const trueAnomaly =
            rdotv < 0 ? Math.PI * 2 - rawTrueAnomaly : rawTrueAnomaly; // 0/2pi = pericenter

          const meanAnomalyComponent =
            (Math.sqrt(1 - eccentricity ** 2) * Math.sin(trueAnomaly)) /
            (1 + eccentricity * Math.cos(trueAnomaly));

          const meanAnomaly = boundAngle(
            Math.atan2(
              meanAnomalyComponent,
              (eccentricity + Math.cos(trueAnomaly)) /
                (1 + eccentricity * Math.cos(trueAnomaly))
            ) -
              eccentricity * meanAnomalyComponent
          );

          // const eccentricAnomaly2 = Math.acos(
          //   (eccentricity + Math.cos(trueAnomaly)) /
          //     (1 + eccentricity * Math.cos(trueAnomaly))
          // );
          // const meanAnomaly2 =
          //   eccentricAnomaly2 - eccentricity * Math.sin(eccentricAnomaly2);

          const nextMeanAnomaly = boundAngle(meanAnomaly + meanAnomalyDelta);

          const nextEccentricAnomaly = getEccentricAnomaly({
            meanAnomaly: nextMeanAnomaly,
            eccentricity,
          });

          // TODO: wtf to do if it's hyperbolic
          if (nextEccentricAnomaly === null) {
            return rescale(relativePosition, -effectiveGravity);
          }
          const nextTrueAnomaly =
            2 *
            Math.atan2(
              Math.sin(nextEccentricAnomaly / 2) * Math.sqrt(1 + eccentricity),
              Math.cos(nextEccentricAnomaly / 2) * Math.sqrt(1 - eccentricity)
            );
          const nextDistance =
            semiMajorAxis * (1 - eccentricity * Math.cos(nextEccentricAnomaly));

          const nextFramePosition = scale(
            { x: Math.cos(nextTrueAnomaly), y: Math.sin(nextTrueAnomaly) },
            nextDistance
          );
          const nextFrameVelocity = scale(
            {
              x: Math.sin(nextEccentricAnomaly) * -1,
              y:
                Math.cos(nextEccentricAnomaly) *
                Math.sqrt(1 - eccentricity ** 2),
            },
            Math.sqrt(standardGravitationalParameter * semiMajorAxis) /
              nextDistance
          );
          const frameAngle = angle(eccentricityVector, { x: 1, y: 0 });

          const nextRelativePosition = rotate(nextFramePosition, -frameAngle);
          const nextVelocity = rotate(nextFrameVelocity, -frameAngle);

          if (
            tick % LOG_INTERVAL ===
            0
            // ||
            // (speed > 100 && tick % 50 === 0) ||
            // (speed > 200 && tick % 5 === 0)
          ) {
            console.table({
              tick,
              // posn,
              // velo,
              // speed,
              // orbitalSpeed,
              // standardGravitationalParameter,
              distance,
              nextDistance,
              // specificOrbitalEnergy,
              // specificAngularMomentum,
              // eccentricity,
              // semiMajorAxis,
              // periapsis,
              // apoapsis,
              // meanMotion,
              // orbitalPeriod,
              // eccentricityVector,
              // eccentricityVectorLength,
              relativePosition,
              nextRelativePosition,
              velo,
              nextVelocity,
              // relativEmptyFocusPosition,
              // constant,
              trueAnomaly,
              nextTrueAnomaly,
              meanAnomaly,
              // meanAnomaly2,
              nextMeanAnomaly,
              nextFramePosition,
              nextFrameVelocity,
              // eccentricAnomaly2,
              frameAngle,
              // rdotv,
            });
          }
        }

        // 2_996_703_626_011_387

        // 3 * 10 ** 15

        return rescale(relativePosition, -effectiveGravity);
      };

      const getAccel = (p: Vector, log: boolean = false) =>
        add(thrust, getGravity(p, log));

      const eulerMethod = (p: Vector) => getAccel(p, true);

      const midpointMethod = (p: Vector) => {
        const k1 = getAccel(p);

        const v1 = add(velo, scale(k1, 1 / TICK_PER_SECOND));
        const p1 = add(p, scale(v1, (1 / 2) * (1 / TICK_PER_SECOND)));
        return getAccel(p1);
      };

      // const ralstonMethod = ({ px, py }: { px: number; py: number }) => {
      //   const k1 = getAccel({ px, py });

      //   const a2_1 = 2 / 3;

      //   const v1x = velox + (k1.accelx * a2_1) / TICK_PER_SECOND;
      //   const v1y = veloy + (k1.accely * a2_1) / TICK_PER_SECOND;

      //   const p1x = px + (v1x * a2_1) / TICK_PER_SECOND;
      //   const p1y = py + (v1y * a2_1) / TICK_PER_SECOND;

      //   const k2 = getAccel({ px: p1x, py: p1y });

      //   return {
      //     accelx: k1.accelx * (1 / 4) + k2.accelx * (3 / 4),
      //     accely: k1.accely * (1 / 4) + k2.accely * (3 / 4),
      //   };
      // };
      const rk4Method = (p: Vector) => {
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

        const p0 = p;
        const v0 = velo;

        const k1 = getAccel(p0);
        const v1 = add(v0, scale(k1, a2_1 / TICK_PER_SECOND));
        const p1 = add(
          p0,
          scale(scale(add(v0, v1), 1 / 2), c2 / TICK_PER_SECOND)
        );

        const k2 = getAccel(p1);
        const v2 = add(v0, scale(k2, a3_2 / TICK_PER_SECOND));
        const p2 = add(
          p0,
          scale(scale(add(v0, v2), 1 / 2), c3 / TICK_PER_SECOND)
        );

        const k3 = getAccel(p2);
        const v3 = add(v0, scale(k3, a4_3 / TICK_PER_SECOND));
        const p3 = add(
          p0,
          scale(scale(add(v0, v3), 1 / 2), c4 / TICK_PER_SECOND)
        );

        const k4 = getAccel(p3);

        const a = add(
          add(add(scale(k1, b1), scale(k2, b2)), scale(k3, b3)),
          scale(k4, b4)
        );

        const v = add(
          add(add(scale(v0, b1), scale(v1, b2)), scale(v2, b3)),
          scale(v3, b4)
        );

        return { a, v };

        // const p1x = px;
        // const p1y = py;
        // const k1 = getAccel({ px: p1x, py: p1y });

        // const p2x =
        //   px +
        //   (velox * c2) / TICK_PER_SECOND +
        //   (k1.accelx * a2_1) / TICK_PER_SECOND / TICK_PER_SECOND;
        // const p2y =
        //   py +
        //   (veloy * c2) / TICK_PER_SECOND +
        //   (k1.accely * a2_1) / TICK_PER_SECOND / TICK_PER_SECOND;
        // const k2 = getAccel({ px: p2x, py: p2y });

        // const p3x =
        //   px +
        //   (velox * c3) / TICK_PER_SECOND +
        //   (k2.accelx * a3_2) / TICK_PER_SECOND / TICK_PER_SECOND;
        // const p3y =
        //   py +
        //   (veloy * c3) / TICK_PER_SECOND +
        //   (k2.accely * a3_2) / TICK_PER_SECOND / TICK_PER_SECOND;
        // const k3 = getAccel({ px: p3x, py: p3y });

        // const p4x =
        //   px +
        //   (velox * c4) / TICK_PER_SECOND +
        //   (k3.accelx * a4_3) / TICK_PER_SECOND / TICK_PER_SECOND;
        // const p4y =
        //   py +
        //   (veloy * c4) / TICK_PER_SECOND +
        //   (k3.accely * a4_3) / TICK_PER_SECOND / TICK_PER_SECOND;
        // const k4 = getAccel({ px: p4x, py: p4y });

        // return {
        //   accelx:
        //     k1.accelx * b1 + k2.accelx * b2 + k3.accelx * b3 + k4.accelx * b4,
        //   accely:
        //     k1.accely * b1 + k2.accely * b2 + k3.accely * b3 + k4.accely * b4,
        // };
      };

      const e = eulerMethod(posn);
      const m = midpointMethod(posn);
      // const r = ralstonMethod({ px: posnx, py: posny });
      const rk4 = rk4Method(posn);

      ppvelo = pvelo;
      pvelo = velo;
      // const evelo = add(velo, scale(e, 1 / TICK_PER_SECOND));
      // velo = add(velo, scale(rk4.a, 1 / TICK_PER_SECOND));
      // posn = add(posn, scale(evelo, 1 / TICK_PER_SECOND));
      velo = add(velo, scale(e, 1 / TICK_PER_SECOND));
      posn = add(posn, scale(velo, 1 / TICK_PER_SECOND));
      const rp = sub(planetPosn, posn);
      const d = length(rp);
      const theta = (Math.atan2(rp.y, rp.x) * 180) / Math.PI;

      if (
        ppvelo !== null &&
        pvelo !== null &&
        ((length(velo) > length(pvelo) && length(pvelo) < length(ppvelo)) ||
          (length(velo) < length(pvelo) && length(pvelo) > length(ppvelo)))
      ) {
        console.table({
          tick,
          d,
          theta,
          posn,
          velo,
          pvelo,
          ppvelo,
          e,
          m,
          // r,
          rk4a: rk4.a,
          rk4v: rk4.v,
        });
      }

      if (tick % 100 === 0) {
        // console.table({
        //   tick,
        //   posn,
        //   velo,
        //   e,
        //   m,
        //   // r,
        //   rk4a: rk4.a,
        //   rk4v: rk4.v,
        // });
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
      return posn;
    },
  });
};
