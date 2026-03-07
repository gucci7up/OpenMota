"use client";

import React, { useState } from 'react';
import {
    Search,
    Database,
    Sparkles,
    History,
    Trash2,
    RefreshCw
} from 'lucide-react';

const MemoryView: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const memories = [
        { text: "Implementar autenticación robusta mediante x-api-key en Express.", type: "Conceptual", time: "Hace 2 horas" },
        { text: "Configurar puerto 3001 para evitar conflictos con el dashboard de Dokploy.", type: "Técnico", time: "Hace 3 horas" },
        { text: "El usuario prefiere respuestas concisas y evitar el chitchat innecesario.", type: "Preferencia", time: "Ayer" },
        { text: "Flujo de despliegue en Dokploy configurado con variables de entorno.", type: "Infraestructura", time: "Ayer" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Memoria Semántica</h2>
                    <p className="text-zinc-500">Explora los conceptos y decisiones grabados en el motor RAG.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-medium hover:bg-zinc-800 transition-colors">
                        <RefreshCw className="w-3 h-3" />
                        Re-indexar Memoria
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-red-950/20 border border-red-900/30 rounded-xl text-xs font-medium text-red-400 hover:bg-red-900/20 transition-colors">
                        <Trash2 className="w-3 h-3" />
                        Borrar Memoria
                    </button>
                </div>
            </div>

            <div className="glass p-6 rounded-2xl space-y-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                        type="text"
                        placeholder="Realiza una búsqueda semántica (ej: ¿Qué decidimos sobre la seguridad?)"
                        className="w-full bg-zinc-950/50 border border-zinc-800 rounded-xl pl-12 pr-4 py-4 text-sm focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition-all"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <span className="text-[10px] bg-purple-600/20 text-purple-400 px-2 py-1 rounded font-mono border border-purple-500/20 uppercase">RAG v2.0</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/10 flex items-center justify-center">
                            <Database className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Vectores Almacenados</p>
                            <p className="text-xl font-bold">4,821</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Precisión Semántica</p>
                            <p className="text-xl font-bold">98.4%</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2 ml-1">
                    <History className="w-4 h-4 text-purple-400" />
                    Conceptos Recientes
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {memories.map((memory, i) => (
                        <div key={i} className="glass p-5 rounded-2xl hover:bg-zinc-900/40 transition-all border-l-2 border-l-purple-600Group flex items-center justify-between group">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 uppercase tracking-tighter">
                                        {memory.type}
                                    </span>
                                    <span className="text-[10px] text-zinc-600 font-medium">Recorded: {memory.time}</span>
                                </div>
                                <p className="text-sm text-zinc-200">{memory.text}</p>
                            </div>
                            <button className="opacity-0 group-hover:opacity-100 p-2 text-zinc-600 hover:text-red-400 transition-all">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MemoryView;
