import { ReactFlow, Background, Controls, MiniMap } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

export function FlowEditor() {
    return (
        <div className="h-screen flex flex-col">
            {/* Top bar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-bg-primary">
                <div className="flex items-center gap-3">
                    <h1 className="text-md font-semibold text-fg-primary">Form Builder</h1>
                    <span className="text-xs text-fg-quaternary">activation_chat</span>
                </div>
                <div className="flex items-center gap-2">
                    <button className="px-3 py-1.5 text-sm bg-bg-brand-solid text-fg-white rounded-lg hover:bg-bg-brand-solid_hover">
                        Zapisz
                    </button>
                </div>
            </div>

            {/* Main: flow editor + preview */}
            <div className="flex-1 flex">
                {/* Flow editor */}
                <div className="flex-1">
                    <ReactFlow
                        nodes={[]}
                        edges={[]}
                        fitView
                    >
                        <Background />
                        <Controls />
                        <MiniMap />
                    </ReactFlow>
                </div>

                {/* Live preview */}
                <div className="w-96 border-l border-border bg-bg-secondary flex flex-col">
                    <div className="p-3 border-b border-border">
                        <h2 className="text-sm font-semibold text-fg-primary">Live Preview</h2>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4">
                        <div className="w-full max-w-[375px] h-[600px] rounded-2xl border-2 border-border bg-bg-primary shadow-lg overflow-hidden flex flex-col">
                            <div className="h-10 bg-bg-secondary flex items-center justify-center border-b border-border">
                                <span className="text-xs font-medium text-fg-quaternary">kartysimusa.pl</span>
                            </div>
                            <div className="flex-1 p-3 overflow-y-auto">
                                <p className="text-sm text-fg-quaternary text-center mt-8">
                                    Kliknij "Odśwież" aby uruchomić podgląd
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="p-3 border-t border-border">
                        <button className="w-full px-3 py-2 text-sm border border-border rounded-lg hover:bg-bg-secondary_hover text-fg-secondary">
                            Odśwież preview
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
