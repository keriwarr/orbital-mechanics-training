/**
 * time: in milliseconds, integer, non-negative
 * velo: in meters per second, floating point
 * posn: in meters, floating point, non-negative
 *
 * GRAVITY_ACCEL: in meters per second squared, ${GRAVITY_ACCEL} within sample
   simulation
 * THRUST_ACCEL: in meters per second squared, ${THRUST_ACCEL.toFixed( 2 )}
   within sample simulation
 */
export function shouldFireBooster(
  { time, velo, posn },
  { GRAVITY_ACCEL, THRUST_ACCEL }
) {
  // c.f. return time > 3765

  const TICK_PER_SECOND = 1000;
  const NET_ACCEL = GRAVITY_ACCEL + THRUST_ACCEL;
  const TARGET_VELO = -2;

  const THRUST_ACCEL_PER_TICK = THRUST_ACCEL / TICK_PER_SECOND;
  const GRAVITY_ACCEL_PER_TICK = GRAVITY_ACCEL / TICK_PER_SECOND;
  const NET_ACCEL_PER_TICK = NET_ACCEL / TICK_PER_SECOND;

  const GRAVITY_POSN_DELTA = GRAVITY_ACCEL / TICK_PER_SECOND / TICK_PER_SECOND;
  const THRUST_POSN_DELTA = NET_ACCEL / TICK_PER_SECOND / TICK_PER_SECOND;
  const NET_POSN_DELTA = THRUST_ACCEL / TICK_PER_SECOND / TICK_PER_SECOND;

  if (time === 0) {
    // STEP 1: find the time a continuous solution would take and ceiling that

    // assuming target velo = 0
    const minFullStopContinuousTime = Math.sqrt(
      (2 * posn) /
        ((-GRAVITY_ACCEL_PER_TICK * NET_ACCEL_PER_TICK) /
          (-GRAVITY_ACCEL_PER_TICK + NET_ACCEL_PER_TICK) /
          TICK_PER_SECOND)
    );
    // how long would it take to slow down from target velo to 0
    const targetVeloToFullStopTime = Math.abs(TARGET_VELO / NET_ACCEL_PER_TICK);
    const minTotalContinuousTime =
      minFullStopContinuousTime - targetVeloToFullStopTime;
    const minDiscreteTime = Math.ceil(minTotalContinuousTime);

    // STEP 2: starting from there increment until a viable time is found

    const [viableTime, viableThrustCount, viableDistance] = (() => {
      for (let candidateTime = minDiscreteTime + 3; ; candidateTime += 1) {
        // STEP 2a: a viable time is one that can be divided into some number of
        // free-fall ticks and some number of gravity ticks such that the
        // resulting velocity will be between zero and the target velocity

        const finalVelocityIfFreeFall = GRAVITY_ACCEL_PER_TICK * candidateTime;
        const neededDeltaV = finalVelocityIfFreeFall - TARGET_VELO;
        const neededThrustTicksUpperLimit = Math.abs(
          neededDeltaV / THRUST_ACCEL_PER_TICK
        );
        // assuming target velo is negative, round UP so that we err on the side
        // of going too slow
        const candidateThrustCount = Math.ceil(neededThrustTicksUpperLimit);
        const candidateFreeFallCount = candidateTime - candidateThrustCount;

        const candidateFinalVelocity =
          candidateFreeFallCount * GRAVITY_ACCEL_PER_TICK +
          candidateThrustCount * NET_ACCEL_PER_TICK;

        if (
          candidateFinalVelocity >= 0 ||
          candidateFinalVelocity <= TARGET_VELO
        ) {
          continue;
        }

        // STEP 2b: we need to make sure we can actually get to the ground
        // within `candidateTime` ticks. We go the furthest by doing all of our
        // `candidateFreeFallCount` ticks up front and then all of our
        // `candidateThrustCount` ticks after that. If this doesn't get us all
        // the way to the ground, we'll need more time

        // how far we fall in the free-fall phase of the hypothetical
        // max-distance strategy
        const freeFallDistance = Math.abs(
          ((candidateFreeFallCount ** 2 + candidateFreeFallCount) / 2) *
            GRAVITY_POSN_DELTA
        );

        // how far we fall in the thrusting phase of the hypothetical
        // max-distance strategy
        const thrustingDistance =
          Math.abs(
            ((candidateThrustCount ** 2 - candidateThrustCount) / 2) *
              THRUST_POSN_DELTA
          ) +
          Math.abs(
            (candidateFinalVelocity * candidateThrustCount) / TICK_PER_SECOND
          );
        const totalOffOnDistance = freeFallDistance + thrustingDistance;

        if (totalOffOnDistance > posn) {
          return [candidateTime, candidateThrustCount, totalOffOnDistance];
        }
      }
    })();
    const viableFreeFallCount = viableTime - viableThrustCount;

    // STEP 3: now we have a number of ticks for which we'll be free-falling,
    // and a number for which we'll be thrusting, we know that we can combine
    // them to reach a valid final velocity, and that we'll be able to reach the
    // ground in that time.
    //
    // The only way this goes wrong is if we "over-shoot" and crash into the
    // ground. We can ensure that we approach our target final velocity from a
    // relatively higher altitude by rearranging the thrusting ticks.
    //
    // The "unit" by which we can alter our approach altitude is precicely the
    // change in distance travelled caused by swapping an adjacent pair of
    // "thrust" and "free-fall" ticks, that's what NET_POSN_DELTA is.

    // how much do we want to reduce our approach altitude by, so that we reach
    // our target velocity precicely when we reach an altitude of zero?
    const neededUpwardsPosnUnitsLimit =
      (viableDistance - posn) / NET_POSN_DELTA;
    // floor that so that we definitively cross the zero-altitude threshold
    const neededUpwardsPosnUnits = Math.floor(neededUpwardsPosnUnitsLimit);

    // STEP 4: We know how many units we would overshoot the ground by. How do
    // we rearrange our thrusting ticks to reduce by that much?

    // find a (nearly square) rectangle that "uses up" as many of the units as
    // possible
    const rectWidthUnits = Math.floor(Math.sqrt(neededUpwardsPosnUnits));
    const rectHeightUnits = Math.floor(neededUpwardsPosnUnits / rectWidthUnits);
    // and remember how many are left over
    const remainderUnits =
      neededUpwardsPosnUnits - rectWidthUnits * rectHeightUnits;

    // and assemble into a firing plan!
    const firingPlan = [
      ...Array(viableFreeFallCount - rectHeightUnits - 1).fill(false),
      ...Array(remainderUnits).fill(true),
      ...Array(1).fill(false),
      ...Array(rectWidthUnits - remainderUnits).fill(true),
      ...Array(rectHeightUnits).fill(false),
      ...Array(viableThrustCount - rectWidthUnits).fill(true),
    ];

    /**
     * the speed over time graph will look something like this.
     *  - "A" represents the early thrusting sequence of length `rectWidthUnits`
     *  - "B" represents the late free-fall sequence of length `rectHeightUnits`
     *    +--------------------------------------------------------------------+
     * |                                                                    |
     * |                                                                    |
     * |                                                                    |
     * |                                                                    |
     * |                                   --                               |
     * |                                --/  -\                             |
     * |                              -/    A  \        --                  |
     * |                           --/          -\  ---/  -\                |
     * |                        --/               -/   B    \               |
     * |                     --/                             -\             |
     * |                   -/                                  -\           |
     * |                --/                                      \          |
     * |             --/                                          -\        |
     * |          --/                                               \       |
     * |       --/                                                   -\     |
     * |     -/                                                        -\   |
     * |  --/                                                            \  |
     * |-/                                                                -\|
     *   +---------------------------------------------------------------------
     */

    window.firingPlan = firingPlan;
  }

  return window.firingPlan[time];
}
