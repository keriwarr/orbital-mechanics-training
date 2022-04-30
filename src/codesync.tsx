import Pizzly from "pizzly-js";

const PIZZLY_PUBLISHABLE_KEY =
  "tgHqd*YKzZu!VVQq*z6dCfWJ3HetJHrXg2bbgsRN!Nhtzr6HCWJKvicU9WV8qxTvu6L-4ux6hFwRVn@N";
const PIZZLY_HOST = "https://auth.pereira.io";
const pizzly = new Pizzly({
  host: PIZZLY_HOST,
  publishableKey: PIZZLY_PUBLISHABLE_KEY,
});
const github = pizzly.integration("github");

const SETUP_ID = "23b9b51e-684c-455f-877f-d542fdbf9d84";

const ROCKETS_GIST_DESCRIPTION =
  "Morgan-Wei IPLG Simulation Code (https://keri.warr.ca/rockets/) [do not remove: rockets-gist]";
const ROCKETS_GIST_MARKER = "rockets-gist";
const ROCKETS_README = `Welcome to your computer terminal connected to the network of Morgan-Wei Interplanetary Logistics Group. Please see your submissions for training below.
To resume training, visit https://keri.warr.ca/rockets/`;
const ROCKETS_README_FILENAME = "0_MORGAN-WEI_IPLG_ROCKET_MARK_152_MANUAL.MD";

/**
 * triggerGithubAuthentication will trigger a Pizzly authentication flow to
 * connect a Github account.
 */
export async function triggerGithubAuthentication() {
  return github
    .connect({ setupId: SETUP_ID })
    .then(({ authId }) => {
      console.log("authId", authId);
      return authId;
    })
    .catch((error) => {
      console.error(error);
    });
}

/**
 * findGist will attempt to find a Gist that was generated by the app. If none
 * is found, `undefined` is returned.
 */
export async function findGist(authId: string) {
  const gists = (await github
    .auth(authId)
    .get("/gists")
    .then((response) => response.json())
    .catch(console.error)) as Array<any>;

  return gists.find((gist) =>
    (gist.description || "").includes(ROCKETS_GIST_MARKER)
  );
}

/**
 * createGist will create a new blank gist with a readme.
 */
export async function createGist(authId: string) {
  const body = JSON.stringify({
    description: ROCKETS_GIST_DESCRIPTION,
    public: true,
    files: {
      [ROCKETS_README_FILENAME]: {
        content: ROCKETS_README,
      },
    },
  });

  return github
    .auth(authId)
    .post("/gists", { body, headers: { "Content-Type": "application/json" } })
    .then((response) => response.json())
    .catch((error) => {
      console.error(error);
    });
}

/**
 * updateLevel sends a Gist PATCH, which will only update provided files.
 *
 * The readme is updated for every action, incase the readme has any changed
 * contents.
 */
export async function updateLevel(
  authId: string,
  gistId: string,
  levelNo: number,
  code: string,
  results: string | null
) {
  const body = {
    files: {
      [`level_${levelNo}.js`]: { content: code },
      [ROCKETS_README_FILENAME]: {
        content: ROCKETS_README,
      },
    },
  };

  if (results) {
    body["files"][`level_${levelNo}_results.txt`] = { content: results };
  }

  const bodySerialized = JSON.stringify(body);

  return github
    .auth(authId)
    .patch(`/gists/${gistId}`, {
      body: bodySerialized,
      headers: { "Content-Type": "application/json" },
    })
    .then((response) => response.json())
    .catch((error) => {
      console.error(error);
    });
}
