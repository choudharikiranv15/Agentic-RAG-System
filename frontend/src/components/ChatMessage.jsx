import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Sparkles, User, Bot, Copy, Check } from 'lucide-react';
import { useState, useMemo } from 'react';

/**
 * Format content for better markdown rendering
 * - Adds line breaks before section headers (bold text with colon)
 * - Ensures proper list formatting
 * - Adds spacing between sections
 */
function formatContent(content) {
    if (!content) return '';

    let formatted = content;

    // Add line breaks before bold section headers like **Title:** or **Title**
    // But not at the very start of content
    formatted = formatted.replace(/([^\n])(\*\*[^*]+:\*\*)/g, '$1\n\n$2');
    formatted = formatted.replace(/([^\n])(\*\*[^*]+\*\*:)/g, '$1\n\n$2');

    // Add line breaks before numbered items (1. 2. 3. etc.) if not already there
    formatted = formatted.replace(/([^\n])(\d+\.\s)/g, '$1\n$2');

    // Add line breaks before bullet points if not already there
    formatted = formatted.replace(/([^\n])([-•]\s)/g, '$1\n$2');

    // Convert lines starting with "- " or "• " to proper markdown list items
    formatted = formatted.replace(/^[-•]\s/gm, '- ');

    // Ensure headers have proper spacing (## Header)
    formatted = formatted.replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2');

    // Clean up multiple consecutive newlines (max 2)
    formatted = formatted.replace(/\n{3,}/g, '\n\n');

    // Trim whitespace
    formatted = formatted.trim();

    return formatted;
}

// Code block component with copy button
function CodeBlock({ language, children }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(children);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4">
            <div className="absolute right-2 top-2 z-10">
                <button
                    onClick={handleCopy}
                    className="p-2 rounded-lg bg-slate-700/80 hover:bg-slate-600 transition-colors opacity-0 group-hover:opacity-100"
                    title="Copy code"
                >
                    {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-slate-300" />}
                </button>
            </div>
            {language && (
                <div className="absolute left-3 top-0 -translate-y-1/2 px-2 py-0.5 bg-slate-700 rounded text-[10px] text-slate-400 uppercase font-mono">
                    {language}
                </div>
            )}
            <SyntaxHighlighter
                style={oneDark}
                language={language || 'text'}
                PreTag="div"
                className="!rounded-xl !bg-slate-900/90 !p-4 !pt-6 !text-sm border border-slate-700/50"
            >
                {children}
            </SyntaxHighlighter>
        </div>
    );
}

// Custom markdown components for ChatGPT/Claude-like styling with better spacing
const markdownComponents = {
    // Headings - more spacing above and below
    h1: ({ children }) => <h1 className="text-2xl font-bold mt-8 mb-4 pb-2 text-white border-b border-slate-700/50">{children}</h1>,
    h2: ({ children }) => <h2 className="text-xl font-bold mt-8 mb-4 text-white">{children}</h2>,
    h3: ({ children }) => <h3 className="text-lg font-semibold mt-6 mb-3 text-slate-100">{children}</h3>,
    h4: ({ children }) => <h4 className="text-base font-semibold mt-5 mb-2 text-slate-200">{children}</h4>,

    // Paragraphs - generous line height and spacing
    p: ({ children }) => <p className="my-4 leading-8 text-slate-200">{children}</p>,

    // Lists - ChatGPT style with proper indentation and spacing
    ul: ({ children }) => <ul className="my-5 ml-2 space-y-3">{children}</ul>,
    ol: ({ children }) => <ol className="my-5 ml-2 space-y-3 list-none counter-reset-item">{children}</ol>,
    li: ({ children, ordered, index }) => (
        <li className="flex gap-3 text-slate-200 leading-7">
            <span className="text-blue-400 font-bold mt-0.5 shrink-0">•</span>
            <span className="flex-1">{children}</span>
        </li>
    ),

    // Strong/Bold - slightly brighter
    strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,

    // Emphasis/Italic
    em: ({ children }) => <em className="italic text-slate-300">{children}</em>,

    // Inline code
    code: ({ inline, className, children }) => {
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : null;

        if (!inline && (language || String(children).includes('\n'))) {
            return <CodeBlock language={language}>{String(children).replace(/\n$/, '')}</CodeBlock>;
        }

        return (
            <code className="px-2 py-1 mx-0.5 bg-slate-700/70 rounded-md text-sm font-mono text-pink-300 border border-slate-600/40">
                {children}
            </code>
        );
    },

    // Blockquote - more prominent
    blockquote: ({ children }) => (
        <blockquote className="my-6 pl-5 border-l-4 border-blue-500/60 text-slate-300 bg-slate-800/40 py-4 pr-4 rounded-r-lg">
            {children}
        </blockquote>
    ),

    // Horizontal rule
    hr: () => <hr className="my-8 border-slate-700/60" />,

    // Links
    a: ({ href, children }) => (
        <a href={href} className="text-blue-400 hover:text-blue-300 underline underline-offset-4 decoration-blue-400/50 hover:decoration-blue-300" target="_blank" rel="noopener noreferrer">
            {children}
        </a>
    ),

    // Tables - better spacing
    table: ({ children }) => (
        <div className="my-6 overflow-x-auto rounded-xl border border-slate-700/60">
            <table className="min-w-full divide-y divide-slate-700">{children}</table>
        </div>
    ),
    thead: ({ children }) => <thead className="bg-slate-800/60">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-slate-700/40 bg-slate-900/30">{children}</tbody>,
    tr: ({ children }) => <tr className="hover:bg-slate-800/30 transition-colors">{children}</tr>,
    th: ({ children }) => <th className="px-5 py-3 text-left text-sm font-semibold text-slate-100">{children}</th>,
    td: ({ children }) => <td className="px-5 py-3 text-sm text-slate-300">{children}</td>,
};

export default function ChatMessage({ message }) {
    const isUser = message.role === 'user';

    // Format the content for better markdown rendering
    const formattedContent = useMemo(() => {
        return isUser ? message.content : formatContent(message.content);
    }, [message.content, isUser]);

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
                        <span className="text-xs font-bold tracking-wider uppercase">AI Agent</span>
                    </div>
                )}

                {/* Content with enhanced markdown */}
                <div className="max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={markdownComponents}
                    >
                        {formattedContent}
                    </ReactMarkdown>
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
