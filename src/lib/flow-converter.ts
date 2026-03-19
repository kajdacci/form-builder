import Dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { ChatStepsV2, ActionsConfig } from "./types";

const STEP_COLORS: Record<string, string> = {
    greeting: "#e0f2fe",
    verify_contact: "#fef3c7",
    card_naming: "#ede9fe",
    date_selection: "#dcfce7",
    device_detection: "#fce7f3",
    consents: "#f1f5f9",
};

export function chatStepsToFlow(
    template: ChatStepsV2,
    actions?: ActionsConfig,
    translations?: Record<string, string>,
): { nodes: Node[]; edges: Edge[] } {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const t = (key: string) => translations?.[key] ?? key;

    let globalOffsetY = 0;

    for (let si = 0; si < template.steps.length; si++) {
        const step = template.steps[si];
        const color = STEP_COLORS[step.id] ?? "#f5f5f5";

        // Step header
        const stepLabelId = `step_${step.id}`;
        allNodes.push({
            id: stepLabelId,
            type: "stepHeader",
            position: { x: 0, y: globalOffsetY },
            draggable: false,
            selectable: true,
            data: {
                label: `${si + 1}. ${step.name}`,
                color,
                scope: step.scope,
                repeatPerCard: step.repeatPerCard,
                stepId: step.id,
            },
        });

        // Build dagre graph for this step
        const g = new Dagre.graphlib.Graph();
        g.setGraph({ rankdir: "TB", nodesep: 30, ranksep: 60 });
        g.setDefaultEdgeLabel(() => ({}));

        const stepNodes: Node[] = [];
        const stepEdges: Edge[] = [];

        for (const node of step.nodes) {
            const fullId = `${step.id}__${node.id}`;
            const isInput = node.type === "input";
            const isButtons = node.component === "buttons" && node.branches && node.branches.length > 0;
            const hasAction = !!actions?.nodes?.[node.id];
            const contentPL = node.content ? t(node.content).substring(0, 80) : "";

            if (isButtons) {
                // Question node (no options displayed — they become separate nodes)
                g.setNode(fullId, { width: 240, height: 60 });
                stepNodes.push({
                    id: fullId,
                    type: "question",
                    position: { x: 0, y: 0 },
                    data: {
                        label: node.id,
                        content: contentPL,
                        component: node.component,
                        field: node.field,
                        hasAction,
                        stepNode: node,
                        stepId: step.id,
                    },
                });

                // Answer nodes — one per branch
                for (let bi = 0; bi < node.branches!.length; bi++) {
                    const b = node.branches![bi];
                    const answerId = `${fullId}__ans_${bi}`;
                    const answerText = t(b.answer);
                    const targetNext = b.next;
                    const isDone = targetNext === "__done__";
                    const answerAction = actions?.nodes?.[node.id]?.onAnswer?.[b.answer];

                    g.setNode(answerId, { width: 160, height: 40 });
                    stepNodes.push({
                        id: answerId,
                        type: "answer",
                        position: { x: 0, y: 0 },
                        data: {
                            label: `${node.id}[${bi}]`,
                            answerText,
                            targetId: targetNext,
                            hasAction: !!answerAction,
                            isDone,
                            action: answerAction,
                            stepNode: node,
                            stepId: step.id,
                            branchIndex: bi,
                        },
                    });

                    // Edge: question → answer
                    g.setEdge(fullId, answerId);
                    stepEdges.push({
                        id: `${fullId}-${answerId}`,
                        source: fullId,
                        target: answerId,
                        type: "smoothstep",
                        style: { stroke: "#d1d5db", strokeWidth: 1 },
                    });

                    // Edge: answer → target (within step)
                    if (!isDone && step.nodes.some((n) => n.id === targetNext)) {
                        const targetFullId = `${step.id}__${targetNext}`;
                        g.setEdge(answerId, targetFullId);
                        stepEdges.push({
                            id: `${answerId}-${targetFullId}`,
                            source: answerId,
                            target: targetFullId,
                            type: "smoothstep",
                            style: { stroke: "#3b82f6", strokeWidth: 1.5 },
                        });
                    }
                }
            } else if (isInput) {
                // Non-buttons input (text_input, calendar)
                g.setNode(fullId, { width: 220, height: 50 });
                stepNodes.push({
                    id: fullId,
                    type: "question",
                    position: { x: 0, y: 0 },
                    data: {
                        label: node.id,
                        content: contentPL,
                        component: node.component,
                        field: node.field,
                        hasAction,
                        stepNode: node,
                        stepId: step.id,
                    },
                });

                // Edge to next
                if (node.next && node.next !== "__done__" && step.nodes.some((n) => n.id === node.next)) {
                    const targetFullId = `${step.id}__${node.next}`;
                    g.setEdge(fullId, targetFullId);
                    stepEdges.push({
                        id: `${fullId}-${targetFullId}`,
                        source: fullId,
                        target: targetFullId,
                        type: "smoothstep",
                        style: { stroke: "#94a3b8", strokeWidth: 1 },
                    });
                }
            } else {
                // Message node
                g.setNode(fullId, { width: 200, height: 50 });
                stepNodes.push({
                    id: fullId,
                    type: "message",
                    position: { x: 0, y: 0 },
                    data: {
                        label: node.id,
                        content: contentPL,
                        stepNode: node,
                        stepId: step.id,
                    },
                });

                // Message branches (condition-based, no answer nodes)
                if (node.branches) {
                    for (const b of node.branches) {
                        if (b.next && b.next !== "__done__" && step.nodes.some((n) => n.id === b.next)) {
                            const targetFullId = `${step.id}__${b.next}`;
                            g.setEdge(fullId, targetFullId);
                            stepEdges.push({
                                id: `${fullId}-${targetFullId}-${b.answer}`,
                                source: fullId,
                                target: targetFullId,
                                type: "smoothstep",
                                label: b.answer === "*" ? "default" : b.answer.substring(0, 15),
                                style: { stroke: "#94a3b8", strokeWidth: 1 },
                                labelStyle: { fontSize: "8px", fill: "#9ca3af" },
                            });
                        }
                    }
                }

                // Edge to next
                if (node.next && node.next !== "__done__" && step.nodes.some((n) => n.id === node.next)) {
                    const hasBranch = node.branches?.some((b) => b.next === node.next);
                    if (!hasBranch) {
                        const targetFullId = `${step.id}__${node.next}`;
                        g.setEdge(fullId, targetFullId);
                        stepEdges.push({
                            id: `${fullId}-${targetFullId}`,
                            source: fullId,
                            target: targetFullId,
                            type: "smoothstep",
                            style: { stroke: "#94a3b8", strokeWidth: 1 },
                        });
                    }
                }
            }
        }

        // Run dagre
        Dagre.layout(g);

        // Apply positions
        let maxY = 0;
        const stepStartY = globalOffsetY + 70;

        for (const sn of stepNodes) {
            const dagreNode = g.node(sn.id);
            if (dagreNode) {
                sn.position = { x: dagreNode.x - dagreNode.width / 2, y: stepStartY + dagreNode.y };
                maxY = Math.max(maxY, dagreNode.y + dagreNode.height);
            }
        }

        allNodes.push(...stepNodes);
        allEdges.push(...stepEdges);

        globalOffsetY = stepStartY + maxY + 60;

        // Step → step edge
        if (step.next) {
            allEdges.push({
                id: `${stepLabelId}-step_${step.next}`,
                source: stepLabelId,
                target: `step_${step.next}`,
                type: "smoothstep",
                style: { stroke: "#1f2937", strokeWidth: 3 },
            });
        }
    }

    return { nodes: allNodes, edges: allEdges };
}
