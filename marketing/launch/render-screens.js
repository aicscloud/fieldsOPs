const { chromium } = require('playwright');
const ffmpegPath = require('ffmpeg-static');
const { spawn, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DURATION = 24;
const dir = __dirname;
const html = path.join(dir, 'screens.html');
const out = path.join(dir, 'intervenio-lancement.mp4');
const previews = [
  ['1.6', 'a'],
  ['6.5', 'b'],
  ['12.5', 'c'],
  ['18', 'd'],
  ['23', 'e'],
];

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(cmd + ' exited ' + code))));
  });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1080, height: 1920 },
    recordVideo: { dir, size: { width: 1080, height: 1920 } },
  });
  const page = await context.newPage();
  const openedAt = Date.now();
  await page.goto('file:///' + html.replace(/\\/g, '/'));
  await page.waitForFunction(() => document.body.classList.contains('go'));
  const offset = (Date.now() - openedAt) / 1000;
  await page.waitForTimeout(DURATION * 1000 + 600);
  const video = page.video();
  await context.close();
  await browser.close();
  const webm = await video.path();
  await run(ffmpegPath, [
    '-nostdin',
    '-y',
    '-loglevel', 'error',
    '-ss', offset.toFixed(2),
    '-i', webm,
    '-t', String(DURATION),
    '-vf', 'fps=30',
    '-c:v', 'libx264',
    '-preset', 'slow',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
    '-movflags', '+faststart',
    '-an',
    out,
  ]);
  fs.unlinkSync(webm);
  if (process.argv.includes('--preview')) {
    for (const [at, name] of previews) {
      spawnSync(
        ffmpegPath,
        ['-nostdin', '-y', '-loglevel', 'error', '-ss', at, '-i', out, '-frames:v', '1', '-update', '1', path.join(dir, `prev-${name}.png`)],
        { stdio: ['ignore', 'ignore', 'inherit'], timeout: 20000 },
      );
    }
  }
  console.log('WROTE', out, Math.round(fs.statSync(out).size / 1024) + 'KB');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
