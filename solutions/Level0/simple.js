export function shouldFireBooster(
  { time, velo, posn },
  { GRAVITY_ACCEL, THRUST_ACCEL }
) {
  const TICK_PER_SECOND = 1000;
  const NET_ACCEL = THRUST_ACCEL + GRAVITY_ACCEL;
  const targetVelo = -2 + 0.72; /** mystery constant */
  const extrapolatedPosn =
    posn +
    (velo + GRAVITY_ACCEL / TICK_PER_SECOND) /
      (TICK_PER_SECOND - 200) /** another mystery constant! */ /
      2;

  const neededTime = (2 * extrapolatedPosn) / Math.abs(velo + targetVelo);
  const neededAccel = (targetVelo - velo) / neededTime;

  return neededAccel > NET_ACCEL;
}
