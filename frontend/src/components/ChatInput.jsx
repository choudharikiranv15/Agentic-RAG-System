import { Send, Loader2 } from 'lucide-react';

export default function ChatInput({ input, setInput, onSend, disabled }) {
    return (
        <div className="p-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800/80 sticky bottom-0 z-20">
            <form onSubmit={onSend} className="max-w-4xl mx-auto relative flex items-center gap-4">

                <div className="relative flex-1 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl opacity-20 group-focus-within:opacity-100 transition duration-500 blur"></div>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your documents..."
                        className="relative w-full bg-slate-900 border border-slate-700 text-white rounded-xl px-6 py-4 pr-16 focus:outline-none focus:border-transparent placeholder-slate-500 shadow-xl transition-all"
                        disabled={disabled}
                    />
                </div>

                <button
                    type="submit"
                    disabled={disabled || !input.trim()}
                    className="absolute right-2 p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed rounded-lg transition-all text-white shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center w-10 h-10"
                >
                    {disabled ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
            </form>

            <div className="text-center mt-3 flex items-center justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest font-medium">
                <span>Powered by Gemini 2.0 Flash</span>
                <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                <span>Secure RAG Pipeline</span>
            </div>
        </div>
    );
}
