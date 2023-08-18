const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 400, // 0.4 seconds
    max: 1,
    standardHeaders: false,
    legacyHeaders: false
})

const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200, // for legacy browser support
}

const TuyAPI = require('tuyapi');
const Manager = require('./bin/Manager').default;
const TuyaManager = require('./bin/TuyaManager').default;
const HueManager = require('./bin/HueManager').default;

const {
    getState, 
    getColor, 
    putColor, 
    getBrightness, 
    putBrightness,
    getToggle, 
    putToggle, 
    getMode, 
    putMode,
    getScene,
    putScene
} = require('./bin/LightController');

const PORT = 3001;

const livingroom = new TuyAPI({
    id: 'eb5bcfaa30722046765rxa',
    key: '~AL+EpT$Sv%lu@*0',
    version: 3.3,
    ip: '10.0.0.119',
    issueRefreshOnPing: true,
});

let livingroomManager;

livingroom.find()
    .then(() => livingroom.connect())
    .then(() => {livingroomManager = new Manager(livingroom)});

const bedroom = new TuyAPI({
    id: 'eb9520010f9186a397re4p',
    key: '6d30218d9928a979',
    version: 3.3,
    ip: '10.0.0.174'
})

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, './build/')));
app.use(cors(corsOptions));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

app.get('/state', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const state = await getState(managedDevice);
    res.json(state);
});

app.get('/color', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const color = await getColor(managedDevice);
    return res.json(color);
});

app.put('/color', limiter, async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await putColor(managedDevice, req.body.color);
    res.json(result);
});

app.post('/color', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await putColor(managedDevice, req.body.color);
    res.json(result);
});

app.get('/brightness', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await getBrightness(managedDevice);
    res.json(result);
});

app.put('/brightness', limiter, async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await putBrightness(managedDevice, req.body.brightness);
    res.json(result);
});

app.post('/brightness', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await putBrightness(managedDevice, req.body.brightness);
    res.json(result);
});

app.get('/toggle', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await getToggle(managedDevice);
    res.json(result);
});

app.put('/toggle', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await putToggle(managedDevice, req.body.toggle);
    res.json(result);
});

app.get('/mode', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await getMode(managedDevice);
    res.json(result);
});

app.put('/mode', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await putMode(managedDevice, req.body.mode);
    res.json(result);
});

app.get('/scene', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await getScene(managedDevice);
    if (result === null) {
        res.status(400).json({message: 'Scene not currently supported on Hue device'});
    } else {
        res.json(result);
    }
});

app.put('/scene', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new HueManager('http://10.0.0.157', 'cfuYwV8QRkwH8a1Jw5OqE4Jo6lZpQG2bBRrM-Mrt', 1) : new TuyaManager(livingroom);
    const result = await putScene(managedDevice, req.body);
    if (result === null) {
        res.status(400).json({message: 'Scene not currently supported on Hue device'});
    } else {
        res.json(result);
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});