import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FolderPlus, FilePlus, Upload, Trash2, Loader2, Power, FileText, AlertTriangle, BrainCircuit } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const ACCEPT = '.pdf,.txt,.md,.csv,.json,.docx,.png,.jpg,.jpeg,.webp';
const TEXT_EXT = ['txt', 'md', 'csv', 'json'];

function sizeLabel(kb) {
  if (!kb && kb !== 0) return '';
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

export default function KnowledgeFilesTab() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  useEffect(() => {
    if (folderInputRef.current) folderInputRef.current.setAttribute('webkitdirectory', '');
    load();
  }, []);

  const load = async () => {
    try {
      const page = await base44.entities.KnowledgeFile.list({ sort: '-created_date', limit: 100 });
      const items = (page && page.items) || (Array.isArray(page) ? page : []);
      setFiles(items);
    } catch (e) {
      setStatus({ type: 'error', text: 'Não foi possível carregar a lista.' });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (fileList) => {
    const arr = Array.from(fileList || []);
    if (!arr.length) return;

    setBusy(true);
    let ok = 0;
    let fail = 0;

    for (const file of arr) {
      try {
        setStatus({ type: 'info', text: `A carregar ${ok + fail + 1}/${arr.length}...` });
        const res = await base44.integrations.Core.UploadPrivateFile({ file });
        const fileUri = res?.file_uri || res?.data?.file_uri;
        if (!fileUri) throw new Error('sem uri');

        const relative = file.webkitRelativePath || '';
        const ext = (file.name.split('.').pop() || '').toLowerCase();

        let extractedText = '';
        if (TEXT_EXT.includes(ext)) {
          try {
            extractedText = (await file.text()).slice(0, 20000);
          } catch (err) {
            extractedText = '';
          }
        }

        await base44.entities.KnowledgeFile.create({
          name: file.name,
          file_uri: fileUri,
          file_type: ext,
          size_kb: Math.round((file.size || 0) / 1024),
          folder: relative ? relative.split('/')[0] : 'Geral',
          enabled: true,
          extracted_text: extractedText,
        });
        ok++;
      } catch (e) {
        fail++;
      }
    }

    setBusy(false);
    setStatus({
      type: fail ? 'error' : 'ok',
      text: fail ? `${ok} adicionados · ${fail} falharam` : `${ok} ficheiro(s) adicionados à memória da IA`,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
    await load();
    setTimeout(() => setStatus(null), 5000);
  };

  const toggleFile = async (file) => {
    setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, enabled: !f.enabled } : f)));
    await base44.entities.KnowledgeFile.update(file.id, { enabled: !file.enabled });
  };

  const removeFile = async (file) => {
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
    await base44.entities.KnowledgeFile.delete(file.id);
  };

  const activeCount = files.filter((f) => f.enabled !== false).length;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <BrainCircuit size={16} style={{ color: '#00ff41' }} />
        <h2 className="text-sm uppercase tracking-wider font-bold" style={{ color: '#00ff41' }}>
          Base de Conhecimento
        </h2>
      </div>

      <div className="p-3 rounded-sm mb-4" style={{ background: '#00ff4110', border: '1px solid #00ff4133' }}>
        <p className="text-[10px] leading-relaxed" style={{ color: '#00ff4199' }}>
          Adiciona documentos do telemóvel (PDF, TXT, MD, CSV, JSON, DOCX ou imagens). A IA lê estes ficheiros e cruza-os com conhecimento externo para responder.
        </p>
        <p className="text-[10px] mt-1.5 uppercase tracking-wider" style={{ color: '#00ff4188' }}>
          {activeCount} ativo(s) · {files.length} total
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className="flex items-center justify-center gap-2 p-3 rounded-sm text-[10px] uppercase tracking-wider"
          style={{ background: '#00ff4122', border: '1px solid #00ff4144', color: '#00ff41', opacity: busy ? 0.5 : 1 }}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <FilePlus size={14} />}
          Ficheiros
        </button>
        <button
          onClick={() => folderInputRef.current?.click()}
          disabled={busy}
          className="flex items-center justify-center gap-2 p-3 rounded-sm text-[10px] uppercase tracking-wider"
          style={{ background: '#001a0033', border: '1px solid #00ff4133', color: '#00ff41aa', opacity: busy ? 0.5 : 1 }}
        >
          <FolderPlus size={14} />
          Pasta
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleUpload(e.target.files)}
      />

      {status && (
        <div
          className="p-2.5 rounded-sm mb-3 flex items-start gap-2"
          style={{
            background: status.type === 'error' ? '#ff000011' : '#00ff4110',
            border: `1px solid ${status.type === 'error' ? '#ff000033' : '#00ff4133'}`,
          }}
        >
          {status.type === 'error' ? (
            <AlertTriangle size={12} style={{ color: '#ff5555cc', flexShrink: 0 }} />
          ) : (
            <Upload size={12} style={{ color: '#00ff41', flexShrink: 0 }} />
          )}
          <p className="text-[10px]" style={{ color: status.type === 'error' ? '#ff5555cc' : '#00ff41aa' }}>
            {status.text}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10 gap-2">
          <Loader2 size={14} className="animate-spin" style={{ color: '#00ff41' }} />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: '#00ff4188' }}>A ler registos...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-10">
          <FileText size={28} style={{ color: '#00ff4133', margin: '0 auto' }} />
          <p className="text-[10px] uppercase tracking-wider mt-3" style={{ color: '#00ff4155' }}>
            Sem ficheiros na memória
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {files.map((file, index) => {
            const active = file.enabled !== false;
            return (
              <motion.div
                key={file.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * 0.02, 0.4) }}
                className="flex items-center gap-2 p-2.5 rounded-sm"
                style={{
                  background: active ? '#00ff4110' : '#001a0033',
                  border: `1px solid ${active ? '#00ff4133' : '#00ff4111'}`,
                }}
              >
                <FileText size={14} style={{ color: active ? '#00ff41' : '#00ff4144', flexShrink: 0 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate" style={{ color: active ? '#00ff41cc' : '#00ff4166' }}>
                    {file.name}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider truncate" style={{ color: '#00ff4155' }}>
                    {[file.folder || 'Geral', file.file_type, sizeLabel(file.size_kb)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <button onClick={() => toggleFile(file)} className="p-1.5" aria-label={active ? 'Desativar' : 'Ativar'}>
                  <Power size={13} style={{ color: active ? '#00ff41' : '#00ff4133' }} />
                </button>
                <button onClick={() => removeFile(file)} className="p-1.5" aria-label="Remover">
                  <Trash2 size={13} style={{ color: '#ff555599' }} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <p className="text-[9px] mt-4 leading-relaxed" style={{ color: '#00ff4144' }}>
        🔒 Os ficheiros são guardados de forma privada (armazenamento privado) e só a tua conta lê o conteúdo. No telemóvel podes escolher vários ficheiros; em Android/desktop o botão "Pasta" permite selecionar uma pasta inteira.
      </p>
    </div>
  );
}
