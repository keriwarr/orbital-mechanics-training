import { useCallback, useEffect, useState } from "react";
import { Editor } from "./Editor";
import { getSandboxedFunction } from "./sandbox";
import { Simulation } from "./Simulation";
import {
  FRAME_PER_SECOND,
  runSimulation,
  SimulationFrameData,
  SimulationResultData,
  TICK_PER_SECOND,
  DEFAULT_TIMEOUT_SECONDS,
} from "./engine";

import {
  triggerGithubAuthentication,
  findGist,
  createGist,
  saveCodeAndResultsToGist,
  getGist,
  getGistCodeFileName,
} from "../codesync";
import { Button } from "../components/Button";
import { Link } from "react-router-dom";

const LANDING_SPEED_THRESHOLD = 2;
const GRAVITY_ACCEL = -9.8;
const THRUST_ACCEL = -1 * GRAVITY_ACCEL + 1337 / DEFAULT_TIMEOUT_SECONDS;
const INITAL_POSN = 100;

export const preamble = `\
/**
 * time: in milliseconds, integer, non-negative
 * velo: in meters per second, floating point
 * posn: in meters, floating point, non-negative
 *
 * GRAVITY_ACCEL: in meters per second squared
 * THRUST_ACCEL: in meters per second squared
 */
function shouldFireBooster({time, velo, posn}, {GRAVITY_ACCEL, THRUST_ACCEL}) {`;
const startingCode = `  return false;`;
export const postamble = "}";

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

export const Level0 = () => {
  // FIXME(joey): Consider loading the code from gist. It might be best to put
  // that behind a button to avoid overwriting local state. Even better, check
  // the age of the updated code vs Github. At worst, Github can be overwritten
  // as version history is retained.
  const [code, setCode] = useState(
    localStorage.getItem("level0-shouldFireBooster") ?? startingCode
  );
  const [renderPosn, setRenderPosn] = useState(INITAL_POSN);
  const [isFiring, setIsFiring] = useState(false);
  const [result, setResult] = useState<
    "landed" | "crashed" | "timedout" | null
  >(null);
  const [resultTime, setResultTime] = useState<number | null>(null);
  const [resultSpeed, setResultSpeed] = useState<number | null>(null);
  const [handleReset, setHandleReset] = useState<(() => void) | null>(null);
  const [evaluationResultText, setEvaluationResultText] = useState<
    string | null
  >(null);

  const [initialPosn, setInitialPosn] = useState(INITAL_POSN);
  const [gravityAccel, setGravityAccel] = useState(GRAVITY_ACCEL);
  const [thrustAccel, setThrustAccel] = useState(THRUST_ACCEL);

  const [simulationRunning, setSimulationRunning] = useState(false);

  const [levelComplete, setLevelComplete] = useState(
    localStorage.getItem("level0-complete") === "true"
  );

  const [githubAuthId, setGithubAuthId] = useState(
    localStorage.getItem("github-auth-id")
  );
  // TODO(joey): Check if the githubAuthId is still valid?

  const [githubGistId, setGithubGistId] = useState(
    localStorage.getItem("github-gist-id")
  );
  // TODO(joey): Check if the gist is still valid?

  useEffect(() => {
    localStorage.setItem("level0-shouldFireBooster", code);
    // TODO(joey): Add debounce for gist saving?
  }, [code]);

  const runSimuation = useCallback(() => {
    if (handleReset) {
      handleReset();
    }

    let cancelSignalResolver: () => void;
    const cancelSignal = new Promise<void>((resolve) => {
      cancelSignalResolver = resolve;
    });

    let frameData: Array<
      | ({ type: "frame" } & SimulationFrameData)
      | ({ type: "result" } & SimulationResultData)
    > = [];

    if (githubAuthId && githubGistId) {
      saveCodeAndResultsToGist(githubAuthId, githubGistId, 0, code, null);
    }

    setSimulationRunning(true);

    runSimulation({
      params: {
        initialPosn,
        initialVelo: 0,
        gravityAccel,
        thrustAccel,
        touchdownSpeedThreshold: LANDING_SPEED_THRESHOLD,
        shouldFireBooster: getSandboxedFunction<ShouldFireBooster>(
          `${preamble}\n${code}\n${postamble}`
        ),
      },
      cancelSignal,
      handleFrameData: (frameDatum) => {
        frameData.push({ type: "frame", ...frameDatum });
      },
      handleResult: (result) => {
        frameData.push({
          type: "result",
          ...result,
        });
      },
    });

    const renderFrameData = () => {
      const frameDatum = frameData.shift();

      if (!frameDatum) return;

      setRenderPosn(frameDatum.posn);

      if (frameDatum.type === "frame") {
        setIsFiring(frameDatum.isFiring);
      }

      if (frameDatum.type === "result") {
        setResult(frameDatum.result);
        setResultTime(frameDatum.resultTimeMS / TICK_PER_SECOND);
        setResultSpeed(frameDatum.resultSpeed);
        setIsFiring(false);
        setSimulationRunning(false);
        window.clearInterval(renderIntervalHandler);
      }
    };

    const renderIntervalHandler = setInterval(
      renderFrameData,
      1000 / FRAME_PER_SECOND
    );

    // TODO(joey): Save code to Github?

    setHandleReset(() => () => {
      setRenderPosn(initialPosn);
      setIsFiring(false);
      setResult(null);
      setResultTime(null);
      setResultSpeed(null);
      cancelSignalResolver();
      window.clearInterval(renderIntervalHandler);
    });
  }, [
    handleReset,
    githubAuthId,
    githubGistId,
    initialPosn,
    gravityAccel,
    thrustAccel,
    code,
  ]);

  const connectToGithub = useCallback(async () => {
    try {
      const authId = await triggerGithubAuthentication();

      if (!authId) throw new Error("Missing authId!");

      setGithubAuthId(authId);
      localStorage.setItem("github-auth-id", authId);

      let gist = await findGist(authId);

      if (!gist) {
        gist = await createGist(authId);
      }

      if (!gist) throw new Error("Failed to create gist");

      setGithubGistId(gist.id);
      localStorage.setItem("github-gist-id", gist.id);
    } catch (e) {
      console.error(e);
    }
  }, []);

  const loadCodeFromGithub = useCallback(async () => {
    try {
      if (!githubAuthId) throw new Error("Missing auth ID!");
      if (!githubGistId) throw new Error("Missing gist ID!");
      const gist = await getGist(githubAuthId, githubGistId);

      if (!gist) throw new Error("Failed to find gist");

      setCode(gist.files[getGistCodeFileName({ levelNo: 0 })].content);
    } catch (e) {
      console.error(e);
    }
  }, [githubAuthId, githubGistId]);

  const openGithub = useCallback(() => {
    window.open(`https://gist.github.com/${githubGistId}`);
  }, [githubGistId]);

  const submitForEvaluation = useCallback(() => {
    setEvaluationResultText("Loading ...");

    const results: Array<
      SimulationResultData & {
        initialPosn: number;
        gravityAccel: number;
        thrustAccel: number;
      }
    > = [];
    const freeFallResults: Array<
      SimulationResultData & {
        initialPosn: number;
        gravityAccel: number;
        thrustAccel: number;
      }
    > = [];

    let resultCount = 0;

    const shouldFireBooster = getSandboxedFunction<ShouldFireBooster>(
      `${preamble}\n${code}\n${postamble}`
    );

    const shouldNotFireBooster = getSandboxedFunction<ShouldFireBooster>(
      `${preamble}\nreturn false\n${postamble}`
    );

    const POSN_VARIATIONS = 8;
    const GRAVITY_VARIATIONS = 4;
    const THRUST_VARIATIONS = 4;
    const NUM_VARIATIONS =
      POSN_VARIATIONS * GRAVITY_VARIATIONS * THRUST_VARIATIONS;

    const handleResults = () => {
      const numLanded = results.filter(
        ({ result }) => result === "landed"
      ).length;
      const numCrashed = results.filter(
        ({ result }) => result === "crashed"
      ).length;
      const numTimedOut = results.filter(
        ({ result }) => result === "timedout"
      ).length;
      const meanLandingSpeed =
        results.reduce((sum, next) => sum + next.resultSpeed, 0) /
        results.length;
      const maxLandingSpeed = Math.max(
        ...results.map(({ resultSpeed }) => resultSpeed)
      );
      const totalRocketFireCount = results.reduce(
        (sum, next) => sum + next.totalFireCount,
        0
      );

      const failedCases = results.filter(({ result }) => result !== "landed");

      const squareMeanSqrtDifference = Math.pow(
        results
          .map(({ initialPosn, gravityAccel, thrustAccel, resultTimeMS }) => {
            const freeFallTime = freeFallResults.find(
              (result) =>
                result.initialPosn === initialPosn &&
                result.gravityAccel === gravityAccel &&
                result.thrustAccel === thrustAccel
            )?.resultTimeMS;

            if (!freeFallTime) {
              throw new Error("missing free fall result for config");
            }

            return Math.sqrt(resultTimeMS - freeFallTime);
          })
          .reduce((p, n) => p + n, 0) / results.length,
        2
      );

      const success = numCrashed === 0 && numTimedOut === 0;

      if (success) {
        setLevelComplete(true);
        localStorage.setItem("level0-complete", "true");
      }

      const evaluationText = `${
        success
          ? `Congratulations! Your submission passed all ${NUM_VARIATIONS} test cases.`
          : `Some test cases failed.`
      }
Successful landings: ${numLanded}
Crash landings: ${numCrashed}
Time-outs (240s): ${numTimedOut}

Mean Landing Speed: ${meanLandingSpeed.toFixed(3)}
Max Landing Speed: ${maxLandingSpeed.toFixed(3)}
Number of times rocket fired: ${totalRocketFireCount}
Score (lower is better): ${squareMeanSqrtDifference.toFixed(3)}
${
  failedCases.length === 0
    ? ""
    : `
Failed Test cases:
${failedCases
  .map(
    ({ initialPosn, gravityAccel, thrustAccel }) =>
      `initialPosn: ${initialPosn}, gravityAccel: ${gravityAccel}, thrustAccel: ${thrustAccel}`
  )
  .join("\n")}`
}`;

      if (githubAuthId && githubGistId) {
        saveCodeAndResultsToGist(
          githubAuthId,
          githubGistId,
          0,
          code,
          evaluationText
        );
      }

      setEvaluationResultText(evaluationText);
    };

    for (
      let initialPosn = 20;
      initialPosn < 20 * 2 ** POSN_VARIATIONS;
      initialPosn *= 2
    ) {
      const lowestGravity = Math.min(-2, -initialPosn / 128);

      for (
        let gravityAccel = lowestGravity;
        gravityAccel > lowestGravity * 2 ** GRAVITY_VARIATIONS;
        gravityAccel *= 2
      ) {
        const lowestAccel = gravityAccel * -1.5;

        for (
          let thrustAccel = lowestAccel;
          thrustAccel < gravityAccel * -1.5 * 2 ** THRUST_VARIATIONS;
          thrustAccel *= 2
        ) {
          const config = {
            initialPosn,
            gravityAccel,
            thrustAccel,
          };
          const commonParams = {
            ...config,
            initialVelo: 0,
            touchdownSpeedThreshold: LANDING_SPEED_THRESHOLD,
            timeoutSeconds: 240,
          };

          // check free-fall time
          runSimulation({
            params: {
              ...commonParams,
              shouldFireBooster: shouldNotFireBooster,
            },
            // eslint-disable-next-line no-loop-func
            handleResult: (result) => {
              freeFallResults.push({
                ...config,
                ...result,
              });
              resultCount += 1;
              if (resultCount === NUM_VARIATIONS * 2) {
                handleResults();
              }
            },
          });

          // check actual time
          runSimulation({
            params: { ...commonParams, shouldFireBooster },
            // eslint-disable-next-line no-loop-func
            handleResult: (result) => {
              results.push({
                ...config,
                ...result,
              });
              resultCount += 1;
              if (resultCount === NUM_VARIATIONS * 2) {
                handleResults();
              }
            },
          });
        }
      }
    }
  }, [code, githubAuthId, githubGistId]);

  return (
    <div className="flex flex-col flex-grow">
      <ul className="ml-8 mb-8 list-disc">
        <li>
          `shouldFireBooster` will be called once per simulation millisecond
        </li>
        <li>
          if it returns true, the thruster will fire for that millisecond,
          otherwise free-fall
        </li>
        <li>the barge will begin at an altitude of {initialPosn}m</li>
        <li>
          the barge must reach altitude 0m with a speed no greater than{" "}
          {LANDING_SPEED_THRESHOLD}m/s
        </li>
        <li>faster = better</li>
        <li>
          the simulation will automatically terminate after{" "}
          {DEFAULT_TIMEOUT_SECONDS} seconds
        </li>
      </ul>
      <div className="flex flex-row flex-grow">
        <div className="w-64 flex flex-col pr-4">
          <Simulation
            posn={renderPosn}
            maxPosn={initialPosn}
            isFiring={isFiring}
            isExploded={result === "crashed"}
          />
          <label htmlFor="initialPosn">INITIAL_POSN:</label>
          <input
            className="dark:bg-slate-700 px-2 py-0.5 mb-2"
            id="initialPosn"
            type="number"
            value={initialPosn}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (Number.isFinite(val) && val > 0) {
                setInitialPosn(val);
                if (!simulationRunning) {
                  setRenderPosn(val);
                }
              }
            }}
          />
          <label htmlFor="gravityAccel">GRAVITY_ACCEL:</label>
          <input
            className="dark:bg-slate-700 px-2 py-0.5 mb-2"
            id="gravityAccel"
            type="number"
            value={gravityAccel}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (Number.isFinite(val) && val < 0) {
                setGravityAccel(val);
              }
            }}
          />
          <label htmlFor="thrustAccel">THRUST_ACCEL:</label>
          <input
            className="dark:bg-slate-700 px-2 py-0.5 mb-2"
            id="thrustAccel"
            type="number"
            value={thrustAccel}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (Number.isFinite(val) && val > 0) {
                setThrustAccel(val);
              }
            }}
          />
        </div>
        <div className="flex flex-col w-full max-w-6xl">
          <Editor
            code={code}
            setCode={setCode}
            preamble={preamble}
            postamble={postamble}
          />
          <div className="flex flex-row pt-4 px-8">
            <Button onClick={runSimuation}>Test Program</Button>
            <Button onClick={handleReset || (() => {})}>Abort</Button>
            <Button onClick={submitForEvaluation}>Submit for Evaluation</Button>
          </div>
          <div className="flex flex-row px-8">
            {(githubAuthId == null || githubGistId == null) && (
              <Button onClick={connectToGithub}>Connect Github</Button>
            )}
            {githubAuthId != null && githubGistId != null && (
              <>
                <Button onClick={loadCodeFromGithub}>Load from Github</Button>
                <button onClick={openGithub}>
                  View code on Github &gt;&gt;
                </button>
              </>
            )}
          </div>
          <div className="flex flex-row pt-4 px-8">
            <div>
              {result === "landed" && <div>Success!</div>}
              {(result === "crashed" || result === "timedout") && (
                <div>
                  <p>Failure!</p>
                </div>
              )}
              {result !== null && (
                <div>
                  <p>
                    The simulation ran for {resultTime?.toFixed(3)} seconds.
                  </p>
                  <p>
                    The barge had a final speed of {resultSpeed?.toFixed(3)}{" "}
                    meters per second.
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col py-4 px-8">
            <pre>{evaluationResultText}</pre>
            {levelComplete && (
              <div className="mt-2">
                <Link to="/level/1/intro">
                  <Button>Continue</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
