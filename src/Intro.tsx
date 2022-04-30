import { Link } from "react-router-dom";

export const Intro = () => (
  <div>
    <p className="text-base max-w-prose mb-4">
      Hello and welcome to your first week of training at{" "}
      <span className="font-bold underline">
        Morgan-Wei Interplanetary Logistics Group
      </span>
      . As a Junior Orbital Mechanics Specialist, your role will be to ensure
      that Morgan-Wei Shipping Barges land safe and sound, and most importantly,{" "}
      <span className="font-bold">on time</span>.
    </p>
    <p className="text-base max-w-prose mb-4">
      To get you up to speed we've prepared a{" "}
      <span className="font-bold">simple aptitude test</span>. You are tasked
      with writing a program to land a simulated barge in only one dimension.
      You will be concerned with neither fuel nor atmosphere nor the physical
      structure of the barge. Your sensors are reliable, and your control over
      the barge is instant and infallible.
    </p>
    <p className="text-base max-w-prose mb-4">
      You have been provided with a rudimentary visual representation of the
      simulation, and a console within which you will write your program. The
      simulation is pre-programmed with a fixed set of parameters (force of
      gravity, force of thrusters, initial altitude, etc.), however your
      submission will be automatically evaluated against a wide variety of
      situations, to ensure that you didn't attempt to overfit.
    </p>
    <p className="text-base max-w-prose mb-4">
      Getting into the details: you will write JavaScript which controls whether
      the engine should fire, given the{" "}
      <span className="font-bold">time, and the position and velocity</span> of
      the barge. Your objective is to pilot the craft to touch down with a speed
      no greater than two meters per second, in as little total time as
      possible. Easy, right?
    </p>
    <p className="text-base max-w-prose mb-4">
      You'll do fine. Get cracking, and remember, no funny business with that
      console, we'll be keeping an eye on you from the next room over.
    </p>
    <div className="flex flex-row">
      <Link to="/level/0">
        <button className="p-2 underline">Continue &gt;&gt;</button>
      </Link>
    </div>
  </div>
);
