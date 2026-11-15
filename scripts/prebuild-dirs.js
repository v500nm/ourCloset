const fs = require('fs');
const path = require('path');

function mirrorDirs(srcDir, targetDirs) {
  if (!fs.existsSync(srcDir)) return;
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const subSrc = path.join(srcDir, entry.name);
      for (const targetDir of targetDirs) {
        const subTarget = path.join(targetDir, entry.name);
        fs.mkdirSync(subTarget, { recursive: true });
      }
      mirrorDirs(subSrc, targetDirs.map(t => path.join(t, entry.name)));
    }
  }
}

const baseApp = path.join(__dirname, '..', 'src', 'app');
const serverApp = path.join(__dirname, '..', '.next', 'server', 'app');
const staticApp = path.join(__dirname, '..', '.next', 'static', 'chunks', 'app');

fs.mkdirSync(serverApp, { recursive: true });
fs.mkdirSync(staticApp, { recursive: true });

mirrorDirs(baseApp, [serverApp, staticApp]);
console.log('Successfully mirrored route directory structure into .next');

