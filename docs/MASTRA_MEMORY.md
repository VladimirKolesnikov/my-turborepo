# Semantic Long-Term Memory Architecture

### The Challenge: Context Window and Memory Fragmentation
   
Standard LLM agents suffer from two primary limitations regarding memory:
- Context Saturation: As conversations grow, the message history consumes the context window, leading to higher costs and forgetfulness.
- Thread Isolation: Knowledge shared in one chat thread is typically unavailable in another, preventing a seamless experience across sessions.

### Manual Implementation
Without a framework like Mastra, solving this requires building a complex pipeline:
- Knowledge Extraction: Running a secondary background LLM to identify facts from logs.
- Vector Management: Generating embeddings and storing them in a vector database (pgvector).
- Retrieval Logic: Implementing a semantic trigger that performs a similarity search when a user references past events.
- Context Injection: Developing logic to insert retrieved facts into the system prompt.

### Mastra Implementation: Observational Memory - *chosen option*
Mastra simplifies this via Observational Memory, which automates the background processing of logs into Observations and Reflections.

**Key Mechanisms**:
- Thread ID: Manages the specific message history of a single conversation.
- Resource ID: Acts as the Global Knowledge Anchor (typically the userId). Multiple threads sharing the same resourceId can access the same pool of facts.

### Data Storage and Infrastructure
The memory system is integrated into the existing PostgreSQL infrastructure:

- Database: PostgreSQL (Same instance as Neoxi core).
- Isolation: A dedicated mastra schema is used to separate framework tables from business logic.
- Retrieval: Semantic search is performed on the fly to provide the agent with relevant facts.

---
![Mastra Memory Flow](./MASTRA_MEMORY.png)
