const fs = require('fs');
const path = require('path');

const FONT_PATH = path.join(__dirname, '..', 'fonts', 'NotoSansSC.ttf');

async function ensureFonts() {
    if (!fs.existsSync(FONT_PATH)) {
        throw new Error('Font file not found: ' + FONT_PATH);
    }
    return {
        regular: FONT_PATH,
        bold: FONT_PATH,
    };
}

module.exports = { ensureFonts };
