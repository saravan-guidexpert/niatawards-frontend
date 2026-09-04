import { useEffect, useState } from "react";
import { Archive, Eye, ImageOff, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cloudinaryDisplayUrl } from "@/lib/cloudinaryUrl";
import {
  adminGetAfterSessionNomination,
  adminGetAfterSessionNominations,
  adminUpdateAfterSessionStatus,
  type AfterSessionNomination,
} from "@/lib/apiAdmin";

const STATUS_CHIP: Record<string, string> = {
  NEW: "bg-secondary/10 text-secondary border-secondary/20",
  VIEWED: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  ARCHIVED: "bg-white/10 text-white/50 border-white/15",
};

const FORM_KIND_LABEL: Record<string, string> = {
  student: "Student / parent",
  teacher_self: "Teacher self",
  teacher_other: "Teacher nominated other",
};

const SOURCE_LABEL: Record<string, string> = {
  inline_draft: "Public form (draft flow)",
  one_shot_api: "One-shot API",
};

const formatWhen = (value?: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN");
};

const AfterSessionNominationsPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AfterSessionNomination[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [sourceForm, setSourceForm] = useState("all");
  const [status, setStatus] = useState("all");
  const [date, setDate] = useState("");
  const [idFilter, setIdFilter] = useState("");
  const [detail, setDetail] = useState<AfterSessionNomination | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  const load = async (nextPage = page) => {
    setLoading(true);
    try {
      const data = await adminGetAfterSessionNominations({
        page: nextPage,
        limit: 25,
        search,
        type,
        source_form: sourceForm,
        status,
        date,
        id: idFilter.trim(),
        lifecycle: "submitted",
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || 1);
      setPages(data.pages || 1);
    } catch (err: any) {
      toast({ title: "Failed to load submissions", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(1);
  }, []);

  const openDetail = async (row: AfterSessionNomination) => {
    try {
      const full = await adminGetAfterSessionNomination(row.id);
      setDetail(full);
      if (full.status === "NEW") {
        const viewed = await adminUpdateAfterSessionStatus(full.id, "VIEWED");
        setDetail(viewed);
        setItems((prev) => prev.map((item) => (item.id === viewed.id ? { ...item, status: viewed.status } : item)));
      }
    } catch (err: any) {
      toast({ title: "Could not open submission", description: err.message, variant: "destructive" });
    }
  };

  const setStatusOf = async (id: string, next: "NEW" | "VIEWED" | "ARCHIVED") => {
    setUpdating(id + next);
    try {
      const updated = await adminUpdateAfterSessionStatus(id, next);
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status: updated.status } : item)));
      if (detail?.id === id) setDetail(updated);
    } catch (err: any) {
      toast({ title: "Status update failed", description: err.message, variant: "destructive" });
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <Archive className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">After Session Nominations</p>
            <p className="text-xs text-white/55 mt-1">
              Future form submissions only. These records are not part of production, portraits, videos, or messaging.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name, phone, email…"
            className="pl-9 bg-white/5 border-white/10 text-white h-9 text-sm"
          />
        </div>
        <Input
          value={idFilter}
          onChange={(e) => setIdFilter(e.target.value)}
          placeholder="Submission ID"
          className="bg-white/5 border-white/10 text-white h-9 text-sm"
        />
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-white/5 border-white/10 text-white h-9 text-sm"
        />
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="student">Student / other</SelectItem>
            <SelectItem value="teacher">Teacher self</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sourceForm} onValueChange={setSourceForm}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs"><SelectValue placeholder="Source" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="inline_draft">Public form</SelectItem>
            <SelectItem value="one_shot_api">One-shot API</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-white/5 border-white/10 text-white h-9 text-xs w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="NEW">NEW</SelectItem>
            <SelectItem value="VIEWED">VIEWED</SelectItem>
            <SelectItem value="ARCHIVED">ARCHIVED</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="hero-outline" size="sm" className="h-9 text-xs" onClick={() => void load(1)}>
          Apply filters
        </Button>
        <p className="text-xs text-white/40 self-center">{total.toLocaleString("en-IN")} submitted</p>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2 text-white/50">
            <Loader2 className="w-5 h-5 animate-spin" /> Loading…
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-16">No after-session submissions match these filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-white/40">
                  {["Submitted", "Form", "Nominee", "Nominee phone", "Nominator", "Photo", "Status", ""].map((h) => (
                    <th key={h} className="px-3 py-2.5 font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                    <td className="px-3 py-3 text-xs text-white/70 whitespace-nowrap">{formatWhen(row.submitted_at || row.created_at)}</td>
                    <td className="px-3 py-3 text-xs text-white/70">
                      <p>{FORM_KIND_LABEL[String(row.form_kind || "")] || row.type}</p>
                      <p className="text-white/35">{SOURCE_LABEL[row.source_form] || row.source_form}</p>
                    </td>
                    <td className="px-3 py-3 text-sm text-white font-medium">{row.nominee_name || "—"}</td>
                    <td className="px-3 py-3 text-xs text-white/70">{row.nominee_phone || "—"}</td>
                    <td className="px-3 py-3 text-xs text-white/70">
                      <p>{row.nominator_display_name || "—"}</p>
                      <p className="text-white/35">{row.nominator_display_phone || ""}</p>
                    </td>
                    <td className="px-3 py-3">
                      {row.photo_url ? (
                        <img src={cloudinaryDisplayUrl(row.photo_url)} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/25">
                          <ImageOff className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${STATUS_CHIP[row.status] || STATUS_CHIP.NEW}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => void openDetail(row)} className="inline-flex items-center gap-1 text-xs text-white/60 hover:text-white">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-xs text-white/45">
          <button type="button" disabled={page <= 1} onClick={() => void load(page - 1)} className="disabled:opacity-30">Previous</button>
          <span>Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => void load(page + 1)} className="disabled:opacity-30">Next</button>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4" style={{ background: "rgba(0,0,0,0.75)" }} onClick={() => setDetail(null)}>
          <div
            className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90dvh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <h2 className="font-heading text-lg font-bold text-white">Submission</h2>
                <p className="text-[11px] text-white/40 mt-0.5 break-all">{detail.id}</p>
              </div>
              <button type="button" onClick={() => setDetail(null)} className="p-1.5 text-white/40 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4">
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                <p className="text-white/45">Submitted <span className="text-white">{formatWhen(detail.submitted_at || detail.created_at)}</span></p>
                <p className="text-white/45">Form <span className="text-white">{FORM_KIND_LABEL[String(detail.form_kind || "")] || detail.type}</span></p>
                <p className="text-white/45">Source <span className="text-white">{SOURCE_LABEL[detail.source_form] || detail.source_form}</span></p>
                <p className="text-white/45">Email <span className="text-white">{detail.email || "—"}</span></p>
                <p className="text-white/45">Nominee <span className="text-white">{detail.nominee_name || "—"} · {detail.nominee_phone || "—"}</span></p>
                <p className="text-white/45">Nominator <span className="text-white">{detail.nominator_display_name || "—"} · {detail.nominator_display_phone || "—"}</span></p>
              </div>
              {detail.photo_url ? (
                <img src={cloudinaryDisplayUrl(detail.photo_url)} alt="" className="w-full max-h-64 object-contain rounded-xl border border-white/10" />
              ) : null}
              <div className="flex flex-wrap gap-2">
                {(["NEW", "VIEWED", "ARCHIVED"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={updating?.startsWith(detail.id)}
                    onClick={() => void setStatusOf(detail.id, s)}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${detail.status === s ? STATUS_CHIP[s] : "border-white/10 text-white/40"}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-white/35 mb-2">Complete submitted data</p>
                <pre className="text-[11px] leading-relaxed text-white/75 bg-black/40 border border-white/10 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap break-all">
                  {JSON.stringify(
                    {
                      ...detail,
                      extra_fields: detail.extra_fields || {},
                      raw_payload: detail.raw_payload || {},
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AfterSessionNominationsPanel;
