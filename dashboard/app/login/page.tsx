"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Shield, ArrowRight, Loader2, Sparkles } from 'lucide-react';

export default function LoginPage() {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;

        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });

            if (res.ok) {
                router.push('/');
                router.refresh();
            } else {
                const data = await res.json();
                setError(data.error || 'Acceso denegado. Inténtalo de nuevo.');
            }
        } catch (err) {
            setError('Error de conexión con el sistema central.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6 relative overflow-hidden">

            {/* Background Aesthetic Elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none animate-pulse" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />

            {/* Grid Pattern */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay" />
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />

            <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in-95 duration-700">

                {/* Logo/Brand Header */}
                <div className="flex flex-col items-center mb-10 space-y-4">
                    <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center shadow-2xl shadow-purple-500/20 border border-purple-400/20 group hover:rotate-6 transition-transform duration-500">
                        <Shield className="w-10 h-10 text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-4xl font-black tracking-tighter text-white bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-500">
                            OPENMOTA <span className="text-purple-500">PRO</span>
                        </h1>
                        <p className="text-sm text-zinc-500 font-medium tracking-widest uppercase mt-1">SISTEMA DE CONTROL CENTRAL</p>
                    </div>
                </div>

                {/* Login Card */}
                <div className="glass p-8 rounded-[32px] border border-zinc-800 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-500 to-transparent opacity-50" />

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Lock className="w-3 h-3 text-purple-500" />
                                Acceso de Administrador
                            </label>
                            <div className="relative group">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Introduce tu clave de acceso..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600/30 transition-all text-white placeholder:text-zinc-700"
                                    autoFocus
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                    <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
                                </div>
                            </div>
                            {error && (
                                <p className="text-xs text-red-500 font-medium ml-1 animate-in slide-in-from-top-1">
                                    ⚠️ {error}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !password}
                            className="w-full bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-3 hover:bg-zinc-200 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,255,255,0.1)] group"
                        >
                            {isLoading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    ACCEDER AL TRONO
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 flex items-center justify-between px-2 pt-6 border-t border-zinc-900">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-tighter text-nowrap">Cifrado de Extremo a Extremo</span>
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono">v1.2.0-om_pro</span>
                    </div>
                </div>

                <p className="text-center mt-8 text-zinc-600 text-xs">
                    © 2026 OpenMota • <span className="hover:text-purple-500 transition-colors cursor-help italic">Advanced Agent Intelligence</span>
                </p>
            </div>
        </div>
    );
}
