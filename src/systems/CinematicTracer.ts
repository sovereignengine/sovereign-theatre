/**
 * CinematicTracer.ts V2.2 - The Temporal Control System
 * 
 * Evolution from passive observation to active regulation.
 */

const SAMPLE_SIZE = 120;
const samples = new Float32Array(SAMPLE_SIZE);
let lastTime = 0;
let frameCount = 0;
let index = 0;

// Temporal Truth Persistence
let totalSpikeCount = 0;
let worstFrameEver = 0;
let sessionStart = Date.now();

// DUAL EMA BASELINING: Fast vs Slow truth
let shortEMA = 16.67;
let longEMA = 16.67;
const ALPHA_SHORT = 0.1;
const ALPHA_LONG = 0.01;

// TEMPORAL CLUSTERING
let lastSpikeTime = 0;
let clusterStrength = 0;

export type PerformanceTier = 'DOMINANT' | 'DEGRADED' | 'MINIMAL';
let currentTier: PerformanceTier = 'DOMINANT';

// Session Report
const sessionAudit = {
    avg: 0,
    worst: 0,
    totalSpikes: 0,
    finalTier: 'DOMINANT' as PerformanceTier,
    duration: 0
};

const dumpAudit = () => {
    sessionAudit.avg = longEMA;
    sessionAudit.worst = worstFrameEver;
    sessionAudit.totalSpikes = totalSpikeCount;
    sessionAudit.finalTier = currentTier;
    sessionAudit.duration = (Date.now() - sessionStart) / 1000;
    console.table(sessionAudit);
};

if (typeof window !== 'undefined') {
    ['visibilitychange', 'pagehide', 'beforeunload'].forEach(evt => 
        window.addEventListener(evt, dumpAudit)
    );
}

export function cinematicTracer(now: number, debugMode = false, onRegulate?: (tier: PerformanceTier) => void) {
    if (!debugMode) return;

    if (lastTime === 0) {
        lastTime = now;
        return;
    }

    const delta = now - lastTime;
    lastTime = now;

    // UPDATE EMA: Track the "Boiling Frog"
    shortEMA = delta * ALPHA_SHORT + shortEMA * (1 - ALPHA_SHORT);
    longEMA = delta * ALPHA_LONG + longEMA * (1 - ALPHA_LONG);

    // DYNAMIC THRESHOLD: Adaptive based on short-term jitter
    const threshold = Math.max(25, shortEMA * 1.6);
    
    if (delta > threshold) {
        totalSpikeCount++;
        if (delta > worstFrameEver) worstFrameEver = delta;
        
        // TEMPORAL CLUSTERING: Detect "Machine Gun Stutter"
        const timeSinceLastSpike = now - lastSpikeTime;
        if (timeSinceLastSpike < 120) { // Cluster if spikes happen within 120ms of each other
            clusterStrength++;
        } else {
            clusterStrength = 0;
        }
        lastSpikeTime = now;

        if (debugMode) console.warn(`[SOVEREIGN_SPIKE] ${delta.toFixed(2)}ms | Cluster: ${clusterStrength}`);
        
        if (clusterStrength > 3) {
            console.error(`[SOVEREIGN_CRITICAL] TEMPORAL_STORM_DETECTED: Dropping Performance Tier.`);
            if (currentTier === 'DOMINANT') currentTier = 'DEGRADED';
            else if (currentTier === 'DEGRADED') currentTier = 'MINIMAL';
            onRegulate?.(currentTier);
        }
    }

    // BOILING FROG DETECTION: Slow decay check
    if (shortEMA > longEMA * 1.3 && currentTier === 'DOMINANT') {
        console.warn(`[SOVEREIGN_GOVERNANCE] SLOW_DECAY_DETECTED: Downscaling to DEGRADED.`);
        currentTier = 'DEGRADED';
        onRegulate?.(currentTier);
    }

    samples[index] = delta;
    index = (index + 1) % SAMPLE_SIZE;
    frameCount++;

    if (frameCount % SAMPLE_SIZE === 0) {
        let max = -Infinity;
        for (let i = 0; i < SAMPLE_SIZE; i++) if (samples[i] > max) max = samples[i];
        
        const jitter = max - shortEMA;

        if (debugMode) {
            console.log(
                `[TRUTH_PULSE] sEMA: ${shortEMA.toFixed(2)} | lEMA: ${longEMA.toFixed(2)} | jitter: ${jitter.toFixed(2)} | tier: ${currentTier}`
            );
        }
    }
}
