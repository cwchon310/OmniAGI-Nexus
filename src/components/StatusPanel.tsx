export function WindowControls() {
  return (
    <div className="flex gap-2 px-4">
      <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
      <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
      <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
    </div>
  );
}

export function StatusPills() {
  return (
    <div className="flex gap-2 absolute bottom-5 left-10 z-50">
      <div className="text-[9px] px-2.5 py-1 border border-white/20 rounded-full text-white/60 uppercase tracking-wider">Zero-Latent</div>
      <div className="text-[9px] px-2.5 py-1 border border-white/20 rounded-full text-white/60 uppercase tracking-wider">Military-Grade</div>
      <div className="text-[9px] px-2.5 py-1 border border-white/20 rounded-full text-white/60 uppercase tracking-wider">MoE Active</div>
    </div>
  );
}

export default function StatusPanel() {
  return (
    <>
      <div className="fixed top-0 left-0 right-0 flex justify-between items-center px-6 py-4 bg-gradient-to-b from-black/80 to-transparent z-50">
        <div className="flex items-center gap-6">
          <WindowControls />
          <div className="flex items-center gap-2 font-medium text-[14px] text-white/80">
            <div className="w-4 h-4 border border-white/40 rounded-full flex items-center justify-center text-[10px]">∞</div>
            OmniAGI Nexus
          </div>
        </div>
        <div className="flex items-center gap-4 text-[11px] text-white/40 uppercase tracking-[0.1em]">
          <span>v1.0.0-infinity</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>
      <StatusPills />
    </>
  );
}
