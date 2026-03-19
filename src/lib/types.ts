// Chat tree v1 format (current)
export interface ChatNodeV1 {
    id: string;
    type: "message" | "input";
    scope: "order" | "card";
    content?: string;
    component?: string;
    config?: Record<string, any>;
    next?: string;
    branches?: { condition: string; next: string }[];
    field?: string;
    required?: boolean;
    action?: { endpoint: string; params?: Record<string, string> };
}

export interface ChatTreeV1 {
    format: "chat_tree";
    start: string;
    nodes: Record<string, ChatNodeV1>;
}

// Template from DB
export interface FormTemplate {
    id: string;
    name: string;
    steps: ChatTreeV1;
    actions: Record<string, any>;
    is_active: boolean;
    created_at: string;
}
