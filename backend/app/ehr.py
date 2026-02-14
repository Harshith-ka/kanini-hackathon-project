"""EHR/EMR upload: extract text from PDF/TXT, NLP symptom extraction, highlight keywords."""

import re
from typing import Any

from app.schemas import SYMPTOM_OPTIONS

# Human phrases that map to symptom codes (for NLP extraction)
SYMPTOM_PHRASES: list[tuple[list[str], str]] = [
    (["chest pain", "chest discomfort", "chest tightness", "angina"], "chest_pain"),
    (["shortness of breath", "difficulty breathing", "dyspnea", "sob", "breathlessness"], "shortness_of_breath"),
    (["headache", "head pain", "migraine"], "headache"),
    (["fever", "febrile", "pyrexia", "elevated temperature", "high temp"], "fever"),
    (["dizziness", "dizzy", "vertigo", "lightheaded"], "dizziness"),
    (["nausea", "nauseous", "vomiting", "vomit", "nauseated"], "nausea"),
    (["abdominal pain", "stomach pain", "belly pain", "abdomen pain"], "abdominal_pain"),
    (["bleeding", "hemorrhage", "blood loss", "bleed"], "bleeding"),
    (["unconscious", "loss of consciousness", "loc", "passed out", "syncope", "unresponsive"], "unconscious"),
    (["seizure", "seizures", "convulsion", "fitting"], "seizure"),
    (["trauma", "injury", "injured", "laceration", "wound"], "trauma"),
    (["burn", "burns", "burned", "scald"], "burn"),
    (["allergic reaction", "allergy", "anaphylaxis", "allergic"], "allergic_reaction"),
    (["stroke", "stroke symptoms", "facial droop", "slurred speech", "weakness on one side", "stroke-like"], "stroke_symptoms"),
]


def extract_text_from_file(content: bytes, filename: str) -> str:
    """Extract raw text from PDF or TXT. For PDF requires PyPDF2 or similar."""
    name_lower = filename.lower()
    if name_lower.endswith(".txt"):
        return content.decode("utf-8", errors="replace")
    if name_lower.endswith(".pdf"):
        try:
            import io
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception:
            return ""
    return ""


def extract_symptoms_nlp(text: str) -> tuple[list[str], list[dict[str, Any]]]:
    """
    Extract symptom codes from text using phrase matching.
    Returns (list of symptom codes, list of {symptom, start, end, matched_text} for highlights).
    """
    text_lower = text.lower()
    found_codes: set[str] = set()
    highlights: list[dict[str, Any]] = []

    for phrases, code in SYMPTOM_PHRASES:
        for phrase in phrases:
            # Case-insensitive search; keep original case for highlight
            pattern = re.compile(re.escape(phrase), re.IGNORECASE)
            for m in pattern.finditer(text):
                found_codes.add(code)
                highlights.append({
                    "symptom": code,
                    "start": m.start(),
                    "end": m.end(),
                    "matched_text": m.group(),
                })
    # Also check for codes as words
    for code in SYMPTOM_OPTIONS:
        word = code.replace("_", " ")
        if word in text_lower and code not in found_codes:
            idx = text_lower.find(word)
            found_codes.add(code)
            highlights.append({"symptom": code, "start": idx, "end": idx + len(word), "matched_text": text[idx:idx + len(word)]})

    return list(found_codes), highlights


def process_ehr_upload(content: bytes, filename: str) -> dict[str, Any]:
    """
    Process uploaded EHR file. Returns:
    - extracted_text: first 2000 chars of raw text
    - extracted_symptoms: list of symptom codes
    - highlights: list of {symptom, start, end, matched_text}
    - snippet: short snippet with <mark> around matches for display
    """
    raw = extract_text_from_file(content, filename)
    if not raw:
        return {"extracted_text": "", "extracted_symptoms": [], "highlights": [], "snippet": "", "error": "Could not extract text from file."}
    extracted_symptoms, highlights = extract_symptoms_nlp(raw)
    # Build snippet with marked highlights (non-overlapping, by start index)
    highlights_sorted = sorted(highlights, key=lambda x: x["start"])
    snippet_parts: list[str] = []
    last_end = 0
    for h in highlights_sorted:
        if h["start"] > last_end:
            snippet_parts.append(raw[last_end:h["start"]])
        snippet_parts.append("<mark>" + raw[h["start"]:h["end"]] + "</mark>")
        last_end = h["end"]
    if last_end < len(raw):
        snippet_parts.append(raw[last_end:])
    snippet = "".join(snippet_parts)[:3000]
    return {
        "extracted_text": raw[:2000],
        "extracted_symptoms": extracted_symptoms,
        "highlights": highlights_sorted,
        "snippet": snippet,
        "error": None,
    }
