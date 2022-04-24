import React, { useState } from "react";
import { Intro } from "./Intro";
import { Level0 } from "./Level0";

enum STAGE {
  INTRO = "INTRO",
  LEVEL0 = "LEVEL0",
}

function App() {
  const [stage, setStage] = useState(STAGE.INTRO);

  return (
    <div className="p-8 font-mono">
      <h1 className="text-3xl font-bold mb-4">Mike</h1>
      {stage === STAGE.INTRO && (
        <>
          <Intro />
          <button
            className="p-2 underline"
            onClick={() => setStage(STAGE.LEVEL0)}
          >
            Continue &gt;&gt;
          </button>
        </>
      )}
      {stage === STAGE.LEVEL0 && (
        <>
          <Level0 />
        </>
      )}
    </div>
  );
}

export default App;
