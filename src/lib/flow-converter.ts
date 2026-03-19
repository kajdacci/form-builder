import type { Node, Edge } from "@xyflow/react";
import type { ChatTreeV1, ChatNodeV1 } from "./types";

const STEP_GROUPS: Record<string, { name: string; color: string }> = {
    greeting: { name: "Powitanie", color: "#e0f2fe" },
    verify_contact: { name: "Weryfikacja kontaktu", color: "#fef3c7" },
    card_naming: { name: "Nazwy kart", color: "#ede9fe" },
    date_selection: { name: "Daty aktywacji", color: "#dcfce7" },
    device_detection: { name: "Model telefonu", color: "#fce7f3" },
    consents: { name: "Zgody", color: "#f1f5f9" },
};

// Map node ID prefix → step group
function getStepGroup(nodeId: string): string {
    if (nodeId.startsWith("greeting")) return "greeting";
    if (
        nodeId.startsWith("check_source") ||
        nodeId.startsWith("confirm_") ||
        nodeId.startsWith("input_change") ||
        nodeId.startsWith("choose_what") ||
        nodeId.startsWith("check_allegro") ||
        nodeId.startsWith("ask_real") ||
        nodeId.startsWith("input_real")
    )
        return "verify_contact";
    if (
        nodeId.startsWith("card_") ||
        nodeId.startsWith("multi_card") ||
        nodeId.startsWith("single_card") ||
        nodeId.startsWith("check_card") ||
        nodeId.startsWith("confirm_card") ||
        nodeId.startsWith("show_card")
    )
        return "card_naming";
    if (nodeId.startsWith("date_") || nodeId.startsWith("ask_single") || nodeId === "contact_us")
        return "date_selection";
    if (nodeId.startsWith("device_") || nodeId === "devices_done") return "device_detection";
    if (nodeId.startsWith("consent") || nodeId === "done_msg") return "consents";
    return "other";
}

export function chatTreeToFlow(tree: ChatTreeV1): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Group nodes by step
    const groups: Record<string, ChatNodeV1[]> = {};
    for (const [id, node] of Object.entries(tree.nodes)) {
        const group = getStepGroup(id);
        if (!groups[group]) groups[group] = [];
        groups[group].push({ ...node, id });
    }

    let groupY = 0;

    for (const [groupId, groupNodes] of Object.entries(groups)) {
        const group = STEP_GROUPS[groupId] ?? { name: groupId, color: "#f5f5f5" };

        let nodeX = 0;
        const nodeY = groupY;

        for (const chatNode of groupNodes) {
            const isInput = chatNode.type === "input";
            const hasButtons = chatNode.component === "buttons" && chatNode.config?.options;

            nodes.push({
                id: chatNode.id,
                type: "default",
                position: { x: nodeX, y: nodeY },
                data: {
                    label: chatNode.id,
                    content: chatNode.content?.substring(0, 60) ?? "",
                    nodeType: chatNode.type,
                    component: chatNode.component,
                    scope: chatNode.scope,
                    options: hasButtons ? chatNode.config?.options : undefined,
                    field: chatNode.field,
                    group: groupId,
                    groupName: group.name,
                    chatNode,
                },
                style: {
                    background: isInput ? (chatNode.component === "buttons" ? "#ffffff" : "#f0f9ff") : "#f8fafc",
                    border: `2px solid ${isInput ? "#3b82f6" : "#e2e8f0"}`,
                    borderRadius: "12px",
                    padding: "12px",
                    minWidth: "200px",
                    maxWidth: "280px",
                    fontSize: "12px",
                },
            });

            // Edges from branches
            if (chatNode.branches) {
                for (let i = 0; i < chatNode.branches.length; i++) {
                    const b = chatNode.branches[i];
                    if (b.next && tree.nodes[b.next]) {
                        edges.push({
                            id: `${chatNode.id}-${b.next}-${i}`,
                            source: chatNode.id,
                            target: b.next,
                            label: b.condition.length > 30 ? b.condition.substring(0, 30) + "…" : b.condition,
                            style: { stroke: "#3b82f6" },
                            labelStyle: { fontSize: "9px", fill: "#6b7280" },
                        });
                    }
                }
            }

            // Edge from next
            if (chatNode.next && tree.nodes[chatNode.next]) {
                const hasBranchToNext = chatNode.branches?.some((b) => b.next === chatNode.next);
                if (!hasBranchToNext) {
                    edges.push({
                        id: `${chatNode.id}-${chatNode.next}`,
                        source: chatNode.id,
                        target: chatNode.next,
                        style: { stroke: "#94a3b8" },
                    });
                }
            }

            nodeX += 320;
        }

        groupY += 200;
    }

    return { nodes, edges };
}
