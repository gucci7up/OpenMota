"use client";

import React from 'react';
import {
    LayoutDashboard,
    MessageSquare,
    BrainCircuit,
    Settings,
    Zap,
    Activity,
    User,
    LogOut
} from 'lucide-react';

interface SidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab }) => {
    const menuItems = [
        { id: 'overview', name: 'Resumen', icon: LayoutDashboard },
        { id: 'chat', name: 'Chat en Vivo', icon: MessageSquare },
        { id: 'memory', name: 'Memoria Semántica', icon: BrainCircuit },
        { id: 'skills', name: 'Habilidades (Skills)', icon: Zap },
        { id: 'logs', name: 'Logs del Sistema', icon: Activity },
        { id: 'settings', name: 'Configuración', icon: Settings },
    ];

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        window.location.href = '/login';
    };

    return (
        <aside className="w-64 h-screen bg-[#09090b] border-r border-[#27272a] flex flex-col fixed left-0 top-0 z-50">
            <div className="p-6">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center glow-primary">
                        <Zap className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">OpenMota</h1>
                        <p className="text-[10px] text-purple-400 font-mono tracking-widest uppercase">God Mode Pro</p>
                    </div>
                </div>

                <nav className="space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 ${activeTab === item.id
                                ? 'bg-purple-600/10 text-purple-400 font-medium'
                                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-auto p-6 border-t border-[#27272a]">
                <div className="flex items-center gap-3 mb-4 p-2">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="w-4 h-4 text-zinc-400" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-medium truncate">Admin User</p>
                        <p className="text-[10px] text-zinc-500 truncate">Gucci7up</p>
                    </div>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-zinc-500 hover:text-red-400 text-sm transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Cerrar Sesión
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
