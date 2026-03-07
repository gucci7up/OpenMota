"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Image as ImageIcon } from 'lucide-react';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

const ChatView: React.FC = () => {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hola. Soy el motor OpenMota en tiempo real. ¿En qué puedo ayudarte desde el terminal web?' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            // Calling the OpenMota Pro API (Assuming it's proxyable or accessible)
            // In a real scenario, we'd call /api/chat which proxies to the real agent
            const response = await fetch('/api/proxy-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg })
            });

            const data = await response.json();
            setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error de conexión con el motor central.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] glass rounded-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-sm font-medium">Motor: Groq Llama-3 + OpenRouter Vision</span>
                </div>
                <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Loader2 className="w-4 h-4" />
                </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-zinc-800' : 'bg-purple-600/20'
                            }`}>
                            {msg.role === 'user' ? <User className="w-4 h-4 text-zinc-400" /> : <Bot className="w-4 h-4 text-purple-400" />}
                        </div>
                        <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                ? 'bg-zinc-800/50 text-zinc-100 rounded-tr-none'
                                : 'bg-purple-600/5 text-zinc-300 rounded-tl-none border border-purple-500/10'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex gap-4">
                        <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center shrink-0">
                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        </div>
                        <div className="bg-purple-600/5 p-4 rounded-2xl rounded-tl-none border border-purple-500/10">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 animate-bounce" />
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 animate-bounce [animation-delay:0.2s]" />
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500/50 animate-bounce [animation-delay:0.4s]" />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="p-6 bg-zinc-900/50 border-t border-zinc-800">
                <div className="relative flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Escribe una instrucción para OpenMota..."
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 pr-24 text-sm focus:outline-none focus:ring-1 focus:ring-purple-600/50 transition-all"
                    />
                    <div className="absolute right-2 flex items-center gap-2">
                        <button className="p-1.5 text-zinc-500 hover:text-zinc-300 transition-colors">
                            <ImageIcon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleSend}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-1.5 rounded-lg transition-all glow-primary"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ChatView;
