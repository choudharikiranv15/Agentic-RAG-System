import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

export default function UploadArea({ files, onUpload, status }) {
    const fileInputRef = useRef(null);

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Drag & Drop Zone */}
            <div
                onClick={() => fileInputRef.current?.click()}
                className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center text-center gap-4 border-dashed border-2 border-slate-700 hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer group relative overflow-hidden"
            >
                <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />

                <input
                    type="file"
                    multiple
                    ref={fileInputRef}
                    onChange={onUpload}
                    className="hidden"
                />

                <div className="p-4 bg-slate-800 rounded-full group-hover:scale-110 transition-transform shadow-xl">
                    <Upload size={32} className="text-blue-400" />
                </div>

                <div className="z-10">
                    <p className="text-base font-medium text-white group-hover:text-blue-200 transition-colors">
                        Drop documents here
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                        PDF, DOCX, TXT supported
                    </p>
                </div>
            </div>

            {/* Status Notifications */}
            <AnimatePresence mode="wait">
                {status === 'uploading' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center gap-3"
                    >
                        <Loader2 size={20} className="text-blue-400 animate-spin" />
                        <span className="text-sm font-medium text-blue-200">Ingesting documents...</span>
                    </motion.div>
                )}
                {status === 'success' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3"
                    >
                        <CheckCircle size={20} className="text-green-400" />
                        <span className="text-sm font-medium text-green-200">Processing complete!</span>
                    </motion.div>
                )}
                {status === 'error' && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3"
                    >
                        <AlertCircle size={20} className="text-red-400" />
                        <span className="text-sm font-medium text-red-200">Upload failed.</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* File List */}
            <div className="flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Knowledge Base ({files.length})
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2 scrollbar-thin">
                    {files.length === 0 ? (
                        <div className="text-center py-10 opacity-30 border-2 border-dashed border-slate-800 rounded-xl">
                            <FileText size={48} className="mx-auto mb-2" />
                            <p className="text-sm">No files indexed</p>
                        </div>
                    ) : (
                        files.map((file, i) => (
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                key={i}
                                className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-colors group"
                            >
                                <div className="p-2 bg-slate-900 rounded-lg text-slate-400 group-hover:text-blue-400 transition-colors">
                                    <FileText size={16} />
                                </div>
                                <span className="text-sm text-slate-300 truncate font-medium">{file}</span>
                                <CheckCircle size={14} className="ml-auto text-green-500/50" />
                            </motion.div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
