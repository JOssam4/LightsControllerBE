const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const limiter = rateLimit({
    windowMs: 400, // 0.4 seconds
    max: 1,
    standardHeaders: false,
    legacyHeaders: false
});

const corsOptions = {
    origin: 'http://localhost:3000',
    optionsSuccessStatus: 200, // for legacy browser support
}

const TuyAPI = require('tuyapi');
const Manager = require('./bin/Manager').default;
const TuyaManager = require('./bin/TuyaManager').default;
const HueManager = require('./bin/HueManager').default;

const LightController = require('./bin/LightController').default;

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

let controller;

const hueSecrets = JSON.parse(fs.readFileSync('./bin/hue_keys.json').toString());
LightController.create(hueSecrets.baseUrl, hueSecrets.username)
    .then((lightController) => {controller = lightController});

app.get('/devices', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const reScan = req.query.hasOwnProperty('reScan');
    const devices = await controller.getDevices(reScan);
    res.json(devices);
})

app.get('/state', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.getState(device);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.get('/color', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.getColor(device);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.put('/color', limiter, async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.putColor(device, req.body.color);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.post('/color', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.putColor(device, req.body.color);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.get('/brightness', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.getBrightness(device);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.put('/brightness', limiter, async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.putBrightness(device, req.body.brightness);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.post('/brightness', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.putBrightness(device, req.body.brightness);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.get('/toggle', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.getToggle(device);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.put('/toggle', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.putToggle(device, req.body.toggle);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.get('/mode', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.getMode(device);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.put('/mode', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.putMode(device, req.body.mode);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.get('/scene', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.getScene(device);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.put('/scene', async (req, res) => {
    if (!controller) {
        const retryAfter = '30'
        res.set('Retry-After', retryAfter);
        res.status(503).send(`Light controller not up yet. Please wait ${retryAfter} seconds.`);
        return;
    }
    const device = req.query.device;
    const result = await controller.putScene(device, req.body);
    if (result.responseCode === 200) {
        res.json(result.data);
    } else {
        res.status(result.responseCode).send(result.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});