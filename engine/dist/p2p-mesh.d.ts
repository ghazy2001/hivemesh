/**
 * HiveMesh P2P Mesh — Peer-to-peer contract negotiation between agents.
 * Agents propose API/schema contracts before coding, ensuring alignment.
 */
export type ContractStatus = "proposed" | "accepted" | "rejected" | "superseded";
export interface Contract {
    id: string;
    fromAgent: string;
    toAgent: string;
    type: string;
    spec: string;
    status: ContractStatus;
    response?: string;
    createdAt: number;
    updatedAt: number;
}
declare class P2PMesh {
    private contracts;
    private counter;
    propose(fromAgent: string, toAgent: string, type: string, spec: string): Contract;
    respond(contractId: string, status: "accepted" | "rejected", response?: string): Contract | null;
    getContracts(filters?: {
        agentId?: string;
        status?: ContractStatus;
        type?: string;
    }): Contract[];
    getPendingFor(agentId: string): Contract[];
}
export declare const mesh: P2PMesh;
export {};
//# sourceMappingURL=p2p-mesh.d.ts.map