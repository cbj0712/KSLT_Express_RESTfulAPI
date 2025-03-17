const spawn = require('child_process').spawn;
const path = require('path');

function signLanguageTranslatorConnector(videoPath) {
    const utilsPath = path.resolve('src', 'utils');

    const pythonPath = path.join(utilsPath, 'sign_language_translator.py');
    const modelPath = path.join(utilsPath, 'video_LSTM_1024.h5');
    
    return new Promise((resolve, _) => {
        const test = spawn('python3', [pythonPath, videoPath, modelPath]);
        test.once("close", resolve);
        // test.stdout.on('data', (data) => console.log(data.toString()));
        // test.stderr.on('data', (data) => console.error(data.toString()));
    });
}

module.exports = signLanguageTranslatorConnector;