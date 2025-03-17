const textToSpeech = require('@google-cloud/text-to-speech');

async function google_cloud_text_to_speech(text, gender) {
    const name = gender === 'MALE' ? 'ko-KR-Standard-C' : 'ko-KR-Standard-B';
    
    const clientOption = {
        GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS
    };

    const client = new textToSpeech.TextToSpeechClient(clientOption);
        
    const request = {
        input: {
            text: text
        },
        voice: {
            languageCode: 'ko-KR',
            ssmlGender: gender,
            name: name
        },
        audioConfig: {
            audioEncoding: 'MP3'
        },
    };

    const [response] = await client.synthesizeSpeech(request);
    const base64String = 'data:audio/mp3;base64,' + btoa(String.fromCharCode(...new Uint8Array(response.audioContent)));

    return base64String;
}

module.exports = google_cloud_text_to_speech;