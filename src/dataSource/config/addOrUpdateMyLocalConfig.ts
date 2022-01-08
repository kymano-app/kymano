import { Database } from 'better-sqlite3';

const addOrUpdateMyLocalConfig = async (
  config: {
    name: any;
    arch: any;
    macos: any;
    linux: any;
    win: any;
  },
  db: Database
) => {
  const row = db
    .prepare('SELECT * FROM my_local_config WHERE name = ?')
    .get(config.name);
  if (!row) {
    const sql = `INSERT INTO my_local_config (
      name,
      config)
      VALUES (?, json(?))`;
    console.log(sql);
    await db.prepare(sql).run(
      config.name,
      JSON.stringify({
        arch: config.arch,
        macos: config.macos,
        linux: config.linux,
        win: config.win,
      })
    );
  } else {
    const sql = `UPDATE my_local_config SET config = json(?) WHERE name = ?`;
    await db.prepare(sql).run(
      JSON.stringify({
        arch: config.arch,
        macos: config.macos,
        linux: config.linux,
        win: config.win,
      }),
      config.name
    );
  }
};

export default async (config: any, db: Database) => {
  return Promise.resolve(await addOrUpdateMyLocalConfig(config, db));
};
