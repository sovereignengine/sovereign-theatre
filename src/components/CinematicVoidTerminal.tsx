import React, { useState, useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Text, PerspectiveCamera, Environment, Stars, Html } from '@react-three/drei';
import * as THREE from 'three';
import { GhostTerminalHUD } from './GhostTerminalHUD';
import { useCinematicMetabolism } from '../hooks/useCinematicMetabolism';

// ═══════════════════════════════════════════════════════════════════════════
// 3D MESSAGE ENTITY
// ═══════════════════════════════════════════════════════════════════════════

const FloatingMessage = ({ message, sender, timestamp, index, total }: { message: string, sender: string, timestamp: number, index: number, total: number }) => {
    const yPos = (total - index - 1) * -1.5; 
    const zPos = Math.sin(index * 0.5) * 0.5;
    const xPos = Math.cos(index * 0.3) * 0.2;

    return (
        <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.5} position={[xPos, yPos, zPos]}>
            <Html transform distanceFactor={10} occlude="blending" style={{ width: '600px', pointerEvents: 'none' }}>
                <div className={`font-mono transition-all duration-700 ${sender === 'USER' ? 'text-right' : 'text-left'}`}>
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-[8px] opacity-30 tracking-[0.4em] uppercase">
                            <span>{sender}</span>
                            <span className="w-1 h-1 bg-white/20 rounded-full" />
                            <span>{new Date(timestamp).toLocaleTimeString()}</span>
                        </div>
                        <div className={`text-sm leading-relaxed ${sender === 'USER' ? 'text-white/80' : 'text-[#00ff9c]'} drop-shadow-[0_0_10px_rgba(0,255,156,0.3)]`}>
                            {message}
                        </div>
                    </div>
                </div>
            </Html>
        </Float>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// DATA STREAM BACKGROUND
// ═══════════════════════════════════════════════════════════════════════════

const DataRain = () => {
    const count = 50;
    const [positions] = useState(() => Array.from({ length: count }, () => [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10 - 10
    ]));

    return (
        <group>
            {positions.map((pos, i) => (
                <Text
                    key={i}
                    position={pos as [number, number, number]}
                    fontSize={0.1}
                    color="rgba(0,255,156,0.05)"
                    font="monospace"
                >
                    {Math.random().toString(16).substring(2, 10).toUpperCase()}
                </Text>
            ))}
        </group>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// SCROLL RIG
// ═══════════════════════════════════════════════════════════════════════════

const Rig = ({ children }: { children: React.ReactNode }) => {
    const group = useRef<THREE.Group>(null);
    useFrame((state) => {
        if (!group.current) return;
        group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, state.mouse.y * 0.5, 0.1);
        group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, state.mouse.x * 0.1, 0.1);
    });
    return <group ref={group}>{children}</group>;
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const CinematicVoidTerminal: React.FC = () => {
    const [input, setInput] = useState('');
    const { isGlitching, triggerGlitch } = useCinematicMetabolism();
    const [chatHistory, setChatHistory] = useState([
        { message: "SYSTEM_READY: VOID_INGRESS_SUCCESS", sender: "KERNEL", timestamp: Date.now() - 5000 },
        { message: "Establishing zero-trust neural link...", sender: "ORACLE", timestamp: Date.now() - 4000 },
        { message: "Arhitekte, prostor je bezgraničan. Govori bez okvira.", sender: "ORACLE", timestamp: Date.now() - 3000 }
    ]);
    
    const handleSend = () => {
        if (!input.trim()) return;
        
        triggerGlitch(200);
        const userMsg = { message: input, sender: "USER", timestamp: Date.now() };
        setChatHistory(prev => [...prev.slice(-15), userMsg]);
        setInput('');

        // Simulate Agent response
        setTimeout(() => {
            const agentMsg = { 
                message: `PROCESSED: "${input.substring(0, 20)}..." // NO_FRAME_NEEDS_DETECTION: ${Math.random().toFixed(4)}`, 
                sender: "KERNEL", 
                timestamp: Date.now() 
              };
            setChatHistory(prev => [...prev.slice(-15), agentMsg]);
        }, 1000);
    };

    return (
        <div className={`fixed inset-0 bg-black overflow-hidden select-none ${isGlitching ? 'glitch-active' : ''}`}>
            {/* 3D CANVAS LAYER */}
            <div className="absolute inset-0 z-10">
                <Canvas dpr={[1, 2]}>
                    <PerspectiveCamera makeDefault position={[0, 0, 8]} fov={35} />
                    <fog attach="fog" args={['#000', 8, 15]} />
                    <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    
                    <Suspense fallback={null}>
                        <Rig>
                            <group position={[0, -1, 0]}>
                                {chatHistory.map((chat, i) => (
                                    <FloatingMessage 
                                        key={i} 
                                        {...chat} 
                                        index={i} 
                                        total={chatHistory.length} 
                                    />
                                ))}
                            </group>
                            <DataRain />
                            {/* HUD INTEGRATION */}
                            <GhostTerminalHUD position={[0, -4, 2]} />
                        </Rig>
                        <Environment preset="night" />
                    </Suspense>
                </Canvas>
            </div>

            {/* SCANLINE OVERLAY */}
            <div className="absolute inset-0 z-20 pointer-events-none opacity-20 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%)] bg-size-[100%_4px]" />

            {/* FLOATING UI ELEMENTS */}
            <div className="absolute inset-0 z-30 flex flex-col pointer-events-none p-12 justify-between">
                {/* TOP BRANDING */}
                <div className="flex justify-between items-start opacity-40">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono tracking-[1em] text-white uppercase">Sovereign_Void</span>
                        <span className="text-[8px] font-mono text-[#39ff14] tracking-[0.5em] uppercase">No_Container_Protocol // v9.2.0</span>
                    </div>
                    <div className="text-right text-[8px] font-mono space-y-1">
                        <div className="text-[#39ff14]">MEM_USED: 48GB_VRAM_POOL</div>
                        <div>SIGNAL: NOMINAL_88%</div>
                        <div>NODE: RTX_A6000_EDGE</div>
                    </div>
                </div>

                {/* BOTTOM INPUT BAR - FLOATING IN SPACE */}
                <div className="flex flex-col items-center gap-6 pointer-events-auto">
                    <div className="w-px h-24 bg-linear-to-b from-transparent via-[#39ff14]/20 to-[#39ff14]" />
                    
                    <div className="flex items-center gap-4 w-full max-w-2xl px-8">
                        <span className="text-[#39ff14] animate-pulse">❯</span>
                        <input 
                            type="text" 
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            autoFocus
                            placeholder="COMMUNICATE_WITH_THE_VOID..."
                            className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-white placeholder:text-white/10 tracking-widest uppercase"
                        />
                        <div className="flex gap-2">
                             <div className="w-1 h-1 bg-[#39ff14] rounded-full" />
                             <div className="w-1 h-1 bg-white/20 rounded-full" />
                             <div className="w-1 h-1 bg-white/20 rounded-full" />
                        </div>
                    </div>
                    
                    <div className="text-[8px] font-mono text-white/20 tracking-[1em] uppercase mt-4">
                        Press_Enter_To_Broadcast_Into_Infinity
                    </div>
                </div>
            </div>

            {/* AMBIENT GLOWS */}
            <div className="absolute top-0 left-0 w-full h-1/2 bg-linear-to-b from-[#39ff14]/5 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-full h-1/4 bg-linear-to-t from-black to-transparent pointer-events-none" />
        </div>
    );
};
