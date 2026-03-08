"use client";

import React, { useState, useEffect } from 'react';
import {
    Zap,
    Code,
    Cpu,
    Sparkles,
    Search,
    RefreshCw,
    Loader2,
    Terminal
} from 'lucide-react';

interface Skill {
    name: string;
    description: string;
}

const SkillsView: React.FC = () => {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');

    const fetchSkills = () => {
        setLoading(true);
        fetch('/api/skills')
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setSkills(data);
                }
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchSkills();
    }, []);

    const filteredSkills = skills.filter(s =>
        s.name.toLowerCase().includes(filter.toLowerCase()) ||
        s.description.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Auto-Skills Engine</h2>
                    <p className="text-zinc-500">Arsenal de herramientas y habilidades autónomas del motor OpenMota.</p>
                </div>
                <button
                    onClick={fetchSkills}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium hover:bg-zinc-800 transition-colors text-zinc-300"
                >
                    <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    Recargar
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="glass p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Habilidades Totales</p>
                        <p className="text-xl font-bold text-white">{skills.length}</p>
                    </div>
                </div>
                <div className="glass p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Cpu className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Arquitectura</p>
                        <p className="text-xl font-bold text-white">Modular V1</p>
                    </div>
                </div>
                <div className="glass p-5 rounded-2xl flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Estado Evolutivo</p>
                        <p className="text-xl font-bold text-white">Crecimiento Activo</p>
                    </div>
                </div>
            </div>

            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                    type="text"
                    placeholder="Filtrar por nombre o descripción..."
                    className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition-all text-white"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                    <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    <p className="text-zinc-500 text-sm animate-pulse">Sincronizando arsenal de herramientas...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSkills.map((skill, i) => (
                        <div key={i} className="glass p-6 rounded-2xl border border-zinc-800 hover:border-purple-500/30 transition-all group relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-20 transition-opacity">
                                <Terminal className="w-12 h-12 text-purple-400" />
                            </div>
                            <div className="space-y-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-zinc-900 rounded-lg border border-zinc-800">
                                        <Code className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <h3 className="font-bold text-zinc-100">{skill.name}</h3>
                                </div>
                                <p className="text-xs text-zinc-400 leading-relaxed min-h-[40px]">
                                    {skill.description}
                                </p>
                                <div className="flex items-center justify-between pt-2">
                                    <span className="text-[9px] font-mono text-zinc-600 uppercase">Status: Ready</span>
                                    <span className="text-[9px] font-mono text-purple-500/60 uppercase">System Root</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {!loading && filteredSkills.length === 0 && (
                <div className="text-center p-20 glass rounded-2xl">
                    <p className="text-zinc-500 italic">No se encontraron habilidades que coincidan con tu búsqueda.</p>
                </div>
            )}
        </div>
    );
};

export default SkillsView;
