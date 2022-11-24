const express = require('express');
const path = require('path');
const bodyparser = require('body-parser');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');

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


// const bedroomManager = new Manager(bedroom);

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.resolve(__dirname, './build/')));
app.use(cors(corsOptions));
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({ extended: true }));

/*
https://developer.tuya.com/en/docs/iot/product-function-definition?id=K9tp155s4th6b
dps: {
    '20': true, <-- switch. Type: Boolean. Value: true/false or on/off

    '21': 'white', <-- mode. Type: Enum. Value: 'white', 'colour', 'scene', 'music'

    '22': 200, <-- white light brightness. Type: Number. Value: 10 - 1000, corresponding to actual brightness 1%-100%$. Lowest brightness display is 1%.

    Note that 23 is missing. It would have been cooling and warming value. @TODO: see if we can program it back in

    '24': '00e302bc0294', <-- IPL (hsv). Type: Character. Value: of format AAAABBBBCCCC (ex: 000011112222).
    0000: H (chromaticity: 0-360, 0X0000-0X0168)
    1111: S (saturation: 0-1000, 0X0000-0X03E8)
    2222: V (Brightness: 0-1000, 0X0000-0X03E8)

    '25': '000e0d0000000000000000c80000', <-- Situation. Type: Character. Value: Value: 0011223344445555666677778888
    00: Scene number
    11: Unit switching interval time (0-100)
    22: Unit change time (0-100)
    33: Unit change mode (0 static, 1 jump, 2 gradual change)
    4444: H (chromaticity: 0-360, 0X0000-0X0168)
    5555: S (saturated: 0-1000, 0X0000-0X03E8)
    6666: V (Brightness: 0-1000, 0X0000-0X03E8)
    7777: White light brightness (0-1000)
    8888: Color temperature value (0-1000)
    Note: The numbers 1-8 correspond to as many groups as there are units

    '26': 0 <-- Countdown. Type: Numeric. Value: 0-86400. The data unit is second,
    which corresponds to a value of 60 for one minute, and the maximum setting is 86400 = 23 hours and 59 minutes.
    0 means off
  }

 */

/* GET home page. */
/*
app.get('/', function(req, res, next) {
    res.render('index', { title: 'Express' });
});

/* GET users listing. * /
app.get('/', function(req, res, next) {
    res.send('respond with a resource');
});
*/

app.get('/color', async (req, res) => {
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    const [h, s, v] = await managedDevice.getBetterHSV();
    console.log(`current color: ${[h, s, v]}`);
    res.json({h, s, v});
});

app.put('/color', (req, res) => {
    const { h, s, v } = req.body.color;
    const device = parseInt(req.query.device);
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    managedDevice.setBetterHSV(h, s, v)
        .then(() => livingroomManager.getBetterHSV())
        .then((data) => console.log(data))
        .then(res.json({completed: true}));
});

app.post('/color', (req, res) => {
    const device = req.query.device;
    const managedDevice = (device === 0) ? new Manager(bedroom) : new Manager(livingroom);
    const h = parseInt(req.query.h);
    const s = parseInt(req.query.s);
    const v = parseInt(req.query.v);
    managedDevice.setBetterHSV(h, s, v)
        .then(() => res.json({ completed: true }));
})

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
