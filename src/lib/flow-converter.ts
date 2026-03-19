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
        const stepLabelId = `step_label_${step.id}`;
        allNodes.push({
            id: stepLabelId,
            type: "default",
            position: { x: 0, y: globalOffsetY },
            draggable: false,
            selectable: false,
            data: { label: `${si + 1}. ${step.name}${step.repeatPerCard ? " (per karta)" : ""}` },
            style: {
                background: color,
                border: "2px solid #9ca3af",
                borderRadius: "12px",
                padding: "10px 24px",
                fontSize: "14px",
                fontWeight: "bold",
                width: "300px",
                textAlign: "center" as const,
            },
        });

        // Dagre layout per step (tree: top-to-bottom)
        const g = new Dagre.graphlib.Graph();
        g.setGraph({ rankdir: "TB", nodesep: 40, ranksep: 80 });
        g.setDefaultEdgeLabel(() => ({}));

        const stepEdges: Edge[] = [];

        // Add nodes to dagre
        for (const node of step.nodes) {
            const optionLabels = node.options?.map((o) => t(o)) ?? [];
            const h = 60 + optionLabels.length * 16;
            g.setNode(node.id, { width: 220, height: h });
        }

        // Add edges to dagre
        for (const node of step.nodes) {
            const nodeId = `${step.id}__${node.id}`;

            if (node.branches) {
                for (let bi = 0; bi < node.branches.length; bi++) {
                    const b = node.branches[bi];
                    if (b.next && b.next !== "__done__" && step.nodes.some((n) => n.id === b.next)) {
                        g.setEdge(node.id, b.next);
                        stepEdges.push({
                            id: `${nodeId}-${step.id}__${b.next}-b${bi}`,
                            source: nodeId,
                            target: `${step.id}__${b.next}`,
                            label: t(b.answer).length > 18 ? t(b.answer).substring(0, 18) + "…" : t(b.answer),
                            type: "smoothstep",
                            style: { stroke: "#3b82f6", strokeWidth: 1.5 },
                            labelStyle: { fontSize: "8px", fill: "#6b7280" },
                        });
                    }
                }
            }

            if (node.next && node.next !== "__done__" && step.nodes.some((n) => n.id === node.next)) {
                const hasBranch = node.branches?.some((b) => b.next === node.next);
                if (!hasBranch) {
                    g.setEdge(node.id, node.next);
                    stepEdges.push({
                        id: `${nodeId}-${step.id}__${node.next}`,
                        source: nodeId,
                        target: `${step.id}__${node.next}`,
                        type: "smoothstep",
                        style: { stroke: "#94a3b8", strokeWidth: 1 },
                    });
                }
            }
        }

        // Run dagre
        Dagre.layout(g);

        // Get bounds for centering
        let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const node of step.nodes) {
            const pos = g.node(node.id);
            if (pos) {
                minX = Math.min(minX, pos.x - 110);
                maxX = Math.max(maxX, pos.x + 110);
                maxY = Math.max(maxY, pos.y + 40);
            }
        }
        const treeWidth = maxX - minX;
        const centerOffset = 150 - treeWidth / 2; // center tree around x=150

        // Create reactflow nodes
        const stepStartY = globalOffsetY + 60;
        for (const node of step.nodes) {
            const pos = g.node(node.id);
            if (!pos) continue;

            const isInput = node.type === "input";
            const hasAction = !!actions?.nodes?.[node.id];
            const contentPreview = node.content ? t(node.content).substring(0, 50) : "";
            const optionLabels = node.options?.map((o) => t(o)) ?? [];

            const nodeId = `${step.id}__${node.id}`;

            let label = node.id;
            if (contentPreview) label += `\n${contentPreview}`;
            if (optionLabels.length > 0) label += `\n${optionLabels.map((o) => `[${o}]`).join(" ")}`;

            allNodes.push({
                id: nodeId,
                type: "default",
                position: {
                    x: pos.x - 110 + centerOffset,
                    y: stepStartY + pos.y,
                },
                data: {
                    label,
                    nodeType: node.type,
                    component: node.component,
                    field: node.field,
                    hasAction,
                    stepNode: node,
                    stepId: step.id,
                },
                style: {
                    background: hasAction ? "#fffbeb" : isInput ? "#ffffff" : "#f8fafc",
                    border: `2px solid ${hasAction ? "#f59e0b" : isInput ? "#3b82f6" : "#e2e8f0"}`,
                    borderRadius: "10px",
                    padding: "6px 8px",
                    fontSize: "9px",
                    width: "220px",
                    whiteSpace: "pre-wrap" as const,
                    lineHeight: "1.3",
                },
            });
        }

        allEdges.push(...stepEdges);

        // Step height
        globalOffsetY = stepStartY + maxY + 80;

        // Step → step edge
        if (step.next) {
            allEdges.push({
                id: `${stepLabelId}-step_label_${step.next}`,
                source: stepLabelId,
                target: `step_label_${step.next}`,
                type: "smoothstep",
                style: { stroke: "#1f2937", strokeWidth: 3 },
            });
        }
    }

    return { nodes: allNodes, edges: allEdges };
}
