/**
 * HiveMesh Blackboard — High-Performance Shared Knowledge Store
 * Powered by Node.js native SQLite with FTS5 (Full-Text Search) and BM25 ranking.
 * Enables zero-token discovery reuse across swarm agents.
 */
import { DatabaseSync } from "node:sqlite";
export class Blackboard {
    db;
    counter = 0;
    constructor(dbPath = ":memory:") {
        this.db = new DatabaseSync(dbPath);
        this.initSchema();
    }
    initSchema() {
        // Primary storage table
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        topic TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        ttl INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_insights_topic ON insights(topic);
      CREATE INDEX IF NOT EXISTS idx_insights_key ON insights(key);
    `);
        // FTS5 Full-Text Search virtual table for semantic and keyword queries
        this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS insights_fts USING fts5(
        id UNINDEXED,
        topic,
        key,
        value,
        tokenize = 'porter unicode61'
      );
    `);
    }
    post(topic, key, value, agentId, ttl = 0) {
        this.cleanup();
        const id = `ins_${++this.counter}_${Date.now().toString(36)}`;
        const now = Date.now();
        // Insert or update in relational table
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO insights (id, topic, key, value, agent_id, created_at, ttl)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, topic, key, value, agentId, now, ttl);
        // Index into FTS5
        const ftsStmt = this.db.prepare(`
      INSERT INTO insights_fts (id, topic, key, value)
      VALUES (?, ?, ?, ?)
    `);
        ftsStmt.run(id, topic, key, value);
        return {
            id,
            topic,
            key,
            value,
            agentId,
            createdAt: now,
            ttl,
        };
    }
    query(topic, key, search) {
        this.cleanup();
        if (search && search.trim().length > 0) {
            return this.search(search, topic);
        }
        let queryStr = "SELECT id, topic, key, value, agent_id, created_at, ttl FROM insights WHERE 1=1";
        const params = [];
        if (topic) {
            queryStr += " AND topic = ?";
            params.push(topic);
        }
        if (key) {
            queryStr += " AND key = ?";
            params.push(key);
        }
        queryStr += " ORDER BY created_at DESC";
        const stmt = this.db.prepare(queryStr);
        const rows = stmt.all(...params);
        return rows.map((r) => ({
            id: r.id,
            topic: r.topic,
            key: r.key,
            value: r.value,
            agentId: r.agent_id,
            createdAt: Number(r.created_at),
            ttl: Number(r.ttl),
        }));
    }
    search(naturalQuery, topicFilter) {
        this.cleanup();
        // Sanitize query for FTS5 (match individual tokens with prefix support)
        const tokens = naturalQuery
            .replace(/[^\w\s]/g, " ")
            .trim()
            .split(/\s+/)
            .filter((t) => t.length > 0)
            .map((t) => `"${t}"*`)
            .join(" OR ");
        if (!tokens)
            return [];
        let sql = `
      SELECT i.id, i.topic, i.key, i.value, i.agent_id, i.created_at, i.ttl, bm25(insights_fts) as rank
      FROM insights_fts f
      JOIN insights i ON f.id = i.id
      WHERE insights_fts MATCH ?
    `;
        const params = [tokens];
        if (topicFilter) {
            sql += " AND i.topic = ?";
            params.push(topicFilter);
        }
        sql += " ORDER BY rank ASC LIMIT 20";
        try {
            const stmt = this.db.prepare(sql);
            const rows = stmt.all(...params);
            return rows.map((r) => ({
                id: r.id,
                topic: r.topic,
                key: r.key,
                value: r.value,
                agentId: r.agent_id,
                createdAt: Number(r.created_at),
                ttl: Number(r.ttl),
                relevanceScore: Math.abs(Number(r.rank)),
            }));
        }
        catch {
            // Fallback to substring LIKE search if FTS syntax edge case occurs
            return this.fallbackLikeSearch(naturalQuery, topicFilter);
        }
    }
    fallbackLikeSearch(term, topicFilter) {
        let sql = `
      SELECT id, topic, key, value, agent_id, created_at, ttl
      FROM insights
      WHERE (value LIKE ? OR key LIKE ?)
    `;
        const params = [`%${term}%`, `%${term}%`];
        if (topicFilter) {
            sql += " AND topic = ?";
            params.push(topicFilter);
        }
        sql += " ORDER BY created_at DESC LIMIT 20";
        const stmt = this.db.prepare(sql);
        const rows = stmt.all(...params);
        return rows.map((r) => ({
            id: r.id,
            topic: r.topic,
            key: r.key,
            value: r.value,
            agentId: r.agent_id,
            createdAt: Number(r.created_at),
            ttl: Number(r.ttl),
        }));
    }
    listTopics() {
        this.cleanup();
        const stmt = this.db.prepare(`
      SELECT topic, COUNT(*) as count
      FROM insights
      GROUP BY topic
      ORDER BY count DESC
    `);
        const rows = stmt.all();
        return rows.map((r) => ({ topic: r.topic, count: Number(r.count) }));
    }
    getStats() {
        this.cleanup();
        const totalStmt = this.db.prepare("SELECT COUNT(*) as count FROM insights");
        const total = Number(totalStmt.get()?.count || 0);
        const topics = this.listTopics();
        const topicsBreakdown = {};
        for (const t of topics) {
            topicsBreakdown[t.topic] = t.count;
        }
        const agentsStmt = this.db.prepare("SELECT DISTINCT agent_id FROM insights");
        const agents = agentsStmt.all().map((a) => a.agent_id);
        return {
            totalInsights: total,
            totalTopics: topics.length,
            activeAgents: agents,
            topicsBreakdown,
        };
    }
    clear(topic) {
        let count = 0;
        if (topic) {
            const delStmt = this.db.prepare("DELETE FROM insights WHERE topic = ?");
            const res = delStmt.run(topic);
            count = Number(res.changes);
            this.db.prepare("DELETE FROM insights_fts WHERE topic = ?").run(topic);
        }
        else {
            const delStmt = this.db.prepare("DELETE FROM insights");
            const res = delStmt.run();
            count = Number(res.changes);
            this.db.prepare("DELETE FROM insights_fts").run();
        }
        return count;
    }
    cleanup() {
        const now = Date.now();
        // Delete expired entries (where ttl > 0 and now - created_at > ttl * 1000)
        const expiredRows = this.db
            .prepare("SELECT id FROM insights WHERE ttl > 0 AND (? - created_at) > (ttl * 1000)")
            .all(now);
        if (expiredRows.length > 0) {
            const delInsight = this.db.prepare("DELETE FROM insights WHERE id = ?");
            const delFts = this.db.prepare("DELETE FROM insights_fts WHERE id = ?");
            for (const row of expiredRows) {
                delInsight.run(row.id);
                delFts.run(row.id);
            }
        }
    }
}
//# sourceMappingURL=blackboard.js.map