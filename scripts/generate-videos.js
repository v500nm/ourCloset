const { chromium } = require('@playwright/test');
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TARGET_URL = 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, '../public/auto-demos');
const TEMP_DIR = path.join(__dirname, '../public/auto-demos/.temp');
const TTS_VOICE = 'en-US-JennyNeural';

process.on('uncaughtException', (err) => {
    if (err.code === 'ENOENT' && err.syscall === 'unlink') {} else {
        console.error('Uncaught Exception:', err);
        process.exit(1);
    }
});

let FFMPEG_BIN;
try {
    FFMPEG_BIN = require('ffmpeg-static');
} catch (e) {
    console.error('❌ ffmpeg-static not installed.');
    process.exit(1);
}

const videoScenarios = [
    {
        category: 'fashion',
        name: 'ourcloset_explore',
        path: '/',
        title: 'OurCloset - AI Wardrobe Manager',
        subtitle: 'Intelligent Outfit Tracking & Recommendations',
        walkthrough: async (page, engine) => {
            await engine.narrate(page, "Welcome to OurCloset.");
            await page.waitForTimeout(1000);
            
            await engine.narrate(page, "An AI-powered wardrobe management application.");
            await page.waitForTimeout(2000);
            
            await engine.narrate(page, "Experience intelligent outfit tracking and recommendations.");
            await page.waitForTimeout(3000);
        }
    }
];

class VideoEngine {
    constructor() {
        this.tts = new MsEdgeTTS();
        this.browser = null;
        this.context = null;
    }

    async init() {
        await this.tts.setMetadata(TTS_VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
        
        this.browser = await chromium.launch({ headless: true });
        this.context = await this.browser.newContext({
            viewport: { width: 1920, height: 1080 },
            recordVideo: { dir: TEMP_DIR, size: { width: 1920, height: 1080 } }
        });
    }

    async close() {
        if (this.context) await this.context.close();
        if (this.browser) await this.browser.close();
    }

    async narrate(page, text) {
        console.log(`   🎙️ Narration queued: "${text}"`);
        this.currentScenarioNarration.push(text);
        
        await page.evaluate((captionText) => {
            let overlay = document.getElementById('pw-caption-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'pw-caption-overlay';
                overlay.style.position = 'fixed';
                overlay.style.bottom = '80px';
                overlay.style.left = '50%';
                overlay.style.transform = 'translateX(-50%)';
                overlay.style.backgroundColor = 'rgba(15, 23, 42, 0.9)';
                overlay.style.color = '#F8FAFC';
                overlay.style.padding = '16px 32px';
                overlay.style.borderRadius = '12px';
                overlay.style.fontFamily = 'Inter, system-ui, sans-serif';
                overlay.style.fontSize = '24px';
                overlay.style.fontWeight = '500';
                overlay.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
                overlay.style.zIndex = '999999';
                overlay.style.textAlign = 'center';
                overlay.style.maxWidth = '80%';
                overlay.style.transition = 'opacity 0.3s ease';
                document.body.appendChild(overlay);
            }
            overlay.textContent = captionText;
            overlay.style.opacity = '1';
        }, text);
        
        const estDuration = (text.split(' ').length / 2.5) * 1000 + 1500;
        await page.waitForTimeout(estDuration);
        
        await page.evaluate(() => {
            const overlay = document.getElementById('pw-caption-overlay');
            if (overlay) overlay.style.opacity = '0';
        });
    }

    async runPipeline() {
        await this.init();
        
        for (let i = 0; i < videoScenarios.length; i++) {
            const scenario = videoScenarios[i];
            this.currentScenarioNarration = [];
            const outName = `${scenario.name}.webm`;
            const outPath = path.join(OUTPUT_DIR, outName);
            
            console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            console.log(`  📹 [${i + 1}/${videoScenarios.length}] ${scenario.category} / ${scenario.name}`);
            console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
            
            const page = await this.context.newPage();
            
            try {
                await page.goto(`${TARGET_URL}${scenario.path}`, { waitUntil: 'networkidle' });
                await page.waitForTimeout(2000);
                
                await scenario.walkthrough(page, this);
                await page.waitForTimeout(2000);
                
                const video = await page.video();
                const tempVideoPath = await video.path();
                await page.close();
                
                const tempAudioPath = path.join(TEMP_DIR, `audio_${scenario.name}.mp3`);
                let audioTrackPath = tempAudioPath;
                if (this.currentScenarioNarration.length > 0) {
                    const fullText = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>
                        <voice name='${TTS_VOICE}'>
                            <prosody rate="0.9" pitch="-2Hz">
                                ${this.currentScenarioNarration.map(t => `<p>${t}</p>`).join('\n')}
                            </prosody>
                        </voice>
                    </speak>`;
                    
                    const tempDirForMsEdge = path.join(TEMP_DIR, `msedge_${scenario.name}`);
                    if (!fs.existsSync(tempDirForMsEdge)) fs.mkdirSync(tempDirForMsEdge);
                    
                    try {
                        await this.tts.toFile(tempDirForMsEdge, fullText);
                        const files = fs.readdirSync(tempDirForMsEdge);
                        if (files.length > 0) fs.renameSync(path.join(tempDirForMsEdge, files[0]), tempAudioPath);
                        else audioTrackPath = null;
                    } catch (e) {
                        if (fs.existsSync(tempDirForMsEdge)) {
                             const files = fs.readdirSync(tempDirForMsEdge);
                             if (files.length > 0) fs.renameSync(path.join(tempDirForMsEdge, files[0]), tempAudioPath);
                             else audioTrackPath = null;
                        }
                    }
                } else audioTrackPath = null;
                
                let mergeCmd = `"${FFMPEG_BIN}" -y -i "${tempVideoPath}" -c:v copy "${outPath}"`;
                if (audioTrackPath && fs.existsSync(audioTrackPath)) {
                    mergeCmd = `"${FFMPEG_BIN}" -y -i "${tempVideoPath}" -i "${audioTrackPath}" -c:v copy -c:a libopus -b:a 128k -map 0:v:0 -map 1:a:0 -shortest "${outPath}"`;
                }
                execSync(mergeCmd, { stdio: 'ignore' });
                
                if (fs.existsSync(tempVideoPath)) fs.unlinkSync(tempVideoPath);
                if (audioTrackPath && fs.existsSync(audioTrackPath)) fs.unlinkSync(audioTrackPath);
                console.log(`   ✅ Done: ${outName}`);
                
            } catch (err) {
                console.error(`❌ Error in ${scenario.name}:`, err.message);
                if (!page.isClosed()) await page.close();
            }
        }
        await this.close();
    }
}

const engine = new VideoEngine();
engine.runPipeline().then(() => {
    console.log(`\n🎉 Complete! Outputs saved to public/auto-demos/`);
}).catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
});
