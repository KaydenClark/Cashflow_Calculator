import { FileCheck2, Search, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "../api";
import { useData } from "../DataContext";
import { Money, shortDate } from "../components/Format";
import { StatusMark } from "../components/StatusMark";
import { SPENDING_CATEGORIES } from "../types";
import { PageState } from "./Overview";

export default function Transactions() {
  const { state, loading, error, classify, refresh } = useData();
  const [search, setSearch] = useState("");
  const [reviewOnly, setReviewOnly] = useState(false);
  const [sourceType, setSourceType] = useState<"bank" | "venmo">("bank");
  const [file, setFile] = useState<File>();
  const [csvText, setCsvText] = useState("");
  const [preview, setPreview] = useState<Record<string, unknown>>();
  const [message, setMessage] = useState("");
  const [visibleLimit, setVisibleLimit] = useState(200);
  const transactions = useMemo(() => state?.transactions.filter((row) => (!reviewOnly || row.review_required || row.treatment === "unresolved") && `${row.description} ${row.chosen_category} ${row.source_type}`.toLowerCase().includes(search.toLowerCase())) ?? [], [state, reviewOnly, search]);
  const visibleTransactions = transactions.slice(0, visibleLimit);
  if (loading && !state) return <PageState title="Loading transactions…" />;
  if (error || !state) return <PageState title={error || "Transactions are unavailable"} error />;
  const selectFile = async (selected?: File) => { setFile(selected); setPreview(undefined); setMessage(""); setCsvText(selected ? await selected.text() : ""); };
  const validate = async () => { if (!file) return; setPreview(await api.importPreview(sourceType, file.name, csvText)); };
  const commit = async () => { if (!file) return; const result = await api.importCommit(sourceType, file.name, csvText); setMessage(`Imported ${String(result.inserted)} new rows; ${String(result.duplicates)} duplicates ignored.`); setPreview(undefined); await refresh(); };
  return <div className="page transactions-page"><header className="page-header"><div><h1>Transactions & Classification</h1><p>Review every source row, exclusion, and merchant-derived spending category.</p></div></header>
    <section className="panel import-panel"><div><span className="panel-icon"><Upload /></span><div><h2>Import a new CSV</h2><p>Validate and preview bank or Venmo rows before saving. Source files are never modified.</p></div></div><label>Source<select value={sourceType} onChange={(event) => setSourceType(event.target.value as "bank" | "venmo")}><option value="bank">Bank</option><option value="venmo">Venmo</option></select></label><label className="file-input"><input type="file" accept=".csv,text/csv" onChange={(event) => void selectFile(event.target.files?.[0])} /><span>{file?.name || "Choose CSV"}</span></label><button className="button secondary" disabled={!file} onClick={() => void validate()}><FileCheck2 size={17} />Validate</button>{preview && <div className="import-preview"><strong>{String(preview.rowCount)} rows ready</strong><span>{String(preview.duplicateCount)} duplicates</span><span>{String(preview.excludedCount)} excluded</span><span>{String(preview.unresolvedCount)} unresolved</span><button className="button primary" onClick={() => void commit()}>Import validated rows</button></div>}{message && <p className="success-message">{message}</p>}</section>
    <div className="toolbar"><label className="search-control"><Search size={17} /><span className="sr-only">Search transactions</span><input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleLimit(200); }} placeholder="Search merchant, category, or source" /></label><label className="check-control"><input type="checkbox" checked={reviewOnly} onChange={(event) => { setReviewOnly(event.target.checked); setVisibleLimit(200); }} />Unreviewed only</label><span>Showing {visibleTransactions.length} of {transactions.length} rows</span></div>
    <div className="table-frame"><table className="data-table"><thead><tr><th>Date</th><th>Description</th><th>Source</th><th>Category</th><th>Amount</th><th>Treatment</th><th>Rule / reason</th></tr></thead><tbody>{visibleTransactions.map((transaction) => <tr key={transaction.fingerprint} className={transaction.review_required ? "needs-review" : ""}><td>{shortDate(transaction.transaction_at)}</td><td><strong>{transaction.description}</strong><small>{transaction.source_file_name}</small></td><td>{transaction.source_type}</td><td><select aria-label={`Category for ${transaction.description}`} value={transaction.chosen_category} onChange={(event) => void classify(transaction.fingerprint, event.target.value)}>{SPENDING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></td><td className={transaction.signed_amount_cents < 0 ? "negative" : "positive"}><Money cents={transaction.signed_amount_cents} /></td><td><StatusMark status={transaction.treatment === "unresolved" ? "Review" : transaction.treatment} /></td><td>{transaction.exclusion_reason || transaction.classification_rule}</td></tr>)}</tbody></table>{!transactions.length && <div className="empty-state">No transactions match these filters.</div>}{visibleTransactions.length < transactions.length && <button className="button secondary load-more" onClick={() => setVisibleLimit((limit) => limit + 200)}>Show 200 more</button>}</div>
  </div>;
}
