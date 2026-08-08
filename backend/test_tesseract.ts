const Tesseract = require('tesseract.js');
async function test() {
  try {
    console.log('testing tesseract');
    const { data: { text } } = await Tesseract.recognize('https://tesseract.projectnaptha.com/img/eng_bw.png', 'eng');
    console.log(text);
  } catch(e: any) {
    console.error(e);
  }
}
test();
