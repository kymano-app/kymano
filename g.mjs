import net from "net";
import readline from "readline";

var client = new net.Socket();
let disk = 'disk127';
let device = disk+'d';
// /Users/oleg/Library/Application Support/kymano/layers/6cfc729346bbb60ff68dfe3c589b5fbd6ef6ac84ab82abb0295b20f8d95ea672
let path = '/Users/oleg/Downloads/win11-arm-base.vhdx';
client.connect(5551, 'localhost', function() {
	client.write("drive_add 0 \"if=none,file="+path+",readonly=on,id="+disk+"\"\n", function () {
            console.log('move forward command sent');
        });
});

var rl = readline.createInterface({ input : client });
rl.on('line', function(l) {
     console.log('line:', l);
     if (l == 'OK') {
            client.write("device_add usb-storage,serial=KY-JD9034vssN90FFGO9,drive="+disk+",id="+device+"\n");
            console.log('done');
     }
});

client.on('close', function() {
	console.log('Connection closed');
});