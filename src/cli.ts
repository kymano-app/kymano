import Database from "better-sqlite3";
import path from 'path';
import getUserDataPath from "./commands/service/getUserDataPath";
import createTables from "./dataSource/config/createTables";
import processCLI from "./processCLI";
import isFileExist from "./service/isFileExist";
const fsAsync = require('fs').promises;

export default async function cli(args: any[]) {
  
  const userDataPath = getUserDataPath();
  if (!isFileExist(userDataPath)) {
    await fsAsync.mkdir(userDataPath, {
      recursive: true,
    });
  }
  var argv = require("minimist")(args);
  const db = new Database(path.join(userDataPath, 'sqlite3.db'), {
    verbose: console.log,
  });
  console.log(`${userDataPath}/sqlite3.db`);

  const row = db
    .prepare(
      `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='repo_v1'`
    )
    .get();
  console.debug(row);

  if (row.count === 0) {
    createTables(db);
  }

  processCLI(argv, db);
}
