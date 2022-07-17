import {
  cleanSocketData,
  delFromDiskIds,
  diskIds,
  electronWindow,
  getCmdId,
  globalSockets,
  lenghtSocketData,
  pushSocketData,
  shiftSocketData,
} from "../global";
import net from "net";
import path from 'path';
import readline from 'readline';

const client = {};
export function createConnection(worker: string) {
  const sockets = globalSockets.remote[1];
  let fullData = "";
  console.log("sockets", sockets);
  if (!client[worker]) {
    client[worker] = net.createConnection(sockets[worker]);
    console.log("new connection");
    client[worker].on("error", async function (error) {
      await sleep(1);
      console.log("error, trying again", error);
      client[worker] = createConnection(worker);
    });
    client[worker].on("data", (data) => {
      fullData += data.toString();
      const nb = data.toString().search(/\0/);
      const lastChar = data[data.length - 1];
      console.log("lastChar: ", lastChar);
      if (nb != -1) {
        const dataArr = fullData.split("\0");
        let arr = [];
        if (lastChar !== 0) {
          console.log("lastChar!=0: ", lastChar);
          arr = dataArr.slice(0, dataArr.length - 2);
          fullData = dataArr[dataArr.length - 1];
          console.log("fullData add:", dataArr[dataArr.length - 1]);
        } else {
          fullData = "";
          arr = dataArr.slice(0, dataArr.length - 1);
        }
        pushSocketData(worker, arr);
      }
      // if (data.toString().split('\0').length > 1) {
      //   const dataArr = fullData.split('\0');
      //   fullData = '';
      //   console.log('data:::', dataArr, worker);
      //   pushSocketData(worker, dataArr);
      // }
    });
  }

  return client[worker];
}

export const execInGuestfs = async (command, worker) => {
  console.log("exec-in-guestfs", command, worker);
  // const myConfig = await kymano.getMyConfigById(1);
  // const sockets = JSON.parse(myConfig.sockets);
  // const sockets = globalSockets.remote[1];
  // console.log('exec-in-guestfs sockets', sockets.guestexec);

  if (!client[worker]) {
    console.log("NO client");
    client[worker] = createConnection(worker);
  }
  // try {
  //   client = net.createConnection(sockets.guestexec);
  // } catch (err) {
  //   console.log('err::::::::::', err);
  // }
  // client.on('error', function (err) {
  //   console.log('err2::::::::::', err);
  // });
  // if (rlSearchInGuestFs) {
  // const [result0, rl0] = exec(
  //   'kill -9 `pidof grep`; kill -9 `pidof find`',
  //   client,
  //   false,
  //   globalMainWindow
  // );
  // await result0;
  // rl0.close();
  // }
  while (lenghtSocketData(worker) !== 0) {
    console.log("wait:::", worker, socketData[worker]);
    // eslint-disable-next-line no-await-in-loop
    await sleep(0.5);
  }

  const result = await exec(command, client[worker], false, worker);
  // setRlSearchInGuestFs(rl);
  console.log("finished", result);

  return result;
};

export const searchInGuestfs = async (command, worker) => {
  console.log("searchInGuestfs", command, worker);

  // const sockets = globalSockets.remote[1];

  // const client = net.createConnection(sockets.guestexec);
  // client = createConnection();
  if (!client[worker]) {
    console.log("NO client");
    client[worker] = createConnection(worker);
  }

  // const [result0, rl0] = exec(
  //   'kill -9 `pidof grep`; kill -9 `pidof find`',
  //   client,
  //   false,
  //   globalMainWindow
  // );
  // await result0;
  // rl0.close();
  while (lenghtSocketData(worker) !== 0) {
    console.log("wait:::", worker, socketData[worker]);
    await sleep(0.5);
  }

  const result = await exec(command, client[worker], true, worker);
  // setRlSearchInGuestFs(rl);
  console.log("finished", result);
  return result;
};

export async function readLine(instantResult, command, cmdId, worker) {
  console.log("readLine:::::", cmdId, worker, command);
  const arr = [];
  return new Promise(async (resolve) => {
    while (true) {
      const line = shiftSocketData(worker);
      // console.log('line:::', cmdId, worker, line);
      if (!line) {
        // eslint-disable-next-line no-await-in-loop
        await sleep(0.1);
        // eslint-disable-next-line no-continue
        continue;
      }
      if (instantResult) {
        try {
            if (Object.keys(electronWindow).length) {
                electronWindow.global.webContents.send("response-cmd", line);
            }
        } catch (err) {
          console.log("err::::::::", err);
        }
      } else {
        console.log("arr.push:::", cmdId, worker, line);
        arr.push(line);
      }
      if (line === `end${cmdId}`) {
        console.log("resolve:::", cmdId);
        // client.destroy();
        cleanSocketData(worker);
        resolve(arr);
        console.log("break:::", cmdId);
        break;
      }
    }
  });
}

export async function exec(command, client, instantResult, worker) {
  const cmdId = getCmdId();

  console.log("exec start", command, cmdId);
  let result;
  try {
    await client.write(`${cmdId}#kymano#${command}`);

    // const rl = readline.createInterface({ input: client });
    console.log("readLine", cmdId);
    // new Promise((resolve) =>
    //   setTimeout(() => {
    //     rl.close();
    //     resolve();
    //   }, 10 * 1000)
    // );
    result = await readLine(instantResult, command, cmdId, worker);
    console.log("readLine result", result, cmdId);
    return result;
  } catch (err) {
    console.log("err!::::::", err);
  }
}

export async function addDriveViaMonitor(diskPath) {
  console.log("addDriveViaMonitor:::::", path);
  // const myConfig = await kymano.getMyConfigById(1);
  // const sockets = JSON.parse(myConfig.sockets);
  const sockets = globalSockets.remote[1];
  console.log("myConfig sockets:::::", sockets);
  const client = net.createConnection(sockets.monitor);
  const disk = `disk${Math.floor(Math.random() * 100000)}`;
  const device = `${disk}d`;
  const diskName = path.basename(diskPath);

  client.write(`drive_add 0 "if=none,file=${diskPath},id=${disk}"\n`, () => {
    console.log("drive_add command sent");
  });

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: client });
    let driveAddcommandAccepted = false;
    let deviceAddcommandAccepted = false;
    rl.on("line", function (line) {
      console.log("line:", line);
      if (/drive_add/.test(line)) {
        driveAddcommandAccepted = true;
        console.log("driveAddcommandAccepted");
      } else if (/device_add/.test(line)) {
        deviceAddcommandAccepted = true;
        console.log("deviceAddcommandAccepted");
        client.destroy();
        sleepAndResolve(1, resolve);
      } else if (line === "OK" && !deviceAddcommandAccepted) {
        client.write(
          `device_add usb-storage,serial=KY-${diskName},drive=${disk},id=${device}\n`,
          () => {
            console.log("client.write device_add");
            diskIds.push(device);
          }
        );
      }
    });
  });
}

export async function delDrivesViaMonitor(diskId) {
  const sockets = globalSockets.remote[1];
  const client = net.createConnection(sockets.monitor);
  console.log("delDrivesViaMonitor:::::", sockets.monitor);

  client.write(`device_del ${diskId}\n`, () => {
    delFromDiskIds(diskId);
  });

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: client });
    rl.on("line", function (line) {
      console.log("delDrivesViaMonitor line:", line);
      if (/device_del/.test(line)) {
        console.log("device_del line:", line);
        client.destroy();
        resolve();
      }
    });
  });
}

export async function delDrives() {
  diskIds.forEach(async (diskId) => {
    await delDrivesViaMonitor(diskId);
  });
}

export async function sleep(seconds: number) {
  return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
}

export async function sleepAndResolve(
  seconds: number,
  setResolve: CallableFunction
) {
  await sleep(seconds);
  setResolve(true);
}
