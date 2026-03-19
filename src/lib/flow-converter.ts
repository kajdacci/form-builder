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

    let stepY = 0;

    for (let si = 0; si < template.steps.length; si++) {
        const step = template.steps[si];
        const color = STEP_COLORS[step.id] ?? "#f5f5f5";
        const stepX = 0;
        const nodeSpacingX = 280;
        const nodeSpacingY = 140;
        const nodesPerRow = 4;

        // Step label node (header)
        const stepLabelId = `step_label_${step.id}`;
        nodes.push({
            id: stepLabelId,
            type: "default",
            position: { x: stepX, y: stepY },
            data: { label: `${si + 1}. ${step.name}` },
            draggable: false,
            selectable: false,
            style: {
                background: color,
                border: `2px solid #9ca3af`,
                borderRadius: "12px",
                padding: "8px 16px",
                fontSize: "14px",
                fontWeight: "bold",
                minWidth: `${nodesPerRow * nodeSpacingX}px`,
                textAlign: "center" as const,
            },
        });

        // Inner nodes
        for (let ni = 0; ni < step.nodes.length; ni++) {
            const node = step.nodes[ni];
            const col = ni % nodesPerRow;
            const row = Math.floor(ni / nodesPerRow);
            const nodeX = stepX + col * nodeSpacingX + 20;
            const nodeY = stepY + 60 + row * nodeSpacingY;

            const isInput = node.type === "input";
            const hasAction = !!actions?.nodes?.[node.id];
            const contentPreview = node.content ? t(node.content).substring(0, 60) : "(pusty)";
            const optionLabels = node.options?.map((o) => t(o)) ?? [];

            const nodeId = `${step.id}__${node.id}`;

            nodes.push({
                id: nodeId,
                type: "default",
                position: { x: nodeX, y: nodeY },
                data: {
                    label: `${node.id}\n${contentPreview}${optionLabels.length > 0 ? "\n[" + optionLabels.join("] [") + "]" : ""}`,
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
                    padding: "8px 10px",
                    fontSize: "10px",
                    width: "240px",
                    whiteSpace: "pre-wrap" as const,
                    lineHeight: "1.3",
                },
            });

            // Edges: branches
            if (node.branches) {
                for (let bi = 0; bi < node.branches.length; bi++) {
                    const b = node.branches[bi];
                    if (b.next && b.next !== "__done__" && step.nodes.some((n) => n.id === b.next)) {
                        const targetId = `${step.id}__${b.next}`;
                        edges.push({
                            id: `${nodeId}-${targetId}-b${bi}`,
                            source: nodeId,
                            target: targetId,
                            label: t(b.answer).length > 20 ? t(b.answer).substring(0, 20) + "…" : t(b.answer),
                            style: { stroke: "#3b82f6", strokeWidth: 1.5 },
                            labelStyle: { fontSize: "8px", fill: "#6b7280" },
                        });
                    }
                }
            }

            // Edge: next (non-branch)
            if (node.next && node.next !== "__done__" && step.nodes.some((n) => n.id === node.next)) {
                const targetId = `${step.id}__${node.next}`;
                const hasBranch = node.branches?.some((b) => b.next === node.next);
                if (!hasBranch) {
                    edges.push({
                        id: `${nodeId}-${targetId}`,
                        source: nodeId,
                        target: targetId,
                        style: { stroke: "#94a3b8", strokeWidth: 1 },
                    });
                }
            }
        }

        // Step height
        const rows = Math.ceil(step.nodes.length / nodesPerRow);
        stepY += 60 + rows * nodeSpacingY + 40;

        // Step → step edge
        if (step.next) {
            const nextStepLabelId = `step_label_${step.next}`;
            edges.push({
                id: `${stepLabelId}-${nextStepLabelId}`,
                source: stepLabelId,
                target: nextStepLabelId,
                style: { stroke: "#1f2937", strokeWidth: 3 },
                type: "smoothstep",
            });
        }
    }

    return { nodes, edges };
}
