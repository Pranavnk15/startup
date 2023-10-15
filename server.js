const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const ArduinoIotClient = require('@arduino/arduino-iot-client');



const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.set('view engine', 'ejs');  // Set EJS as the view engine
app.set('views', path.join(__dirname, 'views'));  // Set the views directory


// Configure Arduino IoT Client
const defaultClient = ArduinoIotClient.ApiClient.instance;
const oauth2 = defaultClient.authentications['oauth2'];
oauth2.accessToken = "YOUR_ACCESS_TOKEN"; // Replace with your access token

const api = new ArduinoIotClient.PropertiesV2Api();

// Sample zones and corresponding indicators (1 for on, 0 for off)
const zones = ['zone1', 'zone2', 'zone3', 'zone4'];


// Function to control lights based on zones and control signals
function controlLightsForZones(parsedControlSignals) {
  for (let i = 0; i < zones.length; i++) {
    const zone = zones[i];
    const controlSignal = parsedControlSignals[i];  // Use parsedControlSignals instead of controlSignals

    console.log(`Controlling lights for ${zone}: Turning ${controlSignal === 1 ? 'on' : 'off'}`);

    // Publish the control signal to the corresponding zone
    api.propertiesV2Publish(zone, 'light_control', { value: controlSignal.toString() })  // Convert controlSignal to string
      .then(() => console.log(`Published control signal ${controlSignal} for ${zone}.`))
      .catch(error => console.error(`Error publishing control signal for ${zone}:`, error));
  }
}

let controlSignals = 'zone_counts.txt';  // Use let instead of const

function readAndUpdateControlSignals() {
  try {
    const data = fs.readFileSync(controlSignals, 'utf8');
    const parsedControlSignals = data.trim().split('').map(Number);

    controlLightsForZones(parsedControlSignals);
  } catch (error) {
    console.error('Error reading and updating control signals:', error.message);
  }
}

setInterval(readAndUpdateControlSignals, 5000); 

// Route to trigger controlling lights for zones
app.post('/control-lights', (req, res) => {
  controlLightsForZones();
  res.status(200).send('Lights control request processed.');
});

app.get('/', (req, res) => {
  res.render('index');  // Renders 'index.ejs' in the 'views' directory
});

exec('python app.py', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error starting Flask server: ${error}`);
        return;
    }
    console.log(`Flask server started: ${stdout}`);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
