import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// SVG geometry constants
// ---------------------------------------------------------------------------
const SVG_W = 500;
const SVG_H = 520;
const CX = 250;
const CY = 245;
const R = 210;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase = 'idle' | 'loading' | 'result';

interface CSResult {
  vertices: [number, number][];
  payout: number;
}

// ---------------------------------------------------------------------------
// Pyodide type shim (loaded from CDN at runtime)
// ---------------------------------------------------------------------------
declare global {
  interface Window {
    loadPyodide: (opts: { indexURL: string }) => Promise<any>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function CrossSectionGame() {
  const [dimension, setDimension] = useState(42);
  const [phase, setPhase] = useState<Phase>('idle');
  const [result, setResult] = useState<CSResult | null>(null);
  const [pyodideReady, setPyodideReady] = useState(false);

  const pyodideRef = useRef<any>(null);

  // -------------------------------------------------------------------------
  // Load Pyodide + install package on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function initPyodide() {
      if (!window.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/pyodide.js';
          script.onload = () => resolve();
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const pyodide = await window.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.27.3/full/',
      });

      await pyodide.loadPackage(['micropip', 'numpy']);

      const packageUrl = `${window.location.origin}/wheels/cross_sections_of_cubes-0.1.0-py3-none-any.whl`;
      await pyodide.runPythonAsync(`
import micropip
await micropip.install("${packageUrl}")
      `);

      pyodideRef.current = pyodide;
      setPyodideReady(true);
    }

    initPyodide().catch(console.error);
  }, []);

  // -------------------------------------------------------------------------
  // Generate handler
  // -------------------------------------------------------------------------
  async function handleGenerate() {
    if (!pyodideReady || phase === 'loading') return;
    setPhase('loading');
    try {
      const resultStr: string = await pyodideRef.current.runPythonAsync(`
from cross_sections_of_cubes import run_cross_section
run_cross_section(${dimension})
      `);
      setResult(JSON.parse(resultStr));
      setPhase('result');
    } catch (err) {
      console.error(err);
      setPhase('idle');
    }
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const isDisabled = !pyodideReady || phase === 'loading';
  const isSpinning = !pyodideReady || phase === 'loading';

  const polygonPoints = result
    ? result.vertices.map(([x, y]) => `${CX + x * R},${CY - y * R}`).join(' ')
    : '';

  const innerR = result ? result.payout * R : 0;

  function buttonLabel() {
    if (!pyodideReady) return 'Loading Python…';
    if (phase === 'loading') return 'Computing…';
    return 'Generate cross-section';
  }

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {/* Controls */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', maxWidth: SVG_W, width: '100%', flexWrap: 'wrap' }}>
        <label htmlFor="cs-dim-input" style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
          Dimension N:
        </label>
        <input
          id="cs-dim-input"
          type="number"
          min={3}
          max={1000}
          value={dimension}
          onChange={e => {
            const v = parseInt(e.target.value);
            if (!isNaN(v)) setDimension(Math.max(3, Math.min(1000, v)));
          }}
          style={{
            width: 80,
            padding: '0.4rem 0.6rem',
            fontSize: '1rem',
            borderRadius: 6,
            border: '1px solid #4a6a9c',
            background: '#1a2a4a',
            color: 'white',
          }}
        />
        <button onClick={handleGenerate} disabled={isDisabled} style={buttonStyle(isDisabled)}>
          {isSpinning && <Spinner />}
          {buttonLabel()}
        </button>
      </div>

      {/* SVG canvas */}
      <svg
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        width={SVG_W}
        height={SVG_H}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        {/* Background */}
        <rect width={SVG_W} height={SVG_H} fill="#0f1e3c" rx={6} />

        {/* Circumscribed circle */}
        <circle cx={CX} cy={CY} r={R} fill="#AED6F1" />

        {/* Polygon */}
        {result && (
          <polygon points={polygonPoints} fill="rgba(165,105,189,0.72)" />
        )}

        {/* Inscribed circle */}
        {result && (
          <circle cx={CX} cy={CY} r={innerR} fill="rgba(26,82,118,0.55)" />
        )}

        {/* Label */}
        {result ? (
          <text
            x={CX}
            y={SVG_H - 12}
            textAnchor="middle"
            fill="#AED6F1"
            fontSize={14}
            fontWeight="bold"
            fontFamily="Atkinson, sans-serif"
          >
            {`inradius / circumradius = ${result.payout.toFixed(4)}`}
          </text>
        ) : (
          <text
            x={CX}
            y={SVG_H - 12}
            textAnchor="middle"
            fill="rgba(174,214,241,0.35)"
            fontSize={13}
            fontFamily="Atkinson, sans-serif"
          >
            {pyodideReady ? 'Enter N and generate a cross-section' : 'Loading Python runtime…'}
          </text>
        )}
      </svg>

      {/* Learn button */}
      <button
        onClick={() => { window.location.href = '/cross-sections-of-cubes-learn'; }}
        style={buttonStyle(false)}
      >
        Learn
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    borderRadius: 10,
    boxShadow: '0 4px 8px rgba(0,0,0,0.25)',
    background: disabled ? '#4a6a9c' : '#1e4d8c',
    color: 'white',
    border: 'none',
    padding: '0.6rem 1.4rem',
    fontSize: '1rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    transition: 'background 0.15s, box-shadow 0.15s',
  };
}

function Spinner() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 14,
        height: 14,
        border: '2px solid rgba(255,255,255,0.4)',
        borderTopColor: 'white',
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }}
    />
  );
}

// Inject keyframes once
if (typeof document !== 'undefined') {
  const id = '__cross-section-spin__';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }
button:hover:not(:disabled) { background: #2a5faa !important; box-shadow: 0 6px 12px rgba(0,0,0,0.35) !important; }`;
    document.head.appendChild(style);
  }
}
