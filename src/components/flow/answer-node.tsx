import { Handle, Position } from "@xyflow/react";

interface AnswerNodeData {
    label: string;
    answerText: string;
    targetId: string;
    hasAction?: boolean;
    isDone?: boolean;
    [key: string]: any;
}

export function AnswerNode({ data }: { data: AnswerNodeData }) {
    const bg = data.hasAction ? "#fffbeb" : data.isDone ? "#fef2f2" : "#f0fdf4";
    const border = data.hasAction ? "#f59e0b" : data.isDone ? "#ef4444" : "#22c55e";
    const textColor = data.hasAction ? "#92400e" : data.isDone ? "#991b1b" : "#166534";

    return (
        <div
            className="rounded-lg shadow-sm"
            style={{
                minWidth: 140,
                maxWidth: 180,
                padding: "6px 10px",
                background: bg,
                border: `2px solid ${border}`,
            }}
        >
            <Handle type="target" position={Position.Top} className="!w-2 !h-2" style={{ background: border }} />

            <p className="text-[10px] font-semibold leading-tight" style={{ color: textColor }}>
                {data.answerText}
            </p>

            {data.hasAction && (
                <span className="text-[8px] text-amber-600">⚡ akcja</span>
            )}

            <p className="text-[7px] text-gray-400 font-mono mt-0.5">
                → {data.targetId}
            </p>

            <Handle type="source" position={Position.Bottom} className="!w-2 !h-2" style={{ background: border }} />
        </div>
    );
}
