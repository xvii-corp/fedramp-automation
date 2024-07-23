import express from 'express';
import pkg from 'body-parser';
import { validateFileSarif, OscalValidationOptions } from 'oscal';
import { unlinkSync } from 'fs';
import { v4 as uuidv4 } from 'uuid';
const { json } = pkg;
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = 3000;

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname))
    }
})

const upload = multer({ storage: storage })

app.use(json({ limit: '50mb' }));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'resources', 'index.html'));
});

app.post('/validate', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
        const options: OscalValidationOptions = {
            extensions: ["../../../src/validations/constraints/fedramp-external-constraints.xml","../../../src/validations/constraints/oscal-external-constraints.xml"],
            useAjv: false
        };

        // Validate the file and get the SARIF output
        const sarifResult = await validateFileSarif(filePath, options);

        res.json(sarifResult);
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({ error: 'An error occurred during validation' });
    } finally {
        // Clean up the temporary file
        try {
            unlinkSync(filePath);
        } catch (unlinkError) {
            console.error('Error deleting temporary file:', unlinkError);
        }
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});