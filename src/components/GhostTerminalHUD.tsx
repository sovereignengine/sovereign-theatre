import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { useSovereignSSE } from "@/hooks/useSovereignSSE";
import { motion } from "framer-motion";

interface GhostTerminalHUDProps {
  position?: [number, number, number];
}

const formatGiB = (bytes: number): string => (bytes / (1024 ** 3)).toFixed(2);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * GHOST TERMINAL HUD v2.0 (STARK ARMOR AESTHETIC)
 * ═══════════════════════════════════════════════════════════════════════════
 * Premium 3D UI component that visualizes the "Digital Soul" of the Sovereign Bunker.
 * Features:
 * - Real-time Hardware Telemetry (CPU/RAM/Disk)
 * - MERKLEROOT integrity tracking
 * - AI TRIUMVIRATE Status (NIM Cloud + Ollama)
 * - Kinetic AuditChain real-time hash view
 */
export function GhostTerminalHUD({ position = [0, -3.2, 0] }: GhostTerminalHUDProps) {
  const { hardwareTelemetry, connected, lastAuditHash, logs, architecturalDrift } = useSovereignSSE();
  const [pulse, setPulse] = useState(0);

  const tsEl = useRef<HTMLDivElement | null>(null);
  const cpuEl = useRef<HTMLSpanElement | null>(null);
  const memEl = useRef<HTMLSpanElement | null>(null);
  const hashEl = useRef<HTMLDivElement | null>(null);
  const statusEl = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setPulse(p => (p + 1) % 100), 50);
    return () => clearInterval(interval);
  }, []);

  useFrame((state) => {
    if (!hardwareTelemetry) return;

    if (tsEl.current) tsEl.current.textContent = new Date().toLocaleTimeString();
    if (cpuEl.current) cpuEl.current.textContent = `${hardwareTelemetry.cpu.percent.toFixed(1)}%`;
    if (memEl.current) {
        memEl.current.textContent = `${hardwareTelemetry.memory.percent.toFixed(1)}% (${formatGiB(hardwareTelemetry.memory.used_bytes)}G / ${formatGiB(hardwareTelemetry.memory.total_bytes)}G)`;
    }
    if (hashEl.current) {
        hashEl.current.textContent = lastAuditHash ? lastAuditHash.substring(0, 16).toUpperCase() : "SYNCING...";
    }
    
    if (statusEl.current) {
        statusEl.current.style.opacity = (0.7 + Math.sin(state.clock.elapsedTime * 4) * 0.3).toString();
    }
  });

  return (
    <Html position={position} transform distanceFactor={8}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-[500px] select-none pointer-events-none"
      >
        {/* Main Frame Container */}
        <div className="relative bg-black/85 border border-[#ff003c]/40 backdrop-blur-xl p-4 overflow-hidden shadow-[0_0_30px_rgba(255,0,60,0.1)]">
          
          {/* Header Block */}
          <div className="flex items-start justify-between border-b border-[#ff003c]/30 pb-3 mb-4">
            <div>
              <h1 className="text-[#ff003c] font-black text-xl tracking-tighter uppercase italic leading-none">
                GHOST_TERMINAL <span className="text-[10px] opacity-60 not-italic font-normal">v2.0 HUD</span>
              </h1>
              <p className="text-[#ff003c]/60 font-mono text-[9px] mt-1 tracking-widest">
                [MERKLE_ROOT_LINKED :: STARK_ARMOR_PROTO]
              </p>
            </div>
            <div className="text-right">
                <div ref={statusEl} className="flex items-center gap-2">
                    <span className="text-[10px] text-[#ff003c] font-bold">STATUS:</span>
                    <span className={`text-[10px] font-bold border px-1 ${connected ? 'border-[#ff003c] text-[#ff003c]' : 'border-white/20 text-white/40'}`}>
                        {connected ? "BUNKER_ONLINE" : "OFFLINE_COGNITIVE"}
                    </span>
                </div>
                <div className="text-[9px] text-[#ff003c]/80 font-mono mt-1" ref={tsEl}>
                    00:00:00
                </div>
            </div>
          </div>

          {/* Data Grid Section */}
          <div className="grid grid-cols-2 gap-6 mb-4">
            
            {/* Left Column: Vitals */}
            <div className="space-y-4">
               <div>
                  <div className="flex justify-between text-[10px] text-[#ff003c]/80 mb-1 font-bold">
                    <span>CPU_INTENSITY</span>
                    <span ref={cpuEl}>0.0%</span>
                  </div>
                  <div className="h-1 bg-[#ff003c]/10 relative">
                    <div 
                        style={{ width: `${hardwareTelemetry?.cpu.percent || 0}%` }}
                        className="h-full bg-[#ff003c] shadow-[0_0_8px_#ff003c]"
                    />
                  </div>
               </div>

               <div>
                  <div className="flex justify-between text-[10px] text-[#ff003c]/80 mb-1 font-bold">
                    <span>MEM_SATURATION</span>
                    <span ref={memEl}>0.0%</span>
                  </div>
                  <div className="h-1 bg-[#ff003c]/10 relative">
                    <div 
                        style={{ width: `${hardwareTelemetry?.memory.percent || 0}%` }}
                        className="h-full bg-[#ff003c]/80"
                    />
                  </div>
               </div>

               <div className="pt-2 border-t border-[#ff003c]/10">
                  <div className="text-[8px] text-[#ff003c]/60 mb-1 uppercase font-bold tracking-tight">Kinetic Audit Hash (SHA-512)</div>
                  <div ref={hashEl} className="text-[10px] text-[#ff003c] font-mono break-all leading-tight opacity-90 truncate">
                    SYNCING_CHAINS...
                  </div>
               </div>
            </div>

            {/* Right Column: Fleet / AI Status */}
            <div className="bg-[#ff003c]/5 p-2 border border-[#ff003c]/10 relative">
              <h3 className="text-[9px] text-[#ff003c] font-bold mb-2 uppercase border-b border-[#ff003c]/20 pb-1">AI_TRIUMVIRATE_STATUS</h3>
              
              <div className="space-y-2">
                {[
                    { name: 'nemotron-ultra-70b', state: 'DORMANT' },
                    { name: 'llama-3.3-nim', state: 'ACTIVE' },
                    { name: 'slavko-architect', state: 'READY' }
                ].map((m) => (
                    <div key={m.name} className="flex items-center justify-between">
                         <span className="text-[8px] text-[#ff003c]/80 font-mono">{m.name}</span>
                         <span className={`text-[8px] font-bold ${m.state === 'ACTIVE' ? 'text-[#ff003c]' : 'text-white/20'}`}>[{m.state}]</span>
                    </div>
                ))}
              </div>

              {/* WORM Vector Nodes [Source 2053] */}
              <div className="mt-4 pt-2 border-t border-[#ff003c]/20">
                <h3 className="text-[8px] text-[#ff003c] font-bold mb-2 uppercase flex justify-between">
                    <span>WORM_MEMORY_NODES</span>
                    <span className="opacity-50">QDRANT_LINKED</span>
                </h3>
                <div className="flex flex-wrap gap-1 min-h-[20px]">
                    {logs.filter(l => l.type === 'AUDIT' && l.message.includes('SATURATION_HANDOFF')).slice(0, 24).map((_, i) => (
                        <motion.div 
                            key={i}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: [0.4, 1, 0.4] }}
                            transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                            className={`w-1.5 h-1.5 ${architecturalDrift ? 'bg-[#ff003c]' : 'bg-[#00ff9c]'} shadow-[0_0_5px_${architecturalDrift ? '#ff003c' : '#00ff9c'}]`}
                        />
                    ))}
                    {logs.filter(l => l.type === 'AUDIT' && l.message.includes('SATURATION_HANDOFF')).length === 0 && (
                        <span className="text-[7px] text-[#ff003c]/30 italic">NO_OFFLOADS_DETECTED</span>
                    )}
                </div>
              </div>

              {/* Small Decorative Grid */}
              <div className="absolute bottom-2 right-2 flex gap-[2px]">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div 
                        key={i} 
                        className={`w-1 h-3 ${i < 4 ? 'bg-[#ff003c]' : 'bg-[#ff003c]/20'}`} 
                        style={{ opacity: i === 3 && pulse > 50 ? 0.3 : 1 }}
                    />
                ))}
              </div>
            </div>

          </div>

           {/* Footer: Diagnostic */}
           <div className="flex items-center justify-between text-[#ff003c]/40 font-mono text-[8px] uppercase tracking-tighter">
             <span>SovereignOS 9.0 (STARK)</span>
             <span>Cores: {hardwareTelemetry?.cpu.count_logical || 8} | SSD_OK</span>
             <span>Cognitive_Lock: SECURED</span>
           </div>

        </div>

        {/* Outer Corner Accents */}
        <div className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-2 border-l-2 border-[#ff003c]" />
        <div className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-2 border-r-2 border-[#ff003c]" />
      </motion.div>
    </Html>
  );
}

export default GhostTerminalHUD;
