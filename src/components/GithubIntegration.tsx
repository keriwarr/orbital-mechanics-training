import React, { createContext, useCallback, useState } from "react";
import {
  createGist,
  findGist,
  getGist,
  getGistCodeFileName,
  triggerGithubAuthentication,
  _saveCodeAndResultsToGist,
} from "../util/codesync";
import { Button } from "./Button";

type CodeAndResultsArgs = {
  levelNo: number;
  code: string;
  results?: string | null;
};

const GithubContext = createContext<{
  authId: string | null;
  gistId: string | null;
  setAuthId: (authId: string) => void;
  setGistId: (gistId: string) => void;
  trySaveCodeAndResultsToGist: (args: CodeAndResultsArgs) => void;
} | null>(null);

export const GithubContextProvider: React.FC<React.PropsWithChildren<{}>> = ({
  children,
}) => {
  const [authId, setAuthId] = useState(localStorage.getItem("github-auth-id"));
  // TODO(joey): Check if the auth Id is still valid?
  const [gistId, setGistId] = useState(localStorage.getItem("github-gist-id"));
  // TODO(joey): Check if the gist is still valid?

  const trySaveCodeAndResultsToGist = useCallback(
    ({ levelNo, code, results }: CodeAndResultsArgs) => {
      if (authId && gistId) {
        _saveCodeAndResultsToGist(authId, gistId, levelNo, code, results);
      }
    },
    [authId, gistId]
  );

  return (
    <GithubContext.Provider
      value={{
        authId,
        gistId,
        setAuthId,
        setGistId,
        trySaveCodeAndResultsToGist,
      }}
    >
      {children}
    </GithubContext.Provider>
  );
};

export const useGithubContext = () => {
  const context = React.useContext(GithubContext);

  if (!context) {
    throw new Error(
      "useGithubContext must be used within GithubContextProvider"
    );
  }

  return context;
};

export const GithubIntegration: React.FC<{
  onReceiveCode: (code: string) => void;
}> = ({ onReceiveCode }) => {
  const { authId, gistId, setAuthId, setGistId } = useGithubContext();

  const connectToGithub = useCallback(async () => {
    try {
      const freshAuthId = await triggerGithubAuthentication();

      if (!freshAuthId) throw new Error("Missing authId!");

      setAuthId(freshAuthId);
      localStorage.setItem("github-auth-id", freshAuthId);

      let gist = await findGist(freshAuthId);

      if (!gist) {
        gist = await createGist(freshAuthId);
      }

      if (!gist) throw new Error("Failed to create gist");

      setGistId(gist.id);
      localStorage.setItem("github-gist-id", gist.id);
    } catch (e) {
      console.error(e);
    }
  }, [setAuthId, setGistId]);

  const loadCodeFromGithub = useCallback(async () => {
    try {
      if (!authId) throw new Error("Missing auth ID!");
      if (!gistId) throw new Error("Missing gist ID!");
      const gist = await getGist(authId, gistId);

      if (!gist) throw new Error("Failed to find gist");

      onReceiveCode(gist.files[getGistCodeFileName({ levelNo: 0 })].content);
    } catch (e) {
      console.error(e);
    }
  }, [authId, gistId, onReceiveCode]);

  const openGithub = useCallback(() => {
    window.open(`https://gist.github.com/${gistId}`);
  }, [gistId]);

  return (
    <div className="flex flex-row px-8">
      {authId === null || gistId === null ? (
        <Button onClick={connectToGithub}>Connect Github</Button>
      ) : (
        <>
          <Button onClick={loadCodeFromGithub}>Load from Github</Button>
          <Button onClick={openGithub}>View code on Github</Button>
        </>
      )}
    </div>
  );
};
