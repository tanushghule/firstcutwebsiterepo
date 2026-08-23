const fs = require('fs');
const path = require('path');
const https = require('https');

const IMAGES_DIR = path.join(__dirname, '..', 'images');

// Ensure images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// List of high-quality public domain Unsplash URLs corresponding to film festival topics
const imageSources = {
  'about.jpg': 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop&q=80', // movie theater screen
  'guests.jpg': 'https://images.unsplash.com/photo-1478812954026-9c750f0e89fc?w=800&auto=format&fit=crop&q=80', // speaker on stage
  'submit_banner.jpg': 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&auto=format&fit=crop&q=80', // camera silhouette on set
  
  // Hero Strip
  'strip1.jpg': 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&auto=format&fit=crop&q=80', // theater seats projector
  'strip2.jpg': 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&auto=format&fit=crop&q=80', // movie reels editing
  'strip3.jpg': 'https://images.unsplash.com/photo-1542204172-e7052809a862?w=600&auto=format&fit=crop&q=80', // director clapboard
  'strip4.jpg': 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80', // filming scene
  
  // Event Cards
  'event_awards.jpg': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=600&auto=format&fit=crop&q=80', // golden trophy award
  'event_face2face.jpg': 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=600&auto=format&fit=crop&q=80', // stage panel discussion
  'event_masterclass.jpg': 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80', // film study seminar
  'event_redcarpet.jpg': 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&auto=format&fit=crop&q=80', // gala lights red carpet
  
  // Team circular shots
  'team1.jpg': 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&auto=format&fit=crop&q=80', // young female creator
  'team2.jpg': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&auto=format&fit=crop&q=80', // young male creator
  'team3.jpg': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=300&auto=format&fit=crop&q=80', // young female creator
  'team4.jpg': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&auto=format&fit=crop&q=80', // young male creator
  'team5.jpg': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&auto=format&fit=crop&q=80'  // young female creator
};

function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const destPath = path.join(IMAGES_DIR, filename);
    const file = fs.createWriteStream(destPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (Status Code: ${response.statusCode})`));
        return;
      }
      
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function downloadAll() {
  console.log('Downloading cinematic photos...');
  for (const [filename, url] of Object.entries(imageSources)) {
    try {
      await downloadImage(url, filename);
    } catch (err) {
      console.error(`Error downloading ${filename}:`, err.message);
    }
  }
  console.log('All downloads completed!');
}

downloadAll();
