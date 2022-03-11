import { Database } from "better-sqlite3";

const getConfigIdByRepoUrlAndName = async (
  repoUrl: string,
  name: string,
  db: Database
) => {
  let { id } = await db
    .prepare("SELECT id FROM repo_v1 WHERE url = ?")
    .get(repoUrl);
  const data = await db
    .prepare("SELECT id FROM config_v1 WHERE repo_id = ? AND name = ? ")
    .get(parseInt(id), name);

  return parseInt(data.id);
};

export default async (repoUrl: string, name: string, db: Database) => {
  return Promise.resolve(await getConfigIdByRepoUrlAndName(repoUrl, name, db));
};
