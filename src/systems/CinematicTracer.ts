/**
 * CinematicTracer.ts
 * 
 * Zero-overhead frame time and jitter analyzer.
 * Uses a pre-allocated ring buffer to avoid GC churn within the render loop.
 * Tuned for 128 BPM / 432Hz determinism auditing.
 */

const SAMPLE_SIZE = 120; // ~2 seconds of data at 60 FPS
const samples = new Float32Array(SAMPLE_SIZE);
let lastTime = 0;
let frameCount = 0;
let index = 0;

// Temporal Truth Engine V2.1 - Adaptive Persistence
let totalSpikeCount = 0;
let worstFrameEver = 0;
let burstCounter = 0;
let sessionStart = Date.now();
let rollingAvg = 16.67;

// Session Report for Post-Mortem Analysis
const sessionAudit = {
    avg: 0,
    worst: 0,
    totalSpikes: 0,
    durationSeconds: 0,
    startTime: new Date().toISOString()
};

// Auto-Dump session metrics on closure
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        sessionAudit.avg = rollingAvg;
        sessionAudit.worst = worstFrameEver;
        sessionAudit.totalSpikes = totalSpikeCount;
        sessionAudit.durationSeconds = (Date.now() - sessionStart) / 1000;
        console.table(sessionAudit);
    });
}

export function cinematicTracer(now: number, debugMode = false) {
    if (!debugMode) return;

    if (lastTime === 0) {
        lastTime = now;
        return;
    }

    const delta = now - lastTime;
    lastTime = now;

    // ADAPTIVE BASELINE: Detect spikes relative to recent performance (+60% jump)
    const threshold = Math.max(25, rollingAvg * 1.6);
    
    if (delta > threshold) {
        totalSpikeCount++;
        burstCounter++;
        if (delta > worstFrameEver) worstFrameEver = delta;
        
        console.warn(`[SOVEREIGN_SPIKE] ${delta.toFixed(2)}ms (Threshold: ${threshold.toFixed(2)}ms). Total: ${totalSpikeCount}.`);
        
        // BURST DETECTION: Identify series of jitter within a single sample window
        if (burstCounter > 3) {
            console.error(`[SOVEREIGN_CRITICAL] JITTER_BURST_DETECTED: System stability unstable. Burst Count: ${burstCounter}.`);
        }
    }

    samples[index] = delta;
    index = (index + 1) % SAMPLE_SIZE;

    frameCount++;

    // Process and report every SAMPLE_SIZE frames
    if (frameCount % SAMPLE_SIZE === 0) {
        let min = Infinity;
        let max = -Infinity;
        let sum = 0;

        for (let i = 0; i < SAMPLE_SIZE; i++) {
            const v = samples[i];
            if (v < min) min = v;
            if (v > max) max = v;
            sum += v;
        }

        rollingAvg = sum / SAMPLE_SIZE;
        const jitter = max - min;
        burstCounter = 0; // Reset burst on each audit window

        // Temporal Truth Summary
        console.log(
            `[SOVEREIGN_TRACE] rolling_avg: ${rollingAvg.toFixed(2)}ms | jitter: ${jitter.toFixed(2)}ms | session_spikes: ${totalSpikeCount} | worst_record: ${worstFrameEver.toFixed(2)}ms`
        );
        
        // Threshold Alert: Sustained Jitter > 5ms
        if (jitter > 5) {
            console.warn(`[SOVEREIGN_WARNING] SUSTAINED_JITTER: ${jitter.toFixed(2)}ms exceeds high-fidelity variance.`);
        }
    }
}
