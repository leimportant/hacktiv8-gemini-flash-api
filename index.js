require('dotenv').config(); 
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
// const visionModel = genAI.getGenerativeModel({ model: "gemini-pro-vision" });
const visionModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });


if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// inisial express.json() middleware
app.use(express.json());


// POST end point generate text
app.post('/generate-text', async (req, res) => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({ error: "Prompt tidak boleh kosong" });
        }

        const result = await model.generateContent(prompt);
        const response = await result.response;
        res.json({ text: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    try {
        const imagePath = req.file.path;

        if (!imagePath) {
            return res.status(400).json({ error: "Image file is required" });
        }

        const imageData = fs.readFileSync(imagePath);
        const imageBase64 = imageData.toString('base64');

        const parts = [
            { text: req.body.prompt || "Describe this image" },
            {
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: imageBase64
                }
            }
        ];

        const result = await visionModel.generateContent(parts);
        const response = await result.response;
        
        // Cleanup
        // delete image setelah
        fs.unlinkSync(imagePath);
        
        res.json({ text: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Document analysis endpoint
app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    try {
        const docPath = req.file.path;
        if (!docPath) {
            return res.status(400).json({ error: "Document file is required" });
        }

        const documentData = fs.readFileSync(docPath);
        const docBase64 = documentData.toString('base64');

        const parts = [
            { text: req.body.prompt || "Analyze this document" },
            {
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: docBase64
                }
            }
        ];

        const result = await visionModel.generateContent(parts);
        const response = await result.response;
        
        // Cleanup
        fs.unlinkSync(docPath);
        
        res.json({ text: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Audio processing endpoint
app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    try {
        const audioPath = req.file.path;
        if (!audioPath) {
            return res.status(400).json({ error: "Audio file is required" });
        }
        const audioData = fs.readFileSync(audioPath);
        const audioBase64 = audioData.toString('base64');

        const parts = [
            { text: req.body.prompt || "Transcribe and analyze this audio" },
            {
                inlineData: {
                    mimeType: req.file.mimetype,
                    data: audioBase64
                }
            }
        ];

        const result = await visionModel.generateContent(parts);
        const response = await result.response;
        
        // Cleanup
        fs.unlinkSync(audioPath);
        
        res.json({ text: response.text() });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
