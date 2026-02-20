import React from 'react';
import { useForm } from 'react-hook-form';
import { Calendar, Clock, MessageSquare, Send, Loader2 } from 'lucide-react';
import { Modal, ModalForm } from '@/components/ui/Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';

interface FollowUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  dealId: string | null;
  dealTitle?: string;
  onScheduled?: () => void;
}

interface FollowUpForm {
  date: string;
  time: string;
  message: string;
}

export const FollowUpModal: React.FC<FollowUpModalProps> = ({
  isOpen,
  onClose,
  dealId,
  dealTitle,
  onScheduled,
}) => {
  const { profile } = useAuth();
  const { addToast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FollowUpForm>({
    defaultValues: {
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
      time: '14:00',
      message: 'OlÃ¡! Conseguiu ver aquela proposta que te enviei?',
    },
  });

  const onSubmit = async (data: FollowUpForm) => {
    if (!dealId || !profile) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${data.date}T${data.time}:00`);

      const { error } = await supabase.from('scheduled_messages').insert({
        deal_id: dealId,
        user_id: profile.id,
        scheduled_at: scheduledAt.toISOString(),
        message_content: data.message,
        status: 'PENDING',
      });

      if (error) throw error;

      addToast('Follow-up agendado com sucesso!', 'success');
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
    <Modal isOpen={isOpen} onClose={onClose} title="Agendar Follow-up Inteligente" size="md">
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

      <ModalForm onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Calendar size={12} /> Data
            </label>
            <input
              type="date"
              {...register('date', { required: 'Data Ã© obrigatÃ³ria' })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <Clock size={12} /> Hora
            </label>
            <input
              type="time"
              {...register('time', { required: 'Hora Ã© obrigatÃ³ria' })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
            <MessageSquare size={12} /> Mensagem de Follow-up
          </label>
          <textarea
            {...register('message', { required: 'Mensagem Ã© obrigatÃ³ria' })}
            rows={4}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg text-sm text-slate-900 dark:text-white"
            placeholder="O que o robÃ´ deve dizer?"
          />
        </div>

        <div className="pt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-lg shadow-primary-600/20 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Agendar Follow-up
          </button>
        </div>
      </ModalForm>
    </Modal>
  );
};
