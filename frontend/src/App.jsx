import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import {
  MessageSquarePlus,
  Upload,
  FileText,
  Menu,
  X,
  Bot,
  Loader2,
  Send,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// API Base URL
const API_URL = 'http://localhost:8000';

export default function App() {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [files, setFiles] = useState([]);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "# Welcome to Agentic RAG\n\nI'm ready to help! Upload your PDF/DOCX files on the left, and I'll answer questions based **strictly** on their content.\n\nType a question below to get started."
    }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // File Upload
  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setUploadStatus('uploading');
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      await axios.post(`${API_URL}/upload`, formData);
      setFiles(prev => [...prev, ...selectedFiles.map(f => f.name)]);
      setUploadStatus('success');
      setTimeout(() => setUploadStatus('idle'), 2000);
    } catch (error) {
      console.error(error);
      setUploadStatus('error');
    }
  };

  // Chat Logic
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const question = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsThinking(true);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        question: question,
        provider: 'auto'
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.data.answer,
        sources: response.data.sources
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: '**Error**: Could not reach the agent. Please check if the backend is running.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#212121] text-[#ECECEC] font-sans overflow-hidden">

      {/* SIDEBAR */}
      <div className={`${sidebarOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full ml-0'} bg-[#171717] transition-all duration-300 ease-in-out flex flex-col border-r border-[#333] fixed md:relative z-20 h-full`}>

        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg tracking-tight">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Bot size={20} />
            </div>
            Agentic RAG
          </div>
          <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1 hover:bg-[#333] rounded">
            <X size={20} />
          </button>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          {/* New Chat */}
          <button
            onClick={() => setMessages([])}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2F2F2F] hover:bg-[#424242] transition-all mb-6 text-sm font-medium group"
          >
            <MessageSquarePlus size={18} className="text-blue-400 group-hover:text-blue-300" />
            New Conversation
          </button>

          {/* Divider */}
          <div className="h-px bg-[#333] mb-6 mx-2"></div>

          {/* Upload Section */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-[#888] uppercase px-3 mb-3 tracking-wider flex items-center gap-2">
              <Sparkles size={12} className="text-yellow-500" />
              Source Documents
            </h3>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg border border-dashed border-[#444] hover:bg-[#2A2B32] hover:border-blue-500/50 transition-all text-sm text-[#AAA] relative overflow-hidden group"
            >
              <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

              <div className="w-8 h-8 rounded-full bg-[#333] flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                {uploadStatus === 'uploading' ? (
                  <Loader2 size={16} className="animate-spin text-blue-400" />
                ) : (
                  <Upload size={16} className="text-[#888] group-hover:text-blue-400" />
                )}
              </div>
              <span className="group-hover:text-white transition-colors">
                {uploadStatus === 'uploading' ? 'Ingesting...' : 'Add Knowledge'}
              </span>
            </button>

            {/* Status Feedback */}
            {uploadStatus === 'success' && (
              <div className="mt-2 mx-1 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                Ready to search
              </div>
            )}
          </div>

          {/* Files List */}
          <div className="space-y-1">
            {files.map((file, i) => (
              <div key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#CCC] hover:bg-[#2F2F2F] rounded-lg group transition-colors cursor-default">
                <FileText size={16} className="shrink-0 text-[#666] group-hover:text-blue-400 transition-colors" />
                <span className="truncate flex-1">{file}</span>
              </div>
            ))}
            {files.length === 0 && (
              <p className="text-xs text-[#555] px-3 py-2 italic text-center">No documents uploaded yet</p>
            )}
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col relative h-full bg-[#212121]">

        {/* Top Navigation (Mobile/Desktop Toggle) */}
        <div className="h-16 flex items-center px-4 md:px-6 sticky top-0 z-10 bg-[#212121]/80 backdrop-blur text-[#ECECEC]">
          {!sidebarOpen && (
            <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 mr-2 hover:bg-[#333] rounded-lg transition-colors text-[#999] hover:text-white">
              <Menu size={20} />
            </button>
          )}
          <div className="flex-1 text-center md:text-left font-medium text-[#ECECEC] opacity-90">
            Agentic RAG <span className="text-[#666] text-sm ml-2 font-normal hidden md:inline">Secure Enterprise Pipeline</span>
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto w-full scrollbar-thin scrollbar-thumb-[#444] scrollbar-track-transparent">
          <div className="max-w-3xl mx-auto px-4 pb-12 pt-4 flex flex-col gap-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`group w-full text-base `}>
                <div className="flex gap-4 md:gap-6">
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border ${msg.role === 'assistant'
                    ? 'bg-transparent border-[#444] text-green-400'
                    : 'bg-[#333] border-transparent text-[#EEE]'
                    }`}>
                    {msg.role === 'assistant' ? <Bot size={18} /> : <div className="text-xs font-bold">You</div>}
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-hidden">
                    <div className="font-semibold text-sm mb-1 opacity-90">
                      {msg.role === 'assistant' ? 'AI Agent' : 'You'}
                    </div>

                    <div className="prose prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none text-[#ECECEC]">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            return !inline && match ? (
                              <div className="rounded-md overflow-hidden my-4 border border-[#444] bg-[#1e1e1e]">
                                <div className="bg-[#2d2d2d] px-4 py-1.5 text-xs text-[#aaa] font-mono border-b border-[#444] flex justify-between items-center">
                                  <span className="uppercase">{match[1]}</span>
                                </div>
                                <div className="p-4 overflow-x-auto">
                                  <code {...props} className="font-mono text-sm text-[#e0e0e0] block">
                                    {children}
                                  </code>
                                </div>
                              </div>
                            ) : (
                              <code {...props} className={`${className} bg-[#2F2F2F] text-[#E0E0E0] px-1.5 py-0.5 rounded text-sm font-mono`}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* Citations Block */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="mt-6">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-px bg-[#333] flex-1"></div>
                            <span className="text-xs font-medium text-[#666] uppercase tracking-wider">Sources</span>
                            <div className="h-px bg-[#333] flex-1"></div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {msg.sources.map((s, i) => (
                              <div key={i} className="flex items-center gap-1.5 bg-[#2A2A2A] border border-[#333] px-2.5 py-1.5 rounded-md text-xs text-[#BBB] hover:border-blue-500/30 transition-colors">
                                <FileText size={10} className="text-[#666]" />
                                {s.replace('[Source: ', '').replace(']', '')}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex gap-4 md:gap-6 animate-pulse">
                <div className="w-8 h-8 rounded-full border border-[#444] flex items-center justify-center text-green-500">
                  <Bot size={18} />
                </div>
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-[#333] rounded w-1/4"></div>
                  <div className="h-4 bg-[#333] rounded w-3/4 opacity-60"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </div>

        {/* Input Area */}
        <div className="w-full flex-shrink-0 bg-gradient-to-t from-[#212121] via-[#212121] to-transparent pt-10 pb-8">
          <div className="max-w-3xl mx-auto px-4">
            <div className="relative group">
              <form onSubmit={handleSendMessage} className="relative flex items-end gap-2 bg-[#2F2F2F] border border-[#444] rounded-2xl px-4 py-3 shadow-lg focus-within:ring-1 focus-within:ring-white/20 hover:border-[#555] transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Ask anything about your documents..."
                  className="w-full bg-transparent text-[#ECECEC] placeholder-[#777] resize-none outline-none max-h-[200px] min-h-[24px] py-1"
                  rows={1}
                  disabled={isThinking}
                  style={{ height: 'auto', minHeight: '24px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking}
                  className="p-2 mb-0.5 rounded-lg bg-white text-black disabled:bg-[#444] disabled:text-[#888] transition-all hover:opacity-90 flex-shrink-0"
                >
                  {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
              <div className="text-center text-xs text-[#666] mt-3 font-medium">
                AI can provide real-time reasoning based on your data. Verify important information.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
