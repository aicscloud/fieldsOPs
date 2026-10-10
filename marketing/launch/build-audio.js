const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');
const ffmpeg = require('ffmpeg-static');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const VOICE = process.env.VOICE || 'fr-FR-HenriNeural';
const DURATION = 24;
const RATE = 44100;
const OUT_DIR = path.join(__dirname, 'audio');
const VIDEO_IN = path.join(__dirname, 'intervenio-lancement.mp4');
const VIDEO_OUT = path.join(__dirname, 'intervenio-lancement-son.mp4');

const LINES = [
  { at: 0.4, text: 'Intervenio : vos interventions terrain, simplifiées.' },
  { at: 3.9, text: 'Planifiez, suivez et facturez, depuis une seule application.' },
  { at: 9.0, text: 'Toute votre équipe sur une seule vue : qui fait quoi, et ce qui est en retard.' },
  { at: 16.0, text: 'Le bureau et le terrain, enfin connectés.' },
  { at: 19.9, text: 'Intervenio, pensé pour les PME. Testez la démo !' },
];

function durationOf(file) {
  const r = spawnSync(ffmpeg, ['-nostdin', '-i', file], { encoding: 'utf8' });
  const m = /Duration: (\d+):(\d+):([\d.]+)/.exec(r.stderr);
  return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : 0;
}

async function buildVoices() {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3);
  const files = [];
  for (let i = 0; i < LINES.length; i++) {
    const dir = path.join(OUT_DIR, `voice-${i + 1}`);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const { audioFilePath: raw } = await tts.toFile(dir, LINES[i].text, { rate: '+8%' });
    const audioFilePath = path.join(dir, 'voix.wav');
    execFileSync(ffmpeg, [
      '-nostdin', '-y', '-i', raw,
      '-af', 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse',
      audioFilePath,
    ], { stdio: 'ignore' });
    const dur = durationOf(audioFilePath);
    const next = LINES[i + 1] ? LINES[i + 1].at : DURATION;
    const fits = LINES[i].at + dur <= next + 0.05;
    console.log(`voix ${i + 1}: ${dur.toFixed(2)} s (${LINES[i].at}s -> ${(LINES[i].at + dur).toFixed(2)}s)${fits ? '' : '  ⚠ déborde'}`);
    files.push(audioFilePath);
  }
  tts.close();
  return files;
}

// Am F C G Am F G C, 3 s par accord
const CHORDS = [
  { bass: 55.0, pad: [220.0, 261.63, 329.63], arp: [440.0, 523.25, 659.25, 880.0] },
  { bass: 43.65, pad: [174.61, 220.0, 261.63], arp: [349.23, 440.0, 523.25, 698.46] },
  { bass: 65.41, pad: [261.63, 329.63, 392.0], arp: [523.25, 659.25, 783.99, 1046.5] },
  { bass: 49.0, pad: [196.0, 246.94, 293.66], arp: [392.0, 493.88, 587.33, 783.99] },
];
const PROGRESSION = [0, 1, 2, 3, 0, 1, 3, 2];
const BEAT = 0.5;

function buildMusic(file) {
  const n = DURATION * RATE;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  const arpL = new Float32Array(n);
  const arpR = new Float32Array(n);
  const TAU = Math.PI * 2;

  for (let c = 0; c < PROGRESSION.length; c++) {
    const chord = CHORDS[PROGRESSION[c]];
    const start = c * 3;
    const s0 = Math.max(0, Math.floor((start - 0.3) * RATE));
    const s1 = Math.min(n, Math.floor((start + 3.3) * RATE));
    for (let s = s0; s < s1; s++) {
      const t = s / RATE;
      const local = t - start;
      const env = Math.min(1, (local + 0.3) / 0.6) * Math.min(1, (3.3 - local) / 0.6);
      let v = 0;
      for (const f of chord.pad) {
        v += Math.sin(TAU * f * 0.997 * t) + Math.sin(TAU * f * 1.003 * t) + 0.25 * Math.sin(TAU * f * 2 * t);
      }
      const swell = 0.75 + 0.25 * Math.sin(TAU * 0.25 * t);
      const pad = v * 0.035 * env * swell;
      const bassOn = t >= 3.2 ? 1 : 0.4;
      const bass = Math.sin(TAU * chord.bass * 2 * t) * 0.12 * env * bassOn;
      L[s] += pad + bass;
      R[s] += pad * 0.95 + bass;
    }

    if (start + 3 <= 3.2) continue;
    for (let k = 0; k < 12; k++) {
      const nt = start + k * 0.25;
      if (nt < 3.2 || nt >= DURATION - 0.5) continue;
      const f = chord.arp[[0, 1, 2, 3, 2, 1][k % 6]];
      const pan = k % 2 ? 0.35 : 0.65;
      const a = Math.floor(nt * RATE);
      const len = Math.floor(0.6 * RATE);
      for (let i = 0; i < len && a + i < n; i++) {
        const t = i / RATE;
        const env = Math.exp(-t * 7) * Math.min(1, t / 0.004);
        const v = (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * f * 2 * t) + 0.1 * Math.sin(TAU * f * 3 * t)) * env * 0.07;
        arpL[a + i] += v * (1 - pan);
        arpR[a + i] += v * pan;
      }
    }
  }

  const delays = [[0.031, 0.037], [0.043, 0.029], [0.375, 0.25]];
  for (const [dl, dr] of delays) {
    const fb = dl > 0.3 ? 0.35 : 0.55;
    const nl = Math.floor(dl * RATE);
    const nr = Math.floor(dr * RATE);
    for (let s = 0; s < n; s++) {
      if (s >= nl) arpL[s] += arpR[s - nl] * fb * 0.5;
      if (s >= nr) arpR[s] += arpL[s - nr] * fb * 0.5;
    }
  }
  for (let s = 0; s < n; s++) {
    L[s] += arpL[s];
    R[s] += arpR[s];
  }

  for (let b = 3.2; b < DURATION - 1; b += BEAT) {
    const a = Math.floor(b * RATE);
    const isDown = Math.abs((b - 3.2) % 2) < 1e-6;
    for (let i = 0; i < 0.35 * RATE && a + i < n; i++) {
      const t = i / RATE;
      const f = 50 + 90 * Math.exp(-t * 30);
      const v = Math.sin(TAU * f * t) * Math.exp(-t * 9) * (isDown ? 0.32 : 0.24);
      L[a + i] += v;
      R[a + i] += v;
    }
    if (b >= 8.6) {
      const h = Math.floor((b + BEAT / 2) * RATE);
      let last = 0;
      for (let i = 0; i < 0.05 * RATE && h + i < n; i++) {
        const noise = Math.random() * 2 - 1;
        const hp = noise - last;
        last = noise;
        const v = hp * Math.exp(-(i / RATE) * 70) * 0.05;
        L[h + i] += v;
        R[h + i] += v * 0.8;
      }
    }
  }

  const riseStart = 2.2;
  for (let s = Math.floor(riseStart * RATE); s < Math.floor(3.2 * RATE); s++) {
    const p = (s / RATE - riseStart) / 1.0;
    const v = (Math.random() * 2 - 1) * p * p * 0.06;
    L[s] += v;
    R[s] += v;
  }

  const fadeIn = 0.4 * RATE;
  const fadeOut = 1.8 * RATE;
  let peak = 0;
  for (let s = 0; s < n; s++) {
    const g = Math.min(1, s / fadeIn) * Math.min(1, (n - s) / fadeOut);
    L[s] *= g;
    R[s] *= g;
    peak = Math.max(peak, Math.abs(L[s]), Math.abs(R[s]));
  }

  const gain = 0.89 / peak;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(RATE, 24);
  buf.writeUInt32LE(RATE * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let s = 0; s < n; s++) {
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[s] * gain)) * 32767), 44 + s * 4);
    buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[s] * gain)) * 32767), 46 + s * 4);
  }
  fs.writeFileSync(file, buf);
}

function mix(musicFile, voiceFiles) {
  const args = ['-nostdin', '-y', '-i', VIDEO_IN, '-i', musicFile];
  for (const f of voiceFiles) args.push('-i', f);

  const voiceChains = voiceFiles.map((_, i) => {
    const ms = Math.round(LINES[i].at * 1000);
    return `[${i + 2}:a]aresample=44100,aformat=channel_layouts=stereo,adelay=${ms}|${ms}[v${i}]`;
  });
  const voiceLabels = voiceFiles.map((_, i) => `[v${i}]`).join('');
  const filter = [
    ...voiceChains,
    `${voiceLabels}amix=inputs=${voiceFiles.length}:normalize=0,highpass=f=90,acompressor=threshold=0.1:ratio=3:attack=5:release=120,volume=1.6,apad,atrim=0:${DURATION}[vo]`,
    `[vo]asplit=2[vo1][vo2]`,
    `[1:a]volume=0.55[mu]`,
    `[mu][vo1]sidechaincompress=threshold=0.03:ratio=8:attack=30:release=400[duck]`,
    `[duck][vo2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100[aout]`,
  ].join(';');

  args.push(
    '-filter_complex', filter,
    '-map', '0:v', '-map', '[aout]',
    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
    '-t', String(DURATION), '-movflags', '+faststart',
    VIDEO_OUT,
  );
  execFileSync(ffmpeg, ['-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'inherit'], timeout: 120000 });
}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const voices = await buildVoices();
  const musicFile = path.join(OUT_DIR, 'musique.wav');
  buildMusic(musicFile);
  console.log('musique: ok');
  mix(musicFile, voices);
  console.log(`vidéo: ${VIDEO_OUT} (${Math.round(fs.statSync(VIDEO_OUT).size / 1024)} KB)`);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
