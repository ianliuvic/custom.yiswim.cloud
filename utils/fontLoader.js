const fs = require('fs');
const path = require('path');
const https = require('https');

const FONT_DIR = path.join(__dirname, '..', 'fonts');
const FONT_URL = 'https://fonts.gstatic.com/s/notosanssc/v37/k3kCo84MPvpLmixcA63oeAL7Iqp5IZJF9bmaG9_EnYxNbPzS5HE.ttf';
const FONTS = {
    'NotoSansSC-Regular.ttf': FONT_URL,
    'NotoSansSC-Bold.ttf': FONT_URL,
};

function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(dest);
        const request = (reqUrl) => {
            https.get(reqUrl, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    request(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) {
                    fs.unlinkSync(dest);
                    reject(new Error(`Download failed: HTTP ${res.statusCode}`));
                    return;
                }
                res.pipe(file);
                file.on('finish', () => { file.close(); resolve(); });
            }).on('error', (e) => {
                fs.unlinkSync(dest);
                reject(e);
            });
        };
        request(url);
    });
}

let _fontsReady = null;

async function ensureFonts() {
    if (_fontsReady) return _fontsReady;
    _fontsReady = _doEnsure();
    return _fontsReady;
}

async function _doEnsure() {
    fs.mkdirSync(FONT_DIR, { recursive: true });
    for (const [filename, url] of Object.entries(FONTS)) {
        const dest = path.join(FONT_DIR, filename);
        if (!fs.existsSync(dest)) {
            console.log(`[PDF] Downloading font ${filename}...`);
            await downloadFile(url, dest);
            console.log(`[PDF] Font ${filename} downloaded.`);
        }
    }
    return {
        regular: path.join(FONT_DIR, 'NotoSansSC-Regular.ttf'),
        bold: path.join(FONT_DIR, 'NotoSansSC-Bold.ttf'),
    };
}

module.exports = { ensureFonts };
