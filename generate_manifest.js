
const fs = require('fs');
const path = require('path');

const hudDir = path.join(__dirname, 'client/public/default_hud');
const outputFile = path.join(hudDir, 'manifest.json');

function scanDir(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
        if (entry.name === 'manifest.json') continue;
        
        const relPath = path.join(relativePath, entry.name).replace(/\\/g, '/');
        
        if (entry.isDirectory()) {
            result.push({
                name: entry.name,
                type: 'folder',
                path: relPath,
                children: scanDir(path.join(dir, entry.name), relPath)
            });
        } else {
            result.push({
                name: entry.name,
                type: 'file',
                path: relPath
            });
        }
    }
    return result;
}

try {
    const tree = scanDir(hudDir);
    fs.writeFileSync(outputFile, JSON.stringify(tree, null, 2));
    console.log(`Manifest generated at ${outputFile}`);
} catch (e) {
    console.error("Error generating manifest:", e);
}
