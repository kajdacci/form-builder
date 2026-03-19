import { useCallback, useEffect, useMemo, useState } from "react";
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
import { chatStepsToFlow } from "@/lib/flow-converter";
import { QuestionNode } from "@/components/flow/question-node";
import { AnswerNode } from "@/components/flow/answer-node";
import { MessageNode } from "@/components/flow/message-node";
import { StepHeaderNode } from "@/components/flow/step-header-node";
import type { FormTemplate, ChatStepsV2, StepNodeV2 } from "@/lib/types";

const nodeTypes = {
    question: QuestionNode,
    answer: AnswerNode,
    message: MessageNode,
    stepHeader: StepHeaderNode,
};

export function FlowEditor() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [templates, setTemplates] = useState<FormTemplate[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
    const [selectedNodeData, setSelectedNodeData] = useState<{ node: StepNodeV2; stepId: string } | null>(null);
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);

    // Load templates + translations
    useEffect(() => {
        (async () => {
            try {
                const [tplRes, transRes] = await Promise.all([
                    callEdge<{ templates: FormTemplate[] }>("form-template-list", {}),
                    callEdge<{ translations: Array<{ key: string; pl: string }> }>("translations-list", {}),
                ]);

                const trans: Record<string, string> = {};
                for (const t of transRes.translations ?? []) {
                    trans[t.key] = t.pl;
                }
                setTranslations(trans);

                const chatTemplates = (tplRes.templates ?? []).filter(
                    (t: any) => t.steps?.format === "chat_steps" || t.steps?.format === "chat_tree"
                );
                setTemplates(chatTemplates);
                if (chatTemplates.length > 0) {
                    loadTemplate(chatTemplates[0], trans);
                }
            } catch (err) {
                console.error("Failed to load:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const loadTemplate = useCallback((template: FormTemplate, trans?: Record<string, string>) => {
        setSelectedTemplate(template);
        setSelectedNodeData(null);

        if (template.steps.format === "chat_steps") {
            const { nodes: flowNodes, edges: flowEdges } = chatStepsToFlow(
                template.steps as ChatStepsV2,
                template.actions,
                trans ?? translations,
            );
            setNodes(flowNodes);
            setEdges(flowEdges);
        }
    }, [translations]);

    const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
        if (node.data.stepNode) {
            setSelectedNodeData({ node: node.data.stepNode as StepNodeV2, stepId: node.data.stepId as string });
        }
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
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-bg-secondary text-fg-secondary border-border"
                            }`}
                        >
                            {t.name} ({t.steps.format})
                        </button>
                    ))}
                    <span className="text-xs text-fg-quaternary ml-2">
                        {nodes.length} nodes · {edges.length} edges
                    </span>
                </div>
                <button className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
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
                        nodeTypes={nodeTypes}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onNodeClick={onNodeClick}
                        fitView
                        minZoom={0.05}
                        maxZoom={2}
                    >
                        <Background gap={20} />
                        <Controls />
                        <MiniMap
                            nodeColor={(node) => {
                                if (node.type === "group") return "#d1d5db";
                                const t = node.data?.nodeType;
                                return t === "input" ? "#3b82f6" : "#94a3b8";
                            }}
                            style={{ height: 120 }}
                        />
                    </ReactFlow>
                </div>

                {/* Side panel */}
                <div className="w-96 border-l border-border bg-bg-primary flex flex-col shrink-0 overflow-hidden">
                    {selectedNodeData ? (
                        <NodeDetailPanel
                            node={selectedNodeData.node}
                            stepId={selectedNodeData.stepId}
                            translations={translations}
                            actions={selectedTemplate?.actions}
                            onClose={() => setSelectedNodeData(null)}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-6">
                            <div className="text-center space-y-2">
                                <p className="text-sm text-fg-quaternary">Kliknij node na grafie</p>
                                <p className="text-xs text-fg-disabled">Grupy (kolorowe) = stepy formularza<br />Boxy wewnątrz = poszczególne pytania/wiadomości</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function NodeDetailPanel({ node, stepId, translations, actions, onClose }: {
    node: StepNodeV2;
    stepId: string;
    translations: Record<string, string>;
    actions?: any;
    onClose: () => void;
}) {
    const t = (key: string) => translations[key] ?? key;
    const nodeAction = actions?.nodes?.[node.id];

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-border flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-sm font-semibold text-fg-primary font-mono">{node.id}</h3>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                            step: {stepId}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            node.type === "input" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        }`}>
                            {node.type}
                        </span>
                        {node.component && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">
                                {node.component}
                            </span>
                        )}
                        {nodeAction && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">
                                has action
                            </span>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="text-fg-quaternary hover:text-fg-primary text-lg">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* i18n Content */}
                {node.content && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">Treść</label>
                        <p className="mt-1 text-[10px] font-mono text-fg-disabled">{node.content}</p>
                        <div className="mt-1 p-3 bg-bg-secondary rounded-lg text-sm text-fg-secondary whitespace-pre-wrap">
                            {t(node.content)}
                        </div>
                    </div>
                )}

                {/* Field */}
                {node.field && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">Pole</label>
                        <p className="mt-1 text-sm font-mono text-fg-primary">{node.field}</p>
                    </div>
                )}

                {/* Options */}
                {node.options && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">
                            Opcje ({node.options.length})
                        </label>
                        <div className="mt-2 space-y-1.5">
                            {node.options.map((opt, i) => (
                                <div key={i} className="px-3 py-2 bg-bg-secondary border border-border rounded-lg">
                                    <p className="text-sm text-fg-primary">{t(opt)}</p>
                                    <p className="text-[10px] font-mono text-fg-disabled mt-0.5">{opt}</p>
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
                                    <p className="text-xs text-fg-secondary">{t(b.answer)}</p>
                                    <p className="text-[10px] font-mono text-fg-disabled">{b.answer}</p>
                                    <p className="text-sm text-fg-primary mt-1">→ <span className="font-mono font-medium">{b.next}</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Next */}
                {node.next && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">Next</label>
                        <p className="mt-1 text-sm font-mono text-fg-primary">→ {node.next}</p>
                    </div>
                )}

                {/* Action */}
                {nodeAction && (
                    <div>
                        <label className="text-xs font-semibold text-fg-quaternary uppercase tracking-wider">Akcje</label>
                        <pre className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-mono text-amber-800 overflow-x-auto">
                            {JSON.stringify(nodeAction, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
}
