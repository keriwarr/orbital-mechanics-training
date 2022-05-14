import { useEffect, useRef } from "react";
import { getSandboxedFunction } from "../util/sandbox";
import { level1Simulation } from "./simulation";

export const Level1 = () => {
  const runningEffectRef = useRef(false);
  useEffect(() => {
    if (runningEffectRef.current) return;
    runningEffectRef.current = true;
    level1Simulation({
      initialPosn: { x: 100, y: 100 },
      initialVelo: { x: -5, y: 1 },
      thrustAccel: 1,
      planetGravity: 1000,
      planetPosn: { x: 10, y: 10 },
      planetRadius: 2,
      touchdownSpeedThreshold: -2,
      timeoutSeconds: 100,

      // touchdownSpeedThreshold: LANDING_SPEED_THRESHOLD,
      shouldFireBooster: getSandboxedFunction(`() => false`),
    })({
      // params: ,
      handleFrameData: (frameDatum) => {
        // console.log(frameDatum);
      },
      handleResultData: (result) => {
        console.log(result);
      },
    });
  }, []);
  return <div>level 1 coming soon...</div>;
};
