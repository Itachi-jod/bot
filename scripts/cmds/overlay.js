const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { createCanvas, loadImage } = require('canvas');
const { v4: uuidv4 } = require('uuid');

const cacheFolder = path.join(__dirname, 'cache');
const templates = {
  1: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720460590331-106.mp4',
    imagePosition: { x: 434, y: 120, width: 495, height: 495, curvature: 30 }
  },
  2: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720544714048-1.mp4',
    imagePosition: { x: 35, y: 492, width: 500, height: 650, curvature: 30 }
  },
  3: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720546638190-417.mp4',
    curvedImagePosition: { x: 45, y: 370, width: 630, height: 830, curvature: 30 },
    circularImagePosition: { x: 355, y: 18, size: 350 }
  },
  4: {
      videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720550953048-168.mp4',
      imagePosition: { x: 480, y: 15, width: 450, height: 700, curvature: 25 }
  },
  5: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720552135256-431.mp4',
    imagePosition: { x: 550, y: 120, width: 380, height: 490, curvature: 30 }
  },
  6: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720605734019-176.mp4',
    imagePosition: { x: 35, y: 760, width: 290, height: 400, curvature: 10 }
  },
  7: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720606729322-430.mp4',
    imagePosition: { x: 50, y: 200, width: 350, height: 350, curvature: 40 }
  },
  8: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720607303782-196.mp4',
    imagePosition: { x: 320, y: 465, width: 350, height: 350, curvature: 40 }
  },
  9: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720609537400-282.mp4',
    imagePosition: { x: 95, y: 95, width: 520, height: 580, curvature: 10 }
  },
  10: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720610455191-118.mp4',
    imagePosition: { x: 57, y: 735, width: 610, height: 480, curvature: 10 }
  },
  11: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720611205416-924.mp4',
    imagePosition: { x: 36, y: 150, width: 500, height: 680, curvature: 10 }
  },
  12: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720612689939-910.mp4',
    imagePosition: { x: 55, y: 395, width: 620, height: 765, curvature: 10 }
  },
  13: {
      videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720614082736-314.mp4',
     curvedImagePosition: { x: 90, y: 480, width: 550, height: 700, curvature: 80 },
       circularImagePosition: { x: 355, y: 18, size: 300 }
  },
  14: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720614943351-759.mp4',
    imagePosition: { x: 79, y: 110, width: 560, height: 700, curvature: 10 }
  },
  15: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720615837449-553.mp4',
    imagePosition: { x: 100, y: 200, width: 500, height: 500, curvature: 40 }
  },
  16: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720616152042-883.mp4',
    imagePosition: { x: 85, y: 200, width: 550, height: 730, curvature: 10 }
  },
  17: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720617043224-284.mp4',
    imagePosition: { x: 0, y: 195, width: 730, height: 740, curvature: 10 }
  },
  18: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720617677923-981.mp4',
    imagePosition: { x: 200, y: 125, width: 500, height: 650, curvature: 50 }
  },
  19: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720618736417-945.mp4',
    imagePosition: { x: 0, y: 385, width: 390, height: 520, curvature: 10 }
  },
  20: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720619640056-719.mp4',
    imagePosition: { x: 43, y: 65, width: 445, height: 590, curvature: 10 }
  },
  21: {
    videoUrl: 'https://raw.githubusercontent.com/zoro-77/video-hosting/main/cache/video-1720620191172-593.mp4',
    imagePosition: { x: 180, y: 0, width: 510, height: 570, curvature: 10 }
  },
};

if (!fs.existsSync(cacheFolder)) {
  fs.mkdirSync(cacheFolder);
}

module.exports = {
  config: {
    name: "overlay",
    version: "1.0",
    author: "Vex_Kshitiz",
    shortDescription: "Overlay images onto a template video.",
    longDescription: "Overlay images onto a template video.."
