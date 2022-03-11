import net from "net";

const sendMonitorCommand = async (command: any) => {
  let client = connect();
  client.on("data", onData);
  client.on("error", onError);
  client.on("close", onClose);

  function onData(data) {
    //console.log(data.toString());
  }

  function onError(err) {
    if (err.message.indexOf("ECONNREFUSED") > -1) {
      setTimeout(() => {
        client = connect();
        client.on("data", onData);
        client.on("error", onError);
        client.on("close", onClose);
      }, 100);
    }
  }
  function onClose() {
    client.removeAllListeners("data");
    client.removeAllListeners("error");
  }

  function connect() {
    const c = net.createConnection({ port: 4445 }, () => {
      c.write(command + "\r\n");
      c.write("cont \r\n");
      console.log(command);
    });

    return c;
  }
};

export default async (command: any) => {
  return Promise.resolve(await sendMonitorCommand(command));
};
