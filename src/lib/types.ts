// Chat steps v2 format
export interface StepNodeV2 {
    id: string;
    type: "message" | "input";
    content?: string;
    component?: string;
    options?: string[];
    field?: string;
    required?: boolean;
    branches?: { answer: string; next: string }[];
    next?: string;
}

export interface StepV2 {
    id: string;
    name: string;
    scope: "order" | "card";
    repeatPerCard?: boolean;
    nodes: StepNodeV2[];
    next: string | null;
}

export interface ChatStepsV2 {
    format: "chat_steps";
    steps: StepV2[];
}

export interface ActionCall {
    call: string;
    params?: Record<string, string>;
    showPoll?: boolean;
    showQR?: boolean;
    pollField?: string;
    freeze?: boolean;
}

export interface ActionsConfig {
    nodes: Record<string, { onAnswer?: Record<string, ActionCall>; onEnter?: ActionCall }>;
    steps: Record<string, { onComplete?: { save?: string[]; call?: string; params?: Record<string, string> } }>;
    _comments?: Record<string, string>;
    [key: string]: any;
}

// Chat tree v1 format (legacy)
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
    steps: ChatStepsV2 | ChatTreeV1;
    actions: ActionsConfig;
    is_active: boolean;
    created_at: string;
}
