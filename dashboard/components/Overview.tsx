"use client";

import React, { useEffect, useState } from 'react';
import {
    BarChart3,
    Users,
    Cpu,
    ShieldCheck,
    TrendingUp,
    Clock,
    Loader2
} from 'lucide-react';

interface Stats {
    totalMessages: number;
    totalUsers: number;
    status: string;
    security: string;
}

const Overview: React.FC = () => {
    const [statsData, setStatsData] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stats')
            .then(res => res.json())
            .then(data => {
                setStatsData(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
            </div>
        );
    }

    const stats = [
        { name: 'Usuarios Totales', value: statsData?.totalUsers || '0', change: 'Whitelist', icon: Users },
        { name: 'Mensajes Procesados', value: statsData?.totalMessages?.toLocaleString() || '0', change: '+Vectores', icon: BarChart3 },
        { name: 'Uso de CPU', value: '14%', change: '-2%', icon: Cpu },
        { name: 'Seguridad', value: statsData?.security || 'Alpha', change: 'Estable', icon: ShieldCheck },
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
                    Sistema {statsData?.status === 'online' ? 'en Línea' : 'Iniciando'}
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
                            Evolución de Inteligencia
                        </h3>
                        <div className="flex items-center gap-4 text-xs font-medium text-zinc-500">
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Semántica</span>
                            <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Visión</span>
                        </div>
                    </div>
                    <div className="flex-1 p-6 flex flex-col items-center justify-center text-zinc-700 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/10 via-transparent to-transparent">
                        <div className="w-full flex items-end justify-between px-20 h-40 gap-4 mb-4">
                            <div className="w-full bg-purple-600/20 rounded-t-lg h-24 animate-pulse" />
                            <div className="w-full bg-purple-600/40 rounded-t-lg h-32 animate-pulse [animation-delay:0.2s]" />
                            <div className="w-full bg-purple-600/30 rounded-t-lg h-28 animate-pulse [animation-delay:0.4s]" />
                            <div className="w-full bg-purple-600/60 rounded-t-lg h-44 animate-pulse [animation-delay:0.6s]" />
                        </div>
                        <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest">Actividad de Neuro-Vectores en Tiempo Real</p>
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
                                    <p className="text-sm font-medium">Sincronización Exitosa</p>
                                    <p className="text-xs text-zinc-500">{i === 0 ? 'Conexión con motor real establecida.' : 'Punto de control guardado en Firestore.'}</p>
                                    <p className="text-[10px] text-zinc-600 font-mono">Hace {i * 2 + 1} min</p>
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
