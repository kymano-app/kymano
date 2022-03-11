import { Database } from "better-sqlite3";
import addMyVmName from "./addMyVmName";

const addConfig = async (
  cli_alias: any,
  configName: string,
  db: Database,
  config_id: any
) => {
  const lastInsertRowid = await addMyVmName(configName, db);
  return await db
    .prepare(
      `INSERT INTO my_config (cli_alias, config_version, config_id, my_vm_name_id) VALUES (?, ?, ?, ?)`
    )
    .run(cli_alias, "1", config_id, lastInsertRowid);
};

export default async (
  cli_alias: any,
  configName: string,
  db: Database,
  config_id: any
) => {
  return Promise.resolve(await addConfig(cli_alias, configName, db, config_id));
};
