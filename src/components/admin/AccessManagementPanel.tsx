import { useEffect, useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import {
  Eye, EyeOff, KeyRound, Loader2, Pencil, Plus, Shield, Trash2, UserPlus, Users, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  adminCreateUser,
  adminDeleteUser,
  adminGetUsers,
  adminUpdateUser,
  type AdminAccount,
} from "@/lib/apiAdmin";
import {
  PANEL_LABELS,
  PANEL_PERMISSIONS,
  type PanelPermission,
} from "@/lib/adminSession";

const emptyForm = {
  name: "",
  username: "",
  password: "",
  permissions: [] as PanelPermission[],
};

const PermissionPicker = ({
  value,
  onChange,
}: {
  value: PanelPermission[];
  onChange: (next: PanelPermission[]) => void;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {PANEL_PERMISSIONS.map((permission) => {
      const checked = value.includes(permission);
      return (
        <label
          key={permission}
          className={`flex items-center gap-3 rounded-xl border px-3 py-3 cursor-pointer transition-colors ${
            checked
              ? "border-secondary/40 bg-secondary/10"
              : "border-white/10 bg-white/[0.03] hover:border-white/20"
          }`}
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-[#d4a017]"
            checked={checked}
            onChange={() =>
              onChange(
                checked
                  ? value.filter((item) => item !== permission)
                  : [...value, permission]
              )
            }
          />
          <span className="text-sm text-white/80">{PANEL_LABELS[permission]}</span>
        </label>
      );
    })}
  </div>
);

const AccessManagementPanel = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [editForm, setEditForm] = useState({ name: "", password: "", permissions: [] as PanelPermission[] });
  const [editSaving, setEditSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await adminGetUsers());
    } catch (err: any) {
      toast({ title: "Could not load access", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (form.permissions.length === 0) {
      toast({ title: "Choose access", description: "Select at least one admin panel section.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const created = await adminCreateUser({
        username: form.username.trim(),
        password: form.password,
        name: form.name.trim(),
        permissions: form.permissions,
      });
      setUsers((prev) => [created, ...prev]);
      setForm(emptyForm);
      toast({ title: "Access created", description: `${created.username} can now sign in to the admin panel.` });
    } catch (err: any) {
      toast({ title: "Could not create access", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (user: AdminAccount) => {
    setEditing(user);
    setEditForm({
      name: user.name || "",
      password: "",
      permissions: user.role === "super_admin" ? [...PANEL_PERMISSIONS] : [...user.permissions],
    });
  };

  const handleEditSave = async () => {
    if (!editing) return;
    if (editing.role !== "super_admin" && editForm.permissions.length === 0) {
      toast({ title: "Choose access", description: "Select at least one admin panel section.", variant: "destructive" });
      return;
    }
    setEditSaving(true);
    try {
      const payload: { name: string; permissions?: PanelPermission[]; password?: string } = {
        name: editForm.name.trim(),
      };
      if (editing.role !== "super_admin") payload.permissions = editForm.permissions;
      if (editForm.password.trim()) payload.password = editForm.password;
      const updated = await adminUpdateUser(editing.id, payload);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditing(null);
      toast({
        title: "Access updated",
        description: editForm.password.trim()
          ? "Permissions saved. They will need to sign in again with the new password."
          : "Permissions saved.",
      });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setEditSaving(false);
    }
  };

  const toggleActive = async (user: AdminAccount) => {
    if (user.role === "super_admin") return;
    setBusyId(user.id);
    try {
      const updated = await adminUpdateUser(user.id, { active: !user.active });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast({ title: updated.active ? "Access enabled" : "Access disabled" });
    } catch (err: any) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (user: AdminAccount) => {
    if (user.role === "super_admin") return;
    const confirmed = window.confirm(`Remove admin access for ${user.username}? They will no longer be able to sign in.`);
    if (!confirmed) return;
    setBusyId(user.id);
    try {
      await adminDeleteUser(user.id);
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      toast({ title: "Access removed" });
    } catch (err: any) {
      toast({ title: "Could not remove access", description: err.message, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const staffCount = users.filter((u) => u.role !== "super_admin").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {[
          { label: "Team accounts", value: users.length, icon: Users },
          { label: "Staff logins", value: staffCount, icon: Shield },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-5"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary/20 flex items-center justify-center mb-3">
              <stat.icon className="w-4 h-4 text-secondary" />
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-white font-heading">{stat.value}</div>
            <div className="text-[10px] sm:text-xs text-primary-foreground/40 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.form
        onSubmit={handleCreate}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 p-4 sm:p-6 space-y-4"
      >
        <div className="flex items-center gap-2">
          <UserPlus className="w-4 h-4 text-secondary" />
          <h2 className="font-heading font-bold text-primary-foreground text-base">Create admin access</h2>
        </div>
        <p className="text-xs text-primary-foreground/45">
          Issue a username and password, then choose which admin panel sections this person can open.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-white/60 text-xs mb-1.5 block">Display name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Influencer tracking team"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
            />
          </div>
          <div>
            <Label className="text-white/60 text-xs mb-1.5 block">Username</Label>
            <Input
              value={form.username}
              onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))}
              placeholder="e.g. campaigns_team"
              required
              autoComplete="off"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
            />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-white/60 text-xs mb-1.5 block">Password</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="At least 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                className="pr-10 bg-white/5 border-white/10 text-white placeholder:text-white/25"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/70"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
        <div>
          <Label className="text-white/60 text-xs mb-2 block">Panel access</Label>
          <PermissionPicker
            value={form.permissions}
            onChange={(permissions) => setForm((p) => ({ ...p, permissions }))}
          />
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="hero" className="gap-2" disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create credentials
          </Button>
        </div>
      </motion.form>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-primary-foreground/10 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-secondary" />
          <h2 className="font-heading font-bold text-primary-foreground text-base">Issued access</h2>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 text-primary-foreground/50">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading...
          </div>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-primary-foreground/40">No admin accounts yet.</p>
        ) : (
          <div className="divide-y divide-primary-foreground/[0.06]">
            {users.map((user) => (
              <div key={user.id} className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white truncate">{user.name || user.username}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      user.role === "super_admin"
                        ? "bg-amber-400/15 text-amber-300"
                        : user.active
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-white/10 text-white/45"
                    }`}>
                      {user.role === "super_admin" ? "Super admin" : user.active ? "Staff" : "Disabled"}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">@{user.username}</p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(user.role === "super_admin" ? PANEL_PERMISSIONS : user.permissions).map((permission) => (
                      <span
                        key={permission}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 text-white/65"
                      >
                        {PANEL_LABELS[permission]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {user.role !== "super_admin" && (
                    <div className="flex items-center gap-2 pr-2">
                      <span className="text-[11px] text-white/40">Active</span>
                      <Switch
                        checked={user.active}
                        disabled={busyId === user.id}
                        onCheckedChange={() => void toggleActive(user)}
                      />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(user)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-white/5 hover:bg-white/10 text-white/60 hover:text-white"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  {user.role !== "super_admin" && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(user)}
                      disabled={busyId === user.id}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-300 disabled:opacity-40"
                    >
                      {busyId === user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

      {editing && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4" style={{ background: "rgba(0,0,0,0.75)" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10">
              <div>
                <h2 className="font-heading text-lg font-bold text-white">Edit access</h2>
                <p className="text-xs text-white/40 mt-0.5">@{editing.username}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} className="text-white/40 hover:text-white p-1.5">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 sm:p-5 space-y-4">
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">Display name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              {editing.role === "super_admin" ? (
                <p className="text-xs text-white/45">Super admin always has access to every section of the dashboard.</p>
              ) : (
                <div>
                  <Label className="text-white/60 text-xs mb-2 block">Panel access</Label>
                  <PermissionPicker
                    value={editForm.permissions}
                    onChange={(permissions) => setEditForm((p) => ({ ...p, permissions }))}
                  />
                </div>
              )}
              <div>
                <Label className="text-white/60 text-xs mb-1.5 block">New password (optional)</Label>
                <Input
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Leave blank to keep the current password"
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/25"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 p-4 sm:p-5 border-t border-white/10">
              <button type="button" onClick={() => setEditing(null)} className="text-sm text-white/45 hover:text-white px-3 py-2">
                Cancel
              </button>
              <Button type="button" variant="hero" className="gap-2" onClick={() => void handleEditSave()} disabled={editSaving}>
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save access
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AccessManagementPanel;
