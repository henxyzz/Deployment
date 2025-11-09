const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { spawn } = require('child_process');
const WebSocket = require('ws');
const AdmZip = require('adm-zip');

const app = express();
const PORT = process.env.PANEL_PORT || 8080;
const SCRIPTS_DIR = process.env.SCRIPTS_DIR || '/scripts';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const upload = multer({ dest: '/tmp/' });
const runningScripts = {};

// ----------------- File Management ----------------- //

// Upload file / ZIP
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const destPath = path.join(SCRIPTS_DIR, req.file.originalname);
    if(req.file.originalname.endsWith('.zip')){
        const zip = new AdmZip(req.file.path);
        zip.extractAllTo(SCRIPTS_DIR, true);
        fs.unlinkSync(req.file.path);
        return res.json({ message: 'ZIP extracted successfully' });
    } else {
        fs.renameSync(req.file.path, destPath);
        return res.json({ message: 'File uploaded successfully' });
    }
});

// List files/folders
app.get('/api/list', (req,res)=>{
    const list = fs.readdirSync(SCRIPTS_DIR, { withFileTypes:true }).map(f=>{
        return { name: f.name, isDir: f.isDirectory() };
    });
    res.json(list);
});

// Read file
app.get('/api/read', (req,res)=>{
    const { file } = req.query;
    if(!file) return res.status(400).json({ error:'Missing file' });
    const filePath = path.join(SCRIPTS_DIR, file);
    if(!fs.existsSync(filePath)) return res.status(404).json({ error:'File not found' });
    res.send(fs.readFileSync(filePath,'utf8'));
});

// Save file
app.post('/api/save', (req,res)=>{
    const { file, content } = req.body;
    if(!file || content===undefined) return res.status(400).json({ error:'Missing fields' });
    const filePath = path.join(SCRIPTS_DIR, file);
    fs.writeFileSync(filePath, content,'utf8');
    res.json({ message:'File saved' });
});

// Delete file/folder
app.post('/api/delete',(req,res)=>{
    const { path: target } = req.body;
    if(!target) return res.status(400).json({ error:'Missing path' });
    const targetPath = path.join(SCRIPTS_DIR, target);
    if(!fs.existsSync(targetPath)) return res.status(404).json({ error:'Not found' });
    fs.rmSync(targetPath, { recursive:true, force:true });
    res.json({ message:'Deleted successfully' });
});

// Rename / Move
app.post('/api/rename', (req,res)=>{
    const { oldPath, newPath } = req.body;
    if(!oldPath || !newPath) return res.status(400).json({ error:'Missing fields' });
    const src = path.join(SCRIPTS_DIR, oldPath);
    const dest = path.join(SCRIPTS_DIR, newPath);
    fs.renameSync(src,dest);
    res.json({ message:'Renamed/Moved successfully' });
});

// ----------------- Script Execution ----------------- //

app.post('/api/start', (req,res)=>{
    const { scriptName, language } = req.body;
    if(!scriptName || !language) return res.status(400).json({ error:'Missing fields' });

    const scriptPath = path.join(SCRIPTS_DIR, scriptName);
    if(!fs.existsSync(scriptPath)) return res.status(404).json({ error:'Script not found' });

    let cmd, args;
    switch(language.toLowerCase()){
        case 'python': cmd='python3'; args=[scriptPath]; break;
        case 'node': cmd='node'; args=[scriptPath]; break;
        case 'html': cmd='python3'; args=['-m','http.server','0','--directory',SCRIPTS_DIR]; break;
        case 'bash': cmd='bash'; args=[scriptPath]; break;
        default: return res.status(400).json({ error:'Unsupported language' });
    }

    const proc = spawn(cmd,args,{ detached:true, stdio:['ignore','pipe','pipe'] });
    proc.unref();
    runningScripts[scriptName]={ pid:proc.pid, stdout:'', stderr:'', language };

    proc.stdout.on('data',(data)=>{ runningScripts[scriptName].stdout+=data.toString(); broadcastLogs(scriptName); });
    proc.stderr.on('data',(data)=>{ runningScripts[scriptName].stderr+=data.toString(); broadcastLogs(scriptName); });

    res.json({ message:'Started', pid:proc.pid });
});

app.post('/api/stop',(req,res)=>{
    const { scriptName } = req.body;
    const info = runningScripts[scriptName];
    if(!info) return res.status(404).json({ error:'Script not running' });
    try{ process.kill(info.pid); } catch{}
    delete runningScripts[scriptName];
    res.json({ message:'Stopped' });
});

// ----------------- WebSocket Logs ----------------- //
const wss = new WebSocket.Server({ noServer:true });
function broadcastLogs(scriptName){
    wss.clients.forEach(client=>{
        if(client.readyState===WebSocket.OPEN){
            client.send(JSON.stringify({ script:scriptName, logs: runningScripts[scriptName]?.stdout }));
        }
    });
}

// HTTP server
const server = app.listen(PORT,()=>console.log(`Pro Panel running on port ${PORT}`));
server.on('upgrade',(req,socket,head)=>{
    wss.handleUpgrade(req,socket,head,ws=>{
        wss.emit('connection',ws,req);
    });
});
