import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { Sparkles, User, Bot } from 'lucide-react';

export default function ChatMessage({ message }) {
    const isUser = message.role === 'user';

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            {/* Avatar (Bot only) */}
            {!isUser && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shrink-0 mt-2">
                    <Bot size={20} className="text-white" />
                </div>
            )}

            <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-6 shadow-xl backdrop-blur-md ${isUser
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'glass-panel text-slate-200 rounded-tl-sm border border-white/5 bg-slate-900/60'
                    }`}
            >
                {/* Helper Badge for Bot */}
                {!isUser && (
                    <div className="flex items-center gap-2 mb-3 opacity-50">
                        <span className="text-xs font-bold tracking-wider uppercase">Gemini Agent</span>
                    </div>
                )}

                {/* Content */}
                <div className="prose prose-invert prose-sm md:prose-base max-w-none leading-relaxed">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>

                {/* Sources */}
                {!isUser && message.sources && message.sources.length > 0 && (
                    <div className="mt-5 pt-4 border-t border-white/5">
                        <p className="text-xs font-bold text-blue-400 mb-3 flex items-center gap-1.5 uppercase tracking-wider">
                            <Sparkles size={12} />
                            Referenced Sources
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, idx) => (
                                <span
                                    key={idx}
                                    className="text-[11px] bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/80 text-slate-300 hover:bg-slate-700 transition-colors cursor-default"
                                >
                                    {source.replace('[Source: ', '').replace(']', '')}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Avatar (User only) */}
            {isUser && (
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center shadow-lg shrink-0 mt-2">
                    <User size={20} className="text-slate-300" />
                </div>
            )}
        </motion.div>
    );
}
