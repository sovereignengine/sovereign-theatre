import { useState, useCallback, useEffect } from 'react';

/**
 * useCinematicMetabolism
 * Controls 'Gaming/Video' style UI effects based on system state.
 */
export const useCinematicMetabolism = () => {
    const [isGlitching, setIsGlitching] = useState(false);
    const [isOverdrive, setIsOverdrive] = useState(false);
    const [interferenceLevel, setInterferenceLevel] = useState(0);

    const toggleOverdrive = useCallback(() => {
        setIsOverdrive(prev => !prev);
    }, []);

    // Trigger a cinematic glitch (e.g., on error or high-priority action)
    const triggerGlitch = useCallback((duration = 300) => {
        setIsGlitching(true);
        setTimeout(() => setIsGlitching(false), duration);
    }, []);

    // Simulate random "Signal Noise" interference
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > (isOverdrive ? 0.7 : 0.95)) {
                setInterferenceLevel(Math.random());
                setTimeout(() => setInterferenceLevel(0), 100);
            }
        }, isOverdrive ? 1000 : 5000);

        return () => clearInterval(interval);
    }, [isOverdrive]);

    return {
        isGlitching,
        isOverdrive,
        interferenceLevel,
        triggerGlitch,
        toggleOverdrive,
        cinematicState: {
            glitchClass: isGlitching ? 'glitch-active' : '',
            overdriveClass: isOverdrive ? 'overdrive-active' : '',
            intensityStyle: { opacity: 1 - (interferenceLevel * (isOverdrive ? 0.3 : 0.1)) }
        }
    };
};
