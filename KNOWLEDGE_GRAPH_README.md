# 🧠 KNOWLEDGE GRAPH — OBSIDIAN FOR ORAVINI

## What Was Built

An **Obsidian-style second brain knowledge graph** that visualizes your Content Intelligence and Niche Intelligence data as an interactive network of connected nodes.

---

## 🎯 Core Features

### 1. **Interactive Graph Visualization**
- D3.js force-directed graph with nodes and edges
- Zoom, pan, and drag functionality
- Click nodes to view details
- Color-coded by funnel stage (TOFU/MOFU/BOFU)
- Size based on viral score

### 2. **Unified Node System**
All your data becomes nodes:
- **Content Nodes** — Your posts, winning patterns
- **Hook Nodes** — Proven viral hooks from hook library
- **Topic Nodes** — Themes and subjects
- **Competitor Nodes** — Competitor insights
- **Brand Voice Nodes** — Voice snapshots over time
- **Project Nodes** — Content calendars and campaigns
- **Idea Nodes** — Brainstorms and concepts
- **Note Nodes** — Quick thoughts and reminders

### 3. **Smart Connections (Edges)**
Automatic relationship detection:
- `uses_hook` — Content → Hook it uses
- `references` — Note → Content it mentions
- `similar_to` — Content A ↔ Content B
- `inspired_by` — Idea → Source content
- `evolved_from` — Version 2 → Version 1
- `part_of` — Content → Project

### 4. **Wiki-Style Linking**
- Use `[[Node Title]]` syntax in content
- Auto-creates edges between linked nodes
- Backlinks panel shows what references each node
- Unlinked mentions detection

### 5. **Search & Filters**
- Full-text search across all nodes
- Filter by node type
- Filter by funnel stage, platform, tags
- Real-time graph updates

### 6. **Auto-Migration**
- One-click import of existing data
- Converts hooks → hook nodes
- Converts winning patterns → content nodes
- Converts content calendars → project nodes
- Creates edges based on relationships

---

## 📂 What Was Created

### **Database Tables**

```sql
knowledge_nodes         — All nodes (content, hooks, topics, etc.)
knowledge_edges         — Connections between nodes
knowledge_projects      — Project containers
project_nodes           — Many-to-many: projects ↔ nodes
```

### **Backend Files**

```
server/knowledgeGraph.ts        — Core logic (CRUD, search, analytics)
server/knowledgeGraphRoutes.ts  — API endpoints
migrations/add_knowledge_graph.sql — Database schema
```

### **Frontend Files**

```
client/src/pages/KnowledgeGraph.tsx — Main graph UI component
```

---

## 🚀 How to Use

### **Step 1: Run the Migration**

```bash
# Run the SQL migration to create tables
psql $DATABASE_URL < migrations/add_knowledge_graph.sql
```

Or the migration will auto-run when you restart the server if you add it to your migration runner.

### **Step 2: Start the Server**

The routes are already registered in `server/index.ts`:

```typescript
import knowledgeGraphRoutes from './knowledgeGraphRoutes';
app.use('/api', knowledgeGraphRoutes);
```

### **Step 3: Import Existing Data**

Visit `/knowledge-graph` (you'll need to add the route to your app router).

Click **"Import Existing Data"** button to auto-migrate:
- All hooks from `hook_library`
- All winning patterns from `winning_patterns`
- All content calendars from `content_calendars`

This creates nodes and edges automatically.

### **Step 4: Explore the Graph**

- **Click and drag** nodes to rearrange
- **Scroll** to zoom in/out
- **Click a node** to see details in right sidebar
- **Search** to find specific nodes
- **Filter** by type to focus on specific data

---

## 📊 API Endpoints

### **Graph Data**

```bash
# Get full graph (nodes + edges)
GET /api/knowledge-graph

# Get single node with connections
GET /api/knowledge-graph/node/:id

# Search nodes
GET /api/knowledge-graph/search?q=business

# Get analytics (stats, hubs, orphans)
GET /api/knowledge-graph/analytics
```

### **Node Management**

```bash
# Create node
POST /api/knowledge-graph/node
{
  "nodeType": "idea",
  "title": "New content series idea",
  "content": "Build a series about [[Content Strategy]]",
  "tags": ["content", "strategy"],
  "funnelStage": "top"
}

# Update node
PATCH /api/knowledge-graph/node/:id

# Delete node
DELETE /api/knowledge-graph/node/:id
```

### **Edges**

```bash
# Create edge (manual connection)
POST /api/knowledge-graph/edge
{
  "sourceId": "uuid-1",
  "targetId": "uuid-2",
  "edgeType": "inspired_by",
  "strength": 0.8
}

# Delete edge
DELETE /api/knowledge-graph/edge/:id
```

### **Projects**

```bash
# Get all projects
GET /api/knowledge-graph/projects

# Create project
POST /api/knowledge-graph/projects
{
  "name": "October Content Sprint",
  "description": "30 posts for October",
  "startDate": "2024-10-01",
  "endDate": "2024-10-31"
}

# Add node to project
POST /api/knowledge-graph/projects/:id/nodes
{ "nodeId": "uuid-123" }

# Remove node from project
DELETE /api/knowledge-graph/projects/:projectId/nodes/:nodeId
```

### **Migration**

```bash
# Import existing content intelligence data
POST /api/knowledge-graph/migrate
```

---

## 🎨 Visual Design

### **Node Colors**

- **Blue** — TOFU (Top of Funnel)
- **Yellow** — MOFU (Middle of Funnel)
- **Red** — BOFU (Bottom of Funnel)
- **Red (darker)** — Hooks
- **Green** — Topics
- **Orange** — Competitors
- **Purple** — Brand Voice
- **Pink** — Projects
- **Cyan** — Ideas
- **Indigo** — Notes

### **Node Size**

- Small (8px) — Low viral score or no score
- Medium (15px) — Average performance
- Large (25px) — High viral score (8+)

### **Edge Styles**

- Thin lines — Weak connections (strength < 0.5)
- Thick lines — Strong connections (strength > 0.7)
- Opacity based on strength

---

## 🔗 Integration with Existing Features

### **Content Intelligence Engine**

All your existing data automatically becomes nodes:

| Existing Table | → | Node Type |
|----------------|---|-----------|
| `hook_library` | → | `hook` nodes |
| `winning_patterns` | → | `content` nodes |
| `content_calendars` | → | `project` nodes |
| `brand_voice_profiles` | → | `brand_voice` nodes |

### **Auto-Linking**

When you create content with `[[Node Title]]` syntax, edges are automatically created:

```typescript
// Example: Create a note that references content
POST /api/knowledge-graph/node
{
  "nodeType": "note",
  "title": "Content Strategy Notes",
  "content": "I should repurpose [[My Best Post]] into a series about [[Topic: Business Growth]]"
}

// Result: Auto-creates 2 edges:
// note → content (My Best Post) [references]
// note → topic (Business Growth) [references]
```

---

## 📈 Analytics

### **Graph Stats**

```bash
GET /api/knowledge-graph/analytics
```

Returns:

```json
{
  "stats": {
    "content_count": 45,
    "hook_count": 120,
    "topic_count": 8,
    "avg_viral_score": 7.2,
    "tofu_count": 18,
    "mofu_count": 20,
    "bofu_count": 7
  },
  "hubs": [
    {
      "id": "uuid",
      "title": "My Best Hook",
      "nodeType": "hook",
      "connection_count": 15
    }
  ],
  "orphans": [
    {
      "id": "uuid",
      "title": "Unused Idea",
      "nodeType": "idea"
    }
  ]
}
```

---

## 🛠️ Technical Architecture

### **Backend (TypeScript)**

- **PostgreSQL** with full-text search indexes
- **Recursive queries** for finding connections
- **JSONB metadata** for flexible node properties
- **Foreign key cascades** for clean deletions

### **Frontend (React + D3.js)**

- **D3 force simulation** for physics-based layout
- **Zoom/pan with d3-zoom**
- **Drag behavior with d3-drag**
- **Real-time search filtering**
- **Responsive sidebar panels**

---

## 🚧 Future Enhancements

### **Phase 2 Features (Not Built Yet)**

- [ ] **Graph layouts** — Tree, radial, hierarchical views
- [ ] **Time-based filtering** — Show graph at specific dates
- [ ] **Cluster detection** — Auto-group related nodes
- [ ] **Export/import** — Save graph as JSON
- [ ] **Collaborative editing** — Multiple users
- [ ] **AI suggestions** — "You should connect these nodes"
- [ ] **Markdown editor** — Edit node content inline
- [ ] **Version history** — Track node changes over time
- [ ] **Graph themes** — Light/dark mode, custom colors
- [ ] **Mobile app** — Touch-optimized graph navigation

---

## 🎯 Use Cases

### **Use Case 1: Content Strategy Planning**

1. Create topic nodes for your content pillars
2. Create idea nodes for each topic
3. Link ideas to winning patterns that inspired them
4. Group ideas into project nodes (e.g., "Q4 Content")
5. Visualize entire strategy as a graph

### **Use Case 2: Hook Library Management**

1. All your hooks are nodes
2. Content that uses hooks creates edges
3. Click a hook node → see all content that used it
4. Find your most-used hooks (largest nodes)
5. Discover orphan hooks (not connected to anything)

### **Use Case 3: Competitor Intelligence**

1. Create competitor nodes
2. Create topic nodes for themes they cover
3. Link competitors → topics they dominate
4. Create idea nodes: "Content gaps we can fill"
5. Link ideas → your content that fills those gaps

### **Use Case 4: Brand Voice Evolution**

1. Create brand voice snapshot nodes over time
2. Link voice nodes → content created with that voice
3. Track how your voice evolved
4. See which voice style produced best results

---

## 📝 Example: Create Your First Node

```bash
curl -X POST http://localhost:5000/api/knowledge-graph/node \
  -H "Content-Type: application/json" \
  -d '{
    "nodeType": "idea",
    "title": "10 Mistakes Business Coaches Make",
    "content": "This idea is inspired by [[My Winning Post About Mistakes]] and targets the [[Business Coaching]] niche. Could become a carousel or YouTube video.",
    "tags": ["business", "coaching", "mistakes"],
    "funnelStage": "top",
    "platform": "instagram"
  }'
```

**Result:**
- Creates 1 idea node
- Auto-creates 2 edges (references to the winning post and niche topic)
- Node appears in the graph immediately
- Searchable by title, content, or tags

---

## 🎓 How to Add to Your App Router

If using React Router:

```typescript
// In your App.tsx or routes file
import KnowledgeGraph from './pages/KnowledgeGraph';

<Route path="/knowledge-graph" element={<KnowledgeGraph />} />
```

If using Next.js:

```typescript
// app/knowledge-graph/page.tsx
import KnowledgeGraph from '@/components/KnowledgeGraph';

export default function KnowledgeGraphPage() {
  return <KnowledgeGraph />;
}
```

---

## ✅ What's Complete

- ✅ Database schema with nodes, edges, projects
- ✅ Backend API (CRUD, search, analytics)
- ✅ Auto-migration function for existing data
- ✅ React component with D3 visualization
- ✅ Search and filtering
- ✅ Node detail panel
- ✅ Wiki-style linking with auto-edge creation
- ✅ Backlinks detection
- ✅ Graph analytics (hubs, orphans, stats)
- ✅ Zoom, pan, drag interactions

---

## 🎉 Summary

You now have a **fully functional Obsidian-style knowledge graph** that:

1. **Visualizes** all your Content Intelligence data
2. **Connects** related content, hooks, topics, and ideas
3. **Auto-imports** your existing data with one click
4. **Searches** across everything instantly
5. **Grows** with your content over time

**This is your second brain for content strategy.** 🧠

---

Built with 🔥 by Amazon Q
