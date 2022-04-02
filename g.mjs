import net from "net";
import readline from "readline";

var client = new net.Socket();
const disk = `disk${Math.floor(Math.random() * 100000000)}`;
let device = disk+'d';
let path = '/Users/oleg/Library/Application Support/kymano/layers/38147a2cf6ae13f1c0d755c61b394db4b7512ca479fef6af0b12a2f47f2f32f9';
//let path = '/Users/oleg/Downloads/win11-arm-base.vhdx';
client.connect(5551, 'localhost', function() {
	client.write("drive_add 0 \"if=none,file="+path+",readonly=on,id="+disk+"\"\n", function () {
            console.log('move forward command sent');
        });
});

var rl = readline.createInterface({ input : client });
let driveAddcommandAccepted = false;
let deviceAddcommandAccepted = false;
rl.on('line', function(line) {
     console.log('line:', line);
     if (/drive_add/.test(line)) {
          driveAddcommandAccepted = true;
          console.log('driveAddcommandAccepted');
     } else if (/device_add/.test(line)) {
          deviceAddcommandAccepted = true;
          console.log('deviceAddcommandAccepted');
          client.destroy();
     } else if (line == 'OK' && !deviceAddcommandAccepted) {
          client.write("device_add usb-storage,serial=KY-"+disk+",drive="+disk+",id="+device+"\n", function () {
               console.log('done 1');
          });
          console.log('done 2');
     }
});