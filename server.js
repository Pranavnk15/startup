const express = require('express');
const path = require('path');
const axios = require('axios');
const mqtt = require('mqtt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.set('view engine', 'ejs');  // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views'));  // Set the views directory

app.use(express.json());

const iotCloudAPIEndpoint = 'YOUR_IOT_CLOUD_API_ENDPOINT'; // Replace with your IoT cloud API endpoint
const mqttBrokerUrl = 'mqtt://YOUR_MQTT_BROKER_URL'; // Replace with your MQTT broker URL


const fs = require('fs');

function readHighsAndLowsFromFile() {
  try {
    const data = fs.readFileSync('myfile.txt', 'utf8');
    // Assuming the content in the file is like "[1,0,1,0]"
    const highsAndLows = JSON.parse(data.replace(/ /g, ''));
    return highsAndLows.join('');
  } catch (error) {
    console.error('Error reading highs and lows from file:', error.message);
    return null;
  }
}



function controlLights(highsAndLows) {
  const client = mqtt.connect(mqttBrokerUrl);

//   client.on('connect', () => {
//     for (const value of highsAndLows) {
//       const topic = 'lights/control';
//       const isHigh = value === '1';

//       // Publish messages to control the lights
//       client.publish(topic, isHigh ? 'on' : 'off');
//       console.log(`Turning ${isHigh ? 'on' : 'off'} the lights.`);
//     }

//     client.end();
//   });

for (const value of highsAndLows) {
    const isHigh = value === '1';
    console.log(`Turning ${isHigh ? 'on' : 'off'} the lights.`);
  }
}

app.post('/control-lights-from-file', async (req, res) => {
    console.log('Received control-lights-from-file request');
    const highsAndLowsFromFile = readHighsAndLowsFromFile();
  
    if (!highsAndLowsFromFile) {
      res.status(500).send('Error reading highs and lows from file.');
      return;
    }
  
    // Control the lights based on highs and lows from the file
    controlLights(highsAndLowsFromFile);
  
    // Make an API call to the IoT cloud platform
    try {
      const response = await axios.post(iotCloudAPIEndpoint, { highsAndLows: highsAndLowsFromFile });
  
      // Handle the response from the IoT cloud platform if needed
      console.log('API Response:', response.data);
  
      res.status(200).send('Lights control request processed.');
    } catch (error) {
      console.error('Error making API call:', error.message);
      res.status(500).send('Error making API call.');
    }
  });
  

app.get('/', (req, res) => {
    res.render('index');  // Renders 'index.ejs' in the 'views' directory
});
  

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
