import { Handle, Position } from "@xyflow/react";

interface MessageNodeData {
    label: string;
    content: string;
    [key: string]: any;
}

export function MessageNode({ data }: { data: MessageNodeData }) {
    return (
        <div
            className="rounded-xl border-2 border-gray-200 bg-gray-50 shadow-sm"
            style={{ minWidth: 200, maxWidth: 240, padding: "8px 12px" }}
        >
            <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2 !h-2" />

            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">message</span>

            <p className="text-[10px] text-gray-600 leading-tight mt-1 whitespace-pre-wrap">
                {data.content || "(pusty)"}
            </p>

            <p className="text-[8px] text-gray-400 font-mono mt-1">{data.label}</p>

            <Handle type="source" position={Position.Bottom} className="!bg-gray-400 !w-2 !h-2" />
        </div>
    );
}
