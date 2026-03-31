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
const STABILIZATION_DELAY = 3000; 

// THERMAL DRIFT TRACKER
let thermalPressure = false;
let thermalHighCounter = 0;

// STRESS SCALING
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
    
    // Telemetry Export (Beacon for production-grade audit)
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
        const payload = JSON.stringify({ ...sessionAudit, id: "sov_void_v8", ts: Date.now() });
        // navigator.sendBeacon('/audit/performance', payload); 
    }
    
    console.table(sessionAudit);
};

if (typeof window !== 'undefined') {
    ['visibilitychange', 'pagehide', 'beforeunload'].forEach(evt => 
        window.addEventListener(evt, dumpAudit)
    );
}

export function cinematicTracer(now: number, debugMode = false, onRegulate?: (factor: number, tier: PerformanceTier) => void) {
    if (!debugMode) return;

    // VISIBILITY GUARD: Skip governor updates if tab is hidden to avoid false stress signals
    if (typeof document !== 'undefined' && document.hidden) {
        lastTime = 0; // Reset timer to avoid massive delta on resume
        return;
    }

    if (lastTime === 0) {
        lastTime = now;
        return;
    }

    const delta = now - lastTime;
    lastTime = now;

    // UPDATE EMA: Fast vs Slow stability
    shortEMA = delta * ALPHA_SHORT + shortEMA * (1 - ALPHA_SHORT);
    longEMA = delta * ALPHA_LONG + longEMA * (1 - ALPHA_LONG);

    // THERMAL DRIFT DETECTION: Look for sustained high latency (> 21ms for 15s)
    if (longEMA > 21) {
        thermalHighCounter++;
        if (thermalHighCounter > 900) { // ~15 seconds at 60 FPS
            thermalPressure = true;
        }
    } else {
        thermalHighCounter = Math.max(0, thermalHighCounter - 1);
    }

    // ANTI-ALIASED STRESS FACTOR 
    const targetStress = Math.min(1, Math.max(0, (shortEMA - 16.67) / 16.67)) + (thermalPressure ? 0.2 : 0);
    rawStress = rawStress * 0.95 + targetStress * 0.05; 
    smoothedStress = smoothedStress * 0.9 + rawStress * 0.1; 

    // HYSTERESIS & CONFIDENCE WINDOW
    const timeSinceSwitch = now - lastTierSwitchTime;
    if (smoothedStress < 0.05) {
        if (lowStressStableSince === 0) lowStressStableSince = now;
    } else {
        lowStressStableSince = 0;
    }
    const bypassCooldown = (lowStressStableSince !== 0 && (now - lowStressStableSince > 500)); 

    if (timeSinceSwitch > STABILIZATION_DELAY || bypassCooldown) {
        // Upgrade Logic
        if (currentTier !== 'DOMINANT' && smoothedStress < 0.1) {
            currentTier = 'DOMINANT';
            lastTierSwitchTime = now;
        } else if (currentTier === 'MINIMAL' && smoothedStress < 0.4) {
            currentTier = 'DEGRADED';
            lastTierSwitchTime = now;
        }

        // Downgrade Logic
        if (smoothedStress > 0.6 && currentTier !== 'MINIMAL') {
            currentTier = 'MINIMAL';
            lastTierSwitchTime = now;
        } else if (smoothedStress > 0.3 && currentTier === 'DOMINANT') {
            currentTier = 'DEGRADED';
            lastTierSwitchTime = now;
        }
    }

    // SPIKE CLASSIFICATION & CLUSTERING
    if (delta > 25) {
        // CLASSIFIER: Is this a rendering spike or an external OS glitch?
        const isExternal = delta > 50 && clusterStrength === 0;
        
        if (!isExternal) {
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
        } else if (debugMode) {
            console.log(`[SOVEREIGN_RESILIENCE] EXTERNAL_SPIKE_IGNORED: ${delta.toFixed(2)}ms`); 
        }
    }

    // EMIT REGULATION
    onRegulate?.(smoothedStress, currentTier);

    samples[index] = delta;
    index = (index + 1) % SAMPLE_SIZE;
    frameCount++;

    if (frameCount % SAMPLE_SIZE === 0 && debugMode) {
        console.log(`[SOVEREIGN_GOV] stress: ${smoothedStress.toFixed(2)} | tier: ${currentTier} | thermal: ${thermalPressure}`);
    }
}
