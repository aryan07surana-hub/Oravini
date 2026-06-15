import { Router } from 'express';
import type { Request, Response } from 'express';
import * as KnowledgeGraph from './knowledgeGraph';

const router = Router();

// Middleware to check authentication (assuming you have this)
const requireAuth = (req: Request, res: Response, next: any) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
};

// GET /api/knowledge-graph - Get full graph
router.get('/knowledge-graph', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const graph = await KnowledgeGraph.getKnowledgeGraph(userId);
    res.json(graph);
  } catch (error: any) {
    console.error('Error getting knowledge graph:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/knowledge-graph/node/:id - Get single node with details
router.get('/knowledge-graph/node/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    const node = await KnowledgeGraph.getNode(id, userId);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found' });
    }
    
    res.json(node);
  } catch (error: any) {
    console.error('Error getting node:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-graph/node - Create new node
router.post('/knowledge-graph/node', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const nodeData = req.body;
    
    if (!nodeData.title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    const node = await KnowledgeGraph.createNode(userId, nodeData);
    res.json(node);
  } catch (error: any) {
    console.error('Error creating node:', error);
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/knowledge-graph/node/:id - Update node
router.patch('/knowledge-graph/node/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const updates = req.body;
    
    const node = await KnowledgeGraph.updateNode(id, userId, updates);
    
    if (!node) {
      return res.status(404).json({ error: 'Node not found or no changes made' });
    }
    
    res.json(node);
  } catch (error: any) {
    console.error('Error updating node:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/knowledge-graph/node/:id - Delete node
router.delete('/knowledge-graph/node/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    await KnowledgeGraph.deleteNode(id, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting node:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-graph/edge - Create edge
router.post('/knowledge-graph/edge', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const edgeData = req.body;
    
    if (!edgeData.sourceId || !edgeData.targetId || !edgeData.edgeType) {
      return res.status(400).json({ error: 'sourceId, targetId, and edgeType are required' });
    }
    
    const edge = await KnowledgeGraph.createEdge(userId, edgeData);
    res.json(edge);
  } catch (error: any) {
    console.error('Error creating edge:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/knowledge-graph/edge/:id - Delete edge
router.delete('/knowledge-graph/edge/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    await KnowledgeGraph.deleteEdge(id, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting edge:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/knowledge-graph/search - Search nodes
router.get('/knowledge-graph/search', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { q, nodeType, funnelStage, platform, tags } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    
    const filters: any = {};
    if (nodeType) filters.nodeType = nodeType;
    if (funnelStage) filters.funnelStage = funnelStage;
    if (platform) filters.platform = platform;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];
    
    const results = await KnowledgeGraph.searchNodes(userId, q, filters);
    res.json(results);
  } catch (error: any) {
    console.error('Error searching nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/knowledge-graph/analytics - Get graph analytics
router.get('/knowledge-graph/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const analytics = await KnowledgeGraph.getGraphAnalytics(userId);
    res.json(analytics);
  } catch (error: any) {
    console.error('Error getting analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-graph/migrate - Migrate existing content to graph
router.post('/knowledge-graph/migrate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const result = await KnowledgeGraph.migrateContentToGraph(userId);
    res.json({
      success: true,
      message: `Migrated ${result.nodes_created} nodes and created ${result.edges_created} edges`,
      ...result
    });
  } catch (error: any) {
    console.error('Error migrating content:', error);
    res.status(500).json({ error: error.message });
  }
});

// PROJECT ROUTES

// GET /api/knowledge-graph/projects - Get all projects
router.get('/knowledge-graph/projects', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const graph = await KnowledgeGraph.getKnowledgeGraph(userId);
    res.json(graph.projects);
  } catch (error: any) {
    console.error('Error getting projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-graph/projects - Create project
router.post('/knowledge-graph/projects', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const projectData = req.body;
    
    if (!projectData.name) {
      return res.status(400).json({ error: 'Name is required' });
    }
    
    const project = await KnowledgeGraph.createProject(userId, projectData);
    res.json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/knowledge-graph/projects/:id/nodes - Get nodes in project
router.get('/knowledge-graph/projects/:id/nodes', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    
    const nodes = await KnowledgeGraph.getProjectNodes(id, userId);
    res.json(nodes);
  } catch (error: any) {
    console.error('Error getting project nodes:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/knowledge-graph/projects/:id/nodes - Add node to project
router.post('/knowledge-graph/projects/:id/nodes', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { nodeId } = req.body;
    
    if (!nodeId) {
      return res.status(400).json({ error: 'nodeId is required' });
    }
    
    await KnowledgeGraph.addNodeToProject(id, nodeId, userId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error adding node to project:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/knowledge-graph/projects/:projectId/nodes/:nodeId - Remove node from project
router.delete('/knowledge-graph/projects/:projectId/nodes/:nodeId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, nodeId } = req.params;
    
    await KnowledgeGraph.removeNodeFromProject(projectId, nodeId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removing node from project:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
