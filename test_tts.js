const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');

async function testTTS() {
    const tts = new MsEdgeTTS();
    await tts.setMetadata('en-US-AriaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    
    console.log('Generating TTS to file...');
    await tts.toFile('test_audio.mp3', 'Hello world, this is a test of edge tts.');
    
    const buffer = fs.readFileSync('test_audio.mp3');
    console.log('Successfully generated TTS, buffer size:', buffer.length);
    console.log('Base64 preview:', buffer.toString('base64').substring(0, 50) + '...');
}

testTTS().catch(console.error);
