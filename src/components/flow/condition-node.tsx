import { Handle, Position } from "@xyflow/react";

interface ConditionNodeData {
    label: string;
    conditions: string[];
    [key: string]: any;
}

export function ConditionNode({ data }: { data: ConditionNodeData }) {
    return (
        <div
            style={{
                minWidth: 160,
                maxWidth: 200,
                padding: "8px 12px",
                background: "#f5f3ff",
                border: "2px solid #8b5cf6",
                borderRadius: "10px",
                transform: "rotate(0deg)",
            }}
        >
            <Handle type="target" position={Position.Top} className="!w-2 !h-2" style={{ background: "#8b5cf6" }} />

            <div className="flex items-center gap-1 mb-1">
                <span style={{ fontSize: "12px" }}>🔀</span>
                <span className="text-[9px] font-bold text-purple-600 uppercase tracking-wider">condition</span>
            </div>

            {data.conditions.map((c, i) => (
                <p key={i} className="text-[9px] font-mono text-purple-700 leading-tight">
                    {c}
                </p>
            ))}

            <p className="text-[8px] text-gray-400 font-mono mt-1">{data.label}</p>

            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" style={{ background: "#8b5cf6" }} />
        </div>
    );
}
