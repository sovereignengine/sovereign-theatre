/**
 * CinematicTracer.ts V2.7 - The Economic Governor
 * 
 * Transition from simple reaction to a weighted economic model of performance.
 * Implements spike confidence, re-entry normalization, and thermal recovery.
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
const STABILIZATION_DELAY = 3000; 

// THERMAL DRIFT TRACKER
let thermalPressure = false;
let thermalHighCounter = 0;
let thermalLowCounter = 0;

// RE-ENTRY WARMUP
let warmupCounter = 0;
const WARMUP_FRAMES = 30;

// STRESS SCALING (Economic Model)
let rawStress = 0;
let smoothedStress = 0; 
let lowStressStableSince = 0;

export type PerformanceTier = 'DOMINANT' | 'DEGRADED' | 'MINIMAL';
let currentTier: PerformanceTier = 'DOMINANT';

// Session Report
const sessionAudit = {
    avg: 0,
    worst: 0,
    totalSpikes: 0,
    finalStress: 0,
    duration: 0,
    thermalPressure: false
};

const dumpAudit = () => {
    sessionAudit.avg = longEMA;
    sessionAudit.worst = worstFrameEver;
    sessionAudit.totalSpikes = totalSpikeCount;
    sessionAudit.finalStress = smoothedStress;
    sessionAudit.thermalPressure = thermalPressure;
    sessionAudit.duration = (Date.now() - sessionStart) / 1000;
    
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const payload = JSON.stringify({ ...sessionAudit, id: "sov_void_v8", ts: Date.now() });
        // navigator.sendBeacon('/audit/performance', payload); 
    }
    
    console.table(sessionAudit);
};

if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
            shortEMA = 16.67;
            rawStress = 0;
            smoothedStress = smoothedStress * 0.5; 
            warmupCounter = WARMUP_FRAMES; // START WARMUP
            lastTime = 0; 
        }
    });
    ['pagehide', 'beforeunload'].forEach(evt => 
        window.addEventListener(evt, dumpAudit)
    );
}

export function cinematicTracer(
    now: number, 
    debugMode = false, 
    onRegulate?: (factor: number, tier: PerformanceTier) => void,
    isInteracting = false
) {
    if (!debugMode) return;
    if (typeof document !== 'undefined' && document.hidden) return;

    if (lastTime === 0) {
        lastTime = now;
        return;
    }

    const delta = now - lastTime;
    lastTime = now;

    // UPDATE EMA: Fast vs Slow stability
    shortEMA = delta * ALPHA_SHORT + shortEMA * (1 - ALPHA_SHORT);
    longEMA = delta * ALPHA_LONG + longEMA * (1 - ALPHA_LONG);

    // THERMAL RECOVERY LOGIC
    if (longEMA > 21) {
        thermalHighCounter++;
        thermalLowCounter = 0;
        if (thermalHighCounter > 900) thermalPressure = true;
    } else {
        thermalHighCounter = Math.max(0, thermalHighCounter - 1);
        if (thermalPressure) {
            thermalLowCounter++;
            if (thermalLowCounter > 600) { 
                thermalPressure = false;
                thermalLowCounter = 0;
            }
        }
    }

    // WEIGHTED STRESS FACTOR (Governor Economy)
    const targetStress = Math.min(1, Math.max(0, (shortEMA - 16.67) / 16.67)) + (thermalPressure ? 0.2 : 0);
    rawStress = rawStress * 0.95 + targetStress * 0.05; 
    smoothedStress = smoothedStress * 0.9 + rawStress * 0.1; 

    // INTENT-AWARE MODULATION: If user is interacting, we "downplay" the stress to protect quality
    const effectiveStress = isInteracting ? smoothedStress * 0.7 : smoothedStress;

    // HYSTERESIS & CONFIDENCE WINDOW
    const timeSinceSwitch = now - lastTierSwitchTime;
    if (effectiveStress < 0.05) {
        if (lowStressStableSince === 0) lowStressStableSince = now;
    } else {
        lowStressStableSince = 0;
    }
    const bypassCooldown = (lowStressStableSince !== 0 && (now - lowStressStableSince > 500)); 

    // RE-ENTRY WARMUP GUARD: Skip regulation during warmup frames
    if (warmupCounter > 0) {
        warmupCounter--;
        return;
    }

    if (timeSinceSwitch > STABILIZATION_DELAY || bypassCooldown) {
        // Upgrade Logic
        if (currentTier !== 'DOMINANT' && effectiveStress < 0.1) {
            currentTier = 'DOMINANT';
            lastTierSwitchTime = now;
        } else if (currentTier === 'MINIMAL' && effectiveStress < 0.4) {
            currentTier = 'DEGRADED';
            lastTierSwitchTime = now;
        }

        // Downgrade Logic
        if (effectiveStress > 0.6 && currentTier !== 'MINIMAL') {
            currentTier = 'MINIMAL';
            lastTierSwitchTime = now;
        } else if (effectiveStress > 0.3 && currentTier === 'DOMINANT') {
            currentTier = 'DEGRADED';
            lastTierSwitchTime = now;
        }
    }

    // WEIGHTED SPIKE CLASSIFICATION
    if (delta > 25) {
        const isIsolated = delta > 50 && clusterStrength === 0;
        const spikeWeight = isIsolated ? 0.3 : 1.0; 
        
        if (spikeWeight > 0.5) { 
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
    }

    // EMIT REGULATION
    onRegulate?.(effectiveStress, currentTier);

    samples[index] = delta;
    index = (index + 1) % SAMPLE_SIZE;
    frameCount++;

    if (frameCount % SAMPLE_SIZE === 0 && debugMode) {
        console.log(`[SOVEREIGN_GOV] stress: ${effectiveStress.toFixed(2)} | interacting: ${isInteracting} | warm: ${warmupCounter}`);
    }
}
