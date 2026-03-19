import { Handle, Position } from "@xyflow/react";

interface StepHeaderData {
    label: string;
    color: string;
    scope: string;
    repeatPerCard?: boolean;
    [key: string]: any;
}

export function StepHeaderNode({ data }: { data: StepHeaderData }) {
    return (
        <div
            className="rounded-xl shadow-sm"
            style={{
                background: data.color,
                border: "2px solid #9ca3af",
                padding: "10px 24px",
                minWidth: 280,
                textAlign: "center",
            }}
        >
            <Handle type="target" position={Position.Top} className="!bg-gray-500 !w-3 !h-3" />

            <p className="text-sm font-bold text-gray-800">{data.label}</p>
            <div className="flex items-center justify-center gap-2 mt-1">
                <span className="text-[9px] bg-white/60 text-gray-600 px-1.5 py-0.5 rounded">
                    {data.scope}
                </span>
                {data.repeatPerCard && (
                    <span className="text-[9px] bg-white/60 text-gray-600 px-1.5 py-0.5 rounded">
                        per karta
                    </span>
                )}
            </div>

            <Handle type="source" position={Position.Bottom} className="!bg-gray-500 !w-3 !h-3" />
        </div>
    );
}
