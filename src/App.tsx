import { Route, Routes } from "react-router-dom";
import { Intro } from "./Intro";
import { Level0 } from "./Level0";

function App() {
  return (
    <div className="p-8 font-mono dark:text-slate-200 flex flex-col">
      <h1 className="text-3xl font-bold mb-4">
        Morgan-Wei IPLG: Orbital Mechanics Training
      </h1>
      <Routes>
        <Route index element={<Intro />} />
        <Route path="level">
          <Route path="0" element={<Level0 />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;
