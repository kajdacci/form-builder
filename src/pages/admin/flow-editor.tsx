import { useCallback, useEffect, useState } from "react";
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    type Node,
    type Edge,
    type NodeMouseHandler,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { callEdge } from "@/lib/api";
import { chatTreeToFlow } from "@/lib/flow-converter";
import type { FormTemplate, ChatNodeV1 } from "@/lib/types";

export function FlowEditor() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
    const [selectedNode, setSelectedNode] = useState<ChatNodeV1 | null>(null);
    const [loading, setLoading] = useState(true);

    // Load templates
    useEffect(() => {
        (async () => {
            try {
                const res = await callEdge<{ templates: FormTemplate[] }>("form-template-list", {});
                const chatTemplates = (res.templates ?? []).filter(
                    (t: any) => t.steps?.format === "chat_tree"
                );
                setTemplates(chatTemplates);
                if (chatTemplates.length > 0) {
                    loadTemplate(chatTemplates[0]);
                }
            } catch (err) {
                console.error("Failed to load templates:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const loadTemplate = useCallback((template: FormTemplate) => {
        setSelectedTemplate(template);
        setSelectedNode(null);
        const { nodes: flowNodes, edges: flowEdges } = chatTreeToFlow(template.steps);
        setNodes(flowNodes);
        setEdges(flowEdges);
    }, []);

    const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
        setSelectedNode(node.data.chatNode as ChatNodeV1);
    }, []);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <p className="text-sm text-fg-quaternary">Ładowanie...</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Top bar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-bg-primary shrink-0">
                <div className="flex items-center gap-3">
                    <h1 className="text-md font-semibold text-fg-primary">Form Builder</h1>
                    {templates.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => loadTemplate(t)}
                            className={`px-3 py-1 text-xs rounded-full border ${
                                selectedTemplate?.id === t.id
                                    ? "bg-bg-brand-primary text-fg-brand-primary border-border-brand"
                                    : "bg-bg-secondary text-fg-secondary border-border"
                            }`}
                        >
                            {t.name}
                        </button>
                    ))}
                    <span className="text-xs text-fg-quaternary">
                        {nodes.length} nodes · {edges.length} edges
                    </span>
                </div>
                <button className="px-3 py-1.5 text-sm bg-bg-brand-solid text-fg-white rounded-lg hover:bg-bg-brand-solid_hover">
                    Zapisz
                </button>
            </div>

            {/* Main */}
            <div className="flex-1 flex min-h-0">
                {/* Flow canvas */}
                <div className="flex-1">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        fitView
                        minZoom={0.1}
                        maxZoom={2}
                    >
                        <Background gap={20} />
                        <Controls />
                        <MiniMap
                            nodeColor={(node) => {
                                const t = node.data?.nodeType;
                                return t === "input" ? "#3b82f6" : "#94a3b8";
                            }}
                            style={{ height: 100 }}
                        />
                    </ReactFlow>
                </div>

                {/* Side panel */}
                <div className="w-96 border-l border-border bg-bg-primary flex flex-col shrink-0 overflow-hidden">
                    {selectedNode ? (
                        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-4">
                            <p className="text-sm text-fg-quaternary text-center">
                                Kliknij node na grafie żeby zobaczyć szczegóły
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function NodeDetailPanel({ node, onClose }: { node: ChatNodeV1; onClose: () => void }) {
    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-sm font-semibold text-fg-primary font-mono">{node.id}</h3>
                    <div className="flex gap-2 mt-1">
                        <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                node.type === "input"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-600"
                            }`}
                        >
                            {node.type}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                            {node.scope}
                        </span>
                        {node.component && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                {node.component}
                            </span>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="text-fg-quaternary hover:text-fg-primary text-lg">
                    ×
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Content */}
                {node.content && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">
                            Treść
                        </label>
                        <div className="mt-1 p-3 bg-bg-secondary rounded-lg text-sm text-fg-secondary whitespace-pre-wrap">
                            {node.content}
                        </div>
                    </div>
                )}

                {/* Field */}
                {node.field && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">
                            Pole
                        </label>
                        <p className="mt-1 text-sm font-mono text-fg-primary">{node.field}</p>
                    </div>
                )}

                {/* Options (buttons) */}
                {node.config?.options && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">
                            Opcje ({node.config.options.length})
                        </label>
                        <div className="mt-2 space-y-1.5">
                            {node.config.options.map((opt: string, i: number) => (
                                <div
                                    key={i}
                                    className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-fg-primary"
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Branches */}
                {node.branches && node.branches.length > 0 && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">
                            Branches ({node.branches.length})
                        </label>
                        <div className="mt-2 space-y-2">
                            {node.branches.map((b, i) => (
                                <div key={i} className="p-2 bg-bg-secondary border border-border rounded-lg">
                                    <p className="text-xs text-fg-quaternary font-mono">{b.condition}</p>
                                    <p className="text-sm text-fg-primary mt-1">
                                        → <span className="font-mono font-medium">{b.next}</span>
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Next */}
                {node.next && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">
                            Next
                        </label>
                        <p className="mt-1 text-sm font-mono text-fg-primary">→ {node.next}</p>
                    </div>
                )}

                {/* Action */}
                {node.action && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">
                            Akcja
                        </label>
                        <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-xs font-mono text-amber-800">{node.action.endpoint}</p>
                            {node.action.params && (
                                <pre className="text-[10px] text-amber-600 mt-1">
                                    {JSON.stringify(node.action.params, null, 2)}
                                </pre>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
