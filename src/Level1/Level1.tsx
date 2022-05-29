import { useEffect, useRef, useState } from "react";
import { Simulation } from "../components/Visualization2D";
import { FRAME_PER_SECOND } from "../util/cancelableBatchSimulation";
import { getSandboxedFunction } from "../util/sandbox";
import { level1Simulation } from "./simulation";

export const Level1 = () => {
  const runningEffectRef = useRef(false);
  const [renderPosn, setRenderPosn] = useState({ x: 100, y: 100 });

  useEffect(() => {
    if (runningEffectRef.current) return;
    runningEffectRef.current = true;

    let frameData: Array<{ x: number; y: number } | { result: string }> = [];

    level1Simulation({
      initialPosn: { x: 100, y: 100 },
      initialVelo: { x: -10, y: 1 },
      thrustAccel: 11,
      planetGravity: 50000,
      planetPosn: { x: 10, y: 10 },
      planetRadius: 2,
      touchdownSpeedThreshold: -2,
      timeoutSeconds: 100,

      // touchdownSpeedThreshold: LANDING_SPEED_THRESHOLD,
      // shouldFireBooster: getSandboxedFunction(`() => PI`),
      shouldFireBooster: getSandboxedFunction(`() => false`),
    })({
      // params: ,
      handleFrameData: (frameDatum) => {
        frameData.push(frameDatum);
      },
      handleResultData: (result) => {
        frameData.push(result);
      },
    });

    const renderFrameData = () => {
      const frameDatum = frameData.shift();

      if (!frameDatum) return;

      if ("result" in frameDatum) {
        window.clearInterval(renderIntervalHandler);
        return;
      }

      setRenderPosn(frameDatum);
    };

    const renderIntervalHandler = setInterval(
      renderFrameData,
      1000 / FRAME_PER_SECOND
    );
  }, []);
  return (
    <div>
      <Simulation
        posn={renderPosn}
        bounds={{
          x1: -100,
          x2: 200,
          y1: -100,
          y2: 200,
        }}
        planetPosn={{ x: 10, y: 10 }}
        planetRadius={2}
      />
    </div>
  );
};
