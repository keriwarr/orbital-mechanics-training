import CodeEditor from "@uiw/react-textarea-code-editor";
import { useCallback, useRef, useState } from "react";

const getAsciiBox = ({
  yPos,
  yMaxPos,
  isFiring,
}: //   exploded,
{
  yPos: number;
  yMaxPos: number;
  isFiring: boolean;
  //   exploded: boolean;
}) => {
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
      asciiString += "🚀";
    } else if (i === rocketPos + 1 && isFiring) {
      asciiString += "🔥";
    } else {
      asciiString += "  ";
    }

    asciiString += " ".repeat(Math.ceil((internalWidth - 1) / 2) - 1);
    asciiString += "│";

    const markerFrequency = Math.floor((internalHeight - 1) / 5);
    if (i % markerFrequency === 0) {
      asciiString += ` ${100 - (i / markerFrequency) * 20}m`.padStart(5, " ");
    }

    asciiString += "\n";
  }

  asciiString += "└";
  asciiString += "─".repeat(internalWidth);
  asciiString += "┘";

  return asciiString;
};

const Simulation = () => {
  return (
    <div>
      <pre>
        {getAsciiBox({
          yPos: 100,
          yMaxPos: 100,
          isFiring: false,
          //   exploded: false,
        })}
      </pre>
    </div>
  );
};

const Editor = () => {
  const preAmble = `\
/**
 * time: in milliseconds, integer, non-negative
 * velo: in meters per second, floating point
 * posn: in meters, floating point, non-negative
 *
 * GRAVITY_ACCEL: in meters per second squared, -9.8 within sample simulation
 * THRUST_ACCEL: in meters per second squared, 30 within sample simulation
 */
function shouldFireBooster({time, velo, posn}, {GRAVITY_ACCEL, THRUST_ACCEL}) {`;
  const [code, setCode] = useState(`  return false;`);
  const editorRef = useRef<HTMLTextAreaElement | null>(null);

  const handleClick = useCallback(() => {
    editorRef.current?.focus();
    editorRef.current?.setSelectionRange(
      editorRef.current?.value.length,
      editorRef.current?.value.length
    );
  }, []);

  return (
    <div className="ml-8 w-full p-2 bg-slate-800" onClick={handleClick}>
      <CodeEditor
        value={preAmble}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        style={{
          fontSize: 12,
          backgroundColor: "rgb(30, 41, 59)",
          fontFamily:
            "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        }}
        disabled
      />
      <CodeEditor
        value={code}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        style={{
          fontSize: 12,
          backgroundColor: "rgb(30, 41, 59)",
          fontFamily:
            "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        }}
        ref={editorRef}
      />
      <CodeEditor
        value={"}"}
        language="js"
        onChange={(evn) => setCode(evn.target.value)}
        padding={0}
        style={{
          fontSize: 12,
          backgroundColor: "rgb(30, 41, 59)",
          fontFamily:
            "ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace",
        }}
        disabled
      />
    </div>
  );
};

export const Level0 = () => {
  return (
    <div>
      <ul className="ml-8 mb-8 list-disc">
        <li>
          shouldFireBooster will be called once per simulation millisecond
        </li>
        <li>
          if it returns true, the thruster will fire for that millisecond,
          otherwise free-fall
        </li>
        <li>
          the barge must reach altitude 0 with a speed no greater than 2 m/s
        </li>
        <li>faster = better</li>
        <li>the simulation will automatically terminate after 60 seconds</li>
      </ul>
      <div className="flex flex-row">
        <Simulation />
        <Editor />
      </div>
    </div>
  );
};
