import { memo, useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Image as ImageIcon, Link2, MessageSquare, Upload } from 'lucide-react';
import { MindFlowNode } from '../../types';
import { cn } from '../../utils/cn';
import { useFlowStore } from '../../store/useFlowStore';

type ImageFit = 'cover' | 'contain';
type ImageFrame = 'rounded' | 'polaroid' | 'circle';
type ImageFilter = 'none' | 'mono' | 'warm' | 'cool';
type CaptionAlign = 'left' | 'center' | 'right';

const FILTER_STYLE: Record<ImageFilter, string> = {
  none: 'none',
  mono: 'grayscale(100%) contrast(1.06)',
  warm: 'sepia(28%) saturate(1.2) hue-rotate(-8deg)',
  cool: 'saturate(1.12) hue-rotate(12deg) brightness(0.96)',
};

const CAPTION_ALIGN_CLASS: Record<CaptionAlign, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

const HANDLE_CLASS =
  '!h-3.5 !w-3.5 rounded-full border-2 border-white bg-sky-500 shadow-[0_0_0_2px_rgba(14,165,233,0.35)] dark:border-slate-900 dark:bg-sky-400';

export const ImageNode = memo(({ id, data, selected }: NodeProps<MindFlowNode>) => {
  const { dropTargetId } = useFlowStore();

  const label = String(data.label || 'Imagem');
  const imageUrl = String(data.imageUrl || '').trim();
  const fit = ((data.imageFit as ImageFit) || 'cover') as ImageFit;
  const frame = ((data.imageFrame as ImageFrame) || 'rounded') as ImageFrame;
  const filter = ((data.imageFilter as ImageFilter) || 'none') as ImageFilter;
  const captionAlign = ((data.imageCaptionAlign as CaptionAlign) || 'center') as CaptionAlign;
  const showDomain = data.imageShowDomain !== false;
  const openComments = Array.isArray(data.comments)
    ? data.comments.filter((comment) => comment && typeof comment === 'object' && !(comment as { resolved?: boolean }).resolved).length
    : 0;

  const isDropTarget = id === dropTargetId;

  const sourceDomain = useMemo(() => {
    if (!imageUrl) return '';
    try {
      return new URL(imageUrl).hostname.replace(/^www\./, '');
    } catch {
      return '';
    }
  }, [imageUrl]);

  const frameClasses: Record<ImageFrame, string> = {
    rounded: 'rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
    polaroid: 'rounded-xl border border-slate-300 bg-white p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900',
    circle: 'rounded-[28px] border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
  };

  const mediaWrapperClasses = cn(
    'relative w-[248px] overflow-hidden bg-slate-100 dark:bg-slate-800/70',
    frame === 'circle' ? 'h-[248px] rounded-[24px]' : 'h-[160px] rounded-xl',
  );

  return (
    <div
      className={cn(
        'relative overflow-visible',
        frameClasses[frame],
        selected && 'ring-2 ring-sky-500/45',
        isDropTarget && 'ring-4 ring-blue-400/40',
      )}
    >
      <Handle type="source" id="top" position={Position.Top} className={HANDLE_CLASS} />
      <Handle type="source" id="left" position={Position.Left} className={HANDLE_CLASS} />
      <Handle type="source" id="bottom" position={Position.Bottom} className={HANDLE_CLASS} />
      <Handle type="source" id="right" position={Position.Right} className={HANDLE_CLASS} />

      <div className={cn('flex flex-col', frame === 'polaroid' && 'gap-2')}>
        <div className={mediaWrapperClasses}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={label}
              className={cn('h-full w-full transition-transform duration-300', fit === 'cover' ? 'object-cover' : 'object-contain')}
              style={{ filter: FILTER_STYLE[filter] }}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200 text-slate-500 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-slate-400">
              <ImageIcon size={20} />
              <span className="text-[11px] font-medium">Cole URL ou envie arquivo</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-300/70 bg-white/80 px-2 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-900/80">
                <Upload size={10} />
                JPG, PNG, WebP
              </span>
            </div>
          )}

          {sourceDomain && showDomain && (
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full border border-black/10 bg-white/75 px-2 py-0.5 text-[10px] font-medium text-slate-700 backdrop-blur dark:border-white/20 dark:bg-black/45 dark:text-slate-100">
              <Link2 size={10} />
              {sourceDomain}
            </div>
          )}
        </div>

        <div className={cn('px-3 pb-2 pt-2 text-xs font-semibold text-slate-800 dark:text-slate-100', CAPTION_ALIGN_CLASS[captionAlign])}>
          {label || 'Imagem sem legenda'}
        </div>
      </div>

      {openComments > 0 && (
        <div className="absolute -bottom-2 -right-2 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-amber-900/30 dark:text-amber-300">
          <MessageSquare size={10} />
          {openComments}
        </div>
      )}

    </div>
  );
});
