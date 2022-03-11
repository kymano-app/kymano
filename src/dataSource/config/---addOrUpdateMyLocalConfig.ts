import { Database } from "better-sqlite3";

const addOrUpdateMyLocalConfig = async (
  config: {
    name: any;
    arch: any;
    macos: any;
    linux: any;
    windows: any;
  },
  db: Database
) => {
  const my_local_config = db
    .prepare(
      `SELECT my_local_config.id 
              FROM my_local_config 
              LEFT JOIN my_vm_name 
                ON my_vm_name.id = my_local_config.my_vm_name_id 
              WHERE my_vm_name.name = ?`
    )
    .get(config.name);
  console.log("my_local_config", my_local_config);

  if (!my_local_config) {
    const { lastInsertRowid } = await db
      .prepare(`INSERT INTO my_vm_name (name) VALUES (?)`)
      .run(config.name);

    const sql = `
      INSERT INTO my_local_config (
        my_vm_name_id,
        config
      )
      VALUES (?, json(?))`;
    console.log(sql);
    await db.prepare(sql).run(
      lastInsertRowid,
      JSON.stringify({
        arch: config.arch,
        macos: config.macos,
        linux: config.linux,
        windows: config.windows,
      })
    );
  } else {
    const sql = `UPDATE my_local_config SET config = json(?) WHERE my_vm_name_id = ?`;
    await db.prepare(sql).run(
      JSON.stringify({
        arch: config.arch,
        macos: config.macos,
        linux: config.linux,
        windows: config.windows,
      }),
      my_local_config.id
    );
  }
};

export default async (config: any, db: Database) => {
  return Promise.resolve(await addOrUpdateMyLocalConfig(config, db));
};
