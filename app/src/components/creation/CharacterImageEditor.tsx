import { useRef, useState, useEffect } from 'react';

const INK_COLORS = ['#2B1D10', '#6B5233', '#8B2E22', '#2F4F6B', '#3F6B3A'];
const CANVAS_SIZE = 320;
const CANVAS_BG = '#F2E7C6';

function DrawModal({ initial, onSave, onClose }: {
  initial?: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const historyRef = useRef<ImageData[]>([]);
  const drawingRef = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(INK_COLORS[0]);
  const [size, setSize] = useState(4);
  const [eraser, setEraser] = useState(false);
  const [canUndo, setCanUndo] = useState(false);

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    if (initial) {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (CANVAS_SIZE - w) / 2, (CANVAS_SIZE - h) / 2, w, h);
        pushHistory();
      };
      img.src = initial;
    } else {
      pushHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pushHistory() {
    const ctx = canvasRef.current!.getContext('2d')!;
    historyRef.current.push(ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE));
    if (historyRef.current.length > 25) historyRef.current.shift();
    setCanUndo(historyRef.current.length > 1);
  }

  function undo() {
    if (historyRef.current.length <= 1) return;
    historyRef.current.pop();
    const prev = historyRef.current[historyRef.current.length - 1];
    canvasRef.current!.getContext('2d')!.putImageData(prev, 0, 0);
    setCanUndo(historyRef.current.length > 1);
  }

  function clearAll() {
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.fillStyle = CANVAS_BG;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    pushHistory();
  }

  function getPos(e: React.PointerEvent) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (CANVAS_SIZE / rect.width),
      y: (e.clientY - rect.top) * (CANVAS_SIZE / rect.height),
    };
  }

  function handleDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = eraser ? CANVAS_BG : color;
    ctx.fill();
  }

  function handleMove(e: React.PointerEvent) {
    if (!drawingRef.current || !lastPos.current) return;
    const pos = getPos(e);
    const ctx = canvasRef.current!.getContext('2d')!;
    ctx.strokeStyle = eraser ? CANVAS_BG : color;
    ctx.lineWidth = size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  }

  function handleUp() {
    if (drawingRef.current) pushHistory();
    drawingRef.current = false;
    lastPos.current = null;
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-hairline rounded-xl p-4 space-y-3 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <h3 className="font-display text-2xl text-paper">Charakterbild zeichnen</h3>

        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="w-full aspect-square rounded-lg border border-hairline touch-none cursor-crosshair"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
        />

        <div className="flex items-center gap-2 flex-wrap">
          {INK_COLORS.map(c => (
            <button
              key={c}
              onClick={() => { setColor(c); setEraser(false); }}
              aria-label={`Farbe ${c}`}
              className="w-7 h-7 rounded-full border-2 shrink-0"
              style={{ backgroundColor: c, borderColor: !eraser && color === c ? '#2B1D10' : 'transparent' }}
            />
          ))}
          <button
            onClick={() => setEraser(true)}
            aria-label="Radierer"
            className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs bg-raised shrink-0"
            style={{ borderColor: eraser ? '#2B1D10' : 'transparent' }}
          >
            ⌫
          </button>
          <div className="flex-1" />
          {[3, 6, 10].map(s => (
            <button
              key={s}
              onClick={() => setSize(s)}
              aria-label={`Stiftstärke ${s}`}
              className="w-7 h-7 rounded-full border flex items-center justify-center shrink-0"
              style={{ borderColor: size === s ? '#2B1D10' : '#B4A075' }}
            >
              <span style={{ width: s, height: s, borderRadius: '50%', backgroundColor: '#2B1D10', display: 'block' }} />
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={undo} disabled={!canUndo}
            className="flex-1 py-2 border border-hairline rounded-lg text-sm text-muted hover:text-primary disabled:opacity-30 transition-colors">
            ↺ Rückgängig
          </button>
          <button onClick={clearAll}
            className="flex-1 py-2 border border-hairline rounded-lg text-sm text-muted hover:text-primary transition-colors">
            Leeren
          </button>
        </div>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-hairline rounded-lg text-sm text-muted hover:text-primary transition-colors">
            Abbrechen
          </button>
          <button onClick={() => onSave(canvasRef.current!.toDataURL('image/png'))}
            className="flex-1 py-2.5 bg-paper text-bg rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

export function CharacterImagePicker({ value, onChange }: {
  value?: string;
  onChange: (dataUrl: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuRect, setMenuRect] = useState<DOMRect | null>(null);
  const [drawOpen, setDrawOpen] = useState(false);

  function openMenu() {
    setMenuRect(btnRef.current?.getBoundingClientRect() ?? null);
    setMenuOpen(true);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 260;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        onChange(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
    setMenuOpen(false);
  }

  const menuStyle = menuRect ? {
    position: 'fixed' as const,
    top: menuRect.top,
    left: Math.min(menuRect.right + 4, window.innerWidth - 136),
  } : {};

  return (
    <div className="relative w-14 shrink-0 self-stretch">
      <button
        ref={btnRef}
        onClick={() => (menuOpen ? setMenuOpen(false) : openMenu())}
        className="w-full h-full rounded border border-dashed border-hairline flex items-center justify-center overflow-hidden"
      >
        {value ? (
          <img src={value} alt="Charakterbild" className="w-full h-full object-cover" />
        ) : (
          <span className="text-[8px] uppercase tracking-widest text-faint/40" style={{ writingMode: 'vertical-rl' }}>Bild</span>
        )}
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-140" onClick={() => setMenuOpen(false)} />
          <div className="z-150 w-32 bg-surface border border-hairline rounded-lg shadow-xl p-1.5 space-y-1" style={menuStyle}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full text-left px-2 py-1.5 text-xs text-muted hover:text-primary hover:bg-raised rounded transition-colors"
            >
              ↑ Hochladen
            </button>
            <button
              onClick={() => { setDrawOpen(true); setMenuOpen(false); }}
              className="w-full text-left px-2 py-1.5 text-xs text-muted hover:text-primary hover:bg-raised rounded transition-colors"
            >
              ✎ Zeichnen
            </button>
            {value && (
              <button
                onClick={() => { onChange(''); setMenuOpen(false); }}
                className="w-full text-left px-2 py-1.5 text-xs text-danger hover:bg-raised rounded transition-colors"
              >
                Entfernen
              </button>
            )}
          </div>
        </>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {drawOpen && (
        <DrawModal
          initial={value || undefined}
          onClose={() => setDrawOpen(false)}
          onSave={dataUrl => { onChange(dataUrl); setDrawOpen(false); }}
        />
      )}
    </div>
  );
}
