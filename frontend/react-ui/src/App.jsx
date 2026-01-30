import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, Send, Sparkles, AlertCircle, CheckCircle, BrainCircuit } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';

// API Base URL
const API_URL = 'http://localhost:8000';

function App() {
  // State
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your Agentic RAG assistant. Upload some documents, and I can answer questions about them.' }
  ]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [agentContext, setAgentContext] = useState(null); // To show what the agent found

  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Handle File Upload
  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files);
    if (!selectedFiles.length) return;

    setUploadStatus('uploading');
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setFiles(prev => [...prev, ...selectedFiles.map(f => f.name)]);
      setUploadStatus('success');

      // Reset success status after 3 seconds
      setTimeout(() => setUploadStatus('idle'), 3000);

    } catch (error) {
      console.error('Upload failed:', error);
      setUploadStatus('error');
    }
  };

  // Handle Chat Submit
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;

    const question = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setIsThinking(true);
    setAgentContext(null);

    try {
      const response = await axios.post(`${API_URL}/chat`, {
        question: question,
        provider: 'auto'
      });

      const { answer, sources, context } = response.data;

      // Optional: Store context to show "Agent Reasoning" or specific sources
      setAgentContext({ sources, context });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: answer,
        sources: sources
      }]);

    } catch (error) {
      console.error('Chat failed:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error while processing your request.' }]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="full-screen text-slate-100 flex flex-col md:flex-row overflow-hidden font-sans">

      {/* LEFT PANEL: Document Management (30% width on desktop) */}
      <motion.div
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className="w-full md:w-80 border-r border-slate-700 bg-slate-900/50 p-6 flex flex-col gap-6"
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/30">
            <BrainCircuit size={24} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">Agentic RAG</h1>
            <p className="text-xs text-slate-400">Gemini 2.0 Powered</p>
          </div>
        </div>

        {/* Upload Area */}
        <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center gap-3 border-dashed border-2 border-slate-700 hover:border-blue-500 transition-colors relative">
          <input
            type="file"
            multiple
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="p-3 bg-slate-800 rounded-full">
            <Upload size={24} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-medium">Click to Upload</p>
            <p className="text-xs text-slate-500">PDF, DOCX, TXT</p>
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {uploadStatus === 'uploading' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/50 flex items-center gap-2 text-sm text-blue-200">
              <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span>
              Ingesting documents...
            </motion.div>
          )}
          {uploadStatus === 'success' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-lg bg-green-500/20 border border-green-500/50 flex items-center gap-2 text-sm text-green-200">
              <CheckCircle size={16} />
              Files ready for search!
            </motion.div>
          )}
          {uploadStatus === 'error' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 flex items-center gap-2 text-sm text-red-200">
              <AlertCircle size={16} />
              Upload failed.
            </motion.div>
          )}
        </AnimatePresence>

        {/* File List */}
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Active Documents</h3>
          <div className="space-y-2">
            {files.length === 0 ? (
              <p className="text-sm text-slate-600 italic">No documents yet.</p>
            ) : (
              files.map((file, i) => (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50"
                >
                  <FileText size={16} className="text-slate-400" />
                  <span className="text-sm truncate">{file}</span>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </motion.div>

      {/* RIGHT PANEL: Chat Interface */}
      <div className="flex-1 flex flex-col bg-slate-900/30 relative">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 md:p-6 shadow-xl backdrop-blur-sm ${msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'glass-panel text-slate-200 rounded-tl-none border-t-0 border-l-0 border-white/5'
                  }`}
              >
                {/* Message Content */}
                <div className="prose prose-invert prose-sm max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>

                {/* Sources / Citations */}
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
                      <Sparkles size={12} className="text-yellow-400" />
                      Sources Used:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {msg.sources.map((source, idx) => (
                        <span key={idx} className="text-[10px] bg-slate-800 px-2 py-1 rounded border border-slate-700 text-slate-300">
                          {source.replace('[Source: ', '').replace(']', '')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Agent Thinking Indicator */}
          {isThinking && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="glass-panel rounded-2xl p-4 rounded-tl-none flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-slate-400 animate-pulse">Agent is thinking...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-slate-900/80 backdrop-blur-xl border-t border-slate-800">
          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about your documents..."
              className="w-full bg-slate-800/50 border border-slate-700 text-white rounded-xl px-6 py-4 pr-14 focus:outline-none focus:border-blue-500 focus:bg-slate-800 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!input.trim() || isThinking}
              className="absolute right-2 p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-lg transition-colors text-white shadow-lg shadow-blue-600/20"
            >
              <Send size={20} />
            </button>
          </form>
          <div className="text-center mt-2">
            <p className="text-[10px] text-slate-500">
              Powered by Google Gemini 2.0 • AI can make mistakes, please verify information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
