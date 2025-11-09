const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PANEL_PORT || 8080;
const SCRIPTS_DIR = process.env.SCRIPTS_DIR || '/scripts';

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory store for running scripts
const runningScripts = {};

// Deploy endpoint
app.post('/deploy', (req, res) => {
    const { language, scriptName, code } = req.body;
    if (!language || !scriptName || !code) return res.status(400).json({ error: 'Missing fields' });

    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    fs.writeFileSync(scriptPath, code, { encoding: 'utf8' });

    // Determine command
    let cmd, args;
    switch (language.toLowerCase()) {
        case 'python':
            cmd = 'python3'; args = [scriptPath]; break;
        case 'node':
            cmd = 'node'; args = [scriptPath]; break;
        case 'html':
            // Simple HTTP server for HTML
            cmd = 'python3'; args = ['-m', 'http.server', '0', '--directory', SCRIPTS_DIR];
            break;
        default:
            return res.status(400).json({ error: 'Unsupported language' });
    }

    // Run in background
    const proc = spawn(cmd, args, { detached: true, stdio: 'ignore' });
    proc.unref();
    runningScripts[scriptName] = { pid: proc.pid, language, scriptPath };

    res.json({ message: 'Deployed successfully', pid: proc.pid, url: `http://<host>:${PORT}/${scriptName}` });
});

// List running scripts
app.get('/status', (req, res) => {
    res.json(runningScripts);
});

// Stop script
app.post('/stop', (req, res) => {
    const { scriptName } = req.body;
    if (!runningScripts[scriptName]) return res.status(404).json({ error: 'Script not found' });

    try { process.kill(runningScripts[scriptName].pid); } catch {}
    delete runningScripts[scriptName];
    res.json({ message: 'Stopped successfully' });
});

app.listen(PORT, () => console.log(`Deploy panel running on port ${PORT}`));
