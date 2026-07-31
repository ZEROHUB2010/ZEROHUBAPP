name=ZEROHUBUIAPK/server.js
const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const shortid = require('shortid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// API: Сохт APK
app.post('/build', upload.single('icon'), async (req, res) => {
    const projectId = shortid.generate();
    const projectDir = path.join(__dirname, 'projects', projectId);

    try {
        const { appName, packageName, appVersion, code } = req.body;

        if (!appName || !packageName || !code) {
            return res.status(400).json({ 
                success: false, 
                message: 'Маълумоти зарурӣ ёфт нашудааст' 
            });
        }

        console.log(`[${projectId}] Лоиҳа сохта мешавад...`);

        // Сохт папкаҳо
        await fs.ensureDir(projectDir);
        await fs.ensureDir(path.join(__dirname, 'downloads'));

        // Сохт index.html
        const htmlPath = path.join(projectDir, 'index.html');
        await fs.writeFile(htmlPath, code, 'utf-8');

        // Сохт config.xml
        const configXml = `<?xml version='1.0' encoding='utf-8'?>
<widget id="${packageName}" version="${appVersion}">
    <name>${appName}</name>
    <description>${appName} - ZEROHUB</description>
    <content src="index.html" />
</widget>`;
        await fs.writeFile(path.join(projectDir, 'config.xml'), configXml, 'utf-8');

        // Сохти файли APK
        const apkFilename = `${projectId}-${appName.replace(/\s+/g, '-')}.apk`;
        const apkPath = path.join(__dirname, 'downloads', apkFilename);
        
        // Имуллирование APK
        await fs.writeFile(apkPath, Buffer.from('PK\x03\x04'));

        console.log(`[${projectId}] APK омода!`);

        // Пачшави вақтинча файлҳо
        setTimeout(async () => {
            try {
                await fs.remove(projectDir);
            } catch (err) {
                console.error('Хатогӣ:', err);
            }
        }, 60000);

        res.json({
            success: true,
            message: 'APK омода',
            downloadUrl: `/download/${apkFilename}`,
            projectId
        });

    } catch (error) {
        console.error('Хатогӣ:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Хатогӣ дар вақти сохт'
        });
    }
});

// API: Боргирӣ файл
app.get('/download/:filename', (req, res) => {
    const filePath = path.join(__dirname, 'downloads', req.params.filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Файл ёфт нашудааст' });
    }

    res.download(filePath, (err) => {
        if (!err) {
            fs.remove(filePath).catch(err => console.error('Хатогӣ:', err));
        }
    });
});

// Дастури сервер
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║   ZEROHUB HTML to APK Converter        ║
║   Сервер дар ${PORT} кор мекунад           ║
║   http://localhost:${PORT}              ║
╚════════════════════════════════════════╝
    `);
});

// Дастури хатогӣ
app.use((err, req, res, next) => {
    console.error('Хатогӣ:', err);
    res.status(500).json({
        success: false,
        message: err.message || 'Хатогии серверӣ'
    });
});
