"""Writes one Firestore document. Dry run unless write=True; a write replaces the whole document (idempotent)."""

COLLECTIONS = {"families", "forecasts"}  # this job owns only these (contract section 2)


def write_doc(db, collection: str, doc_id: str, doc: dict, *, write: bool = False) -> str:
    if collection not in COLLECTIONS:
        raise ValueError(f"this job never writes {collection}")
    path = f"{collection}/{doc_id}"
    if not write:
        return f"DRY RUN: would set {path}"
    db.collection(collection).document(doc_id).set(doc)
    return f"WROTE {path}"


def firestore_client(project: str):
    from google.cloud import firestore
    return firestore.Client(project=project)
