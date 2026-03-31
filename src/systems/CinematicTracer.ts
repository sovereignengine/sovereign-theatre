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

// Temporal Truth Engine V2 - Persisting across bursts
let totalSpikeCount = 0;
let worstFrameEver = 0;

export function cinematicTracer(now: number, debugMode = false) {
    if (!debugMode) return;

    if (lastTime === 0) {
        lastTime = now;
        return;
    }

    const delta = now - lastTime;
    lastTime = now;

    // SPIKE HUNTER: Detect individual micro-stutters (> 25ms / ~40fps drop)
    if (delta > 25) {
        totalSpikeCount++;
        if (delta > worstFrameEver) worstFrameEver = delta;
        console.warn(`[SOVEREIGN_SPIKE] ${delta.toFixed(2)}ms detected. Cumulative Spikes: ${totalSpikeCount}.`);
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

        const avg = sum / SAMPLE_SIZE;
        const jitter = max - min;

        // Temporal Truth Summary
        console.log(
            `[SOVEREIGN_TRACE] avg: ${avg.toFixed(2)}ms | jitter: ${jitter.toFixed(2)}ms | spikes: ${totalSpikeCount} | worst_frame: ${worstFrameEver.toFixed(2)}ms`
        );
        
        // Critical Threshold Log: Alert if jitter exceeds 5ms
        if (jitter > 5) {
            console.warn(`[SOVEREIGN_WARNING] JITTER_STORM: ${jitter.toFixed(2)}ms exceeds deterministic threshold.`);
        }
    }
}
