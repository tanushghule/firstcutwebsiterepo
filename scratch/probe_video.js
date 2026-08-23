const fs = require('fs');

function getMp4Duration(filePath) {
    const buffer = fs.readFileSync(filePath);
    
    // Find 'mvhd' atom
    let offset = 0;
    while (offset < buffer.length - 8) {
        const size = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        
        if (type === 'moov') {
            offset += 8; // Move inside moov
            continue;
        }
        
        if (type === 'mvhd') {
            const version = buffer.readUInt8(offset + 8);
            let timescale, duration;
            if (version === 1) {
                timescale = buffer.readUInt32BE(offset + 28);
                duration = buffer.readBigUInt64BE(offset + 32);
            } else {
                timescale = buffer.readUInt32BE(offset + 20);
                duration = buffer.readUInt32BE(offset + 24);
            }
            
            return Number(duration) / timescale;
        }
        
        if (size <= 0) break;
        offset += size;
    }
    return null;
}

const duration = getMp4Duration('TEMPLATES/SCROLLING-LINKED-ANIMATION-VIDEO.mp4');
console.log('Video Duration:', duration, 'seconds');
