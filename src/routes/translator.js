const express = require('express');
const mecab = require('mecab-ya');
const dbConnector = require('../mysql.js').getConnection();
const synthesizer = require('../utils/google_cloud_text_to_speech.util.js');
const signLanguageTranslatorConnector = require('../utils/sign_language_translator_connector.js');
const multer  = require('multer');
const storage = multer.memoryStorage();
const upload = multer({storage});
const uuid = require('uuid').v4;
const fs = require('fs');
const path = require('path');

const router = express.Router();

router.get('/', async (req, res) => {
    res.status(200).send('OK');
});

router.get('/text2sign', async (req, res) => {
    const voiceSentence = req.query.text;
    
    const postPosition = ['JKS', 'JKC', 'JKG', 'JKO', 'JKB', 'JKV', 'JKQ', 'JX', 'JC'];
    const predicate = ['VV', 'VA'];
    const ending = ['EP', 'EF', 'EC', 'XSV'];

    const withOutPostPositionWordArray = await new Promise((resolve, rejcet) => {
        mecab.pos(voiceSentence, (err, result) => {
            if(err) rejcet(err);
            resolve(result.reduce((prev, next) => {
                if(!postPosition.includes(next[1])) {
                    if(predicate.includes(next[1])) {
                        next[0] += '다';
                    }

                    if(!ending.includes(next[1])) {
                        prev.push(next[0]);
                    }
                }
                return prev;
            }, []));
        });
    });

    dbConnector.query('SELECT function_name, korean_word FROM MAPPING WHERE korean_word IN ('+withOutPostPositionWordArray.map(word => JSON.stringify(word)).join()+')', (error, rows, fields) => {
        if (error) {
            res.status(400).send(error);
        }

        res.status(200).send(withOutPostPositionWordArray.map(word => rows.find(({korean_word}) => korean_word === word)?.function_name).filter(word => word));
    });

});

router.post('/sign2text', upload.single('video'), async (req, res) => {
    const UUID = uuid();
    const videoPath = path.resolve(path.join('src', 'sign_language_storage', `${UUID}.txt`));
    const videoBase64 = 'data:video/webm;base64,' + req.file.buffer.toString('base64');

    fs.writeFileSync(videoPath, videoBase64);

    await signLanguageTranslatorConnector(videoPath);

    const translateResult = fs.readFileSync(videoPath);
    fs.unlinkSync(videoPath);

    res.status(200).send(translateResult);
});

router.get('/text2voice', async (req, res) => {
    const synthesisValue = req.query.text;
    const gender = req.query.gender;

    const binaryVoiceResult = await synthesizer(synthesisValue, gender);

    res.status(200).send(binaryVoiceResult);
});

router.get('/*', (_, res) => {
    res.status(404).send('Not found');
});

module.exports = router;