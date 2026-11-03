/**
 * HiveMesh P2P Mesh — Peer-to-peer contract negotiation between agents.
 * Agents propose API/schema contracts before coding, ensuring alignment.
 */
class P2PMesh {
    contracts = new Map();
    counter = 0;
    propose(fromAgent, toAgent, type, spec) {
        const id = `contract_${++this.counter}_${Date.now()}`;
        const contract = {
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
    respond(contractId, status, response) {
        const contract = this.contracts.get(contractId);
        if (!contract)
            return null;
        if (contract.status !== "proposed")
            return contract;
        contract.status = status;
        contract.response = response;
        contract.updatedAt = Date.now();
        return contract;
    }
    getContracts(filters) {
        return Array.from(this.contracts.values()).filter((c) => {
            if (filters?.agentId &&
                c.fromAgent !== filters.agentId &&
                c.toAgent !== filters.agentId)
                return false;
            if (filters?.status && c.status !== filters.status)
                return false;
            if (filters?.type && c.type !== filters.type)
                return false;
            return true;
        });
    }
    getPendingFor(agentId) {
        return this.getContracts({ agentId, status: "proposed" }).filter((c) => c.toAgent === agentId);
    }
}
export const mesh = new P2PMesh();
//# sourceMappingURL=p2p-mesh.js.map