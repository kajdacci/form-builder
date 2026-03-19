import { useParams } from "react-router";

export function ChatPage() {
    const { token } = useParams();

    return (
        <div className="min-h-screen bg-bg-primary flex items-start justify-center pt-12 px-4">
            <div className="w-full max-w-lg">
                <div className="text-center mb-8">
                    <h1 className="text-display-sm font-semibold text-fg-primary">
                        karty<span className="text-fg-brand-primary">simusa</span>.pl
                    </h1>
                    <p className="text-sm text-fg-quaternary mt-2">Formularz aktywacji</p>
                </div>

                <div className="bg-bg-primary border border-border rounded-2xl p-6 shadow-xs">
                    <p className="text-sm text-fg-secondary">
                        Token: <code className="text-xs font-mono bg-bg-secondary px-2 py-1 rounded">{token}</code>
                    </p>
                    <p className="text-sm text-fg-quaternary mt-4">
                        Chat renderer — wkrótce
                    </p>
                </div>
            </div>
        </div>
    );
}
