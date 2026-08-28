"""
ZFinance — RAG Engine
=======================
Ties together: ChromaDB (storage/retrieval), sentence-transformers (embedding),
and an LLM (Groq or Ollama) for narrative/health-score/Q&A generation.
"""

import os
import json
import logging

import pandas as pd
import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

from rag.chunker import build_financial_chunks
from rag.anomaly import detect_anomalies
from rag.prompts import (
    NARRATIVE_SYSTEM, QA_SYSTEM, HEALTH_SCORE_SYSTEM,
    narrative_user_prompt, qa_user_prompt, health_score_user_prompt,
)

log = logging.getLogger("zfinance.rag")

CHROMA_PATH   = os.getenv("CHROMA_PATH", "./chroma_db")
EMBED_MODEL   = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
LLM_PROVIDER  = os.getenv("LLM_PROVIDER", "groq")     # "groq" | "ollama"
LLM_MODEL     = os.getenv("LLM_MODEL", "openai/gpt-oss-20b")
GROQ_API_KEY  = os.getenv("GROQ_API_KEY", "")
TOP_K         = int(os.getenv("RAG_TOP_K", "10"))
SIGMA         = float(os.getenv("ANOMALY_SIGMA", "2.5"))


def _call_llm(system: str, user: str, temperature: float = 0.3, json_mode: bool = False) -> str:
    if LLM_PROVIDER == "groq":
        from groq import Groq
        client = Groq(api_key=GROQ_API_KEY)
        kwargs = {}
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=temperature,
            **kwargs,
        )
        return resp.choices[0].message.content
    else:
        import ollama
        resp = ollama.chat(
            model=LLM_MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            options={"temperature": temperature},
            format="json" if json_mode else None,
        )
        return resp["message"]["content"]


class ZFinanceRAG:

    def __init__(self):
        self._client = chromadb.PersistentClient(path=CHROMA_PATH)
        self._embed = SentenceTransformerEmbeddingFunction(model_name=EMBED_MODEL)
        log.info("ZFinanceRAG initialised — embed model: %s, LLM: %s/%s",
                 EMBED_MODEL, LLM_PROVIDER, LLM_MODEL)

    def _collection(self, business_id: str):
        return self._client.get_or_create_collection(
            name=f"zfinance_{business_id}",
            embedding_function=self._embed,
            metadata={"hnsw:space": "cosine"},
        )

    # ── Ingestion ────────────────────────────────────────────────────────────

    def ingest(self, df: pd.DataFrame, business_id: str, week: str) -> int:
        chunks = build_financial_chunks(df, week)

        # Build category history for anomaly detection
        df = df.copy()
        df["date"] = pd.to_datetime(df["date"])
        df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)
        current_totals = {}
        if "category" in df.columns:
            current_totals = df.groupby("category")["amount"].sum().to_dict()

        history = self._get_category_history(business_id)
        anomalies = detect_anomalies(current_totals, history, week, SIGMA)

        anomaly_chunks = [a["text"] for a in anomalies]
        all_chunks = chunks + anomaly_chunks

        ids = [f"{business_id}_{week}_chunk_{i}" for i in range(len(chunks))]
        ids += [f"{business_id}_{week}_anomaly_{i}" for i in range(len(anomaly_chunks))]

        metadatas = [{"week": week, "type": "summary", "business_id": business_id} for _ in chunks]
        for a in anomalies:
            metadatas.append({
                "week": week, "type": "anomaly", "business_id": business_id,
                "category": a["category"], "sigma": str(a["sigma"]),
                "is_critical": str(a["is_critical"]),
            })

        # Store each raw transaction row too, so the Transactions table can list them
        tx_chunks, tx_ids, tx_metas = [], [], []
        for i, row in df.reset_index(drop=True).iterrows():
            date_str = row["date"].strftime("%Y-%m-%d")
            category = str(row.get("category", ""))
            description = str(row.get("description", category or "transaction"))
            amount = float(row["amount"])
            tx_chunks.append(f"{date_str} — {description} ({category}): ₹{amount:,.2f}")
            tx_ids.append(f"{business_id}_{week}_tx_{i}")
            tx_metas.append({
                "week": week, "type": "transaction", "business_id": business_id,
                "date": date_str, "category": category, "description": description,
                "amount": str(amount),
            })

        all_chunks += tx_chunks
        ids += tx_ids
        metadatas += tx_metas

        col = self._collection(business_id)
        col.upsert(documents=all_chunks, metadatas=metadatas, ids=ids)

        log.info("Ingested %d chunks (%d transactions, %d anomalies) for %s / %s",
                  len(all_chunks), len(tx_chunks), len(anomalies), business_id, week)
        return len(all_chunks)

    def _get_category_history(self, business_id: str) -> dict[str, list[float]]:
        """Pull prior weeks' category net values from stored summary chunks."""
        col = self._collection(business_id)
        try:
            results = col.get(where={"type": "summary"}, include=["documents"])
        except Exception:
            return {}

        history: dict[str, list[float]] = {}
        for doc in results.get("documents", []):
            if "category '" not in doc:
                continue
            try:
                cat = doc.split("category '")[1].split("'")[0]
                net_str = doc.split("net ₹")[1].split(".")[0].replace(",", "")
                history.setdefault(cat, []).append(float(net_str))
            except (IndexError, ValueError):
                continue
        return history

    # ── Retrieval ────────────────────────────────────────────────────────────

    def _retrieve(self, business_id: str, query: str, n: int = TOP_K) -> str:
        col = self._collection(business_id)
        count = col.count()
        if count == 0:
            return ""
        results = col.query(query_texts=[query], n_results=min(n, count))
        docs = results["documents"][0] if results["documents"] else []
        return "\n".join(f"- {d}" for d in docs)

    # ── Generation ───────────────────────────────────────────────────────────

    def generate_narrative(self, business_id: str, week: str) -> str:
        context = self._retrieve(business_id, f"revenue expenses margin anomalies {week}")
        if not context:
            return f"No data found for week {week}. Please upload transactions first."
        prompt = narrative_user_prompt(week, context)
        return _call_llm(NARRATIVE_SYSTEM, prompt, temperature=0.3).strip()

    def generate_health_score(self, business_id: str, week: str) -> dict:
        context = self._retrieve(business_id, f"revenue expenses margin growth {week}")
        if not context:
            return {"score": 0, "reason": "No data available", "components": {}}
        prompt = health_score_user_prompt(week, context)
        raw = _call_llm(HEALTH_SCORE_SYSTEM, prompt, temperature=0.1, json_mode=True)
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            log.warning("Health score JSON parse failed: %s", raw[:200])
            return {"score": 50, "reason": "Could not parse score", "components": {}}

    def ask(self, business_id: str, question: str, week: str | None = None) -> str:
        query = f"{question} {week or ''}".strip()
        context = self._retrieve(business_id, query)
        if not context:
            return "I don't have enough financial data to answer that yet."
        prompt = qa_user_prompt(question, context)
        return _call_llm(QA_SYSTEM, prompt, temperature=0.2).strip()

    def get_anomalies(self, business_id: str, week: str) -> list[dict]:
        col = self._collection(business_id)
        try:
            results = col.get(
                where={"$and": [{"type": {"$eq": "anomaly"}}, {"week": {"$eq": week}}]},
                include=["documents", "metadatas"],
            )
        except Exception:
            return []
        return [
            {
                "text": doc,
                "category": meta.get("category"),
                "sigma": float(meta.get("sigma", 0)),
                "is_critical": meta.get("is_critical") == "True",
            }
            for doc, meta in zip(results.get("documents", []), results.get("metadatas", []))
        ]

    def list_weeks(self, business_id: str) -> list[str]:
        col = self._collection(business_id)
        try:
            results = col.get(where={"type": {"$eq": "summary"}}, include=["metadatas"])
        except Exception:
            return []
        weeks = {m["week"] for m in results.get("metadatas", [])}
        return sorted(weeks)

    def get_weekly_totals(self, business_id: str) -> list[dict]:
        """
        Returns [{ week, revenue, expenses }] across all ingested weeks,
        parsed from the stored summary chunks. Used for the trend chart.
        """
        col = self._collection(business_id)
        try:
            results = col.get(where={"type": {"$eq": "summary"}}, include=["documents", "metadatas"])
        except Exception:
            return []

        by_week: dict[str, dict] = {}
        for doc, meta in zip(results.get("documents", []), results.get("metadatas", [])):
            week = meta.get("week")
            if not week or week in by_week:
                continue
            try:
                after_revenue = doc.split("Revenue ₹")[1]
                revenue_str, rest = after_revenue.split(", Expenses ₹")
                expenses_str = rest.split(", Net ₹")[0]
                revenue = float(revenue_str.replace(",", ""))
                expenses = float(expenses_str.replace(",", ""))
                by_week[week] = {"week": week, "revenue": revenue, "expenses": expenses}
            except (IndexError, ValueError):
                continue

        return sorted(by_week.values(), key=lambda x: x["week"])

    def get_transactions(self, business_id: str, week: str | None = None) -> list[dict]:
        """
        Return raw transaction rows for the table view.
        If week is None, returns transactions across all ingested weeks.
        """
        col = self._collection(business_id)
        where = {"type": {"$eq": "transaction"}}
        if week:
            where = {"$and": [{"type": {"$eq": "transaction"}}, {"week": {"$eq": week}}]}
        try:
            results = col.get(where=where, include=["metadatas"])
        except Exception:
            return []

        rows = [
            {
                "date": m.get("date"),
                "description": m.get("description"),
                "category": m.get("category"),
                "amount": float(m.get("amount", 0)),
                "week": m.get("week"),
            }
            for m in results.get("metadatas", [])
        ]
        rows.sort(key=lambda r: r["date"], reverse=True)
        return rows

    def delete_week(self, business_id: str, week: str) -> None:
        col = self._collection(business_id)
        results = col.get(where={"week": {"$eq": week}}, include=[])
        if results.get("ids"):
            col.delete(ids=results["ids"])