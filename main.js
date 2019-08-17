const mqtt = require('mqtt');
const fs = require('fs');
const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');


var com = null;

console.log("Loading configuration....");
let data = fs.readFileSync("./config.json").toString();
const config = JSON.parse(data);

if(!config)
{
  process.exit();
}



const client  = mqtt.connect('mqtt://'+config.Server.ip+':'+config.Server.port,{clientId:config.Auth.clientName});

client.on('connect', function () {
  console.log("Connected to EXP_Broker");
  client.subscribe(config.Auth.clientName+"/"+config.Interface.subTopic);
});

loop();

function loop(){
  SerialPort.list((err, ports) => {
    ports.forEach(port=>{
      config.Port.manufacturers.forEach(man => {

        if(port.manufacturer.indexOf(man) !== -1)
        {
          com = port.comName;
        }
        
      });
    });
    if(com == null)
    {
      console.error("No Device Found");
      process.exit();
    }
    console.log('ports', ports);
  
    const port = new SerialPort(com, { baudRate: config.Port.baudrate });
  
  
    console.log("Connected to Port : ",com);
  
    const parser = new Readline();
  
    port.pipe(parser);
  
    setInterval(()=>port.write('ee_get:10'),5000);

    client.on('message', function (topic, message) {
      console.log("Sending to PORT : ", message);
      port.write(message);
      })
  
    parser.on('data', line =>{
      try{
        console.log("Transmiting ",line);
        client.publish(config.Auth.clientName+"/"+config.Interface.pubTopic, line);
      }catch(err)
      {
        console.log(err.message)
      }
    })
  });
}



