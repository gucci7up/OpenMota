"use client";

import React, { useState, useEffect } from 'react';
import {
    Search,
    Database,
    Sparkles,
    History,
    Trash2,
    RefreshCw,
    Loader2
} from 'lucide-react';

interface Memory {
    id: string;
    content: string;
    role: string;
    type: string;
    timestamp: string;
}

const MemoryView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [memories, setMemories] = useState<Memory[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMemories = () => {
        setLoading(true);
        fetch('/api/memory')
            .then(res => res.json())
            .then(data => {
                setMemories(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchMemories();
    }, []);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Memoria Semántica</h2>
                    <p className="text-zinc-500">Explora los conceptos y decisiones grabados en el motor RAG.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchMemories}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium hover:bg-zinc-800 transition-colors"
                    >
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                        Sincronizar
                    </button>
                </div>
            </div>

            <div className="glass p-6 rounded-2xl space-y-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Realiza una búsqueda semántica (Próximamente...)"
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition-all cursor-not-allowed"
                        value={searchQuery}
                        readOnly
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-1 rounded font-mono border border-purple-500/20 uppercase">RAG Engine</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                            <Database className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Vectores Activos</p>
                            <p className="text-xl font-bold">{memories.length}</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Último Aprendizaje</p>
                            <p className="text-xl font-bold text-zinc-400 text-sm truncate max-w-[150px]">
                                {memories[0]?.content || 'Iniciando...'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 ml-1">
                    <History className="w-4 h-4 text-purple-400" />
                    Conceptos y Mensajes en Memoria
                </h3>
                {loading ? (
                    <div className="flex justify-center p-20">
                        <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3">
                        {memories.map((memory, i) => (
                            <div key={memory.id} className="glass p-5 rounded-2xl hover:bg-zinc-900/40 transition-all border-l-2 border-l-purple-600 flex items-center justify-between group">
                                <div className="space-y-2 flex-1">
                                    <div className="flex items-center gap-3">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${memory.role === 'user' ? 'bg-zinc-800 text-zinc-400' : 'bg-purple-900/20 text-purple-400'
                                            }`}>
                                            {memory.role} • {memory.type}
                                        </span>
                                        <span className="text-[10px] text-zinc-600 font-medium">{memory.timestamp}</span>
                                    </div>
                                    <p className="text-sm text-zinc-200 line-clamp-2">{memory.content}</p>
                                </div>
                            </div>
                        ))}
                        {memories.length === 0 && (
                            <div className="text-center p-10 text-zinc-600 text-sm italic">
                                No hay recuerdos grabados aún.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoryView;
