# NEOXI - SEQUENCE

This section describes Sequence Diagram's steps of the data processing workflow, from initiation to the self-learning cycle.

### 1. Initialization (Service 1: API Gateway)
1. The User uploads text or PDF files.
2. Service 1 uses Langchain to extract text content from the document.
3. Service 1 saves a record in Postgres with the status `PROCESSING` and queues the task in Redis (BullMQ).
4. The User immediately receives a 202 Accepted HTTP response. A loader or skeleton component is activated on the frontend.

### 2. Intelligent Processing (Service 2: AI Worker)
1. Service 2 picks up the task. It generates an embedding (vector) of the input data.
2. **Vector DB (pgvector):** A search is performed for relevant historical data, specifically: "What has this user previously confirmed with similar meaning?"
3. **Prompt Construction:** A comprehensive prompt is formulated, which includes: system instructions, the retrieved context from RAG (Retrieval-Augmented Generation), and the new input data.
4. **AI Engine:** The model returns a structured JSON object containing the identified categories and corresponding amounts.
5. Service 2 updates the status in Postgres to `REVIEW_REQUIRED`.

### 3. Notification and Confirmation (WebSockets)
1. Service 1 observes the status update or receives an internal event and pushes the data to the Web Client via WebSockets.
2. The User reviews the result, makes corrections if necessary, and clicks **Confirm**.

### 4. Self-Learning Cycle
1. After the User clicks the Confirm button, Service 1 (or a dedicated background worker) retrieves the final text and the final category.
2. A new vector is created from this confirmed data and saved to the Vector DB.

**Outcome:** The next time a similar request is processed, RAG will retrieve this newly confirmed example, enabling the LLM to provide a more precise and accurate categorization.
