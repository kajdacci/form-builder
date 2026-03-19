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
import { chatStepToFlow } from "@/lib/flow-converter";
import { QuestionNode } from "@/components/flow/question-node";
import { AnswerNode } from "@/components/flow/answer-node";
import { MessageNode } from "@/components/flow/message-node";
import { ConditionNode } from "@/components/flow/condition-node";
import type { FormTemplate, ChatStepsV2, StepV2, StepNodeV2 } from "@/lib/types";

const nodeTypes = {
    question: QuestionNode,
    answer: AnswerNode,
    message: MessageNode,
    condition: ConditionNode,
};

const STEP_COLORS: Record<string, string> = {
    greeting: "#e0f2fe",
    verify_contact: "#fef3c7",
    card_naming: "#ede9fe",
    date_selection: "#dcfce7",
    device_detection: "#fce7f3",
    consents: "#f1f5f9",
};

export function FlowEditor() {
    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
    const [template, setTemplate] = useState<FormTemplate | null>(null);
    const [steps, setSteps] = useState<StepV2[]>([]);
    const [activeStepId, setActiveStepId] = useState<string | null>(null);
    const [selectedNodeData, setSelectedNodeData] = useState<{ node: StepNodeV2; stepId: string } | null>(null);
    const [translations, setTranslations] = useState<Record<string, string>>({});
    const [comments, setComments] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const [tplRes, transRes] = await Promise.all([
                    callEdge<{ templates: FormTemplate[] }>("form-template-list", {}),
                    callEdge<{ translations: Array<{ key: string; pl: string }> }>("translations-list", {}),
                ]);

                const trans: Record<string, string> = {};
                for (const t of transRes.translations ?? []) trans[t.key] = t.pl;
                setTranslations(trans);

                const chatTpl = (tplRes.templates ?? []).find((t: any) => t.steps?.format === "chat_steps");
                if (chatTpl) {
                    setTemplate(chatTpl);
                    setComments(chatTpl.actions?._comments ?? {});
                    const s = (chatTpl.steps as ChatStepsV2).steps;
                    setSteps(s);
                    if (s.length > 0) {
                        setActiveStepId(s[0].id);
                        loadStep(s[0], chatTpl, trans);
                    }
                }
            } catch (err) {
                console.error("Failed to load:", err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const loadStep = useCallback((step: StepV2, tpl?: FormTemplate, trans?: Record<string, string>) => {
        setSelectedNodeData(null);
        const t = tpl ?? template;
        const tr = trans ?? translations;
        if (!t) return;
        const { nodes: flowNodes, edges: flowEdges } = chatStepToFlow(step, t.actions, tr);
        // Mark nodes with comments
        const coms = t.actions?._comments ?? comments;
        for (const n of flowNodes) {
            const nodeId = n.data?.stepNode?.id ?? n.id;
            if (coms[nodeId]) {
                n.data = { ...n.data, hasComment: true, commentText: coms[nodeId] };
            }
        }
        setNodes(flowNodes);
        setEdges(flowEdges);
    }, [template, translations]);

    const selectStep = useCallback((stepId: string) => {
        setActiveStepId(stepId);
        const step = steps.find((s) => s.id === stepId);
        if (step) loadStep(step);
    }, [steps, loadStep]);

    const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
        if (node.data.stepNode) {
            setSelectedNodeData({ node: node.data.stepNode as StepNodeV2, stepId: node.data.stepId as string });
        }
    }, []);

    const activeStep = steps.find((s) => s.id === activeStepId);
    const activeStepAction = template?.actions?.steps?.[activeStepId ?? ""];
    const nextStep = steps.find((s) => s.id === activeStep?.next);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center">
                <p className="text-sm text-gray-400">Ładowanie...</p>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Top bar */}
            <div className="h-12 border-b border-gray-200 flex items-center justify-between px-4 bg-white shrink-0">
                <h1 className="text-sm font-bold text-gray-800">Form Builder</h1>
                <button
                    onClick={async () => {
                        if (!template) return;
                        setSaving(true);
                        try {
                            const newActions = { ...template.actions, _comments: comments };
                            await callEdge("form-template-upsert", { id: template.id, name: template.name, steps: template.steps, actions: newActions });
                            setTemplate({ ...template, actions: newActions });
                        } catch (err) { console.error("Save failed:", err); }
                        finally { setSaving(false); }
                    }}
                    disabled={saving}
                    className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                    {saving ? "Zapisuję..." : "Zapisz"}
                </button>
            </div>

            <div className="flex-1 flex min-h-0">
                {/* Left: step list */}
                <div className="w-56 border-r border-gray-200 bg-gray-50 flex flex-col shrink-0">
                    <div className="p-3 border-b border-gray-200">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kroki ({steps.length})</p>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {steps.map((step, i) => (
                            <button
                                key={step.id}
                                onClick={() => selectStep(step.id)}
                                className={`w-full text-left px-3 py-2.5 border-b border-gray-100 transition-colors ${
                                    activeStepId === step.id
                                        ? "bg-white border-l-3 border-l-blue-500"
                                        : "hover:bg-white"
                                }`}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-gray-600"
                                        style={{ background: STEP_COLORS[step.id] ?? "#f5f5f5" }}
                                    >
                                        {i + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-semibold text-gray-700 truncate">{step.name}</p>
                                        <div className="flex gap-1 mt-0.5">
                                            <span className="text-[9px] text-gray-400">{step.scope}</span>
                                            {step.repeatPerCard && (
                                                <span className="text-[9px] text-purple-500">per karta</span>
                                            )}
                                            <span className="text-[9px] text-gray-400">· {step.nodes.length} nodes</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Center: flow graph */}
                <div className="flex-1 flex flex-col">
                    {/* Step info bar */}
                    {activeStep && (
                        <div className="px-4 py-2 border-b border-gray-200 bg-white flex items-center justify-between shrink-0"
                            style={{ borderLeft: `4px solid ${STEP_COLORS[activeStep.id] ?? "#d1d5db"}` }}>
                            <div>
                                <h2 className="text-sm font-bold text-gray-800">{activeStep.name}</h2>
                                <p className="text-[10px] text-gray-400">
                                    {activeStep.nodes.length} nodes · {activeStep.scope}{activeStep.repeatPerCard ? " · powtarzany per karta" : ""}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Graph */}
                    <div className="flex-1">
                        <ReactFlow
                            nodes={nodes}
                            edges={edges}
                            nodeTypes={nodeTypes}
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
                                    if (node.type === "condition") return "#8b5cf6";
                                    if (node.type === "answer") return "#22c55e";
                                    if (node.type === "question") return "#3b82f6";
                                    return "#94a3b8";
                                }}
                                style={{ height: 100 }}
                            />
                        </ReactFlow>
                    </div>

                    {/* Bottom: step output */}
                    {activeStep && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Następny krok:</span>
                                    {nextStep ? (
                                        <button
                                            onClick={() => selectStep(nextStep.id)}
                                            className="text-xs font-semibold text-blue-600 hover:underline"
                                        >
                                            {nextStep.name} →
                                        </button>
                                    ) : (
                                        <span className="text-xs text-gray-400">koniec formularza</span>
                                    )}
                                </div>
                                {activeStepAction?.onComplete?.save && (
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase">Zapisuje:</span>
                                        {activeStepAction.onComplete.save.map((f: string) => (
                                            <span key={f} className="text-[10px] font-mono bg-green-50 text-green-700 px-1.5 py-0.5 rounded">
                                                {f}
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: node detail */}
                <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-hidden">
                    {selectedNodeData ? (
                        <NodeDetailPanel
                            node={selectedNodeData.node}
                            stepId={selectedNodeData.stepId}
                            translations={translations}
                            actions={template?.actions}
                            comment={comments[selectedNodeData.node.id] ?? ""}
                            onCommentChange={(text) => setComments((prev) => ({ ...prev, [selectedNodeData.node.id]: text }))}
                            onClose={() => setSelectedNodeData(null)}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center p-4">
                            <p className="text-xs text-gray-400 text-center">Kliknij node na grafie</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function NodeDetailPanel({ node, stepId: _stepId, translations, actions, comment, onCommentChange, onClose }: {
    node: StepNodeV2;
    stepId: string;
    translations: Record<string, string>;
    actions?: any;
    comment: string;
    onCommentChange: (text: string) => void;
    onClose: () => void;
}) {
    const t = (key: string) => translations[key] ?? key;
    const nodeAction = actions?.nodes?.[node.id];

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-xs font-bold text-gray-800 font-mono">{node.id}</h3>
                    <div className="flex gap-1 mt-1 flex-wrap">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                            node.type === "input" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-600"
                        }`}>{node.type}</span>
                        {node.component && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 font-medium">{node.component}</span>
                        )}
                        {nodeAction && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-medium">⚡ action</span>
                        )}
                    </div>
                </div>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {node.content && (
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Treść</label>
                        <p className="text-[9px] font-mono text-gray-400 mt-0.5">{node.content}</p>
                        <div className="mt-1 p-2 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-wrap">{t(node.content)}</div>
                    </div>
                )}

                {node.field && (
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Pole</label>
                        <p className="text-xs font-mono text-gray-800 mt-0.5">{node.field}</p>
                    </div>
                )}

                {node.options && (
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Opcje ({node.options.length})</label>
                        <div className="mt-1 space-y-1">
                            {node.options.map((opt, i) => (
                                <div key={i} className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-xs">
                                    <p className="text-gray-800">{t(opt)}</p>
                                    <p className="text-[9px] font-mono text-gray-400">{opt}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {node.branches && node.branches.length > 0 && (
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Branches ({node.branches.length})</label>
                        <div className="mt-1 space-y-1">
                            {node.branches.map((b, i) => (
                                <div key={i} className="p-1.5 bg-gray-50 border border-gray-200 rounded">
                                    <p className="text-[10px] text-gray-600">{t(b.answer)}</p>
                                    <p className="text-[10px] text-gray-800 mt-0.5">→ <span className="font-mono font-medium">{b.next}</span></p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {node.next && (
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Next</label>
                        <p className="text-xs font-mono text-gray-800 mt-0.5">→ {node.next}</p>
                    </div>
                )}

                {nodeAction && (
                    <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Akcje</label>
                        <pre className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded text-[9px] font-mono text-amber-800 overflow-x-auto">
                            {JSON.stringify(nodeAction, null, 2)}
                        </pre>
                    </div>
                )}

                {/* Comment */}
                <div className="mt-2 pt-3 border-t border-gray-200">
                    <label className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Komentarz / uwagi</label>
                    <textarea
                        value={comment}
                        onChange={(e) => onCommentChange(e.target.value)}
                        rows={3}
                        placeholder="Wpisz uwagi do tego node'a..."
                        className="mt-1 w-full text-xs border border-amber-200 rounded p-2 bg-amber-50 focus:ring-1 focus:ring-amber-400 focus:border-amber-400 resize-none"
                    />
                    <p className="text-[8px] text-gray-400 mt-1">Kliknij "Zapisz" na górze żeby zachować komentarze</p>
                </div>
            </div>
        </div>
    );
}
