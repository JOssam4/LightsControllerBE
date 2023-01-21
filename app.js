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

const PORT = 3001;

const livingroom = new TuyAPI({
    id: 'eb5bcfaa30722046765rxa',
    key: '3c236d1941e65bde',
    version: 3.3,
    ip: '10.0.0.7',
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
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    const toggle = await managedDevice.getToggleStatus();
    const [h, s, v] = await managedDevice.getBetterHSV();
    const brightness = await managedDevice.getWhiteBrightnessPercentage();
    const mode = await managedDevice.getMode();
    console.log(`current toggle: ${toggle}`);
    console.log(`current color: ${[h, s, v]}`);
    console.log(`current brightness: ${brightness}`);
    console.log(`current mode: ${mode}`);
    res.json({color: {h, s, v}, brightness, toggle, mode});
});

app.get('/color', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    const [h, s, v] = await managedDevice.getBetterHSV();
    console.log(`current color: ${[h, s, v]}`);
    res.json({h, s, v});
});

app.put('/color', limiter, (req, res) => {
    const { h, s, v } = req.body.color;
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    managedDevice.setBetterHSV(h, s, v)
        .then(() => res.json({completed: true}))
        .catch(() => res.json({completed: false}));
});

// Used as a rate limit override for final decision.
app.post('/color', (req, res) => {
    const { h, s, v } = req.body.color;
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    managedDevice.setBetterHSV(h, s, v)
        .then(() => res.json({completed: true}))
        .catch(() => res.json({completed: false}));
});

app.get('/brightness', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    const brightness = await managedDevice.getBrightnessPercentage();
    console.log(`current brightness: ${brightness}%`);
    res.json({brightness});
});

app.put('/brightness', limiter, (req, res) => {
    const device = parseInt(req.query.device);
    let brightness = parseInt(req.body.brightness);
    if (brightness < 0) {
        brightness = 0;
    } else if (brightness > 100) {
        brightness = 100;
    }
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    managedDevice.setBrightnessPercentage(brightness)
        .then(() => res.json({completed: true}))
        .catch(() => res.json({completed: false}));
});

app.post('/brightness', (req, res) => {
    const device = parseInt(req.query.device);
    let brightness = parseInt(req.body.brightness);
    if (brightness < 0) {
        brightness = 0;
    } else if (brightness > 100) {
        brightness = 100;
    }
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    managedDevice.setBrightnessPercentage(brightness)
        .then(() => res.json({completed: true}))
        .catch(() => res.json({completed: false}));
});

app.get('/toggle', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    const toggle = await managedDevice.getToggleStatus();
    console.log(`current toggle status: ${toggle}`);
    res.json({toggle});
});

app.put('/toggle', (req, res) => {
    const device = parseInt(req.query.device);
    const toggle = req.body.toggle;
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    managedDevice.setToggleStatus(toggle)
        .then(() => res.json({completed: true}))
        .catch(() => res.json({completed: false}));
});

app.get('/mode', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    const mode = await managedDevice.getMode();
    console.log(`current mode: ${mode}`);
    res.json({mode});
});

// Since brightness slider should be for all modes, send back current brightness
app.put('/mode', async (req, res) => {
    const device = parseInt(req.query.device);
    const mode = req.body.mode;
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    managedDevice.setMode(mode)
        .then(() => {
            managedDevice.getBrightnessPercentage()
            .then((brightness) => {
                console.log(`brightness: ${brightness}`);
                res.json({completed: true, brightness});
            })
        })
        .catch(() => res.json({completed: false}));
});

/*
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, './build', 'index.html'));
});
*/
app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});