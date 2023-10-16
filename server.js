const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Replace with the IP address of your single ESP8266 module
const espIpAddress = '192.168.0.102';

const zones = ['zone1', 'zone2', 'zone3', 'zone4'];

function controlLightsForZone(zone, controlSignal) {
  console.log(`Controlling lights for ${zone}: Turning ${controlSignal === 1 ? 'on' : 'off'}`);

  const url = controlSignal === 1 ? `http://${espIpAddress}/relay1/on` : `http://${espIpAddress}/relay1/off`;

  axios.get(url, { timeout: 5000 })
    .then(() => console.log(`Sent control signal ${controlSignal} for ${zone}.`))
    .catch(error => console.error(`Error sending control signal for ${zone}:`, error));
}

let controlSignals = 'zone_counts.txt';

function readAndUpdateControlSignals() {
  try {
    const data = fs.readFileSync(controlSignals, 'utf8');
    const parsedControlSignals = data.trim().split('').map(Number);

    for (let i = 0; i < zones.length; i++) {
      controlLightsForZone(zones[i], parsedControlSignals[i]);
    }
  } catch (error) {
    console.error('Error reading and updating control signals:', error.message);
  }
}

setInterval(readAndUpdateControlSignals, 5000);

app.post('/control-lights', (req, res) => {
  readAndUpdateControlSignals();
  res.status(200).send('Lights control request processed.');
});

exec('python app.py', (error, stdout, stderr) => {
  if (error) {
      console.error(`Error starting Flask server: ${error}`);
      return;
  }
  console.log(`Flask server started: ${stdout}`);
});

app.get('/', (req, res) => {
  res.render('index');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
