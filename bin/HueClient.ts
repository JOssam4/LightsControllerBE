import axios from 'axios';
import * as fs from 'fs';
import * as https from 'https';

// Hue bridges block plain HTTP, so requests go over HTTPS. Bridge certificates are signed by
// the Philips Hue / Signify root CA and use the bridge ID (not the IP) as their common name.
const ca = fs.readFileSync('./bin/hue_root_ca.pem');
const bridgeId: string = JSON.parse(fs.readFileSync('./bin/hue_keys.json').toString()).bridgeId;

const hueClient = axios.create({
    httpsAgent: new https.Agent({
        ca,
        checkServerIdentity: (_host, cert) => {
            if (cert.subject.CN.toLowerCase() !== bridgeId.toLowerCase()) {
                return new Error(`Hue bridge certificate CN ${cert.subject.CN} does not match bridgeId ${bridgeId}`);
            }
            return undefined;
        },
    }),
});

export default hueClient;
