/**
 * HiveMesh Blackboard — In-memory shared knowledge store for swarm agents.
 * Agents post insights (discoveries about the codebase) here so other agents
 * can query them instead of re-reading the same files.
 */
export class Blackboard {
    store = new Map();
    counter = 0;
    post(topic, key, value, agentId, ttl = 0) {
        this.cleanup();
        const id = `ins_${++this.counter}_${Date.now()}`;
        const insight = {
            id,
            topic,
            key,
            value,
            agentId,
            createdAt: Date.now(),
            ttl,
        };
        this.store.set(id, insight);
        return insight;
    }
    query(topic, key) {
        this.cleanup();
        return Array.from(this.store.values()).filter((ins) => {
            if (topic && ins.topic !== topic)
                return false;
            if (key && ins.key !== key)
                return false;
            return true;
        });
    }
    listTopics() {
        this.cleanup();
        const topics = new Set();
        for (const ins of this.store.values()) {
            topics.add(ins.topic);
        }
        return Array.from(topics);
    }
    clear(topic) {
        if (!topic) {
            const count = this.store.size;
            this.store.clear();
            return count;
        }
        let count = 0;
        for (const [id, ins] of this.store) {
            if (ins.topic === topic) {
                this.store.delete(id);
                count++;
            }
        }
        return count;
    }
    cleanup() {
        const now = Date.now();
        for (const [id, ins] of this.store) {
            if (ins.ttl > 0 && now - ins.createdAt > ins.ttl * 1000) {
                this.store.delete(id);
            }
        }
    }
}
//# sourceMappingURL=blackboard.js.map