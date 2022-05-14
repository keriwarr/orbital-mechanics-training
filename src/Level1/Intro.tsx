import { Link } from "react-router-dom";
import { Button } from "../components/Button";

export const Intro = () => {
  return (
    <div>
      <p className="text-base max-w-prose mb-4">something something 2D</p>
      <div className="flex flex-row">
        <Link to="/level/1">
          <Button>Continue</Button>
        </Link>
      </div>
    </div>
  );
};
