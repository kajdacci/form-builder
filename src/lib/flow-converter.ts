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
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const t = (key: string) => translations?.[key] ?? key;

    const g = new Dagre.graphlib.Graph({ compound: true });
    g.setGraph({ rankdir: "TB", nodesep: 60, ranksep: 80, marginx: 40, marginy: 40 });
    g.setDefaultEdgeLabel(() => ({}));

    // Create step group nodes + inner nodes
    for (const step of template.steps) {
        const groupId = `step_${step.id}`;

        // Step group node
        g.setNode(groupId, { width: 300, height: 80 });

        nodes.push({
            id: groupId,
            type: "group",
            position: { x: 0, y: 0 },
            data: {
                label: step.name,
                stepId: step.id,
                scope: step.scope,
                repeatPerCard: step.repeatPerCard,
            },
            style: {
                background: STEP_COLORS[step.id] ?? "#f5f5f5",
                border: "2px solid #d1d5db",
                borderRadius: "16px",
                padding: "16px",
                paddingTop: "40px",
                minWidth: "320px",
                minHeight: "100px",
            },
        });

        // Inner nodes
        for (const node of step.nodes) {
            const nodeId = `${step.id}__${node.id}`;
            const isInput = node.type === "input";
            const hasAction = actions?.nodes?.[node.id];
            const contentPreview = node.content ? t(node.content).substring(0, 80) : "";
            const optionLabels = node.options?.map((o) => t(o)) ?? [];

            g.setNode(nodeId, { width: 240, height: 80 + (optionLabels.length * 20) });
            g.setParent(nodeId, groupId);

            nodes.push({
                id: nodeId,
                type: "default",
                position: { x: 0, y: 0 },
                parentId: groupId,
                extent: "parent" as const,
                data: {
                    label: node.id,
                    content: contentPreview,
                    nodeType: node.type,
                    component: node.component,
                    field: node.field,
                    options: optionLabels,
                    hasAction: !!hasAction,
                    stepNode: node,
                    stepId: step.id,
                },
                style: {
                    background: hasAction ? "#fffbeb" : isInput ? "#ffffff" : "#f8fafc",
                    border: `2px solid ${hasAction ? "#f59e0b" : isInput ? "#3b82f6" : "#e2e8f0"}`,
                    borderRadius: "10px",
                    padding: "8px 12px",
                    fontSize: "11px",
                    minWidth: "200px",
                },
            });

            // Inner edges (within step)
            if (node.branches) {
                for (let i = 0; i < node.branches.length; i++) {
                    const b = node.branches[i];
                    const targetId = b.next === "__done__" ? null : `${step.id}__${b.next}`;
                    if (targetId && step.nodes.some((n) => n.id === b.next)) {
                        g.setEdge(nodeId, targetId);
                        edges.push({
                            id: `${nodeId}-${targetId}-${i}`,
                            source: nodeId,
                            target: targetId,
                            label: t(b.answer).length > 25 ? t(b.answer).substring(0, 25) + "…" : t(b.answer),
                            style: { stroke: "#3b82f6", strokeWidth: 1.5 },
                            labelStyle: { fontSize: "9px", fill: "#6b7280" },
                        });
                    }
                }
            }

            if (node.next && node.next !== "__done__" && step.nodes.some((n) => n.id === node.next)) {
                const targetId = `${step.id}__${node.next}`;
                const hasBranch = node.branches?.some((b) => b.next === node.next);
                if (!hasBranch) {
                    g.setEdge(nodeId, targetId);
                    edges.push({
                        id: `${nodeId}-${targetId}`,
                        source: nodeId,
                        target: targetId,
                        style: { stroke: "#94a3b8", strokeWidth: 1 },
                    });
                }
            }
        }
    }

    // Step → step edges
    for (const step of template.steps) {
        if (step.next) {
            const sourceId = `step_${step.id}`;
            const targetId = `step_${step.next}`;
            g.setEdge(sourceId, targetId);
            edges.push({
                id: `${sourceId}-${targetId}`,
                source: sourceId,
                target: targetId,
                style: { stroke: "#1f2937", strokeWidth: 3 },
                type: "smoothstep",
            });
        }
    }

    // Run dagre layout
    Dagre.layout(g);

    // Apply positions
    for (const node of nodes) {
        const dagreNode = g.node(node.id);
        if (dagreNode) {
            if (node.parentId) {
                // Child node — position relative to parent
                const parentDagre = g.node(node.parentId);
                if (parentDagre) {
                    node.position = {
                        x: dagreNode.x - parentDagre.x + 20,
                        y: dagreNode.y - parentDagre.y + 40,
                    };
                }
            } else {
                node.position = { x: dagreNode.x, y: dagreNode.y };
            }

            // Resize group to fit children
            if (node.type === "group") {
                const children = nodes.filter((n) => n.parentId === node.id);
                if (children.length > 0) {
                    const maxX = Math.max(...children.map((c) => c.position.x + 250));
                    const maxY = Math.max(...children.map((c) => c.position.y + 100));
                    node.style = {
                        ...node.style,
                        width: `${Math.max(maxX + 20, 340)}px`,
                        height: `${Math.max(maxY + 20, 120)}px`,
                    };
                }
            }
        }
    }

    return { nodes, edges };
}
