import { ComponentProps } from "react";

export const Button: React.FC<ComponentProps<"button">> = ({
  className,
  children,
  ...otherProps
}) => (
  <button
    className={"p-2 underline" + (className ? " " + className : "")}
    {...otherProps}
  >
    {children} &gt;&gt;
  </button>
);
