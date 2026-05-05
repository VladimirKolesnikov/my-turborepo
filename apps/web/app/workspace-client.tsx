"use client";

import { FormEvent, useEffect, useState } from "react";
import styles from "./page.module.css";

type RequestRecord = {
  id: string;
  statusCode: string;
  sourceType: string;
  sourceName?: string | null;
  rawContent: string;
  errorMessage?: string | null;
};

type ReviewRecord = {
  proposedCategoryName: string;
  proposedDescription: string;
  confidence: string;
  finalCategoryName?: string | null;
  finalDescription?: string | null;
  decisionStatus: string;
};

type TransactionRecord = {
  id: string;
  amount?: string | null;
  typeCode?: string | null;
  processingRequestId?: string | null;
  statusCode: string;
  rawContent: string;
  createdAt: string;
};

type WorkspaceTransaction = {
  transaction: TransactionRecord;
  review?: ReviewRecord | null;
  category?: { name: string } | null;
};

type ProcessingRequestResponse = {
  request: RequestRecord | null;
  transactions: WorkspaceTransaction[];
};

type QueueResponse = {
  items: WorkspaceTransaction[];
};

type CopilotMessage = {
  role: "user" | "assistant";
  content: string;
};

const gatewayBaseUrl =
  process.env.NEXT_PUBLIC_API_GATEWAY_URL ?? "http://127.0.0.1:3012";

export function WorkspaceClient() {
  const [textInput, setTextInput] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [requestDetail, setRequestDetail] = useState<ProcessingRequestResponse | null>(null);
  const [pendingQueue, setPendingQueue] = useState<WorkspaceTransaction[]>([]);
  const [recentItems, setRecentItems] = useState<WorkspaceTransaction[]>([]);
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotMessages, setCopilotMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      content:
        "I can help you inspect pending reviews, submit new text transactions, and explain what to confirm next.",
    },
  ]);
  const [busyState, setBusyState] = useState<"idle" | "submitting" | "confirming" | "copilot">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void refreshSidebar();
  }, []);

  useEffect(() => {
    if (!currentRequestId) {
      return;
    }

    const events = new EventSource(
      `${gatewayBaseUrl}/processing-requests/${currentRequestId}/events`,
    );

    events.onmessage = (event) => {
      const payload = JSON.parse(event.data) as ProcessingRequestResponse;
      setRequestDetail(payload);

      if (
        payload.request?.statusCode === "review_ready" ||
        payload.request?.statusCode === "failed"
      ) {
        void refreshSidebar();
      }
    };

    events.onerror = () => {
      events.close();
    };

    return () => {
      events.close();
    };
  }, [currentRequestId]);

  async function refreshSidebar() {
    const [queueResponse, recentResponse] = await Promise.all([
      fetch(`${gatewayBaseUrl}/transactions/review-queue`).then((response) =>
        response.json() as Promise<QueueResponse>,
      ),
      fetch(`${gatewayBaseUrl}/transactions/recent`).then((response) =>
        response.json() as Promise<QueueResponse>,
      ),
    ]);

    setPendingQueue(queueResponse.items);
    setRecentItems(recentResponse.items);
  }

  async function loadRequest(requestId: string) {
    const response = await fetch(`${gatewayBaseUrl}/processing-requests/${requestId}`);
    const payload = (await response.json()) as ProcessingRequestResponse;
    setCurrentRequestId(requestId);
    setRequestDetail(payload);
  }

  async function handleSubmitText(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusyState("submitting");

    try {
      const response = await fetch(`${gatewayBaseUrl}/transactions/text`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: textInput }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit text transaction");
      }

      const payload = (await response.json()) as { requestId: string };
      setTextInput("");
      await loadRequest(payload.requestId);
      await refreshSidebar();
    } catch (submissionError) {
      setError((submissionError as Error).message);
    } finally {
      setBusyState("idle");
    }
  }

  async function handleSubmitFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a .txt or .csv file first.");
      return;
    }

    setError(null);
    setBusyState("submitting");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${gatewayBaseUrl}/transactions/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to submit file transaction");
      }

      const payload = (await response.json()) as { requestId: string };
      setFile(null);
      await loadRequest(payload.requestId);
      await refreshSidebar();
    } catch (submissionError) {
      setError((submissionError as Error).message);
    } finally {
      setBusyState("idle");
    }
  }

  async function handleConfirm(transactionId: string, categoryName: string, description: string) {
    setError(null);
    setBusyState("confirming");

    try {
      const response = await fetch(`${gatewayBaseUrl}/transactions/${transactionId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ categoryName, description }),
      });

      if (!response.ok) {
        throw new Error("Failed to confirm transaction");
      }

      await refreshSidebar();

      if (currentRequestId) {
        await loadRequest(currentRequestId);
      }
    } catch (confirmationError) {
      setError((confirmationError as Error).message);
    } finally {
      setBusyState("idle");
    }
  }

  async function handleCopilotSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!copilotInput.trim()) {
      return;
    }

    const nextMessages = [
      ...copilotMessages,
      { role: "user" as const, content: copilotInput.trim() },
    ];

    setCopilotMessages(nextMessages);
    setCopilotInput("");
    setBusyState("copilot");

    try {
      const response = await fetch("/api/copilot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      if (!response.ok) {
        throw new Error("Copilot request failed");
      }

      const payload = (await response.json()) as { text: string };
      setCopilotMessages((current) => [
        ...current,
        { role: "assistant", content: payload.text },
      ]);
    } catch (copilotError) {
      setCopilotMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: `Copilot is unavailable: ${(copilotError as Error).message}`,
        },
      ]);
    } finally {
      setBusyState("idle");
    }
  }

  return (
    <div className={styles.shell}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Neoxi Review Workspace</p>
          <h1>Submit, inspect, and confirm AI-categorized spending.</h1>
          <p className={styles.heroText}>
            Mastra acts as the copilot layer, while the gateway and AI worker keep the
            existing ingestion and categorization flow intact.
          </p>
        </div>
        <div className={styles.heroStats}>
          <span>Pending reviews: {pendingQueue.length}</span>
          <span>Recent records: {recentItems.length}</span>
          <span>
            Active request: {requestDetail?.request?.statusCode ?? "No request selected"}
          </span>
        </div>
      </section>

      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Submit Data</h2>
            <span>Text, .txt, and .csv</span>
          </div>

          <form className={styles.form} onSubmit={handleSubmitText}>
            <label htmlFor="transactionText">Natural-language entry</label>
            <textarea
              id="transactionText"
              className={styles.textarea}
              value={textInput}
              onChange={(event) => setTextInput(event.target.value)}
              placeholder="I got paid $2200, bought groceries for $48, and spent $16 on a taxi."
            />
            <button className={styles.primaryButton} disabled={busyState !== "idle"}>
              {busyState === "submitting" ? "Submitting..." : "Submit text"}
            </button>
          </form>

          <form className={styles.form} onSubmit={handleSubmitFile}>
            <label htmlFor="transactionFile">Artifact upload</label>
            <input
              id="transactionFile"
              className={styles.fileInput}
              type="file"
              accept=".txt,.csv,text/plain,text/csv"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <button className={styles.secondaryButton} disabled={busyState !== "idle"}>
              {busyState === "submitting" ? "Uploading..." : "Upload file"}
            </button>
          </form>

          {error ? <p className={styles.errorBox}>{error}</p> : null}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Current Request</h2>
            <span>{requestDetail?.request?.id ?? "Waiting for selection"}</span>
          </div>

          {requestDetail?.request ? (
            <div className={styles.requestCard}>
              <div className={styles.badgeRow}>
                <span className={styles.badge}>{requestDetail.request.statusCode}</span>
                <span className={styles.muted}>
                  {requestDetail.request.sourceName ?? requestDetail.request.sourceType}
                </span>
              </div>
              <p className={styles.requestText}>{requestDetail.request.rawContent}</p>
              <div className={styles.reviewStack}>
                {requestDetail.transactions.map((item) => (
                  <ReviewCard
                    key={item.transaction.id}
                    item={item}
                    disabled={busyState !== "idle"}
                    onConfirm={handleConfirm}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className={styles.emptyState}>
              Select a request from pending review or submit a new one to start the loop.
            </p>
          )}
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Mastra Copilot</h2>
            <span>Agent-backed guidance</span>
          </div>

          <div className={styles.chatLog}>
            {copilotMessages.map((message, index) => (
              <article
                key={`${message.role}-${index}`}
                className={
                  message.role === "assistant" ? styles.assistantBubble : styles.userBubble
                }
              >
                <strong>{message.role === "assistant" ? "Copilot" : "You"}</strong>
                <p>{message.content}</p>
              </article>
            ))}
          </div>

          <form className={styles.chatComposer} onSubmit={handleCopilotSubmit}>
            <input
              value={copilotInput}
              onChange={(event) => setCopilotInput(event.target.value)}
              placeholder="Ask about pending reviews, recent activity, or submit text through the copilot."
            />
            <button className={styles.primaryButton} disabled={busyState !== "idle"}>
              {busyState === "copilot" ? "Thinking..." : "Ask"}
            </button>
          </form>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Review Queue</h2>
            <span>Pending confirmation</span>
          </div>
          <div className={styles.listStack}>
            {pendingQueue.length === 0 ? (
              <p className={styles.emptyState}>No pending items.</p>
            ) : (
              pendingQueue.map((item) => (
                <button
                  key={item.transaction.id}
                  type="button"
                  className={styles.listCard}
                  onClick={() => {
                    if (
                      item.transaction.processingRequestId &&
                      item.transaction.processingRequestId !== currentRequestId
                    ) {
                      void loadRequest(item.transaction.processingRequestId);
                    }
                  }}
                >
                  <strong>{item.review?.proposedCategoryName ?? "Unknown category"}</strong>
                  <span>{item.review?.proposedDescription ?? item.transaction.rawContent}</span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className={`${styles.panel} ${styles.panelWide}`}>
          <div className={styles.panelHeader}>
            <h2>Recent Transactions</h2>
            <span>Latest processed records</span>
          </div>
          <div className={styles.table}>
            {recentItems.map((item) => (
              <div key={item.transaction.id} className={styles.tableRow}>
                <span>{item.transaction.amount ?? "n/a"}</span>
                <span>{item.review?.finalCategoryName ?? item.review?.proposedCategoryName ?? "uncategorized"}</span>
                <span>{item.transaction.statusCode}</span>
                <span>{new Date(item.transaction.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReviewCard({
  item,
  disabled,
  onConfirm,
}: {
  item: WorkspaceTransaction;
  disabled: boolean;
  onConfirm: (transactionId: string, categoryName: string, description: string) => Promise<void>;
}) {
  const [categoryName, setCategoryName] = useState(
    item.review?.finalCategoryName ??
      item.review?.proposedCategoryName ??
      item.category?.name ??
      "",
  );
  const [description, setDescription] = useState(
    item.review?.finalDescription ?? item.review?.proposedDescription ?? "",
  );

  return (
    <article className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <div>
          <strong>{item.transaction.typeCode ?? "unknown"}</strong>
          <p>{item.transaction.amount ?? "n/a"}</p>
        </div>
        <span className={styles.confidencePill}>
          confidence {item.review?.confidence ?? "n/a"}
        </span>
      </div>

      <label>
        Category
        <input
          value={categoryName}
          onChange={(event) => setCategoryName(event.target.value)}
          disabled={disabled}
        />
      </label>

      <label>
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={disabled}
        />
      </label>

      <button
        className={styles.primaryButton}
        disabled={disabled || !categoryName.trim() || !description.trim()}
        onClick={() =>
          onConfirm(item.transaction.id, categoryName.trim(), description.trim())
        }
      >
        Confirm transaction
      </button>
    </article>
  );
}
