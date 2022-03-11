import { Database } from "better-sqlite3";

const isVmNameAvailable = async (vmName: string, db: Database) => {
  const exists = db
    .prepare(
      `SELECT my_config.id 
       FROM my_config 
       LEFT JOIN my_vm_name 
         ON my_vm_name.id = my_config.my_vm_name_id 
       WHERE my_vm_name.name = ?`
    )
    .get(vmName);
  if (exists) {
    return false;
  }
  return true;
};

export default async (vmName: string, db: Database) => {
  return Promise.resolve(await isVmNameAvailable(vmName, db));
};
