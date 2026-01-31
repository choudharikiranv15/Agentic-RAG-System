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
  ChevronRight,
  Brain,
  Database,
  Copy,
  Check
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// API Base URL
const API_URL = 'http://127.0.0.1:8000';

export default function App() {
  // State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [files, setFiles] = useState([]);
  // Load messages from localStorage or use default
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('chatHistory');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
    }
    return [{
      role: 'assistant',
      content: "# Welcome to Agentic RAG\n\nI'm ready to help! Upload your PDF/DOCX files on the left, and I'll answer questions based **strictly** on their content.\n\nType a question below to get started."
    }];
  });
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filesLoading, setFilesLoading] = useState(true);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('chatHistory', JSON.stringify(messages));
    } catch (err) {
      console.error('Failed to save chat history:', err);
    }
  }, [messages]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setFilesLoading(true);
    try {
      const res = await axios.get(`${API_URL}/documents`);
      setFiles(res.data.documents || []);
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setFilesLoading(false);
    }
  };

  const handleDeleteFile = async (filename, e) => {
    e.stopPropagation(); // Prevent triggering other clicks
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    try {
      await axios.delete(`${API_URL}/documents/${filename}`);
      setFiles(prev => prev.filter(f => f !== filename));
    } catch (err) {
      console.error("Failed to delete file", err);
      alert("Failed to delete file");
    }
  };

  const handleClearDatabase = async () => {
    if (!confirm("⚠️ This will delete ALL uploaded documents and search index. Are you sure?")) return;

    setFilesLoading(true);
    try {
      await axios.delete(`${API_URL}/clear`);
      setFiles([]);
      alert("✅ Knowledge base cleared successfully.");
    } catch (err) {
      console.error("Failed to clear database", err);
      alert("Failed to clear database");
    } finally {
      setFilesLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      await axios.post(`${API_URL}/upload`, formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percentCompleted);
        }
      });
      await fetchDocuments(); // Refresh list from server
      setUploadStatus('success');
      setUploadProgress(100);
      setTimeout(() => {
        setUploadStatus('idle');
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error(error);
      setUploadStatus('error');

      // User-friendly error messages
      let errorMsg = 'Failed to upload files. ';
      if (error.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail || '';

        if (status === 413) {
          errorMsg = '❌ File too large! Maximum size is 10MB per file.';
        } else if (status === 409) {
          errorMsg = `📁 Duplicate File: ${detail}`;
        } else if (status === 429) {
          errorMsg = '⏱️ Too many uploads. Please wait a minute and try again.';
        } else if (status === 400) {
          errorMsg = detail || '❌ Invalid file. Please check the file type and try again.';
        } else {
          errorMsg = `❌ Upload failed: ${detail || 'Unknown error'}`;
        }
      } else if (error.request) {
        errorMsg = '🔌 Cannot reach server. Please check if the backend is running.';
      }

      alert(errorMsg);
      setTimeout(() => setUploadStatus('idle'), 2000);
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
        sources: response.data.sources,
        context: response.data.context
      }]);
    } catch (error) {
      console.error(error);

      // User-friendly error messages
      let errorMsg = '**Error**: Something went wrong. ';

      if (error.response) {
        const status = error.response.status;
        const detail = error.response.data?.detail || '';

        if (status === 429) {
          errorMsg = '**⏱️ Rate Limit**: You\'re asking too many questions! Please wait a minute and try again.';
        } else if (status === 400) {
          if (detail.includes('too long')) {
            errorMsg = '**📏 Question Too Long**: Please keep your question under 500 characters.';
          } else if (detail.includes('empty')) {
            errorMsg = '**❌ Empty Question**: Please type a question first.';
          } else {
            errorMsg = `**❌ Invalid Request**: ${detail}`;
          }
        } else if (status === 500) {
          errorMsg = '**🔧 Server Error**: The AI encountered an issue. Please try rephrasing your question or contact support.';
        } else {
          errorMsg = `**Error**: ${detail || 'Unknown error occurred'}`;
        }
      } else if (error.request) {
        errorMsg = '**🔌 Connection Error**: Cannot reach the server. Please check if the backend is running on port 8000.';
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMsg
      }]);
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
            onClick={() => {
              setMessages([]);
              localStorage.removeItem('chatHistory');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#2F2F2F] hover:bg-[#424242] transition-all mb-6 text-sm font-medium group"
          >
            <MessageSquarePlus size={18} className="text-blue-400 group-hover:text-blue-300" />
            New Conversation
          </button>

          {/* Divider */}
          <div className="h-px bg-[#333] mb-6 mx-2"></div>

          {/* Upload Section */}
          <div className="mb-6">
            <div className="flex items-center justify-between px-3 mb-3">
              <h3 className="text-xs font-bold text-[#888] uppercase tracking-wider flex items-center gap-2">
                <Sparkles size={12} className="text-yellow-500" />
                Source Documents
              </h3>
              {files.length > 0 && (
                <button
                  onClick={handleClearDatabase}
                  className="text-[10px] text-[#555] hover:text-red-400 transition-colors uppercase font-bold"
                  title="Wipe everything"
                >
                  Clear All
                </button>
              )}
            </div>

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
            {uploadStatus === 'uploading' && (
              <div className="mt-2 mx-1 px-3 py-2 bg-blue-500/10 border border-blue-500/20 rounded text-xs text-blue-400">
                <div className="flex items-center justify-between mb-1">
                  <span>Uploading...</span>
                  <span className="font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[#333] rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {uploadStatus === 'success' && (
              <div className="mt-2 mx-1 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-400 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                Ready to search
              </div>
            )}
          </div>

          {/* Files List */}
          <div className="space-y-1">
            {filesLoading ? (
              // Skeleton loaders
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 animate-pulse">
                    <div className="w-4 h-4 bg-[#333] rounded shrink-0"></div>
                    <div className="h-3 bg-[#333] rounded flex-1"></div>
                  </div>
                ))}
              </>
            ) : files.length > 0 ? (
              files.map((file, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 text-sm text-[#CCC] hover:bg-[#2F2F2F] rounded-lg group transition-colors cursor-default justify-between">
                  <div className="flex items-center gap-3 truncate">
                    <FileText size={16} className="shrink-0 text-[#666] group-hover:text-blue-400 transition-colors" />
                    <span className="truncate">{file}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteFile(file, e)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded transition-all text-[#666]"
                    title="Delete file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#555] px-3 py-2 italic text-center">No documents uploaded</p>
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

                    {/* 1. Reasoning/Context Accordion */}
                    {msg.context && (
                      <details className="mb-4 group bg-blue-500/5 border border-blue-500/10 rounded-lg open:bg-blue-500/10 transition-all">
                        <summary className="cursor-pointer p-2.5 text-xs font-semibold text-blue-400 flex items-center gap-2 select-none hover:text-blue-300">
                          <Brain size={14} className="shrink-0" />
                          <span>Analyzed Context & Reasoning</span>
                          <ChevronRight size={12} className="ml-auto group-open:rotate-90 transition-transform opacity-50" />
                        </summary>
                        <div className="p-3 pt-0 text-xs text-blue-200/70 font-mono leading-relaxed max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-blue-500/20 whitespace-pre-wrap">
                          {msg.context.length > 500 ? msg.context.substring(0, 500) + "..." : msg.context}
                        </div>
                      </details>
                    )}

                    <div className="prose prose-invert prose-p:leading-relaxed prose-pre:p-0 max-w-none text-[#ECECEC] prose-headings:font-semibold prose-a:text-blue-400 hover:prose-a:text-blue-300">
                      <ReactMarkdown
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '')
                            const codeContent = String(children).replace(/\n$/, '');

                            // Custom Code Block Component
                            if (!inline && match) {
                              const [copied, setCopied] = useState(false);
                              const handleCopy = () => {
                                navigator.clipboard.writeText(codeContent);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                              };

                              return (
                                <div className="rounded-lg overflow-hidden my-4 border border-[#444] bg-[#1e1e1e] group/code shadow-lg">
                                  <div className="bg-[#2a2a2a] px-4 py-2 text-xs text-[#aaa] font-mono border-b border-[#444] flex justify-between items-center select-none">
                                    <span className="uppercase font-semibold text-[#888]">{match[1]}</span>
                                    <button
                                      onClick={handleCopy}
                                      className="flex items-center gap-1.5 hover:text-white transition-colors p-1 rounded hover:bg-[#333]"
                                    >
                                      {copied ? (
                                        <>
                                          <Check size={12} className="text-green-400" />
                                          <span className="text-green-400">Copied</span>
                                        </>
                                      ) : (
                                        <>
                                          <Copy size={12} />
                                          <span>Copy</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                  <div className="p-4 overflow-x-auto custom-scrollbar">
                                    <code {...props} className="font-mono text-sm text-[#e0e0e0] block leading-relaxed">
                                      {children}
                                    </code>
                                  </div>
                                </div>
                              );
                            }

                            // Inline Code
                            return (
                              <code {...props} className={`${className} bg-[#2F2F2F] text-[#E0E0E0] px-1.5 py-0.5 rounded text-sm font-mono border border-[#333]`}>
                                {children}
                              </code>
                            )
                          }
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>

                      {/* 3. Enhanced Sources Grid (Collapsible) */}
                      {msg.sources && msg.sources.length > 0 && (() => {
                        // 1. Calculate Groups FIRST
                        const groupedSources = {};
                        msg.sources.forEach(sourceString => {
                          // Clean the source string: remove "[Source: " and "]" and surrounding whitespace
                          let cleanSource = sourceString.replace(/^\[Source:\s*/, '').replace(/\]$/, '').trim();
                          let filename = cleanSource;
                          let page = null;

                          // Check pattern: "Filename (Page X)" OR "Filename, Page X"
                          const pageMatch = filename.match(/(.*?)(?:,?\s*\(?Page\s*(\d+)\)?)$/i);

                          if (pageMatch) {
                            filename = pageMatch[1].trim();
                            page = pageMatch[2];
                          } else {
                            if (filename.includes(',')) {
                              filename = filename.split(',')[0].trim();
                            }
                          }

                          if (filename.includes('/') || filename.includes('\\')) {
                            filename = filename.split(/[/\\]/).pop();
                          }

                          if (!groupedSources[filename]) {
                            groupedSources[filename] = { pages: new Set(), original: sourceString };
                          }
                          if (page) {
                            groupedSources[filename].pages.add(page);
                          }
                        });

                        const uniqueFileCount = Object.keys(groupedSources).length;

                        // 2. Render Component
                        return (
                          <div className="mt-4 pt-2 border-t border-[#333]">
                            <details className="group/sources">
                              <summary className="flex items-center gap-2 cursor-pointer py-2 select-none text-[#888] hover:text-[#CCC] transition-colors">
                                <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider">
                                  <Database size={12} className="text-blue-500" />
                                  <span>Verified References ({uniqueFileCount})</span>
                                </div>
                                <ChevronRight size={12} className="ml-auto group-open/sources:rotate-90 transition-transform opacity-50" />
                              </summary>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 animate-in slide-in-from-top-2 duration-300 pb-2">
                                {Object.keys(groupedSources).map((filename, i) => {
                                  const source = groupedSources[filename];
                                  const pages = Array.from(source.pages).sort((a, b) => Number(a) - Number(b));
                                  const label = pages.length > 0
                                    ? `Page ${pages.join(', ')}`
                                    : 'Source Document';

                                  return (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#252525] border border-[#333] hover:border-[#555] hover:bg-[#2a2a2a] transition-all group/card cursor-default">
                                      <div className="w-8 h-8 rounded bg-[#333] border border-[#444] flex items-center justify-center text-[#888] group-hover/card:text-blue-400 group-hover/card:border-blue-500/30 transition-colors shrink-0">
                                        <FileText size={16} />
                                      </div>
                                      <div className="flex-1 min-w-0 flex flex-col justify-center min-h-8">
                                        <div className="text-xs text-[#ECECEC] font-medium truncate" title={filename}>
                                          {filename}
                                        </div>
                                        <div className="text-[10px] text-[#777] font-mono mt-0.5 flex items-center gap-1 truncate">
                                          <span className="w-1 h-1 rounded-full bg-blue-500 shrink-0"></span>
                                          <span className="truncate">{label}</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </details>
                          </div>
                        );
                      })()}
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
                  placeholder={files.length === 0 ? "Upload documents first to start asking questions..." : "Ask anything about your documents..."}
                  className="w-full bg-transparent text-[#ECECEC] placeholder-[#777] resize-none outline-none max-h-[200px] min-h-[24px] py-1"
                  rows={1}
                  disabled={isThinking || files.length === 0}
                  style={{ height: 'auto', minHeight: '24px' }}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isThinking || files.length === 0}
                  className="p-2 mb-0.5 rounded-lg bg-white text-black disabled:bg-[#444] disabled:text-[#888] transition-all hover:opacity-90 flex-shrink-0"
                >
                  {isThinking ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
              <div className="text-center text-xs mt-3 font-medium">
                {files.length === 0 ? (
                  <span className="text-yellow-500">⚠️ Please upload documents first to start chatting</span>
                ) : (
                  <span className="text-[#666]">AI can provide real-time reasoning based on your data. Verify important information.</span>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
