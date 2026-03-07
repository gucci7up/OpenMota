"use client";

import React, { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import Overview from '@/components/Overview';
import ChatView from '@/components/ChatView';
import MemoryView from '@/components/MemoryView';

export default function Home() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return <Overview />;
      case 'chat':
        return <ChatView />;
      case 'memory':
        return <MemoryView />;
      case 'skills':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-zinc-500 space-y-4">
            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold text-zinc-300">Auto-Skills Engine</h3>
            <p className="max-w-md text-center text-sm">Visualización de habilidades programadas dinámicamente en desarrollo para v1.1.</p>
          </div>
        );
      case 'logs':
        return (
          <div className="glass rounded-2xl p-6 h-[70vh] font-mono text-sm overflow-hidden flex flex-col">
            <div className="flex items-center gap-2 mb-4 text-green-400">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Live System Logs
            </div>
            <div className="flex-1 overflow-y-auto space-y-1 text-zinc-400 custom-scrollbar">
              <p><span className="text-zinc-600">[2026-03-07 16:33:32]</span> Firebase Admin initialized successfully.</p>
              <p><span className="text-zinc-600">[2026-03-07 16:33:36]</span> OpenMota API Server running at http://0.0.0.0:3001</p>
              <p><span className="text-zinc-600">[2026-03-07 16:33:36]</span> Bot @OpenMota_bot started successfully!</p>
              <p className="text-purple-400"><span className="text-zinc-600">[2026-03-07 17:15:22]</span> INFO: Vector embedding generated for user message (ID: 8vKj...).</p>
              <p className="text-blue-400"><span className="text-zinc-600">[2026-03-07 17:22:10]</span> DEBUG: Executing semantic_search for "seguridad".</p>
              <p className="text-green-400"><span className="text-zinc-600">[2026-03-07 17:28:45]</span> SUCCESS: Vision request processed via Gemini 2.0 Flash.</p>
              <p><span className="text-zinc-600">[2026-03-07 17:35:12]</span> Waiting for messages...</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="max-w-2xl space-y-8">
            <h2 className="text-3xl font-bold tracking-tight">Configuración</h2>
            <div className="glass p-8 rounded-2xl space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">OpenRouter API Key</label>
                <input type="password" value="••••••••••••••••••••••••••••" readOnly className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Telegram Channel ID</label>
                <input type="text" value="7045646241" readOnly className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm" />
              </div>
              <div className="pt-4 border-t border-zinc-800">
                <button className="bg-purple-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-purple-900/20 hover:bg-purple-500 transition-all">
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <Overview />;
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex">
      {/* Sidebar Navigation */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 ml-64 p-8 lg:p-12 overflow-y-auto h-screen custom-scrollbar">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>

      {/* Background Aesthetic Elements */}
      <div className="fixed top-[-10%] right-[-5%] w-[50%] h-[50%] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none z-0" />
    </div>
  );
}
