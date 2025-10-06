import { useState } from 'react';
import { Play, Download, FileCode } from 'lucide-react';

const CFGGenerator = () => {
  const [cCode, setCCode] = useState(`// Simple Embedded Temperature Controller
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

  interface CFGNode {
    id: number;
    lines: string[];
    type: string;
    label?: string;
  }

  interface CFGEdge {
    from: number;
    to: number;
    label: string;
    color: string;
  }

  interface CFG {
    nodes: CFGNode[];
    edges: CFGEdge[];
  }

  const [cfg, setCfg] = useState<CFG | null>(null);
  const [error, setError] = useState('');

  const generateCFG = () => {
    try {
      setError('');
      
      // Simple CFG generation logic
      const lines = cCode.split('\n').filter(line => line.trim() !== '');
      let nodeId = 0;
      
      // Parse the code to identify control structures
      const blocks: CFGNode[] = [];
      let currentBlock: CFGNode = { id: nodeId++, lines: [], type: 'entry', label: 'START' };
      
      lines.forEach((line) => {
        const trimmed = line.trim();
        
        // Skip comments and braces
        if (trimmed.startsWith('//') || trimmed === '{' || trimmed === '}') {
          return;
        }
        
        // Function declaration
        if (trimmed.includes('int checkTemperature')) {
          currentBlock.lines.push(trimmed);
          return;
        }
        
        // Variable declarations
        if (trimmed.startsWith('int ') && !trimmed.includes('if')) {
          currentBlock.lines.push(trimmed);
          return;
        }
        
        // If statements - create decision nodes
        if (trimmed.startsWith('if')) {
          if (currentBlock.lines.length > 0) {
            blocks.push(currentBlock);
            currentBlock = { id: nodeId++, lines: [], type: 'statement' };
          }
          
          const condition = trimmed.match(/if\s*\((.*?)\)/)?.[1] || trimmed;
          blocks.push({
            id: nodeId++,
            lines: [condition],
            type: 'decision',
            label: condition
          });
          currentBlock = { id: nodeId++, lines: [], type: 'statement' };
        }
        // Else if
        else if (trimmed.startsWith('} else if')) {
          if (currentBlock.lines.length > 0) {
            blocks.push(currentBlock);
          }
          const condition = trimmed.match(/else if\s*\((.*?)\)/)?.[1] || trimmed;
          blocks.push({
            id: nodeId++,
            lines: [condition],
            type: 'decision',
            label: condition
          });
          currentBlock = { id: nodeId++, lines: [], type: 'statement' };
        }
        // Else
        else if (trimmed.startsWith('} else')) {
          if (currentBlock.lines.length > 0) {
            blocks.push(currentBlock);
          }
          currentBlock = { id: nodeId++, lines: [], type: 'statement' };
        }
        // Return statements
        else if (trimmed.includes('return')) {
          currentBlock.lines.push(trimmed);
          blocks.push(currentBlock);
          blocks.push({ id: nodeId++, lines: [], type: 'exit', label: 'EXIT' });
          currentBlock = { id: nodeId++, lines: [], type: 'statement' };
        }
        // Regular statements
        else if (trimmed.endsWith(';')) {
          currentBlock.lines.push(trimmed);
        }
      });
      
      if (currentBlock.lines.length > 0) {
        blocks.push(currentBlock);
      }
      
      // Add final exit node if not present
      if (blocks[blocks.length - 1]?.type !== 'exit') {
        blocks.push({ id: nodeId++, lines: [], type: 'exit', label: 'EXIT' });
      }
      
      // Create edges based on control flow
      const cfgEdges: CFGEdge[] = [];
      for (let i = 0; i < blocks.length - 1; i++) {
        const current = blocks[i];
        const next = blocks[i + 1];
        
        if (current.type === 'decision') {
          cfgEdges.push({
            from: current.id,
            to: next.id,
            label: 'True',
            color: '#22c55e'
          });
          
          // Find false branch (next decision or statement after true branch)
          let falseTarget = i + 2;
          while (falseTarget < blocks.length && blocks[falseTarget].type !== 'decision' && blocks[falseTarget].type !== 'exit') {
            falseTarget++;
          }
          if (falseTarget < blocks.length) {
            cfgEdges.push({
              from: current.id,
              to: blocks[falseTarget].id,
              label: 'False',
              color: '#ef4444'
            });
          }
        } else if (current.type !== 'exit') {
          cfgEdges.push({
            from: current.id,
            to: next.id,
            label: '',
            color: '#6b7280'
          });
        }
      }
      
      setCfg({ nodes: blocks, edges: cfgEdges });
      
    } catch (err) {
      setError('Error generating CFG: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const downloadCFG = () => {
    if (!cfg) return;
    
    let dot = 'digraph CFG {\n';
    dot += '  node [shape=box, style=rounded];\n';
    dot += '  rankdir=TB;\n\n';
    
    cfg.nodes.forEach(node => {
      const shape = node.type === 'decision' ? 'diamond' : 
                    node.type === 'exit' ? 'ellipse' :
                    node.type === 'entry' ? 'ellipse' : 'box';
      const label = node.label || node.lines.join('\\n');
      dot += `  node${node.id} [label="${label}", shape=${shape}];\n`;
    });
    
    dot += '\n';
    
    cfg.edges.forEach(edge => {
      dot += `  node${edge.from} -> node${edge.to}`;
      if (edge.label) {
        dot += ` [label="${edge.label}"]`;
      }
      dot += ';\n';
    });
    
    dot += '}';
    
    const blob = new Blob([dot], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cfg.dot';
    a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <FileCode className="w-10 h-10 text-blue-400" />
            CFG Generator for Embedded C
          </h1>
          <p className="text-slate-300">Parse C code and visualize Control Flow Graph</p>
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
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition"
              >
                <Play className="w-4 h-4" />
                Generate CFG
              </button>
              {cfg && (
                <button
                  onClick={downloadCFG}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-6 py-2 rounded-lg font-medium transition"
                >
                  <Download className="w-4 h-4" />
                  Download DOT
                </button>
              )}
            </div>
            {error && (
              <div className="mt-4 bg-red-900/50 border border-red-600 rounded p-3 text-red-200">
                {error}
              </div>
            )}
          </div>

          {/* CFG Visualization */}
          <div className="bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">Control Flow Graph</h2>
            {cfg ? (
              <div className="bg-slate-900 rounded p-4 overflow-auto h-96 border border-slate-700">
                <svg width="500" height={Math.max(600, cfg.nodes.length * 100)} style={{ minWidth: '500px' }}>
                  {/* Draw edges first (so they appear behind nodes) */}
                  {cfg.edges.map((edge, idx) => {
                    const fromIdx = cfg.nodes.findIndex(n => n.id === edge.from);
                    const toIdx = cfg.nodes.findIndex(n => n.id === edge.to);
                    
                    const isFalse = edge.label === 'False';
                    
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
                          <text
                            x={controlX + 10}
                            y={(y1 + y2) / 2}
                            fill={edge.color}
                            fontSize="11"
                            fontWeight="bold"
                          >
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
                          markerEnd={edge.color === '#22c55e' ? 'url(#arrowhead-green)' : 'url(#arrowhead-gray)'}
                        />
                        {edge.label && (
                          <text
                            x={x1 + 15}
                            y={(y1 + y2) / 2}
                            fill={edge.color}
                            fontSize="11"
                            fontWeight="bold"
                          >
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
                    const isDecision = node.type === 'decision';
                    const isExit = node.type === 'exit' || node.type === 'entry';
                    
                    return (
                      <g key={node.id}>
                        {isDecision ? (
                          <>
                            <polygon
                              points={`${x},${y-30} ${x+70},${y} ${x},${y+30} ${x-70},${y}`}
                              fill="#1e293b"
                              stroke="#3b82f6"
                              strokeWidth="2"
                            />
                            <text x={x} y={y+5} textAnchor="middle" fill="#94a3b8" fontSize="11">
                              {node.label?.substring(0, 15) || 'Decision'}
                            </text>
                          </>
                        ) : isExit ? (
                          <>
                            <ellipse
                              cx={x}
                              cy={y}
                              rx="60"
                              ry="28"
                              fill="#1e293b"
                              stroke="#22c55e"
                              strokeWidth="2"
                            />
                            <text x={x} y={y+5} textAnchor="middle" fill="#94a3b8" fontSize="12" fontWeight="bold">
                              {node.label || 'Node'}
                            </text>
                          </>
                        ) : (
                          <>
                            <rect
                              x={x-70}
                              y={y-25}
                              width="140"
                              height="50"
                              rx="5"
                              fill="#1e293b"
                              stroke="#8b5cf6"
                              strokeWidth="2"
                            />
                            <text x={x} y={y} textAnchor="middle" fill="#94a3b8" fontSize="10">
                              {node.lines[0]?.substring(0, 22) || 'Statement'}
                            </text>
                            {node.lines[1] && (
                              <text x={x} y={y+12} textAnchor="middle" fill="#94a3b8" fontSize="10">
                                {node.lines[1].substring(0, 22)}
                              </text>
                            )}
                          </>
                        )}
                        <text x={x-90} y={y+5} fill="#64748b" fontSize="11" fontWeight="bold">
                          N{node.id}
                        </text>
                      </g>
                    );
                  })}
                  
                  <defs>
                    <marker
                      id="arrowhead-gray"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
                    </marker>
                    <marker
                      id="arrowhead-green"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
                      <polygon points="0 0, 10 3, 0 6" fill="#22c55e" />
                    </marker>
                    <marker
                      id="arrowhead-red"
                      markerWidth="10"
                      markerHeight="10"
                      refX="9"
                      refY="3"
                      orient="auto"
                    >
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
                <p><strong>Nodes:</strong> {cfg.nodes.length}</p>
                <p><strong>Edges:</strong> {cfg.edges.length}</p>
                <p className="mt-2 text-xs">
                  💡 Download the DOT file and visualize with Graphviz for a better layout
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CFG Details */}
        {cfg && (
          <div className="mt-6 bg-slate-800 rounded-lg p-6 shadow-xl border border-slate-700">
            <h2 className="text-xl font-semibold mb-4 text-blue-400">CFG Node Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cfg.nodes.map(node => (
                <div key={node.id} className="bg-slate-900 rounded p-4 border border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-blue-400 font-mono font-bold">Node {node.id}</span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      node.type === 'decision' ? 'bg-yellow-900 text-yellow-200' :
                      node.type === 'exit' ? 'bg-green-900 text-green-200' :
                      node.type === 'entry' ? 'bg-purple-900 text-purple-200' :
                      'bg-blue-900 text-blue-200'
                    }`}>
                      {node.type}
                    </span>
                  </div>
                  <div className="text-sm text-slate-300 font-mono">
                    {node.lines.map((line, idx) => (
                      <div key={idx} className="truncate">{line}</div>
                    ))}
                    {node.label && node.lines.length === 0 && (
                      <div>{node.label}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CFGGenerator;