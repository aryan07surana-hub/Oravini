import { db } from '../db';
import type { Request, Response } from 'express';

// Types
export interface KnowledgeNode {
  id: string;
  userId: number;
  nodeType: 'content' | 'hook' | 'topic' | 'competitor' | 'brand_voice' | 'project' | 'idea' | 'note';
  title: string;
  content?: string;
  metadata?: any;
  viralScore?: number;
  funnelStage?: 'top' | 'middle' | 'bottom';
  platform?: string;
  tags?: string[];
  status?: string;
  positionX?: number;
  positionY?: number;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeEdge {
  id: string;
  userId: number;
  sourceId: string;
  targetId: string;
  edgeType: 'references' | 'similar_to' | 'inspired_by' | 'evolved_from' | 'part_of' | 'uses_hook';
  strength?: number;
  metadata?: any;
  createdAt: Date;
}

export interface KnowledgeProject {
  id: string;
  userId: number;
  name: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  startDate?: Date;
  endDate?: Date;
  color?: string;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphData {
  nodes: KnowledgeNode[];
  edges: KnowledgeEdge[];
  projects: KnowledgeProject[];
}

// Get full knowledge graph for user
export async function getKnowledgeGraph(userId: number): Promise<GraphData> {
  const nodes = await db.query(
    `SELECT 
      id, user_id as "userId", node_type as "nodeType", title, content,
      metadata, viral_score as "viralScore", funnel_stage as "funnelStage",
      platform, tags, status, position_x as "positionX", position_y as "positionY",
      color, created_at as "createdAt", updated_at as "updatedAt"
    FROM knowledge_nodes 
    WHERE user_id = $1 
    ORDER BY created_at DESC`,
    [userId]
  );

  const edges = await db.query(
    `SELECT 
      id, user_id as "userId", source_id as "sourceId", target_id as "targetId",
      edge_type as "edgeType", strength, metadata, created_at as "createdAt"
    FROM knowledge_edges 
    WHERE user_id = $1`,
    [userId]
  );

  const projects = await db.query(
    `SELECT 
      id, user_id as "userId", name, description, status,
      start_date as "startDate", end_date as "endDate", color,
      metadata, created_at as "createdAt", updated_at as "updatedAt"
    FROM knowledge_projects 
    WHERE user_id = $1 
    ORDER BY created_at DESC`,
    [userId]
  );

  return {
    nodes: nodes.rows,
    edges: edges.rows,
    projects: projects.rows
  };
}

// Get single node with related data
export async function getNode(nodeId: string, userId: number) {
  const node = await db.query(
    `SELECT 
      id, user_id as "userId", node_type as "nodeType", title, content,
      metadata, viral_score as "viralScore", funnel_stage as "funnelStage",
      platform, tags, status, position_x as "positionX", position_y as "positionY",
      color, created_at as "createdAt", updated_at as "updatedAt"
    FROM knowledge_nodes 
    WHERE id = $1 AND user_id = $2`,
    [nodeId, userId]
  );

  if (node.rows.length === 0) {
    return null;
  }

  // Get connected nodes (both incoming and outgoing)
  const connections = await db.query(
    `SELECT 
      e.id, e.edge_type as "edgeType", e.strength,
      n.id as "nodeId", n.node_type as "nodeType", n.title, n.viral_score as "viralScore",
      CASE 
        WHEN e.source_id = $1 THEN 'outgoing'
        ELSE 'incoming'
      END as direction
    FROM knowledge_edges e
    JOIN knowledge_nodes n ON (
      CASE 
        WHEN e.source_id = $1 THEN n.id = e.target_id
        ELSE n.id = e.source_id
      END
    )
    WHERE (e.source_id = $1 OR e.target_id = $1) AND e.user_id = $2`,
    [nodeId, userId]
  );

  // Get projects this node belongs to
  const projectsData = await db.query(
    `SELECT p.id, p.name, p.status, p.color
    FROM knowledge_projects p
    JOIN project_nodes pn ON pn.project_id = p.id
    WHERE pn.node_id = $1 AND p.user_id = $2`,
    [nodeId, userId]
  );

  // Get backlinks (nodes that reference this node in content using [[title]])
  const backlinks = await db.query(
    `SELECT id, node_type as "nodeType", title, viral_score as "viralScore"
    FROM knowledge_nodes
    WHERE user_id = $1 
    AND id != $2
    AND (content LIKE $3 OR content LIKE $4)
    LIMIT 20`,
    [userId, nodeId, `%[[${node.rows[0].title}]]%`, `%[[${node.rows[0].title.toLowerCase()}]]%`]
  );

  return {
    ...node.rows[0],
    connections: connections.rows,
    projects: projectsData.rows,
    backlinks: backlinks.rows
  };
}

// Create new node
export async function createNode(userId: number, data: Partial<KnowledgeNode>) {
  const result = await db.query(
    `INSERT INTO knowledge_nodes (
      user_id, node_type, title, content, metadata, viral_score,
      funnel_stage, platform, tags, status, color
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING 
      id, user_id as "userId", node_type as "nodeType", title, content,
      metadata, viral_score as "viralScore", funnel_stage as "funnelStage",
      platform, tags, status, color, created_at as "createdAt", updated_at as "updatedAt"`,
    [
      userId,
      data.nodeType || 'note',
      data.title,
      data.content || null,
      data.metadata ? JSON.stringify(data.metadata) : '{}',
      data.viralScore || 0,
      data.funnelStage || null,
      data.platform || null,
      data.tags || [],
      data.status || 'active',
      data.color || null
    ]
  );

  // Auto-detect links in content and create edges
  if (data.content) {
    await autoCreateEdgesFromContent(userId, result.rows[0].id, data.content);
  }

  return result.rows[0];
}

// Update node
export async function updateNode(nodeId: string, userId: number, data: Partial<KnowledgeNode>) {
  const setClauses: string[] = [];
  const values: any[] = [];
  let paramCounter = 1;

  if (data.title !== undefined) {
    setClauses.push(`title = $${paramCounter++}`);
    values.push(data.title);
  }
  if (data.content !== undefined) {
    setClauses.push(`content = $${paramCounter++}`);
    values.push(data.content);
  }
  if (data.metadata !== undefined) {
    setClauses.push(`metadata = $${paramCounter++}`);
    values.push(JSON.stringify(data.metadata));
  }
  if (data.viralScore !== undefined) {
    setClauses.push(`viral_score = $${paramCounter++}`);
    values.push(data.viralScore);
  }
  if (data.funnelStage !== undefined) {
    setClauses.push(`funnel_stage = $${paramCounter++}`);
    values.push(data.funnelStage);
  }
  if (data.platform !== undefined) {
    setClauses.push(`platform = $${paramCounter++}`);
    values.push(data.platform);
  }
  if (data.tags !== undefined) {
    setClauses.push(`tags = $${paramCounter++}`);
    values.push(data.tags);
  }
  if (data.status !== undefined) {
    setClauses.push(`status = $${paramCounter++}`);
    values.push(data.status);
  }
  if (data.positionX !== undefined) {
    setClauses.push(`position_x = $${paramCounter++}`);
    values.push(data.positionX);
  }
  if (data.positionY !== undefined) {
    setClauses.push(`position_y = $${paramCounter++}`);
    values.push(data.positionY);
  }
  if (data.color !== undefined) {
    setClauses.push(`color = $${paramCounter++}`);
    values.push(data.color);
  }

  if (setClauses.length === 0) {
    return null;
  }

  values.push(nodeId, userId);

  const result = await db.query(
    `UPDATE knowledge_nodes 
    SET ${setClauses.join(', ')}
    WHERE id = $${paramCounter++} AND user_id = $${paramCounter++}
    RETURNING 
      id, user_id as "userId", node_type as "nodeType", title, content,
      metadata, viral_score as "viralScore", funnel_stage as "funnelStage",
      platform, tags, status, position_x as "positionX", position_y as "positionY",
      color, created_at as "createdAt", updated_at as "updatedAt"`,
    values
  );

  // Update edges if content changed
  if (data.content !== undefined) {
    await autoCreateEdgesFromContent(userId, nodeId, data.content);
  }

  return result.rows[0];
}

// Delete node
export async function deleteNode(nodeId: string, userId: number) {
  await db.query(
    `DELETE FROM knowledge_nodes WHERE id = $1 AND user_id = $2`,
    [nodeId, userId]
  );
  return { success: true };
}

// Create edge
export async function createEdge(userId: number, data: {
  sourceId: string;
  targetId: string;
  edgeType: string;
  strength?: number;
  metadata?: any;
}) {
  const result = await db.query(
    `INSERT INTO knowledge_edges (
      user_id, source_id, target_id, edge_type, strength, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (source_id, target_id, edge_type) DO UPDATE
    SET strength = $5, metadata = $6
    RETURNING 
      id, user_id as "userId", source_id as "sourceId", target_id as "targetId",
      edge_type as "edgeType", strength, metadata, created_at as "createdAt"`,
    [
      userId,
      data.sourceId,
      data.targetId,
      data.edgeType,
      data.strength || 0.5,
      data.metadata ? JSON.stringify(data.metadata) : '{}'
    ]
  );

  return result.rows[0];
}

// Delete edge
export async function deleteEdge(edgeId: string, userId: number) {
  await db.query(
    `DELETE FROM knowledge_edges WHERE id = $1 AND user_id = $2`,
    [edgeId, userId]
  );
  return { success: true };
}

// Auto-detect [[wiki-style links]] in content and create edges
async function autoCreateEdgesFromContent(userId: number, nodeId: string, content: string) {
  // Find all [[title]] patterns
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const matches = content.matchAll(linkRegex);

  for (const match of matches) {
    const linkedTitle = match[1];
    
    // Find node with this title
    const targetNode = await db.query(
      `SELECT id FROM knowledge_nodes 
      WHERE user_id = $1 AND LOWER(title) = LOWER($2) AND id != $3
      LIMIT 1`,
      [userId, linkedTitle, nodeId]
    );

    if (targetNode.rows.length > 0) {
      // Create edge
      await createEdge(userId, {
        sourceId: nodeId,
        targetId: targetNode.rows[0].id,
        edgeType: 'references',
        strength: 0.8
      });
    }
  }
}

// Search nodes
export async function searchNodes(userId: number, query: string, filters?: {
  nodeType?: string;
  funnelStage?: string;
  platform?: string;
  tags?: string[];
}) {
  let sql = `
    SELECT 
      id, user_id as "userId", node_type as "nodeType", title, content,
      metadata, viral_score as "viralScore", funnel_stage as "funnelStage",
      platform, tags, status, color, created_at as "createdAt",
      ts_rank(to_tsvector('english', title || ' ' || COALESCE(content, '')), plainto_tsquery('english', $2)) as rank
    FROM knowledge_nodes 
    WHERE user_id = $1
    AND to_tsvector('english', title || ' ' || COALESCE(content, '')) @@ plainto_tsquery('english', $2)
  `;

  const params: any[] = [userId, query];
  let paramCounter = 3;

  if (filters?.nodeType) {
    sql += ` AND node_type = $${paramCounter++}`;
    params.push(filters.nodeType);
  }

  if (filters?.funnelStage) {
    sql += ` AND funnel_stage = $${paramCounter++}`;
    params.push(filters.funnelStage);
  }

  if (filters?.platform) {
    sql += ` AND platform = $${paramCounter++}`;
    params.push(filters.platform);
  }

  if (filters?.tags && filters.tags.length > 0) {
    sql += ` AND tags && $${paramCounter++}`;
    params.push(filters.tags);
  }

  sql += ` ORDER BY rank DESC, viral_score DESC NULLS LAST LIMIT 50`;

  const result = await db.query(sql, params);
  return result.rows;
}

// Get graph analytics
export async function getGraphAnalytics(userId: number) {
  const stats = await db.query(
    `SELECT * FROM knowledge_graph_stats WHERE user_id = $1`,
    [userId]
  );

  // Get most connected nodes (hub nodes)
  const hubs = await db.query(
    `SELECT 
      n.id, n.node_type as "nodeType", n.title, n.viral_score as "viralScore",
      COUNT(e.id) as connection_count
    FROM knowledge_nodes n
    LEFT JOIN knowledge_edges e ON (e.source_id = n.id OR e.target_id = n.id) AND e.user_id = $1
    WHERE n.user_id = $1
    GROUP BY n.id, n.node_type, n.title, n.viral_score
    ORDER BY connection_count DESC
    LIMIT 10`,
    [userId]
  );

  // Get orphan nodes (no connections)
  const orphans = await db.query(
    `SELECT 
      n.id, n.node_type as "nodeType", n.title, n.created_at as "createdAt"
    FROM knowledge_nodes n
    LEFT JOIN knowledge_edges e ON (e.source_id = n.id OR e.target_id = n.id) AND e.user_id = $1
    WHERE n.user_id = $1
    GROUP BY n.id, n.node_type, n.title, n.created_at
    HAVING COUNT(e.id) = 0
    ORDER BY n.created_at DESC
    LIMIT 20`,
    [userId]
  );

  return {
    stats: stats.rows[0] || {},
    hubs: hubs.rows,
    orphans: orphans.rows
  };
}

// Migrate existing content intelligence data to knowledge graph
export async function migrateContentToGraph(userId: number) {
  const result = await db.query(
    `SELECT * FROM migrate_content_to_knowledge_graph($1)`,
    [userId]
  );

  return result.rows[0];
}

// Create project
export async function createProject(userId: number, data: Partial<KnowledgeProject>) {
  const result = await db.query(
    `INSERT INTO knowledge_projects (
      user_id, name, description, status, start_date, end_date, color, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING 
      id, user_id as "userId", name, description, status,
      start_date as "startDate", end_date as "endDate", color,
      metadata, created_at as "createdAt", updated_at as "updatedAt"`,
    [
      userId,
      data.name,
      data.description || null,
      data.status || 'active',
      data.startDate || null,
      data.endDate || null,
      data.color || null,
      data.metadata ? JSON.stringify(data.metadata) : '{}'
    ]
  );

  return result.rows[0];
}

// Add node to project
export async function addNodeToProject(projectId: string, nodeId: string, userId: number) {
  // Verify project and node belong to user
  const verification = await db.query(
    `SELECT 
      (SELECT user_id FROM knowledge_projects WHERE id = $1) as project_user,
      (SELECT user_id FROM knowledge_nodes WHERE id = $2) as node_user`,
    [projectId, nodeId]
  );

  if (verification.rows[0].project_user !== userId || verification.rows[0].node_user !== userId) {
    throw new Error('Unauthorized');
  }

  await db.query(
    `INSERT INTO project_nodes (project_id, node_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING`,
    [projectId, nodeId]
  );

  return { success: true };
}

// Remove node from project
export async function removeNodeFromProject(projectId: string, nodeId: string) {
  await db.query(
    `DELETE FROM project_nodes WHERE project_id = $1 AND node_id = $2`,
    [projectId, nodeId]
  );
  return { success: true };
}

// Get nodes in project
export async function getProjectNodes(projectId: string, userId: number) {
  const result = await db.query(
    `SELECT 
      n.id, n.node_type as "nodeType", n.title, n.viral_score as "viralScore",
      n.funnel_stage as "funnelStage", n.platform, n.status, n.created_at as "createdAt",
      pn.added_at as "addedAt"
    FROM knowledge_nodes n
    JOIN project_nodes pn ON pn.node_id = n.id
    JOIN knowledge_projects p ON p.id = pn.project_id
    WHERE pn.project_id = $1 AND p.user_id = $2
    ORDER BY pn.added_at DESC`,
    [projectId, userId]
  );

  return result.rows;
}
