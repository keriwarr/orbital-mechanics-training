import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import { GithubContextProvider } from "./components/GithubIntegration";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <BrowserRouter basename="rockets">
      <GithubContextProvider>
        <App />
      </GithubContextProvider>
    </BrowserRouter>
  </React.StrictMode>
);
