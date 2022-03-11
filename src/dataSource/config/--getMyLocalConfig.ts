import { Database } from "better-sqlite3";

const getMyLocalConfig = async (name: string, db: Database) => {
  const data = await db
    .prepare(
      `SELECT my_local_config.config 
        FROM my_local_config 
        LEFT JOIN my_vm_name 
          ON my_vm_name.id = my_local_config.my_vm_name_id 
        WHERE my_vm_name.name = ?`
    )
    .get(name);
  console.log(data.config);
  return JSON.parse(data.config);
};

export default async (name: string, db: Database) => {
  return Promise.resolve(await getMyLocalConfig(name, db));
};
