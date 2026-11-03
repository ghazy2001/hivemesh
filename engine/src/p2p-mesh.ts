/**
 * HiveMesh P2P Mesh — Peer-to-peer contract negotiation between agents.
 * Agents propose API/schema contracts before coding, ensuring alignment.
 */

export type ContractStatus = "proposed" | "accepted" | "rejected" | "superseded";

export interface Contract {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: string; // "api" | "schema" | "event" | "shared-type"
  spec: string;
  status: ContractStatus;
  response?: string;
  createdAt: number;
  updatedAt: number;
}

class P2PMesh {
  private contracts = new Map<string, Contract>();
  private counter = 0;

  propose(
    fromAgent: string,
    toAgent: string,
    type: string,
    spec: string
  ): Contract {
    const id = `contract_${++this.counter}_${Date.now()}`;
    const contract: Contract = {
      id,
      fromAgent,
      toAgent,
      type,
      spec,
      status: "proposed",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.contracts.set(id, contract);
    return contract;
  }

  respond(
    contractId: string,
    status: "accepted" | "rejected",
    response?: string
  ): Contract | null {
    const contract = this.contracts.get(contractId);
    if (!contract) return null;
    if (contract.status !== "proposed") return contract;

    contract.status = status;
    contract.response = response;
    contract.updatedAt = Date.now();
    return contract;
  }

  getContracts(filters?: {
    agentId?: string;
    status?: ContractStatus;
    type?: string;
  }): Contract[] {
    return Array.from(this.contracts.values()).filter((c) => {
      if (
        filters?.agentId &&
        c.fromAgent !== filters.agentId &&
        c.toAgent !== filters.agentId
      )
        return false;
      if (filters?.status && c.status !== filters.status) return false;
      if (filters?.type && c.type !== filters.type) return false;
      return true;
    });
  }

  getPendingFor(agentId: string): Contract[] {
    return this.getContracts({ agentId, status: "proposed" }).filter(
      (c) => c.toAgent === agentId
    );
  }
}

export const mesh = new P2PMesh();
