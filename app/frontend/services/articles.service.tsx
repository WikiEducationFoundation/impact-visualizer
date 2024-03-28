import { MediaWikiResponse } from "../types/search-tool.type";

async function fetchSubcatsAndPages(
  categoryIdentifier: string | number,
  usePageID: boolean = false
): Promise<MediaWikiResponse | null> {
  let queriedSubcatsJSON: MediaWikiResponse | null = null;
  try {
    let identifier: string = "";
    if (usePageID) {
      identifier = `gcmpageid=${categoryIdentifier}`;
    } else {
      identifier = `gcmtitle=${categoryIdentifier}`;
    }
    const urlParams: string = `action=query&generator=categorymembers&gcmlimit=500&prop=categoryinfo&${identifier}&format=json&origin=*`;
    const response = await fetch(
      `https://en.wikipedia.org/w/api.php?${urlParams}`
    );

    if (!response.ok) {
      throw new Error("Network response was not ok.");
    }

    queriedSubcatsJSON = await response.json();

    while (queriedSubcatsJSON?.continue?.continue) {
      const continueResponse = await fetch(
        `https://en.wikipedia.org/w/api.php?gcmcontinue=${queriedSubcatsJSON?.continue?.gcmcontinue}&${urlParams}`
      );
      const continueSubcatsJSON: MediaWikiResponse =
        await continueResponse.json();

      queriedSubcatsJSON.continue = continueSubcatsJSON?.continue;
      queriedSubcatsJSON.query.pages = {
        ...queriedSubcatsJSON.query.pages,
        ...continueSubcatsJSON.query.pages,
      };
    }
  } catch (error) {
    console.error("Error fetching subcats: ", error);
  }
  return queriedSubcatsJSON;
}

export { fetchSubcatsAndPages };
