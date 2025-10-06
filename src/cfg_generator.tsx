import React, { useState } from "react";
import { Play, FileCode } from "lucide-react";

interface CFGNode {
  id: number;
  lines: string[];
  type: string;
  label?: string;
}

interface CFGEdge {
  from_node?: number;
  to_node?: number;
  from?: number;
  to?: number;
  label: string;
  color: string;
}

interface CFG {
  nodes: CFGNode[];
  edges: CFGEdge[];
}

const CFGGenerator: React.FC = () => {
  const [cCode, setCCode] = useState<string>(`// Simple Embedded Temperature Controller
int checkTemperature(int temp, int threshold) {
    int status = 0;
    
    if (temp < 0) {
        status = -1;  // Error: Invalid temperature
        return status;
    }
    
    if (temp > threshold) {
        status = 2;  // Critical: Overheating
    } else if (temp > threshold - 10) {
        status = 1;  // Warning: Getting hot
    } else {
        status = 0;  // Normal operation
    }
    
    return status;
}`);
  const [cfg, setCfg] = useState<CFG | null>(null);
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Normalize edges from backend to frontend shape
  const normalizeEdges = (edges: any[]): CFGEdge[] => {
    return edges.map((e) => ({
      from: e.from_node ?? e.from,
      to: e.to_node ?? e.to,
      label: e.label ?? "",
      color: e.color ?? "#6b7280",
    }));
  };

  const generateCFG = async () => {
    setError("");
    setLoading(true);
    setCfg(null);

    try {
      const response = await fetch("https://swe-api-15ov.onrender.com/generate-cfg", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ c_code: cCode }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API error: ${response.status} ${errText}`);
      }

      const data = await response.json();

      const nodes: CFGNode[] = (data.nodes || []).map((n: any) => ({
        id: n.id,
        lines: n.lines || [],
        type: n.type,
        label: n.label,
      }));

      const edges = normalizeEdges(data.edges || []);

      setCfg({ nodes, edges });
    } catch (err: any) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-extrabold tracking-tight mb-4">
            Search-based Test Generation and Fault Localization for Embedded Systems
          </h1>
          <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
            <FileCode className="w-10 h-10 text-blue-400" />
            CFG Generator for Embedded C
          </h2>
          <p className="text-slate-300">Send code to backend to generate CFG</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Code Input */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">C Code Input</h2>
            <textarea
              value={cCode}
              onChange={(e) => setCCode(e.target.value)}
              className="w-full h-96 bg-slate-900 text-green-400 font-mono text-sm p-4 rounded border border-slate-600 focus:border-blue-500 focus:outline-none"
              placeholder="Enter your C code here..."
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={generateCFG}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition"
              >
                <Play className="w-4 h-4" />
                {loading ? "Generating..." : "Generate CFG"}
              </button>
              
            </div>
            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-600 rounded p-3 text-red-200">{error}</div>
            )}
          </div>

          {/* CFG Visualization */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Control Flow Graph</h2>
            {cfg ? (
              <div className="bg-slate-900 rounded p-4 overflow-auto h-96 border border-slate-700">
                <svg width="500" height={Math.max(600, cfg.nodes.length * 100)} style={{ minWidth: "500px" }}>
                  {/* Draw edges first (so they appear behind nodes) */}
                  {cfg.edges.map((edge, idx) => {
                    const fromIdx = cfg.nodes.findIndex((n) => n.id === (edge.from ?? edge.from_node));
                    const toIdx = cfg.nodes.findIndex((n) => n.id === (edge.to ?? edge.to_node));

                    const isFalse = edge.label === "False";

                    // True edge - straight down
                    let x1 = 250;
                    let y1 = 50 + fromIdx * 100 + 25;
                    let x2 = 250;
                    let y2 = 50 + toIdx * 100 - 25;

                    // False edge - curve to the right and down
                    if (isFalse) {
                      const controlX = 380;
                      const controlY1 = y1 + 30;
                      const controlY2 = y2 - 30;

                      return (
                        <g key={idx}>
                          <path
                            d={`M ${x1} ${y1} C ${controlX} ${controlY1}, ${controlX} ${controlY2}, ${x2} ${y2}`}
                            stroke={edge.color}
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead-red)"
                          />
                          <text x={controlX + 10} y={(y1 + y2) / 2} fill={edge.color} fontSize="11" fontWeight="bold">
                            {edge.label}
                          </text>
                        </g>
                      );
                    }
                    // True edge or regular edge
                    return (
                      <g key={idx}>
                        <line
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke={edge.color}
                          strokeWidth="2"
                          markerEnd={edge.color === "#22c55e" ? "url(#arrowhead-green)" : "url(#arrowhead-gray)"}
                        />
                        {edge.label && (
                          <text x={x1 + 15} y={(y1 + y2) / 2} fill={edge.color} fontSize="11" fontWeight="bold">
                            {edge.label}
                          </text>
                        )}
                      </g>
                    );
                  })}

                  {/* Draw nodes on top */}
                  {cfg.nodes.map((node, idx) => {
                    const y = 50 + idx * 100;
                    const x = 250;
                    const isDecision = node.type === "decision";
                    const isExit = node.type === "exit" || node.type === "entry";

                    return (
                      <g key={node.id}>
                        {isDecision ? (
                          <>
                            <polygon
                              points={`${x},${y - 30} ${x + 70},${y} ${x},${y + 30} ${x - 70},${y}`}
                              fill="#1e293b"
                              stroke="#3b82f6"
                              strokeWidth="2"
                            />
                            <text x={x} y={y + 5} textAnchor="middle" fill="#94a3b8" fontSize="11">
                              {node.label?.substring(0, 15) || "Decision"}
                            </text>
                          </>
                        ) : isExit ? (
                          <>
                            <ellipse cx={x} cy={y} rx="60" ry="28" fill="#1e293b" stroke="#22c55e" strokeWidth="2" />
                            <text x={x} y={y + 5} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                              {node.label || "Node"}
                            </text>
                          </>
                        ) : (
                          <>
                            <rect x={x - 70} y={y - 25} width="140" height="50" rx="5" fill="#1e293b" stroke="#8b5cf6" strokeWidth="2" />
                            <text x={x} y={y} textAnchor="middle" fill="#94a3b8" fontSize="10">
                              {node.lines[0]?.substring(0, 22) || "Statement"}
                            </text>
                            {node.lines[1] && (
                              <text x={x} y={y + 12} textAnchor="middle" fill="#94a3b8" fontSize="10">
                                {node.lines[1].substring(0, 22)}
                              </text>
                            )}
                          </>
                        )}
                        <text x={x - 90} y={y + 5} fill="#64748b" fontSize="11" fontWeight="bold">
                          N{node.id}
                        </text>
                      </g>
                    );
                  })}

                  <defs>
                    <marker id="arrowhead-gray" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
                    </marker>
                    <marker id="arrowhead-green" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#22c55e" />
                    </marker>
                    <marker id="arrowhead-red" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#ef4444" />
                    </marker>
                  </defs>
                </svg>
              </div>
            ) : (
              <div className="bg-slate-900 rounded p-4 h-96 flex items-center justify-center text-slate-500">
                Click "Generate CFG" to visualize the control flow graph
              </div>
            )}

            {cfg && (
              <div className="mt-4 text-sm text-slate-400">
                <p>
                  <strong>Nodes:</strong> {cfg.nodes.length}
                </p>
                <p>
                  <strong>Edges:</strong> {cfg.edges.length}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CFG Details */
        }
        {cfg && (
          <div className="mt-6 bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">CFG Node Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cfg.nodes.map((node) => (
                <div key={node.id} className="bg-slate-900 rounded p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-400 font-mono font-bold">Node {node.id}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        node.type === "decision"
                          ? "bg-yellow-900 text-yellow-200"
                          : node.type === "exit"
                          ? "bg-green-900 text-green-200"
                          : node.type === "entry"
                          ? "bg-purple-900 text-purple-200"
                          : "bg-blue-900 text-blue-200"
                      }`}
                    >
                      {node.type}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 font-mono">
                    {node.lines.map((line, idx) => (
                      <div key={idx} className="truncate">
                        {line}
                      </div>
                    ))}
                    {node.label && node.lines.length === 0 && <div>{node.label}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generated Test Cases - empty section */}
        <div className="mt-6 bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Generated Test Cases</h2>
          <div className="bg-slate-900 rounded p-4 border border-slate-700 min-h-[120px]"></div>
        </div>

        {/* Faulty Lines Detected - labeled section with no data */}
        <div className="mt-6 bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Faulty Lines Detected</h2>
          <div className="bg-slate-900 rounded p-4 border border-slate-700 min-h-[80px]"></div>
        </div>
      </div>
    </div>
  );
};

export default CFGGenerator;
