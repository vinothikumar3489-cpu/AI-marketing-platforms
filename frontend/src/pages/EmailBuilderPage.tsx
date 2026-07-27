import React, { useState, useEffect } from 'react';
import { PageHeader, Card } from '../components/UI';
import { useProject } from '../context/ProjectContext';
import { api } from '../lib/api';
import { Save, Plus, ArrowRight, Eye, Layout, Type, Image as ImageIcon, CheckCircle, Mail, MousePointer2 } from 'lucide-react';

type EmailBlock = {
  id: string;
  type: 'header' | 'text' | 'button' | 'image' | 'footer';
  content: any;
};

export default function EmailBuilderPage() {
  const { selectedChatId } = useProject();
  const [blocks, setBlocks] = useState<EmailBlock[]>([
    { id: '1', type: 'header', content: 'Transform Your Workflow' },
    { id: '2', type: 'text', content: 'As a professional, you understand the challenge of inefficient workflows. Discover our new solution today.' },
    { id: '3', type: 'button', content: { label: 'Get Started', url: 'https://example.com' } },
  ]);
  const [subject, setSubject] = useState('New Campaign Subject');
  const [loading, setLoading] = useState(false);
  const [activeBlock, setActiveBlock] = useState<string | null>(null);

  const addBlock = (type: EmailBlock['type']) => {
    const newBlock: EmailBlock = {
      id: Date.now().toString(),
      type,
      content: type === 'button' ? { label: 'Click Me', url: '#' } : (type === 'image' ? 'https://via.placeholder.com/600x200' : 'New block text')
    };
    setBlocks([...blocks, newBlock]);
    setActiveBlock(newBlock.id);
  };

  const updateBlockContent = (id: string, content: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
    if (activeBlock === id) setActiveBlock(null);
  };

  const moveBlock = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === blocks.length - 1)) return;
    const newBlocks = [...blocks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]];
    setBlocks(newBlocks);
  };

  const saveTemplate = async () => {
    if (!selectedChatId) return alert('Select a project first');
    setLoading(true);
    try {
      // Mocking the save format expected by backend
      const emailData = {
        subject,
        bodyParagraphs: blocks.filter(b => b.type === 'text').map(b => b.content),
        primaryCta: blocks.find(b => b.type === 'button')?.content || null,
        html: generateHtmlPreview()
      };
      
      const res = await api.post(`/email/${selectedChatId}/draft`, emailData);
      if (res.success) {
        alert('Draft saved successfully!');
      } else {
        alert('Failed to save draft');
      }
    } catch (e) {
      console.error(e);
      alert('Error saving draft');
    } finally {
      setLoading(false);
    }
  };

  const generateHtmlPreview = () => {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; color: #333;">
        ${blocks.map(b => {
          if (b.type === 'header') return `<h1 style="color: #2563eb; text-align: center;">${b.content}</h1>`;
          if (b.type === 'text') return `<p style="line-height: 1.6; font-size: 16px;">${b.content}</p>`;
          if (b.type === 'button') return `<div style="text-align: center; margin: 20px 0;"><a href="${b.content.url}" style="background: #2563eb; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">${b.content.label}</a></div>`;
          if (b.type === 'image') return `<img src="${b.content}" alt="Image" style="max-width: 100%; border-radius: 8px;" />`;
          if (b.type === 'footer') return `<div style="font-size: 12px; color: #888; text-align: center; margin-top: 40px; border-top: 1px solid #ddd; padding-top: 20px;">${b.content}</div>`;
          return '';
        }).join('')}
      </div>
    `;
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <PageHeader
        eyebrow="Visual Builder"
        title="Enterprise Email Builder"
        subtitle="Design beautiful, high-converting email templates using drag-and-drop components."
      />

      {!selectedChatId ? (
        <Card>
          <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
            <Mail size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3>No Project Selected</h3>
            <p>Please select a project from the top dropdown to start building emails.</p>
          </div>
        </Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', flex: 1, minHeight: 0 }}>
          
          {/* LEFT PANE: Editor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', paddingRight: '4px' }}>
            
            <Card title="Settings">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: '#9aa7bd', marginBottom: '4px', display: 'block' }}>Subject Line</label>
                  <input 
                    type="text" 
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', background: '#0b1220', border: '1px solid #293245', borderRadius: '6px', color: '#fff' }}
                  />
                </div>
                <button 
                  onClick={saveTemplate} 
                  disabled={loading} 
                  className="primary-btn full"
                  style={{ padding: '12px 16px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
                >
                  {loading ? 'Saving...' : <><Save size={16} /> Save Template</>}
                </button>
              </div>
            </Card>

            <Card title="Blocks">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
                <button onClick={() => addBlock('header')} className="secondary-btn small"><Type size={14} /> Header</button>
                <button onClick={() => addBlock('text')} className="secondary-btn small"><Layout size={14} /> Text</button>
                <button onClick={() => addBlock('image')} className="secondary-btn small"><ImageIcon size={14} /> Image</button>
                <button onClick={() => addBlock('button')} className="secondary-btn small"><MousePointer2 size={14} /> Button</button>
                <button onClick={() => addBlock('footer')} className="secondary-btn small" style={{ gridColumn: 'span 2' }}><Layout size={14} /> Footer</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {blocks.map((block, idx) => (
                  <div 
                    key={block.id}
                    onClick={() => setActiveBlock(block.id)}
                    style={{ 
                      padding: '12px', 
                      background: activeBlock === block.id ? '#1e293b' : '#0b1220', 
                      border: `1px solid ${activeBlock === block.id ? '#53a7ff' : '#293245'}`, 
                      borderRadius: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: activeBlock === block.id ? '12px' : '0' }}>
                      <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e2e8f0', textTransform: 'uppercase' }}>{block.type}</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'up'); }} style={{ background: 'none', border: 'none', color: '#9aa7bd', cursor: 'pointer' }}>↑</button>
                        <button onClick={(e) => { e.stopPropagation(); moveBlock(idx, 'down'); }} style={{ background: 'none', border: 'none', color: '#9aa7bd', cursor: 'pointer' }}>↓</button>
                        <button onClick={(e) => { e.stopPropagation(); removeBlock(block.id); }} style={{ background: 'none', border: 'none', color: '#ff4757', cursor: 'pointer', marginLeft: '8px' }}>×</button>
                      </div>
                    </div>

                    {activeBlock === block.id && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} onClick={(e) => e.stopPropagation()}>
                        {block.type === 'button' ? (
                          <>
                            <input 
                              type="text" 
                              value={block.content.label} 
                              onChange={(e) => updateBlockContent(block.id, { ...block.content, label: e.target.value })}
                              placeholder="Button Text"
                              style={{ width: '100%', padding: '6px 8px', background: '#0b1220', border: '1px solid #293245', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                            />
                            <input 
                              type="text" 
                              value={block.content.url} 
                              onChange={(e) => updateBlockContent(block.id, { ...block.content, url: e.target.value })}
                              placeholder="URL"
                              style={{ width: '100%', padding: '6px 8px', background: '#0b1220', border: '1px solid #293245', borderRadius: '4px', color: '#fff', fontSize: '12px' }}
                            />
                          </>
                        ) : (
                          <textarea 
                            value={block.content} 
                            onChange={(e) => updateBlockContent(block.id, e.target.value)}
                            rows={block.type === 'text' ? 4 : 2}
                            style={{ width: '100%', padding: '8px', background: '#0b1220', border: '1px solid #293245', borderRadius: '4px', color: '#fff', fontSize: '12px', resize: 'vertical' }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {blocks.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#9aa7bd', fontSize: '13px' }}>
                    Click a block type above to add it to your email.
                  </div>
                )}
              </div>
            </Card>

          </div>

          {/* RIGHT PANE: Preview */}
          <Card title="Live Preview" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: '8px', overflow: 'hidden', border: '1px solid #293245' }}>
              <iframe 
                srcDoc={generateHtmlPreview()} 
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Email Preview"
              />
            </div>
          </Card>

        </div>
      )}
    </div>
  );
}
