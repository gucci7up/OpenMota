"use client";

import React from 'react';
import {
    BarChart3,
    Users,
    Cpu,
    ShieldCheck,
    TrendingUp,
    Clock
} from 'lucide-react';

const Overview: React.FC = () => {
    const stats = [
        { name: 'Usuarios Totales', value: '7,045', change: '+12%', icon: Users },
        { name: 'Mensajes Procesados', value: '1.2M', change: '+5%', icon: BarChart3 },
        { name: 'Uso de CPU', value: '14%', change: '-2%', icon: Cpu },
        { name: 'Seguridad', value: '100%', change: 'Estable', icon: ShieldCheck },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Resumen del Sistema</h2>
                    <p className="text-zinc-500">Estado actual del motor OpenMota God Mode.</p>
                </div>
                <div className="flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 text-xs font-medium text-green-400">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Sistema en Línea
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="glass p-6 rounded-2xl space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <stat.icon className="w-5 h-5 text-purple-400" />
                            </div>
                            <span className={`text-xs font-medium ${stat.change.startsWith('+') ? 'text-green-400' : 'text-zinc-500'}`}>
                                {stat.change}
                            </span>
                        </div>
                        <div>
                            <p className="text-sm text-zinc-500 font-medium">{stat.name}</p>
                            <h3 className="text-2xl font-bold">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass rounded-2xl overflow-hidden flex flex-col h-[400px]">
                    <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                        <h3 className="font-semibold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-purple-400" />
                            Actividad Reciente
                        </h3>
                        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Chat</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> API</span>
                        </div>
                    </div>
                    <div className="flex-1 p-6 flex items-center justify-center text-zinc-700">
                        {/* Visual placeholder for a real chart */}
                        <p className="text-sm font-mono">[ Visualización de Gráficos Cargando... ]</p>
                    </div>
                </div>

                <div className="glass rounded-2xl p-6 flex flex-col h-[400px]">
                    <h3 className="font-semibold mb-6 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-400" />
                        Últimos Eventos
                    </h3>
                    <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                        {[1, 2, 3, 4, 5].map((_, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="relative">
                                    <div className="w-2 h-2 rounded-full bg-purple-500 mt-1" />
                                    {i !== 4 && <div className="absolute top-3 left-[3.5px] w-[1px] h-10 bg-zinc-800" />}
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Auto-Skill Desarrollado</p>
                                    <p className="text-xs text-zinc-500">El agente creó la herramienta `get_weather` exitosamente.</p>
                                    <p className="text-[10px] text-zinc-600 font-mono">Hace {i + 2} minutos</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Overview;
