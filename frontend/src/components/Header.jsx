import { BrainCircuit } from 'lucide-react';

export default function Header() {
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-500/30 ring-1 ring-white/10">
                <BrainCircuit size={28} className="text-white" />
            </div>
            <div>
                <h1 className="font-bold text-2xl tracking-tight text-white">Agentic RAG</h1>
                <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <p className="text-xs text-slate-400 font-medium tracking-wide">SYSTEM ONLINE</p>
                </div>
            </div>
        </div>
    );
}
