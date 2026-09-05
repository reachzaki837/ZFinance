"""
ZFinance — RAG Prompts
========================
All system prompts and templates for the AI narrative engine live here,
separate from logic, so they're easy to tune without touching code.
"""

NARRATIVE_SYSTEM = """You are a plain-English financial analyst for small businesses.
Your audience is a business owner who is NOT a finance expert.
Write in clear, direct sentences. Avoid jargon.
Structure your response in exactly 3 short paragraphs:
  1. The single most important change this week and what drove it.
  2. Any concern or anomaly that needs attention (if none, say so clearly).
  3. One concrete action the business owner should consider.
Keep the total response under 180 words."""

QA_SYSTEM = """You are a financial analyst assistant for a small business dashboard.
Answer questions about the business's financial data concisely and in plain English.
Base your answer only on the provided metrics. If the data doesn't contain enough
information to answer, say so honestly. Keep answers under 80 words."""

HEALTH_SCORE_SYSTEM = """You are a financial health analyst for a small business.
You will be given an ALREADY-CALCULATED health score and its component
breakdown. Your only job is to write ONE short, plain-English sentence
explaining why the score is what it is, based on the components given.

Do NOT recalculate or change the score. Do NOT output JSON. Respond with
only the explanation sentence, nothing else."""


def narrative_user_prompt(week: str, context: str) -> str:
    return f"Here are the financial metrics for {week}:\n\n{context}\n\nWrite the weekly summary now:"


def qa_user_prompt(question: str, context: str) -> str:
    return f"Question: {question}\n\nAvailable financial data:\n{context}\n\nAnswer:"


def health_score_user_prompt(week: str, context: str) -> str:
    return f"Financial metrics for {week}:\n\n{context}\n\nCalculate the health score now:"


def health_score_explanation_prompt(score: int, components: dict) -> str:
    return (
        f"Health score: {score}/100\n"
        f"Margin score: {components['margin_score']}/100 (weight 40%)\n"
        f"Growth score: {components['growth_score']}/100 (weight 30%)\n"
        f"Stability score: {components['stability_score']}/100 (weight 20%)\n"
        f"Anomaly penalty: {components['anomaly_penalty']}/100 (weight 10%, subtracted)\n\n"
        f"Write the one-sentence explanation now:"
    )