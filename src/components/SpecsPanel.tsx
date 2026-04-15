import React from 'react';

export default function SpecsPanel() {
  return (
    <aside className="w-[280px] glass-morphism p-6 h-[500px] flex flex-col gap-5 overflow-y-auto no-scrollbar">
      <SpecGroup title="Memory & Security">
        <SpecGrid>
          <SpecItem label="Chunk" value="4KB" />
          <SpecItem label="Crypto" value="AES-256" />
          <SpecItem label="Verify" value="SHA-512" />
          <SpecItem label="RSA" value="4096" />
        </SpecGrid>
      </SpecGroup>

      <SpecGroup title="Healing Engine">
        <SpecGrid>
          <SpecItem label="Scan" value="500ms" />
          <SpecItem label="Latency" value="1ms" />
        </SpecGrid>
      </SpecGroup>

      <SpecGroup title="Linguistic (Yue)">
        <SpecGrid>
          <SpecItem label="Vocab" value="128k" />
          <SpecItem label="Spec-Y" value="3.2k" />
        </SpecGrid>
      </SpecGroup>
    </aside>
  );
}

function SpecGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-bottom border-white/10 pb-4 last:border-none">
      <span className="text-[10px] uppercase text-white/40 mb-2.5 block tracking-[0.05em]">{title}</span>
      {children}
    </div>
  );
}

function SpecGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function SpecItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] opacity-60">{label}</span>
      <span className="text-[13px] font-medium font-mono">{value}</span>
    </div>
  );
}
