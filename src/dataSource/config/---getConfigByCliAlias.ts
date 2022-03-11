import { Database } from "better-sqlite3";

const getConfigByCliAlias = async (alias: string, db: Database) => {
  const my_config = await db
    .prepare(
      "SELECT config_id, config_version, config_history_id FROM my_config WHERE cli_alias = ? ORDER BY id DESC LIMIT 1"
    )
    .get(alias);
  if (my_config) {
    const config_v1 = await db
      .prepare(
        `SELECT config, name FROM config_v${my_config.config_version} WHERE id = ? LIMIT 1`
      )
      .get(my_config.config_id);

    if (my_config.config_history_id) {
      const config_history = await db
        .prepare(`SELECT config FROM config_history WHERE id = ? LIMIT 1`)
        .get(my_config.config_history_id);

      return [JSON.parse(config_history.config), config_v1.name];
    } else {
      return [JSON.parse(config_v1.config), config_v1.name];
    }
  }
  return [];
};

export default async (alias: string, db: Database) => {
  return Promise.resolve(await getConfigByCliAlias(alias, db));
};
