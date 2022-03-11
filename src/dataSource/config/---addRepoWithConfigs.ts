import { Database } from "better-sqlite3";
import processConfig from "../../v1/processConfig";
import addConfig from "./addConfig";
import path from "path";

const fs = require("fs");
const yaml = require('js-yaml');

const addRepoWithConfigs = async (
  repoUrl: any,
  repoVersion: any,
  tmpRepoDir: any,
  configName: any,
  db: Database
) => {
  const row = db
    .prepare('SELECT * FROM repo_v1 WHERE url = ?')
    .get(repoUrl);
  if (!row) {
    const sql = `INSERT INTO repo_v1 (url, version) VALUES (?, ?)`;
    const {lastInsertRowid} = await db.prepare(sql).run(
      repoUrl,
      repoVersion
    );
    console.log('lastInsertRowid', lastInsertRowid)
    const latest = yaml.load(fs.readFileSync(`${tmpRepoDir}/latest.yml`, 'utf8'));
    console.log(latest)
    await Promise.all(
      Object.entries(latest.configs).map(async ([configIndex, value]) => {
        console.log(configIndex, value)
        const [from, configVersion] = value.from.split(':');
        let parsedConfig = await processConfig(
          `/${configVersion}`,
          `${tmpRepoDir}/${from}/`
        );
        console.log('parsedConfig', parsedConfig)
        const info = await addConfig(parsedConfig, path.basename(from), db, lastInsertRowid, configIndex, configVersion)
        console.log('info::::::::', info)
      })
    )
  }
};

export default async (repoUrl: any, repoVersion: any, tmpRepoDir: any, configName, db: Database) => {
  return Promise.resolve(await addRepoWithConfigs(repoUrl, repoVersion, tmpRepoDir, configName, db));
};
