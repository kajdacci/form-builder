import { Handle, Position } from "@xyflow/react";

interface QuestionNodeData {
    label: string;
    content: string;
    component?: string;
    field?: string;
    hasAction?: boolean;
    [key: string]: any;
}

export function QuestionNode({ data }: { data: QuestionNodeData }) {
    return (
        <div
            className="rounded-xl border-2 border-blue-400 bg-white shadow-sm"
            style={{ minWidth: 220, maxWidth: 260, padding: "10px 12px" }}
        >
            <Handle type="target" position={Position.Top} className="!bg-blue-400 !w-2 !h-2" />

            <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">
                    {data.component ?? "input"}
                </span>
                {data.field && (
                    <span className="text-[8px] bg-blue-50 text-blue-500 px-1 rounded font-mono">
                        {data.field}
                    </span>
                )}
                {data.hasAction && (
                    <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded">⚡</span>
                )}
                {data.hasComment && (
                    <span className="text-[8px] bg-yellow-200 text-yellow-800 px-1 rounded" title={data.commentText}>💬</span>
                )}
            </div>

            <p className="text-[10px] text-gray-700 leading-tight whitespace-pre-wrap">
                {data.content || "(pusty)"}
            </p>

            <p className="text-[8px] text-gray-400 font-mono mt-1">{data.label}</p>

            <Handle type="source" position={Position.Bottom} className="!bg-blue-400 !w-2 !h-2" />
        </div>
    );
}
