export const TICK_PER_SECOND = 1000;
export const FRAME_PER_SECOND = 60;

const SIMULATION_CHUNK_MS = 10; // simulate for 10ms at a time
const SIMULATION_CHUNK_INTERVAL_MS = 5; // take a 5ms break between each chunk

export const TICK_PER_MS = TICK_PER_SECOND / 1000;
const TICK_PER_FRAME = TICK_PER_SECOND / FRAME_PER_SECOND;

export const makeCancelableBatchSimulation =
  <ResultData, FrameData>({
    simulateOneTick,
    checkForResult,
    getFrameData,
  }: {
    simulateOneTick: (args: { tick: number }) => void;
    checkForResult: (args: { tick: number }) => ResultData | undefined;
    getFrameData?: (args: { frameTick: number }) => FrameData;
  }) =>
    ({
      handleFrameData,
      handleResultData: handleResult,
      cancelSignal,
    }: {
      handleResultData: (args: ResultData) => void;
      handleFrameData?: (args: FrameData) => void;
      cancelSignal?: Promise<void>;
    }) => {
      let tick = 0;
      let frameTick = 0;
      let frameCount = 1; // represents the pre-rendered initial condition

      let timeoutHandle: number | null = null;

      const simulateBatch = () => {
        const startTimeMs = performance.now();

        while (true) {
          simulateOneTick({ tick });

          tick += 1;
          frameTick += 1;

          const result = checkForResult({ tick });

          if (result) {
            handleResult(result);
            if (timeoutHandle) {
              window.clearTimeout(timeoutHandle);
            }
            return;
          }

          if (getFrameData && tick > frameCount * TICK_PER_FRAME) {
            const frameData = getFrameData({ frameTick });

            if (handleFrameData) {
              handleFrameData(frameData);
            }

            frameTick = 0;
            frameCount += 1;
          }

          if (tick % 100 === 0) {
            if (performance.now() - startTimeMs > SIMULATION_CHUNK_MS) {
              break;
            }
          }
        }

        if (timeoutHandle !== null) {
          timeoutHandle = window.setTimeout(
            simulateBatch,
            SIMULATION_CHUNK_INTERVAL_MS
          );
        }
      };

      timeoutHandle = window.setTimeout(simulateBatch, 0);

      cancelSignal?.then(() => {
        if (timeoutHandle !== null) {
          window.clearTimeout(timeoutHandle);
        }
      });
    };
