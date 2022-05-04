

const POSN_VARIATIONS = 8;
const GRAVITY_VARIATIONS = 4;
const THRUST_VARIATIONS = 4;

const BASE_POSN = 20;
export const TEST_CASES = (() => {
  const cases = [];

  for (
    let posnIndex = 0; posnIndex < POSN_VARIATIONS; posnIndex += 1
  ) {
    const initialPosn = BASE_POSN * 2 ** posnIndex;
    const baseGravity = Math.min(-2, -initialPosn / 128);

    for (
      let gravityIndex = 0; gravityIndex < GRAVITY_VARIATIONS; gravityIndex += 1
    ) {
      const gravityAccel = baseGravity * 2 ** gravityIndex
      const baseThrust = gravityAccel * -1.5;

      for (
        let thrustIndex = 0; thrustIndex < THRUST_VARIATIONS; thrustIndex += 1
      ) {
        const thrustAccel = baseThrust * 2 ** thrustIndex;

        cases.push({
          initialPosn, gravityAccel, thrustAccel
        })
      }
    }
  }

  return cases;
})();

export const NUM_TEST_CASES = TEST_CASES.length;
