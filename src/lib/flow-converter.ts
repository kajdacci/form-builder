import Dagre from "@dagrejs/dagre";
import type { Node, Edge } from "@xyflow/react";
import type { StepV2, ActionsConfig } from "./types";

// Detect if adding edge would create a cycle using DFS
function wouldCreateCycle(adjacency: Map<string, Set<string>>, from: string, to: string): boolean {
    // If 'to' can reach 'from', adding from→to creates a cycle
    const visited = new Set<string>();
    const stack = [to];
    while (stack.length > 0) {
        const node = stack.pop()!;
        if (node === from) return true;
        if (visited.has(node)) continue;
        visited.add(node);
        for (const next of adjacency.get(node) ?? []) {
            stack.push(next);
        }
    }
    return false;
}

export function chatStepToFlow(
    step: StepV2,
    actions?: ActionsConfig,
    translations?: Record<string, string>,
): { nodes: Node[]; edges: Edge[] } {
    const allNodes: Node[] = [];
    const allEdges: Edge[] = [];
    const backEdges: Edge[] = []; // cycle edges — drawn differently
    const t = (key: string) => translations?.[key] ?? key;

    const g = new Dagre.graphlib.Graph();
    g.setGraph({ rankdir: "TB", nodesep: 50, ranksep: 80, marginx: 20, marginy: 20 });
    g.setDefaultEdgeLabel(() => ({}));

    // Track adjacency for cycle detection
    const adjacency = new Map<string, Set<string>>();
    function addDagreEdge(from: string, to: string, edge: Edge, isBack = false) {
        if (isBack || wouldCreateCycle(adjacency, from, to)) {
            // Back edge — don't add to dagre, draw as dashed
            backEdges.push({ ...edge, animated: true, style: { ...edge.style, strokeDasharray: "5 3", opacity: 0.5 } });
        } else {
            if (!adjacency.has(from)) adjacency.set(from, new Set());
            adjacency.get(from)!.add(to);
            g.setEdge(from, to);
            allEdges.push(edge);
        }
    }

    for (const node of step.nodes) {
        const fullId = node.id;
        const isInput = node.type === "input";
        const isButtons = node.component === "buttons" && node.branches && node.branches.length > 0;
        const isCondition = node.type === "message" && !node.content && node.branches && node.branches.length > 0;
        const hasAction = !!actions?.nodes?.[node.id];
        const contentPL = node.content ? t(node.content).substring(0, 80) : "";

        if (isCondition) {
            g.setNode(fullId, { width: 170, height: 40 });
            allNodes.push({
                id: fullId, type: "condition", position: { x: 0, y: 0 },
                data: { label: node.id, conditions: node.branches!.map((b) => `${b.answer} → ${b.next}`), stepNode: node, stepId: step.id },
            });

            for (const b of node.branches!) {
                if (b.next && b.next !== "__done__" && step.nodes.some((n) => n.id === b.next)) {
                    addDagreEdge(fullId, b.next, {
                        id: `${fullId}-${b.next}-${b.answer}`, source: fullId, target: b.next, type: "smoothstep",
                        label: b.answer === "*" ? "default" : b.answer.substring(0, 15),
                        style: { stroke: "#8b5cf6", strokeWidth: 1.5 },
                        labelStyle: { fontSize: "8px", fill: "#7c3aed" },
                    });
                }
            }
        } else if (isButtons) {
            g.setNode(fullId, { width: 240, height: 60 });
            allNodes.push({
                id: fullId, type: "question", position: { x: 0, y: 0 },
                data: { label: node.id, content: contentPL, component: node.component, field: node.field, hasAction, stepNode: node, stepId: step.id },
            });

            for (let bi = 0; bi < node.branches!.length; bi++) {
                const b = node.branches![bi];
                const answerId = `${fullId}__ans_${bi}`;
                const isDone = b.next === "__done__";
                const answerAction = actions?.nodes?.[node.id]?.onAnswer?.[b.answer];

                g.setNode(answerId, { width: 150, height: 32 });
                allNodes.push({
                    id: answerId, type: "answer", position: { x: 0, y: 0 },
                    data: { label: `${node.id}[${bi}]`, answerText: t(b.answer), targetId: b.next, hasAction: !!answerAction, isDone, action: answerAction, stepNode: node, stepId: step.id, branchIndex: bi },
                });

                // question → answer (always tree-like, no cycle)
                g.setEdge(fullId, answerId);
                allEdges.push({
                    id: `${fullId}-${answerId}`, source: fullId, target: answerId, type: "smoothstep",
                    style: { stroke: "#d1d5db", strokeWidth: 1 },
                });

                // answer → target
                if (!isDone && step.nodes.some((n) => n.id === b.next)) {
                    addDagreEdge(answerId, b.next, {
                        id: `${answerId}-${b.next}`, source: answerId, target: b.next, type: "smoothstep",
                        style: { stroke: "#3b82f6", strokeWidth: 1.5 },
                    });
                }
            }
        } else if (isInput) {
            g.setNode(fullId, { width: 220, height: 50 });
            allNodes.push({
                id: fullId, type: "question", position: { x: 0, y: 0 },
                data: { label: node.id, content: contentPL, component: node.component, field: node.field, hasAction, stepNode: node, stepId: step.id },
            });

            if (node.next && node.next !== "__done__" && step.nodes.some((n) => n.id === node.next)) {
                addDagreEdge(fullId, node.next, {
                    id: `${fullId}-${node.next}`, source: fullId, target: node.next, type: "smoothstep",
                    style: { stroke: "#94a3b8", strokeWidth: 1 },
                });
            }
        } else {
            // Message
            g.setNode(fullId, { width: 200, height: 50 });
            allNodes.push({
                id: fullId, type: "message", position: { x: 0, y: 0 },
                data: { label: node.id, content: contentPL, stepNode: node, stepId: step.id },
            });

            if (node.branches) {
                for (const b of node.branches) {
                    if (b.next && b.next !== "__done__" && step.nodes.some((n) => n.id === b.next)) {
                        addDagreEdge(fullId, b.next, {
                            id: `${fullId}-${b.next}-${b.answer}`, source: fullId, target: b.next, type: "smoothstep",
                            style: { stroke: "#94a3b8", strokeWidth: 1 },
                        });
                    }
                }
            }

            if (node.next && node.next !== "__done__" && step.nodes.some((n) => n.id === node.next)) {
                const hasBranch = node.branches?.some((b) => b.next === node.next);
                if (!hasBranch) {
                    addDagreEdge(fullId, node.next, {
                        id: `${fullId}-${node.next}`, source: fullId, target: node.next, type: "smoothstep",
                        style: { stroke: "#94a3b8", strokeWidth: 1 },
                    });
                }
            }
        }
    }

    // Layout
    Dagre.layout(g);

    for (const sn of allNodes) {
        const dagreNode = g.node(sn.id);
        if (dagreNode) {
            sn.position = { x: dagreNode.x - dagreNode.width / 2, y: dagreNode.y - dagreNode.height / 2 };
        }
    }

    // Add back edges after layout (dashed, animated)
    allEdges.push(...backEdges);

    return { nodes: allNodes, edges: allEdges };
}
