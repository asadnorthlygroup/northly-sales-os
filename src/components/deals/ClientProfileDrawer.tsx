"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Globe, Tag, Clock, CheckCircle, XCircle,
  TrendingUp, Plus, Trash2, Loader2, StickyNote,
} from "lucide-react";
import { formatCurrency } from "@/lib/pricing";

type NoteType = "general" | "preference" | "objection" | "won_reason" | "lost_reason" | "follow_up";

interface ClientNote {
  id: string;
  note_type: NoteType;
  body: string;
  created_at: string;
}

interface ClientDeal {
  id: string;
  title: string;
  status: string;
  cities: string[];
  goal: string | null;
  created_at: string;
  final_amount: number | null;
  proposals: {
    id: string;
    ladder_data: Record<string, number> | null;
    selected_accounts: string[] | null;
    created_at: string;
  }[];
}

interface ClientProfile {
  id: string;
  company_name: string;
  primary_contact_name: string | null;
  primary_contact_email: string | null;
  website: string | null;
  industry_category: string | null;
  notes: string | null;
  created_at: string;
}

const NOTE_TYPE_CONFIG: Record<NoteType, { label: string; color: string }> = {
  general:     { label: "General",     color: "bg-slate-100 text-slate-600" },
  preference:  { label: "Preference",  color: "bg-blue-100 text-blue-700" },
  objection:   { label: "Objection",   color: "bg-red-100 text-red-600" },
  won_reason:  { label: "Won Reason",  color: "bg-green-100 text-green-700" },
  lost_reason: { label: "Lost Reason", color: "bg-orange-100 text-orange-600" },
  follow_up:   { label: "Follow Up",   color: "bg-purple-100 text-purple-700" },
};

const DEAL_STATUS_COLOR: Record<string, string> = {
  draft:         "bg-slate-100 text-slate-600",
  proposal_sent: "bg-blue-100 text-blue-700",
  negotiating:   "bg-yellow-100 text-yellow-700",
  won:           "bg-green-100 text-green-700",
  lost:          "bg-red-100 text-red-600",
  stalled:       "bg-orange-100 text-orange-600",
};

export default function ClientProfileDrawer({
  clientId,
  onClose,
}: {
  clientId: string;
  onClose: () => void;
}) {
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [deals, setDeals] = useState<ClientDeal[]>([]);
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [noteBody, setNoteBody] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("general");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/clients/${clientId}`);
    const data = await res.json();
    setProfile(data.client ?? null);
    setDeals(data.deals ?? []);
    setNotes(data.notes ?? []);
    setLoading(false);
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  const addNote = async () => {
    if (!noteBody.trim() || saving) return;
    setSaving(true);
    const res = await fetch(`/api/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody, note_type: noteType }),
    });
    const newNote = await res.json();
    if (res.ok) {
      setNotes((n) => [newNote, ...n]);
      setNoteBody("");
      setNoteType("general");
    }
    setSaving(false);
  };

  const deleteNote = async (noteId: string) => {
    setDeletingId(noteId);
    await fetch(`/api/clients/${clientId}/notes?noteId=${noteId}`, { method: "DELETE" });
    setNotes((n) => n.filter((x) => x.id !== noteId));
    setDeletingId(null);
  };

  // Stats
  const wonDeals = deals.filter((d) => d.status === "won");
  const totalRevenue = wonDeals.reduce((s, d) => {
    const opt2 = d.proposals?.[0]?.ladder_data?.option2Price ?? 0;
    return s + (d.final_amount ?? opt2);
  }, 0);
  const totalProposals = deals.reduce((s, d) => s + (d.proposals?.length ?? 0), 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-xl bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {profile?.company_name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">{profile?.company_name ?? "Loading…"}</div>
              {profile?.primary_contact_name && (
                <div className="text-sm text-muted-foreground">{profile.primary_contact_name}</div>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 text-lg leading-none">✕</button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">

            {/* Quick info */}
            <div className="px-6 py-4 border-b bg-slate-50 flex flex-wrap gap-4 text-sm">
              {profile?.website && (
                <a href={profile.website} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline">
                  <Globe className="h-3.5 w-3.5" />{profile.website.replace(/^https?:\/\//, "")}
                </a>
              )}
              {profile?.industry_category && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Tag className="h-3.5 w-3.5" />{profile.industry_category}
                </div>
              )}
              {profile?.primary_contact_email && (
                <div className="flex items-center gap-1.5 text-slate-600">
                  <Building2 className="h-3.5 w-3.5" />{profile.primary_contact_email}
                </div>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 divide-x border-b">
              {[
                { label: "Total Deals", value: deals.length, icon: <TrendingUp className="h-4 w-4 text-slate-400" /> },
                { label: "Won", value: wonDeals.length, icon: <CheckCircle className="h-4 w-4 text-green-500" /> },
                { label: "Revenue", value: totalRevenue > 0 ? formatCurrency(totalRevenue) : "—", icon: <TrendingUp className="h-4 w-4 text-[#E8192C]" /> },
              ].map(({ label, value, icon }) => (
                <div key={label} className="px-4 py-4 text-center">
                  <div className="flex justify-center mb-1">{icon}</div>
                  <div className="font-bold text-lg">{value}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Notes section */}
            <div className="px-6 py-5 border-b">
              <div className="flex items-center gap-2 mb-4">
                <StickyNote className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-sm">AE Notes & Memory</span>
                <span className="text-xs text-muted-foreground ml-auto">{notes.length} note{notes.length !== 1 ? "s" : ""}</span>
              </div>

              {/* Add note */}
              <div className="space-y-2 mb-4">
                <Textarea
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Add a note — preferences, objections, what worked, follow-up reminders…"
                  className="text-sm h-20 resize-none"
                  onKeyDown={(e) => { if (e.key === "Enter" && e.metaKey) addNote(); }}
                />
                <div className="flex items-center gap-2">
                  <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.entries(NOTE_TYPE_CONFIG) as [NoteType, { label: string; color: string }][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={addNote}
                    disabled={!noteBody.trim() || saving}
                    className="h-8 gap-1.5 bg-slate-900 hover:bg-slate-700 ml-auto"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                    Add Note
                  </Button>
                </div>
              </div>

              {/* Notes list */}
              {notes.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No notes yet. Add the first one above.</p>
              ) : (
                <div className="space-y-2">
                  {notes.map((note) => {
                    const cfg = NOTE_TYPE_CONFIG[note.note_type] ?? NOTE_TYPE_CONFIG.general;
                    return (
                      <div key={note.id} className="rounded-xl border bg-slate-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(note.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.body}</p>
                          </div>
                          <button
                            onClick={() => deleteNote(note.id)}
                            disabled={deletingId === note.id}
                            className="shrink-0 text-slate-300 hover:text-red-400 transition-colors p-1"
                          >
                            {deletingId === note.id
                              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Deal history */}
            <div className="px-6 py-5">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-sm">Deal History</span>
                <span className="text-xs text-muted-foreground ml-auto">{totalProposals} proposal{totalProposals !== 1 ? "s" : ""}</span>
              </div>

              {deals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No deals yet.</p>
              ) : (
                <div className="space-y-3">
                  {deals.map((deal) => {
                    const opt2 = deal.proposals?.[0]?.ladder_data?.option2Price;
                    const accounts = deal.proposals?.[0]?.selected_accounts ?? [];
                    return (
                      <div key={deal.id} className="rounded-xl border bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium text-sm truncate">{deal.title}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${DEAL_STATUS_COLOR[deal.status] ?? DEAL_STATUS_COLOR.draft}`}>
                                {deal.status === "proposal_sent" ? "Sent" : deal.status.charAt(0).toUpperCase() + deal.status.slice(1)}
                              </span>
                              {(deal.cities ?? []).map((c) => (
                                <Badge key={c} variant="secondary" className="text-xs">{c}</Badge>
                              ))}
                            </div>
                            {accounts.length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {accounts.length} page{accounts.length !== 1 ? "s" : ""}
                                {accounts.slice(0, 3).map((h) => ` · ${h}`).join("")}
                                {accounts.length > 3 ? ` +${accounts.length - 3} more` : ""}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0">
                            {opt2 && <div className="font-semibold text-sm">{formatCurrency(opt2)}</div>}
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {new Date(deal.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                        {deal.status === "won" && <div className="flex items-center gap-1 mt-2 text-xs text-green-600 font-medium"><CheckCircle className="h-3 w-3" /> Won</div>}
                        {deal.status === "lost" && <div className="flex items-center gap-1 mt-2 text-xs text-red-500 font-medium"><XCircle className="h-3 w-3" /> Lost</div>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
