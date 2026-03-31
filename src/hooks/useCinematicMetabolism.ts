import { useState, useCallback, useEffect } from 'react';

/**
 * useCinematicMetabolism
 * Controls 'Gaming/Video' style UI effects based on system state.
 */
export const useCinematicMetabolism = () => {
    const [isGlitching, setIsGlitching] = useState(false);
    const [interferenceLevel, setInterferenceLevel] = useState(0);

    // Trigger a cinematic glitch (e.g., on error or high-priority action)
    const triggerGlitch = useCallback((duration = 300) => {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), duration);
    }, []);

    // Simulate random "Signal Noise" interference
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.95) {
                setInterferenceLevel(Math.random());
                setTimeout(() => setInterferenceLevel(0), 100);
            }
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return {
        isGlitching,
        interferenceLevel,
        triggerGlitch,
        cinematicState: {
            glitchClass: isGlitching ? 'glitch-active' : '',
            intensityStyle: { opacity: 1 - (interferenceLevel * 0.1) }
        }
    };
};
