import CodeEditor from "@uiw/react-textarea-code-editor";
import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";

type SimulationParams = {
  yPos: number;
  yMaxPos: number;
  isFiring: boolean;
  isExploded: boolean;
};

const TICK_PER_SECOND = 1000;
const SECOND_LIMIT = 60;
const TICK_LIMIT = TICK_PER_SECOND * SECOND_LIMIT;
const LANDING_SPEED_THRESHOLD = 2;

const GRAVITY_ACCEL = -9.81;
const THRUST_ACCEL = -1 * GRAVITY_ACCEL + 1337 / SECOND_LIMIT;

const INITAL_Y_POS = 100;

const FRAME_PER_SECOND = 60;

const TICK_PER_FRAME = TICK_PER_SECOND / FRAME_PER_SECOND;

const getAsciiBox = ({
  yPos,
  yMaxPos,
  isFiring,
  isExploded,
}: SimulationParams) => {
  const internalWidth = 11;
  const internalHeight = 21;

  const rocketPos =
    internalHeight - Math.ceil((yPos / yMaxPos) * (internalHeight - 1)) - 1;

  let asciiString = ``;

  asciiString += "┌";
  asciiString += "─".repeat(internalWidth);
  asciiString += "┐\n";

  for (let i = 0; i < internalHeight; i += 1) {
    asciiString += "│";
    asciiString += " ".repeat(Math.floor((internalWidth - 1) / 2));

    if (i === rocketPos) {
      asciiString += isExploded ? "🔥" : "🚀";
    } else if (i === rocketPos + 1 && isFiring) {
      asciiString += "🔥";
    } else {
      asciiString += "  ";
    }

    asciiString += " ".repeat(Math.ceil((internalWidth - 1) / 2) - 1);
    asciiString += "│";

    const markerFrequency = Math.floor((internalHeight - 1) / 5);
    if (i % markerFrequency === 0) {
      asciiString += ` ${100 - (i / markerFrequency) * 20}m`.padStart(5, " "); // INITAL_Y_POS
    }

    asciiString += "\n";
  }

  asciiString += "└";
  asciiString += "─".repeat(internalWidth);
  asciiString += "┘";

  return asciiString;
};

const Simulation = ({
  yPos,
  yMaxPos,
  isFiring,
  isExploded,
}: SimulationParams) => {
  return (
    <div>
      <pre>
        {getAsciiBox({
          yPos,
          yMaxPos,
          isFiring,
          isExploded,
        })}
      </pre>
    </div>
  );
};

const preamble = `\
/**
 * time: in milliseconds, integer, non-negative
 * velo: in meters per second, floating point
 * posn: in meters, floating point, non-negative
 *
 * GRAVITY_ACCEL: in meters per second squared, -9.8 within sample simulation
 * THRUST_ACCEL: in meters per second squared, ${THRUST_ACCEL.toFixed(
   2
 )} within sample simulation
 */
function shouldFireBooster({time, velo, posn}, {GRAVITY_ACCEL, THRUST_ACCEL}) {`;
const Editor = ({
  code,
  setCode,
}: {
  code: string;
  setCode: (code: string) => void;
}) => {
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const handleClick = useCallback((e: MouseEvent) => {
    if (e.defaultPrevented) return;
    editorRef.current?.focus();
    editorRef.current?.setSelectionRange(
      editorRef.current?.value.length,
      editorRef.current?.value.length
    );
  }, []);

  return (
    <div
      className="w-full p-2 flex-grow bg-gray-100 dark:bg-slate-800"
      onClick={handleClick}
    >
      <CodeEditor
        value={preamble}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        // style={{
        //   fontSize: 12,
        //   backgroundColor: "rgb(30, 41, 59)",
        //   fontFamily:
        //     "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        // }}
        disabled
      />
      <CodeEditor
        value={code}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        // style={{
        //   fontSize: 12,
        //   backgroundColor: "rgb(30, 41, 59)",
        //   fontFamily:
        //     "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        // }}
        ref={editorRef}
        onClick={(e) => {
          e.preventDefault();
        }}
      />
      <CodeEditor
        value={"}"}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        // style={{
        //   fontSize: 12,
        //   backgroundColor: "rgb(30, 41, 59)",
        //   fontFamily:
        //     "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        // }}
        disabled
      />
    </div>
  );
};

function getShouldFireBooster(obj: string) {
  /* eslint-disable no-new-func */
  return Function('"use strict";return (' + obj + ")")();
  /* eslint-enable no-new-func */
}

export const Level0 = () => {
  const [code, setCode] = useState(
    localStorage.getItem("level0-shouldFireBooster") ?? `  return false;`
  );
  const [yPos, setYPos] = useState(INITAL_Y_POS);
  const [isFiring, setIsFiring] = useState(false);
  const [result, setResult] = useState<
    "success" | "failure" | "timeout" | null
  >(null);
  const [resultTime, setResultTime] = useState<number | null>(null);
  const [resultSpeed, setResultSpeed] = useState<number | null>(null);
  const yMaxPos = INITAL_Y_POS;
  const [handleReset, setHandleReset] = useState<(() => void) | null>(null);

  useEffect(() => {
    localStorage.setItem("level0-shouldFireBooster", code);
  }, [code]);

  const runSimuation = useCallback(() => {
    if (handleReset) {
      handleReset();
    }

    let posn = 100;
    let velo = 0;
    let tick = 0;
    let fireCount = 0;
    let frameTickCount = 0;
    let frameCount = 0;

    const shouldFireBooster = getShouldFireBooster(`${preamble}\n${code}\n}`);

    const simulateOneTick = () => {
      velo += GRAVITY_ACCEL / TICK_PER_SECOND;
      if (
        shouldFireBooster(
          {
            time: tick, // hmmm
            posn,
            velo,
          },
          { GRAVITY_ACCEL, THRUST_ACCEL }
        )
      ) {
        fireCount += 1;
        velo += THRUST_ACCEL / TICK_PER_SECOND;
      }
      posn += velo / TICK_PER_SECOND;
      tick += 1;
      frameTickCount += 1;
    };

    const simulateOneFrame = () => {
      while (
        tick < TICK_LIMIT &&
        posn > 0 &&
        tick < (frameCount + 1) * TICK_PER_FRAME
      ) {
        simulateOneTick();
      }

      setYPos(posn);
      setIsFiring(fireCount / frameTickCount > 0.5);

      frameTickCount = 0;
      frameCount += 1;
      fireCount = 0;
    };

    let intervalHandle: any;

    const handleInterval = () => {
      simulateOneFrame();

      if (tick >= TICK_LIMIT) {
        setResult("timeout");
        setResultTime(tick / TICK_PER_SECOND);
        setResultSpeed(Math.abs(velo));
        clearInterval(intervalHandle);
        return;
      }

      if (posn < 0) {
        // handle resolution
        if (velo > 0) {
          throw new Error("wtf");
        }
        if (velo > -2) {
          setResult("success");
        } else {
          setResult("failure");
        }
        setResultTime(tick / TICK_PER_SECOND);
        setResultSpeed(Math.abs(velo));
        clearInterval(intervalHandle);
        return;
      }
    };

    intervalHandle = setInterval(handleInterval, 1000 / FRAME_PER_SECOND);

    setHandleReset(() => () => {
      setYPos(INITAL_Y_POS);
      setIsFiring(false);
      setResult(null);
      setResultTime(null);
      setResultSpeed(null);
      clearInterval(intervalHandle);
    });
  }, [code, handleReset]);

  const submitForEvaluation = useCallback(() => {
    alert("TODO");
  }, []);
  return (
    <div>
      <ul className="ml-8 mb-8 list-disc">
        <li>
          `shouldFireBooster` will be called once per simulation millisecond
        </li>
        <li>
          if it returns true, the thruster will fire for that millisecond,
          otherwise free-fall
        </li>
        <li>the barge will begin at an altitude of {INITAL_Y_POS}m</li>
        <li>
          the barge must reach altitude 0m with a speed no greater than{" "}
          {LANDING_SPEED_THRESHOLD}m/s
        </li>
        <li>faster = better</li>
        <li>
          the simulation will automatically terminate after {SECOND_LIMIT}{" "}
          seconds
        </li>
      </ul>
      <div className="flex flex-row">
        <div className="w-64">
          <Simulation
            yPos={yPos}
            yMaxPos={yMaxPos}
            isFiring={isFiring}
            isExploded={result === "failure"}
          />
        </div>
        <div className="flex flex-col w-full max-w-6xl">
          <Editor code={code} setCode={setCode} />
          <div className="flex flex-row py-4 px-8">
            <button className="p-2 underline" onClick={runSimuation}>
              Test Program &gt;&gt;
            </button>
            <button
              className="p-2 underline"
              onClick={handleReset || (() => {})}
            >
              Abort &gt;&gt;
            </button>
            <button className="p-2 underline" onClick={submitForEvaluation}>
              Submit for Evaluation &gt;&gt;
            </button>
          </div>
          <div className="flex flex-row py-4 px-8">
            <div>
              {result === "success" && <div>Success!</div>}
              {(result === "failure" || result === "timeout") && (
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
        </div>
      </div>
    </div>
  );
};
