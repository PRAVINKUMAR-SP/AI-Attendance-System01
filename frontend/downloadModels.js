import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const modelsDir = path.join(__dirname, 'public', 'models');
if (!fs.existsSync(modelsDir)) fs.mkdirSync(modelsDir, { recursive: true });

const modelsUrl = "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/";
const files = [
    "ssd_mobilenetv1_model-weights_manifest.json", "ssd_mobilenetv1_model-shard1", "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json", "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json", "face_recognition_model-shard1", "face_recognition_model-shard2"
];

console.log('Downloading AI model weights (this takes a few seconds)...');

let completed = 0;
files.forEach(file => {
    https.get(modelsUrl + file, (res) => {
        const filePath = path.join(modelsDir, file);
        const writeStream = fs.createWriteStream(filePath);
        res.pipe(writeStream);
        writeStream.on('finish', () => {
            console.log(`Downloaded: ${file}`);
            completed++;
            if (completed === files.length) {
                console.log('All models downloaded successfully!');
            }
        });
    }).on('error', (e) => {
        console.error(`Error downloading ${file}:`, e);
    });
});
