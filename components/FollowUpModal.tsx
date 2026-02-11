import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { quickScriptsService, type QuickScript } from '@/lib/supabase/quickScripts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScriptEditorModal, type ScriptFormData } from '@/features/inbox/components/ScriptEditorModal';
import { Search, Trash2, Pencil, Calendar, Clock, MessageSquare, Send, Loader2, PenTool, Home, UserCheck, PlusCircle, FileText, Plus, Sparkles } from 'lucide-react';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string | null;
  dealTitle?: string;
  contactName?: string;
  onScheduled?: () => void;
}

interface FollowUpForm {
  id?: string;
  date: string;
  time: string;
  message: string;
}

type TemplateType = 'VISIT' | 'FEEDBACK' | 'OPPORTUNITY' | 'CUSTOM';

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  contactName,
  onScheduled,
}) => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<TemplateType | null>(null);

  // Templates State
  const [scripts, setScripts] = useState<QuickScript[]>([]);
  const [isLoadingScripts, setIsLoadingScripts] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
  const [editingScript, setEditingScript] = useState<ScriptFormData | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [hasValidPhone, setHasValidPhone] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<FollowUpForm>({
    defaultValues: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      time: '14:00',
      message: '',
    },
  });

  const messageValue = watch('message');

  // Templates Definitions
  const templates = {
    VISIT: {
      label: 'Cobrar Visita',
      icon: <Home size={16} />,
      text: (name: string) => `OlÃ¡ ${name}, tudo bem? Conseguimos agendar aquela visita ao imÃ³vel? Tenho outros interessados, mas queria dar prioridade para vocÃª.`
    },
    FEEDBACK: {
      label: 'PÃ³s-Visita',
      icon: <UserCheck size={16} />,
      text: (name: string) => `OlÃ¡ ${name}, o que achou da visita hoje? O imÃ³vel atendeu suas expectativas ou prefere ver outras opÃ§Ãµes?`
    },
    OPPORTUNITY: {
      label: 'Nova Oportunidade',
      icon: <Sparkles size={16} />,
      text: (name: string) => `Oi ${name}, apareceu uma oportunidade incrÃ­vel no mesmo perfil que vocÃª procura. Posso te mandar as fotos?`
    }
  };

  const applyTemplate = (type: TemplateType) => {
    setActiveTemplate(type);
    const name = contactName?.split(' ')[0] || '[Nome]';

    if (type === 'CUSTOM') {
      setValue('message', '');
      return;
    }

    const templateText = templates[type as keyof typeof templates].text(name);
    setValue('message', templateText);
  };

  // Load Scripts
  const loadScripts = async () => {
    setIsLoadingScripts(true);
    const { data } = await quickScriptsService.getScripts();
    if (data) setScripts(data);
    setIsLoadingScripts(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadScripts();
    }
  }, [isOpen]);

  const handleSaveScript = async (data: ScriptFormData) => {
    if (data.id) {
      await quickScriptsService.updateScript(data.id, data);
    } else {
      await quickScriptsService.createScript(data);
    }
    await loadScripts();
  };

  const handleDeleteScript = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Tem certeza que deseja excluir este template?')) return;
    await quickScriptsService.deleteScript(id);
    await loadScripts();
  };

  const handleSelectScript = (script: QuickScript) => {
    const vars = {
      nome: contactName?.split(' ')[0] || '',
      empresa: 'Empresa',
    };
    const text = quickScriptsService.applyVariables(script.template, vars);
    setValue('message', text);
    setIsPopoverOpen(false);
  };

  const handleOpenNewScript = () => {
    const currentMessage = watch('message');
    setEditingScript({
      title: '',
      category: 'other',
      template: currentMessage,
      icon: 'MessageSquare',
    });
    setIsScriptEditorOpen(true);
    setIsPopoverOpen(false);
  };

  const handleOpenEditScript = (script: QuickScript, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingScript({
      id: script.id,
      title: script.title,
      category: script.category,
      template: script.template,
      icon: script.icon,
    });
    setIsScriptEditorOpen(true);
    setIsPopoverOpen(false);
  };

  const filteredScripts = scripts.filter(s =>
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.template.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Fetch existing pending follow-up and check phone
  useEffect(() => {
    if (isOpen && dealId) {
      const fetchData = async () => {
        try {
          // Check for phone number
          const { data: dealData } = await supabase
            .from('deals')
            .select('phone, contacts(phone)')
            .eq('id', dealId)
            .single();

          // @ts-expect-error - dealData type inference issue with inner join
          const phone = dealData?.phone || dealData?.contacts?.phone;
          setHasValidPhone(!!phone);

          // Fetch scheduled message
          const { data, error } = await supabase
            .from('scheduled_messages')
            .select('*')
            .eq('deal_id', dealId)
            .eq('status', 'PENDING')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (data) {
            const dt = new Date(data.scheduled_at);
            setValue('id', data.id);
            setValue('date', dt.toISOString().split('T')[0]);
            setValue('time', dt.toTimeString().slice(0, 5));
            setValue('message', data.message_content);
          } else {
            // Reset defaults if no existing schedule found
            const name = contactName?.split(' ')[0] || '[Nome]';
            reset({
              date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
              time: '14:00',
              message: templates.VISIT.text(name),
            });
            setActiveTemplate('VISIT');
          }
        } catch (err) {
          console.error('Error fetching data:', err);
        }
      };
      fetchData();
    }
  }, [isOpen, dealId, setValue, reset, contactName]);

  const onSubmit = async (data: FollowUpForm) => {
    if (!dealId || !profile) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${data.date}T${data.time}:00`);

      if (data.id) {
        // Update existing
        const { error } = await supabase
          .from('scheduled_messages')
          .update({
            scheduled_at: scheduledAt.toISOString(),
            message_content: data.message,
            status: 'PENDING',
          })
          .eq('id', data.id);

        if (error) throw error;
        addToast('Follow-up atualizado com sucesso!', 'success');
      } else {
        // Create new
        const { error } = await supabase.from('scheduled_messages').insert({
          deal_id: dealId,
          user_id: profile.id,
          scheduled_at: scheduledAt.toISOString(),
          message_content: data.message,
          status: 'PENDING',
        });

        if (error) throw error;
        addToast('Follow-up agendado com sucesso!', 'success');
      }

      queryClient.invalidateQueries({ queryKey: ['scheduled_messages', dealId] });

      reset();
      onScheduled?.();
      onClose();
    } catch (error: any) {
      console.error('Error scheduling follow-up:', error);
      addToast('Erro ao agendar follow-up: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Agendar Follow-up Inteligente"
      size="lg"
      className="!overflow-visible"
    >
      <div className="mb-6">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Agende uma mensagem automÃ¡tica para o WhatsApp. A IA irÃ¡ cancelar o envio se o cliente responder antes.
        </p>

        {dealTitle && (
          <div className="mt-2 text-xs font-semibold px-2 py-1 bg-slate-100 dark:bg-white/5 rounded inline-block">
            NegÃ³cio: {dealTitle}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('id')} />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Calendar size={12} /> Data
            </label>
            <input
              type="date"
              {...register('date', { required: 'Data Ã© obrigatÃ³ria' })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock size={12} /> Hora
            </label>
            <input
              type="time"
              {...register('time', { required: 'Hora Ã© obrigatÃ³ria' })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-2 relative">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <MessageSquare size={12} /> Mensagem de Follow-up
            </label>

            {/* Manual Dropdown Implementation */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className="px-2 py-1 rounded text-xs border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-1"
                title="Usar template salvo"
              >
                <FileText size={12} />
                Meus Templates
              </button>

              {isPopoverOpen && (
                <>
                  {/* Backdrop for click outside */}
                  <div
                    className="fixed inset-0 z-[99998] cursor-default"
                    onClick={() => setIsPopoverOpen(false)}
                  />

                  {/* Dropdown Content */}
                  <div className="absolute right-0 top-full mt-1 w-72 z-[99999] bg-white dark:bg-slate-950 rounded-md border border-slate-200 dark:border-slate-800 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-3 border-b border-slate-200 dark:border-slate-800">
                      <h4 className="font-medium text-xs text-slate-900 dark:text-white mb-2">Meus Templates</h4>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            className="w-full pl-7 pr-3 py-1 text-[10px] bg-slate-100 dark:bg-slate-900 border-none rounded-md focus:ring-1 focus:ring-primary-500"
                            placeholder="Buscar..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <button
                          onClick={handleOpenNewScript}
                          className="p-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors"
                          title="Salvar atual como template"
                          type="button"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                    <div className="max-h-[180px] overflow-y-auto p-1 custom-scrollbar">
                      {isLoadingScripts ? (
                        <div className="p-4 text-center text-slate-500">
                          <Loader2 size={16} className="animate-spin mx-auto mb-1" />
                          <span className="text-[10px]">Carregando...</span>
                        </div>
                      ) : filteredScripts.length === 0 ? (
                        <div className="p-4 text-center text-slate-500 text-[10px]">
                          Nenhum template encontrado
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {filteredScripts.map(script => {
                            const catInfo = quickScriptsService.getCategoryInfo(script.category);
                            return (
                              <div
                                key={script.id}
                                onClick={() => handleSelectScript(script)}
                                className="group flex items-center justify-between p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <div className={`w-0.5 h-6 rounded-full bg-${catInfo.color}-500 shrink-0`} />
                                  <div className="min-w-0">
                                    <p className="text-xs font-medium text-slate-900 dark:text-slate-200 truncate">{script.title}</p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => handleOpenEditScript(script, e)}
                                    className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded z-10 relative"
                                    type="button"
                                    title="Editar template"
                                  >
                                    <Pencil size={10} />
                                  </button>
                                  <button
                                    onClick={(e) => handleDeleteScript(script.id, e)}
                                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded z-10 relative"
                                    type="button"
                                    title="Excluir template"
                                  >
                                    <Trash2 size={10} />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="relative">
            <textarea
              {...register('message', { required: 'Mensagem Ã© obrigatÃ³ria' })}
              rows={5}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="Digite a mensagem que o robÃ´ irÃ¡ enviar..."
            />
            <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-medium bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-sm pointer-events-none">
              {messageValue?.length || 0} caracteres
            </div>
          </div>
        </div>

        {/* Template Toolbar */}
        <div className="flex items-center justify-between">
          <p className="text-[10px] text-slate-500 flex items-center gap-1">
            <PenTool size={10} /> VocÃª pode editar o texto acima livremente antes de agendar.
          </p>
        </div>

        <div className="pt-4 flex justify-between gap-3 border-t border-slate-100 dark:border-white/5">
          {watch('id') && (
            <button
              type="button"
              onClick={async () => {
                if (!confirm('Deseja cancelar este agendamento?')) return;
                setIsSubmitting(true);
                try {
                  const { error } = await supabase
                    .from('scheduled_messages')
                    .delete()
                    .eq('id', watch('id'));
                  if (error) throw error;
                  addToast('Agendamento cancelado', 'success');
                  queryClient.invalidateQueries({ queryKey: ['scheduled_messages', dealId] });
                  onScheduled?.();
                  onClose();
                } catch (e: any) {
                  addToast('Erro ao cancelar: ' + e.message, 'error');
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              Cancelar Agendamento
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            >
              Fechar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !hasValidPhone}
              title={!hasValidPhone ? "Cliente sem WhatsApp cadastrado" : ""}
              className={`px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 ${!hasValidPhone ? 'bg-slate-400 cursor-not-allowed' : 'bg-primary-600 hover:bg-primary-700 shadow-primary-600/20'}`}
            >
              {isSubmitting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              {watch('id') ? 'Atualizar' : (hasValidPhone ? 'Agendar' : 'Sem WhatsApp')}
            </button>
          </div>
        </div>
      </form>

      {isScriptEditorOpen && (
        <ScriptEditorModal
          isOpen={isScriptEditorOpen}
          onClose={() => setIsScriptEditorOpen(false)}
          onSave={handleSaveScript}
          initialData={editingScript}
          previewVariables={{
            nome: contactName?.split(' ')[0] || 'Cliente',
            empresa: 'Empresa'
          }}
        />
      )}
    </Modal >
  );
};
