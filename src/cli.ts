import Database from "better-sqlite3";
import path from 'path';
import {getUserDataPath} from "./commands/service/getUserDataPath";
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

  processCLI(argv, db);
}
