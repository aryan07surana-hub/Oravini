-- Knowledge Graph Migration
-- Obsidian-style second brain for Content & Niche Intelligence

-- Nodes table (unified for all node types)
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  node_type VARCHAR(50) NOT NULL, -- 'content', 'hook', 'topic', 'competitor', 'brand_voice', 'project', 'idea', 'note'
  title TEXT NOT NULL,
  content TEXT,
  metadata JSONB DEFAULT '{}', -- flexible storage for type-specific data
  viral_score DECIMAL(3,1) DEFAULT 0,
  funnel_stage VARCHAR(20), -- 'top', 'middle', 'bottom', NULL
  platform VARCHAR(50), -- 'instagram', 'youtube', 'linkedin', 'tiktok', NULL
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'archived', 'draft', 'published'
  position_x DECIMAL(10,2), -- for saving graph position
  position_y DECIMAL(10,2), -- for saving graph position
  color VARCHAR(7), -- hex color for custom node colors
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Edges table (connections between nodes)
CREATE TABLE IF NOT EXISTS knowledge_edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  target_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  edge_type VARCHAR(50) NOT NULL, -- 'references', 'similar_to', 'inspired_by', 'evolved_from', 'part_of', 'uses_hook'
  strength DECIMAL(3,2) DEFAULT 0.5, -- 0-1, how strong the connection is
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(source_id, target_id, edge_type) -- prevent duplicate edges
);

-- Projects table (for project management)
CREATE TABLE IF NOT EXISTS knowledge_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'archived'
  start_date DATE,
  end_date DATE,
  color VARCHAR(7), -- hex color
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Project nodes (many-to-many relationship)
CREATE TABLE IF NOT EXISTS project_nodes (
  project_id UUID NOT NULL REFERENCES knowledge_projects(id) ON DELETE CASCADE,
  node_id UUID NOT NULL REFERENCES knowledge_nodes(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (project_id, node_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_user_id ON knowledge_nodes(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_node_type ON knowledge_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_funnel_stage ON knowledge_nodes(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_platform ON knowledge_nodes(platform);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_tags ON knowledge_nodes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_created_at ON knowledge_nodes(created_at);

CREATE INDEX IF NOT EXISTS idx_knowledge_edges_user_id ON knowledge_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_source_id ON knowledge_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_target_id ON knowledge_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_edges_edge_type ON knowledge_edges(edge_type);

CREATE INDEX IF NOT EXISTS idx_knowledge_projects_user_id ON knowledge_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_projects_status ON knowledge_projects(status);

CREATE INDEX IF NOT EXISTS idx_project_nodes_project_id ON project_nodes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_nodes_node_id ON project_nodes(node_id);

-- Full-text search on nodes
CREATE INDEX IF NOT EXISTS idx_knowledge_nodes_search ON knowledge_nodes USING GIN(to_tsvector('english', title || ' ' || COALESCE(content, '')));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER knowledge_nodes_updated_at
  BEFORE UPDATE ON knowledge_nodes
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

CREATE TRIGGER knowledge_projects_updated_at
  BEFORE UPDATE ON knowledge_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_updated_at();

-- Migration function to import existing content intelligence data
CREATE OR REPLACE FUNCTION migrate_content_to_knowledge_graph(p_user_id INTEGER)
RETURNS TABLE(
  nodes_created INTEGER,
  edges_created INTEGER
) AS $$
DECLARE
  v_nodes_created INTEGER := 0;
  v_edges_created INTEGER := 0;
  v_hook_record RECORD;
  v_pattern_record RECORD;
  v_calendar_record RECORD;
  v_hook_node_id UUID;
  v_content_node_id UUID;
  v_project_node_id UUID;
BEGIN
  -- 1. Migrate hooks from hook_library to nodes
  FOR v_hook_record IN 
    SELECT * FROM hook_library WHERE user_id = p_user_id OR user_id IS NULL
  LOOP
    INSERT INTO knowledge_nodes (
      user_id, node_type, title, content, metadata, viral_score, funnel_stage, platform, tags
    ) VALUES (
      COALESCE(v_hook_record.user_id, p_user_id),
      'hook',
      v_hook_record.hook,
      v_hook_record.description,
      jsonb_build_object(
        'hookType', v_hook_record.hook_type,
        'category', v_hook_record.category,
        'avgViews', v_hook_record.avg_views,
        'avgEngagement', v_hook_record.avg_engagement,
        'niche', v_hook_record.niche
      ),
      v_hook_record.viral_score,
      NULL,
      v_hook_record.platform,
      ARRAY[v_hook_record.hook_type, v_hook_record.niche]
    ) RETURNING id INTO v_hook_node_id;
    
    v_nodes_created := v_nodes_created + 1;
  END LOOP;

  -- 2. Migrate winning patterns to content nodes
  FOR v_pattern_record IN 
    SELECT * FROM winning_patterns WHERE user_id = p_user_id
  LOOP
    INSERT INTO knowledge_nodes (
      user_id, node_type, title, content, metadata, viral_score, funnel_stage, platform, tags, status
    ) VALUES (
      v_pattern_record.user_id,
      'content',
      v_pattern_record.hook,
      v_pattern_record.body,
      jsonb_build_object(
        'hookType', v_pattern_record.hook_type,
        'structure', v_pattern_record.structure,
        'views', v_pattern_record.views,
        'engagementRate', v_pattern_record.engagement_rate,
        'performanceReason', v_pattern_record.performance_reason,
        'cta', v_pattern_record.cta
      ),
      v_pattern_record.viral_score,
      v_pattern_record.funnel_stage,
      v_pattern_record.platform,
      ARRAY[v_pattern_record.hook_type, v_pattern_record.funnel_stage],
      'published'
    ) RETURNING id INTO v_content_node_id;
    
    v_nodes_created := v_nodes_created + 1;

    -- Create edge from content to hook if hook exists
    IF EXISTS (
      SELECT 1 FROM knowledge_nodes 
      WHERE user_id = p_user_id 
      AND node_type = 'hook' 
      AND title = v_pattern_record.hook
    ) THEN
      INSERT INTO knowledge_edges (user_id, source_id, target_id, edge_type, strength)
      SELECT p_user_id, v_content_node_id, id, 'uses_hook', 0.9
      FROM knowledge_nodes
      WHERE user_id = p_user_id 
      AND node_type = 'hook' 
      AND title = v_pattern_record.hook
      LIMIT 1;
      
      v_edges_created := v_edges_created + 1;
    END IF;
  END LOOP;

  -- 3. Migrate content calendars to project nodes
  FOR v_calendar_record IN 
    SELECT * FROM content_calendars WHERE user_id = p_user_id
  LOOP
    INSERT INTO knowledge_projects (
      user_id, name, description, status, start_date, end_date, metadata
    ) VALUES (
      v_calendar_record.user_id,
      v_calendar_record.month || ' Content Calendar',
      'Platform: ' || v_calendar_record.platform || ' | Strategy: ' || v_calendar_record.strategy,
      CASE 
        WHEN v_calendar_record.month >= to_char(CURRENT_DATE, 'YYYY-MM') THEN 'active'
        ELSE 'completed'
      END,
      (v_calendar_record.month || '-01')::DATE,
      (v_calendar_record.month || '-01')::DATE + INTERVAL '1 month' - INTERVAL '1 day',
      jsonb_build_object(
        'platform', v_calendar_record.platform,
        'niche', v_calendar_record.niche,
        'goal', v_calendar_record.goal,
        'strategy', v_calendar_record.strategy,
        'tofuPercent', v_calendar_record.tofu_percent,
        'mofuPercent', v_calendar_record.mofu_percent,
        'bofuPercent', v_calendar_record.bofu_percent
      )
    ) RETURNING id INTO v_project_node_id;
    
    v_nodes_created := v_nodes_created + 1;
  END LOOP;

  RETURN QUERY SELECT v_nodes_created, v_edges_created;
END;
$$ LANGUAGE plpgsql;

-- View for graph analytics
CREATE OR REPLACE VIEW knowledge_graph_stats AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE node_type = 'content') as content_count,
  COUNT(*) FILTER (WHERE node_type = 'hook') as hook_count,
  COUNT(*) FILTER (WHERE node_type = 'topic') as topic_count,
  COUNT(*) FILTER (WHERE node_type = 'competitor') as competitor_count,
  COUNT(*) FILTER (WHERE node_type = 'project') as project_count,
  COUNT(*) FILTER (WHERE node_type = 'idea') as idea_count,
  AVG(viral_score) FILTER (WHERE viral_score > 0) as avg_viral_score,
  COUNT(*) FILTER (WHERE funnel_stage = 'top') as tofu_count,
  COUNT(*) FILTER (WHERE funnel_stage = 'middle') as mofu_count,
  COUNT(*) FILTER (WHERE funnel_stage = 'bottom') as bofu_count
FROM knowledge_nodes
GROUP BY user_id;

COMMENT ON TABLE knowledge_nodes IS 'Unified nodes for knowledge graph - content, hooks, topics, competitors, brand voice, projects, ideas, notes';
COMMENT ON TABLE knowledge_edges IS 'Connections between knowledge nodes';
COMMENT ON TABLE knowledge_projects IS 'Projects for organizing nodes';
COMMENT ON TABLE project_nodes IS 'Many-to-many relationship between projects and nodes';
