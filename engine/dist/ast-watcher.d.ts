/**
 * HiveMesh AST Watcher — Detects function/type/interface signature changes
 * across worktrees to catch semantic conflicts that Git cannot detect.
 */
export interface SignatureChange {
    file: string;
    type: "function" | "interface" | "type" | "class" | "export";
    name: string;
    oldSignature?: string;
    newSignature?: string;
    changeType: "added" | "modified" | "removed";
}
export interface ASTReport {
    worktreePath: string;
    role: string;
    changes: SignatureChange[];
    timestamp: number;
}
export declare function checkASTChanges(projectPath: string, worktreePath: string, role: string): ASTReport;
//# sourceMappingURL=ast-watcher.d.ts.map