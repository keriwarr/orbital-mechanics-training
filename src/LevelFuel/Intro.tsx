import { Link } from "react-router-dom";
import { Button } from "../components/Button";

export const Intro = () => {
  return (
    <div>
      <p className="text-base max-w-prose mb-4">
        Well what do you know, the rookie made it past the "simple aptitude
        test". That means I'll be forking my pudding over to John at lunch
        today. Thanks.
      </p>
      <p className="text-base max-w-prose mb-4">
        Pudding is worth its weight in gold around here - you'll see. You know
        what else is worth it's weight in gold?{" "}
        <span className="font-bold">Rocket fuel</span>. Oxygen is far less
        abundant here than back home. That's why all good Morgan-Wei Orbital
        Mechanics Specialists know that the only thing worse than a barge that's
        not <span className="font-bold">on time</span> is a barge that not on
        time and <span className="font-bold">wastes fuel</span>.
      </p>
      <p className="text-base max-w-prose mb-4">
        From here on out, firing the simulated barge's thrusters will consume
        fuel. Fuel has mass which means that the thrusters will gradually impart
        more acceleration as the fuel tank empties. If you consume an excessive
        amount of fuel, you will be penalized. You remember the{" "}
        <a
          className="underline dark:text-cyan-300 visited:text-violet-300"
          target="_blank"
          href="https://en.wikipedia.org/wiki/Tsiolkovsky_rocket_equation"
          rel="noreferrer"
        >
          Tsiolkovsky rocket equation
        </a>{" "}
        right? Just kidding, you don't need that one yet.
      </p>
      <p className="text-base max-w-prose mb-4">
        I know what you're thinking - Are we still in just 1D? Don't worry,
        we'll get to the 2D simulations soon. Now get back in the computer lab,
        we're not paying you to ask questions.
      </p>
      <p className="text-base max-w-prose mb-4">
        P.S. We've upgraded the visualization - let us know what you think.
      </p>
      <div className="flex flex-row">
        <Link to="/level/1">
          <Button>Continue</Button>
        </Link>
      </div>
    </div>
  );
};
