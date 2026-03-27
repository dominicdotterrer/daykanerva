import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// SVG geometry constants
// ---------------------------------------------------------------------------
const SVG_SIZE = 500;
const CX = 250;
const CY = 250;
const R = 230;

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------
function toNorm(xSvg: number, ySvg: number): [number, number] {
  return [(xSvg - CX) / R, -((ySvg - CY) / R)];
}

function toSVG(xNorm: number, yNorm: number): [number, number] {
  return [xNorm * R + CX, -yNorm * R + CY];
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type Phase = 'placing' | 'scored' | 'error';

interface ScoreResult {
  score: number;
  num_points: number;
  player_triangle: [number, number][];
  optimal_triangle: [number, number][];
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
export default function HeilbronnGame() {
  const [points, setPoints] = useState<[number, number][]>([]);
  const [phase, setPhase] = useState<Phase>('placing');
  const [scoreResult, setScoreResult] = useState<ScoreResult | null>(null);
  const [isScoring, setIsScoring] = useState(false);
  const [pyodideReady, setPyodideReady] = useState(false);

  const pyodideRef = useRef<any>(null);

  // -------------------------------------------------------------------------
  // Load Pyodide + install package on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    async function initPyodide() {
      // Inject Pyodide script tag if not already present
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

      await pyodide.loadPackage(['micropip', 'numpy', 'scipy']);

      // Load the wheel from the same origin — works in both dev and production.
      const packageUrl = `${window.location.origin}/wheels/heilbronn_triangle_game-0.1.0-py3-none-any.whl`;

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
  // Disk click handler
  // -------------------------------------------------------------------------
  function handleDiskClick(e: React.MouseEvent<SVGCircleElement>) {
    if (phase !== 'placing') return;

    const svg = e.currentTarget.ownerSVGElement!;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const local = pt.matrixTransform(ctm.inverse());

    const [xNorm, yNorm] = toNorm(local.x, local.y);
    // Clamp to disk
    if (xNorm * xNorm + yNorm * yNorm > 1) return;

    setPoints((prev) => [...prev, [xNorm, yNorm]]);
  }

  // -------------------------------------------------------------------------
  // Score button handler
  // -------------------------------------------------------------------------
  async function handleScore() {
    if (points.length < 3) {
      setPhase('error');
      return;
    }

    setIsScoring(true);
    try {
      const pointsJson = JSON.stringify(points);
      const resultStr: string = await pyodideRef.current.runPythonAsync(`
from heilbronn_triangle_game import run_scoring
run_scoring('${pointsJson}', 'nelder-mead', '{}')
      `);
      const result: ScoreResult = JSON.parse(resultStr);
      setScoreResult(result);
      setPhase('scored');
    } catch (err) {
      console.error(err);
      setPhase('error');
    } finally {
      setIsScoring(false);
    }
  }

  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  function handleReset() {
    setPoints([]);
    setPhase('placing');
    setScoreResult(null);
  }

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------
  const playerTriangleSVG: [number, number][] | null =
    phase === 'scored' && scoreResult && scoreResult.player_triangle.length === 3
      ? (scoreResult.player_triangle.map(([x, y]) => toSVG(x, y)) as [number, number][])
      : null;

  const polygonPoints = playerTriangleSVG
    ? playerTriangleSVG.map(([x, y]) => `${x},${y}`).join(' ')
    : '';

  function scoreButtonLabel() {
    if (!pyodideReady) return 'Loading…';
    if (isScoring) return 'Scoring…';
    return 'Score';
  }

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      {/* Instructions */}
      <div style={{ maxWidth: SVG_SIZE, width: '100%', lineHeight: 1.6 }}>
        {phase === 'placing' && (
          <p>
            Click inside the disk to place points. Your score will be determined by the area of
            the smallest triangle formed by your points — try to spread them out to maximize it.
            The more points you place, the higher the difficulty.
          </p>
        )}
        {phase === 'error' && (
          <p>
            Please add at least 3 points. The more you add, the higher the difficulty level.
          </p>
        )}
        {phase === 'scored' && scoreResult && (
          <div>
            <p style={{ margin: '0 0 0.25rem' }}>
              <strong>Score:</strong> {Math.round(scoreResult.score * 100)}%
            </p>
            <p style={{ margin: 0 }}>
              <strong>Difficulty Level:</strong> {scoreResult.num_points}
            </p>
          </div>
        )}
      </div>

      {/* SVG canvas */}
      <svg
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        width={SVG_SIZE}
        height={SVG_SIZE}
        style={{ display: 'block', maxWidth: '100%' }}
      >
        <defs>
          <filter id="diskGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="12" floodColor="#4a90d9" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Background */}
        <rect width={SVG_SIZE} height={SVG_SIZE} fill="#0f1e3c" />

        {/* Clickable disk */}
        <circle
          cx={CX}
          cy={CY}
          r={R}
          fill="#1a3a6b"
          filter="url(#diskGlow)"
          style={{ cursor: phase === 'placing' ? 'crosshair' : 'default' }}
          onClick={handleDiskClick}
        />

        {/* Player's smallest triangle (below points layer) */}
        {playerTriangleSVG && (
          <polygon
            points={polygonPoints}
            fill="rgba(173,216,230,0.35)"
            stroke="white"
            strokeWidth={3}
          />
        )}

        {/* Points */}
        {points.map(([xNorm, yNorm], i) => {
          const [x, y] = toSVG(xNorm, yNorm);
          return <circle key={i} cx={x} cy={y} r={6} fill="white" />;
        })}
      </svg>

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
        {(phase === 'placing') && (
          <button
            onClick={handleScore}
            disabled={isScoring || !pyodideReady}
            style={buttonStyle(isScoring || !pyodideReady)}
          >
            {isScoring && <Spinner />}
            {scoreButtonLabel()}
          </button>
        )}

        {phase === 'scored' && (
          <>
            <button onClick={handleReset} style={buttonStyle(false)}>
              Reset
            </button>
            <button
              onClick={() => { window.location.href = '/heilbronn-learn'; }}
              style={buttonStyle(false)}
            >
              Learn
            </button>
          </>
        )}

        {phase === 'error' && (
          <button onClick={handleReset} style={buttonStyle(false)}>
            Reset
          </button>
        )}
      </div>
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
  const id = '__heilbronn-spin__';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `@keyframes spin { to { transform: rotate(360deg); } }
button:hover:not(:disabled) { background: #2a5faa !important; box-shadow: 0 6px 12px rgba(0,0,0,0.35) !important; }`;
    document.head.appendChild(style);
  }
}
