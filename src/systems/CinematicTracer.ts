/**
 * CinematicTracer.ts V2.3 - The Perceptual SLA Engine
 * 
 * Implements continuous stress scaling (0-1) with hysteresis and 
 * stabilization delays to eliminate discrete 'step' artifacts.
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

// DUAL EMA BASELINING
let shortEMA = 16.67;
let longEMA = 16.67;
const ALPHA_SHORT = 0.1;
const ALPHA_LONG = 0.01;

// TEMPORAL CLUSTERING & HYSTERESIS
let lastSpikeTime = 0;
let clusterStrength = 0;
let lastTierSwitchTime = 0;
const STABILIZATION_DELAY = 3000; // 3 seconds 

// STRESS SCALING (0.0 = Dominant, 1.0 = Minimal)
let stressFactor = 0; 
export type PerformanceTier = 'DOMINANT' | 'DEGRADED' | 'MINIMAL';
let currentTier: PerformanceTier = 'DOMINANT';

// Session Report
const sessionAudit = {
    avg: 0,
    worst: 0,
    totalSpikes: 0,
    finalStress: 0,
    duration: 0
};

const dumpAudit = () => {
    sessionAudit.avg = longEMA;
    sessionAudit.worst = worstFrameEver;
    sessionAudit.totalSpikes = totalSpikeCount;
    sessionAudit.finalStress = stressFactor;
    sessionAudit.duration = (Date.now() - sessionStart) / 1000;
    console.table(sessionAudit);
};

if (typeof window !== 'undefined') {
    ['visibilitychange', 'pagehide', 'beforeunload'].forEach(evt => 
        window.addEventListener(evt, dumpAudit)
    );
}

export function cinematicTracer(now: number, debugMode = false, onRegulate?: (factor: number, tier: PerformanceTier) => void) {
    if (!debugMode) return;

    if (lastTime === 0) {
        lastTime = now;
        return;
    }

    const delta = now - lastTime;
    lastTime = now;

    // UPDATE EMA: Fast vs Slow stability
    shortEMA = delta * ALPHA_SHORT + shortEMA * (1 - ALPHA_SHORT);
    longEMA = delta * ALPHA_LONG + longEMA * (1 - ALPHA_LONG);

    // CONTINUOUS STRESS FACTOR (0 to 1)
    const targetStress = Math.min(1, Math.max(0, (shortEMA - 16.67) / 16.67));
    stressFactor = stressFactor * 0.95 + targetStress * 0.05; // Smooth lerp

    // HYSTERESIS & TIER LOGIC
    const timeSinceSwitch = now - lastTierSwitchTime;
    const bypassCooldown = stressFactor < 0.05; // INSTANT RECOVERY BYPASS

    if (timeSinceSwitch > STABILIZATION_DELAY || bypassCooldown) {
        // Upgrade Logic (Harder to recover, needs stability unless bypass triggered)
        if (currentTier !== 'DOMINANT' && stressFactor < 0.1) {
            currentTier = 'DOMINANT';
            lastTierSwitchTime = now;
        } else if (currentTier === 'MINIMAL' && stressFactor < 0.4) {
            currentTier = 'DEGRADED';
            lastTierSwitchTime = now;
        }

        // Downgrade Logic (Faster reaction to stress)
        if (stressFactor > 0.6 && currentTier !== 'MINIMAL') {
            currentTier = 'MINIMAL';
            lastTierSwitchTime = now;
        } else if (stressFactor > 0.3 && currentTier === 'DOMINANT') {
            currentTier = 'DEGRADED';
            lastTierSwitchTime = now;
        }
    }

    // SPIKE CLUSTERING
    if (delta > 25) {
        totalSpikeCount++;
        if (delta > worstFrameEver) worstFrameEver = delta;
        const timeSinceLastSpike = now - lastSpikeTime;
        if (timeSinceLastSpike < 120) clusterStrength++;
        else clusterStrength = 0;
        lastSpikeTime = now;

        if (clusterStrength > 3 && currentTier !== 'MINIMAL') {
            currentTier = 'MINIMAL';
            lastTierSwitchTime = now;
        }
    }

    // EMIT REGULATION
    onRegulate?.(stressFactor, currentTier);

    samples[index] = delta;
    index = (index + 1) % SAMPLE_SIZE;
    frameCount++;

    if (frameCount % SAMPLE_SIZE === 0 && debugMode) {
        console.log(`[PERCEPT_SLA] stress: ${stressFactor.toFixed(2)} | tier: ${currentTier} | bypass: ${bypassCooldown}`);
    }
}
