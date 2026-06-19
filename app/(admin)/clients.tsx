import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput,
  TouchableOpacity, RefreshControl, Modal, KeyboardAvoidingView,
  Platform, ActivityIndicator, Alert, Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Fonts, Gradients, MonoLabel, Radius, Shadow } from "@/constants/theme";

type Client = {
  id: string; name: string; phone?: string; email?: string;
  no_shows?: number; created_at?: string;
  visitCount?: number;
  lastVisit?: string;
};
type Appt = {
  id: string; appointment_date: string; appointment_time: string; status: string; notes?: string;
  services: { name: string; price: number } | null;
};
type CustomField = { id: string; name: string; field_type: string };
type FieldValue  = { field_id: string; value: string | null };

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pendiente",  color: "#f59e0b", bg: "#fef9eb" },
  confirmed: { label: "Confirmada", color: Colors.blue, bg: "#eff2ff" },
  completed: { label: "Completada", color: Colors.success, bg: "#f0fdf4" },
  cancelled: { label: "Cancelada",  color: Colors.subtle, bg: Colors.cream2 },
  no_show:   { label: "No asistió", color: Colors.red, bg: "#fff0f0" },
};

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase() || "?";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.blue + "14", borderWidth: 1.5, borderColor: Colors.blue + "30", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: Colors.blue, fontSize: size * 0.33, fontFamily: "SpaceGrotesk_700Bold" }}>{initials}</Text>
    </View>
  );
}

// ─── Edit form modal (pageSheet) ──────────────────────────────────────────────

function EditModal({ visible, client, tenantId, onClose, onSaved }: {
  visible: boolean; client: Client | null; tenantId: string;
  onClose: () => void; onSaved: (c?: Client) => void;
}) {
  const isNew = client === null;
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(client?.name ?? ""); setPhone(client?.phone ?? ""); setEmail(client?.email ?? "");
    }
  }, [visible, client]);

  const canSave = name.trim().length >= 2 && phone.trim().length >= 6;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const payload = { name: name.trim(), phone: phone.trim(), email: email.trim() || null };
    if (isNew) {
      const { data } = await supabase.from("clients").insert({ ...payload, tenant_id: tenantId }).select().single();
      setSaving(false);
      onSaved(data ?? undefined);
    } else {
      await supabase.from("clients").update(payload).eq("id", client!.id);
      setSaving(false);
      onSaved({ ...client!, ...payload });
    }
    onClose();
  };

  const handleDelete = () => {
    Alert.alert("Eliminar cliente", `¿Eliminar a ${client?.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        await supabase.from("clients").delete().eq("id", client!.id);
        onSaved();
        onClose();
      }},
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
        <View style={em.header}>
          <View style={em.headerRow}>
            <TouchableOpacity onPress={onClose} style={em.iconBtn}>
              <Ionicons name="close" size={20} color={Colors.text} />
            </TouchableOpacity>
            <Text style={em.headerTitle}>{isNew ? "Nuevo cliente" : "Editar cliente"}</Text>
            {!isNew ? (
              <TouchableOpacity onPress={handleDelete} style={em.iconBtn}>
                <Ionicons name="trash-outline" size={18} color={Colors.red} />
              </TouchableOpacity>
            ) : <View style={{ width: 40 }} />}
          </View>
        </View>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            {[
              { label: "Nombre completo *", val: name, set: setName, ph: "Ej: Juan García", cap: "words" as const },
              { label: "Teléfono *", val: phone, set: setPhone, ph: "3001234567", kb: "phone-pad" as const },
              { label: "Correo electrónico", val: email, set: setEmail, ph: "juan@email.com", kb: "email-address" as const },
            ].map(f => (
              <View key={f.label} style={em.field}>
                <Text style={em.fieldLabel}>{f.label}</Text>
                <TextInput style={em.input} value={f.val} onChangeText={f.set} placeholder={f.ph}
                  placeholderTextColor={Colors.subtle} keyboardType={f.kb ?? "default"}
                  autoCapitalize={f.cap ?? "none"} />
              </View>
            ))}
          </ScrollView>
          <View style={em.bottomBar}>
            <TouchableOpacity style={[em.btn, !canSave && { opacity: 0.4 }]}
              onPress={handleSave} disabled={!canSave || saving} activeOpacity={0.85}>
              <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={em.btnGrad}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={em.btnText}>{isNew ? "Crear cliente" : "Guardar cambios"}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Client profile modal (full-screen) ───────────────────────────────────────

function ClientProfileModal({ client: initialClient, tenantId, onClose, onRefresh }: {
  client: Client; tenantId: string; onClose: () => void; onRefresh: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [client, setClient]   = useState<Client>(initialClient);
  const [appts, setAppts]     = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [fieldValues, setFieldValues]   = useState<Record<string, string>>({});
  const [editingFields, setEditingFields] = useState(false);
  const [draftValues, setDraftValues]     = useState<Record<string, string>>({});
  const [savingFields, setSavingFields]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [apptRes, cfRes, fvRes] = await Promise.all([
      supabase.from("appointments")
        .select("id,appointment_date,appointment_time,status,notes,services(name,price)")
        .eq("client_id", initialClient.id)
        .order("appointment_date", { ascending: false })
        .limit(50),
      supabase.from("custom_fields")
        .select("id,name,field_type")
        .eq("tenant_id", tenantId)
        .eq("applies_to", "client")
        .eq("active", true)
        .order("position"),
      supabase.from("client_field_values")
        .select("field_id,value")
        .eq("client_id", initialClient.id),
    ]);
    setAppts((apptRes.data ?? []) as Appt[]);
    setCustomFields((cfRes.data ?? []) as CustomField[]);
    const map: Record<string, string> = {};
    (fvRes.data ?? []).forEach((r: any) => { map[r.field_id] = r.value ?? ""; });
    setFieldValues(map);
    setDraftValues(map);
    setLoading(false);
  }, [initialClient.id, tenantId]);

  useEffect(() => { load(); }, [load]);

  const completed  = appts.filter(a => a.status === "completed");
  const noShows    = appts.filter(a => a.status === "no_show").length;
  const totalSpent = completed.reduce((s, a) => s + Number(a.services?.price ?? 0), 0);
  const since      = client.created_at ? fmtDate(client.created_at.slice(0, 10)) : "—";
  const fmtMoney   = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

  const handleEditSaved = (updated?: Client) => {
    if (!updated) { onClose(); onRefresh(); return; }
    setClient(updated);
    onRefresh();
  };

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: Colors.cream2 }}>
        {/* Header */}
        <View style={[p.header, { paddingTop: insets.top + 12 }]}>
          <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={p.headerAccent} />
          <View style={p.headerRow}>
            <TouchableOpacity onPress={onClose} style={p.iconBtn}>
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditOpen(true)} style={p.iconBtn}>
              <Ionicons name="create-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View style={p.identity}>
            <Avatar name={client.name} size={72} />
            <Text style={p.clientName}>{client.name}</Text>
            <Text style={p.clientSince}>Cliente desde {since}</Text>
            <View style={p.actions}>
              {client.phone && (
                <>
                  <TouchableOpacity style={p.actionBtn}
                    onPress={() => Linking.openURL(`tel:${client.phone}`)} activeOpacity={0.8}>
                    <Ionicons name="call-outline" size={16} color="white" />
                    <Text style={p.actionLabel}>Llamar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={p.actionBtn}
                    onPress={() => Linking.openURL(`https://wa.me/${client.phone?.replace(/\D/g, "")}`)} activeOpacity={0.8}>
                    <Ionicons name="logo-whatsapp" size={16} color="white" />
                    <Text style={p.actionLabel}>WhatsApp</Text>
                  </TouchableOpacity>
                </>
              )}
              {client.email && (
                <TouchableOpacity style={p.actionBtn}
                  onPress={() => Linking.openURL(`mailto:${client.email}`)} activeOpacity={0.8}>
                  <Ionicons name="mail-outline" size={16} color="white" />
                  <Text style={p.actionLabel}>Correo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}>
          {/* Stats */}
          <Animated.View entering={FadeInDown.delay(0).duration(300)}>
            <View style={[p.statsCard, Shadow.sm]}>
              {[
                { val: String(appts.length), label: "Citas", color: Colors.text },
                { val: String(completed.length), label: "Completadas", color: Colors.success },
                { val: String(noShows), label: "No asistió", color: noShows > 0 ? Colors.red : Colors.text },
                { val: fmtMoney(totalSpent), label: "Gastado", color: Colors.purple },
              ].map((st, i, arr) => (
                <View key={st.label} style={{ flexDirection: "row", flex: 1 }}>
                  <View style={p.statBox}>
                    <Text style={[p.statVal, { color: st.color }]}>{st.val}</Text>
                    <Text style={p.statLabel}>{st.label}</Text>
                  </View>
                  {i < arr.length - 1 && <View style={p.statDiv} />}
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Contact */}
          {(client.phone || client.email) && (
            <Animated.View entering={FadeInDown.delay(60).duration(300)}>
              <Text style={p.sectionLabel}>Contacto</Text>
              <View style={[p.card, Shadow.sm]}>
                {client.phone && (
                  <View style={p.infoRow}>
                    <View style={[p.infoIcon, { backgroundColor: Colors.success + "15" }]}>
                      <Ionicons name="call-outline" size={15} color={Colors.success} />
                    </View>
                    <Text style={p.infoText}>{client.phone}</Text>
                  </View>
                )}
                {client.phone && client.email && <View style={p.infoDivider} />}
                {client.email && (
                  <View style={p.infoRow}>
                    <View style={[p.infoIcon, { backgroundColor: Colors.blue + "15" }]}>
                      <Ionicons name="mail-outline" size={15} color={Colors.blue} />
                    </View>
                    <Text style={p.infoText}>{client.email}</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* Custom fields */}
          {customFields.length > 0 && (
            <Animated.View entering={FadeInDown.delay(90).duration(300)}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <Text style={p.sectionLabel}>Datos adicionales</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (editingFields) setDraftValues(fieldValues);
                    setEditingFields(v => !v);
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons
                    name={editingFields ? "close-outline" : "pencil-outline"}
                    size={16} color={Colors.blue}
                  />
                </TouchableOpacity>
              </View>
              <View style={[p.card, Shadow.sm]}>
                {customFields.map((f, i) => (
                  <View key={f.id}>
                    {i > 0 && <View style={p.infoDivider} />}
                    {editingFields ? (
                      <View style={p.infoRow}>
                        <Text style={[p.infoLabel, { flex: 1 }]}>{f.name}</Text>
                        <TextInput
                          style={p.cfInput}
                          value={draftValues[f.id] ?? ""}
                          onChangeText={v => setDraftValues(prev => ({ ...prev, [f.id]: v }))}
                          placeholder="—"
                          placeholderTextColor={Colors.subtle}
                        />
                      </View>
                    ) : (
                      <View style={p.infoRow}>
                        <Text style={p.infoLabel}>{f.name}</Text>
                        <Text style={p.infoValue}>{fieldValues[f.id] || "—"}</Text>
                      </View>
                    )}
                  </View>
                ))}
                {editingFields && (
                  <TouchableOpacity
                    style={[p.saveCfBtn, savingFields && { opacity: 0.5 }]}
                    disabled={savingFields}
                    onPress={async () => {
                      setSavingFields(true);
                      await Promise.all(
                        customFields.map(f =>
                          supabase.from("client_field_values").upsert(
                            { client_id: initialClient.id, field_id: f.id, value: draftValues[f.id] ?? "" },
                            { onConflict: "client_id,field_id" }
                          )
                        )
                      );
                      setFieldValues({ ...draftValues });
                      setSavingFields(false);
                      setEditingFields(false);
                    }}
                  >
                    {savingFields
                      ? <ActivityIndicator size="small" color="white" />
                      : <Text style={p.saveCfBtnTxt}>Guardar campos</Text>}
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}

          {/* History */}
          <Animated.View entering={FadeInDown.delay(120).duration(300)}>
            <Text style={[p.sectionLabel, { marginTop: 24 }]}>
              Historial{appts.length > 0 ? ` · ${appts.length} citas` : ""}
            </Text>

            {loading ? (
              <ActivityIndicator color={Colors.red} style={{ marginTop: 20 }} />
            ) : appts.length === 0 ? (
              <View style={[p.emptyCard, Shadow.sm]}>
                <Ionicons name="calendar-outline" size={36} color={Colors.subtle} style={{ marginBottom: 10 }} />
                <Text style={p.emptyTitle}>Sin citas registradas</Text>
                <Text style={p.emptySub}>Las citas aparecerán aquí</Text>
              </View>
            ) : (
              appts.map((a, i) => {
                const meta = STATUS_META[a.status] ?? STATUS_META.pending;
                const dt   = new Date(a.appointment_date + "T00:00:00");
                return (
                  <Animated.View key={a.id} entering={FadeInRight.delay(i * 35).duration(260)}>
                    <View style={[p.apptRow, Shadow.sm]}>
                      <View style={p.dateBlock}>
                        <Text style={p.dateDay}>{dt.getDate()}</Text>
                        <Text style={p.dateMon}>{MONTHS[dt.getMonth()]}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={p.apptService} numberOfLines={1}>{a.services?.name ?? "Servicio"}</Text>
                        <Text style={p.apptTime}>{a.appointment_time?.slice(0, 5) ?? "—"}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end", gap: 5 }}>
                        {a.services?.price ? (
                          <Text style={p.apptPrice}>${Number(a.services.price).toLocaleString("es-CO")}</Text>
                        ) : null}
                        <View style={[p.statusPill, { backgroundColor: meta.bg }]}>
                          <Text style={[p.statusText, { color: meta.color }]}>{meta.label}</Text>
                        </View>
                      </View>
                    </View>
                  </Animated.View>
                );
              })
            )}
          </Animated.View>
        </ScrollView>

        <EditModal
          visible={editOpen}
          client={client}
          tenantId={tenantId}
          onClose={() => setEditOpen(false)}
          onSaved={handleEditSaved}
        />
      </View>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ClientsScreen() {
  const [clients, setClients]       = useState<Client[]>([]);
  const [filtered, setFiltered]     = useState<Client[]>([]);
  const [search, setSearch]         = useState("");
  const [tenantId, setTenantId]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [profileClient, setProfileClient] = useState<Client | null>(null);
  const [newModal, setNewModal]     = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("tenants").select("id").eq("owner_id", user.id).single()
        .then(({ data }) => { if (data) setTenantId(data.id); });
    });
  }, []);

  const loadClients = async () => {
    if (!tenantId) return;
    const [{ data }, { data: appts }] = await Promise.all([
      supabase.from("clients")
        .select("id, name, phone, email, no_shows, created_at")
        .eq("tenant_id", tenantId).order("name"),
      supabase.from("appointments")
        .select("client_id, appointment_date")
        .eq("tenant_id", tenantId)
        .neq("status", "cancelled")
        .neq("status", "no_show")
        .limit(3000),
    ]);
    const statsMap = new Map<string, { count: number; last: string }>();
    (appts ?? []).forEach((a: any) => {
      const s = statsMap.get(a.client_id);
      if (!s) statsMap.set(a.client_id, { count: 1, last: a.appointment_date });
      else { s.count++; if (a.appointment_date > s.last) s.last = a.appointment_date; }
    });
    const enriched = (data ?? []).map((c: any) => {
      const st = statsMap.get(c.id);
      return { ...c, visitCount: st?.count ?? 0, lastVisit: st?.last ?? undefined };
    });
    setClients(enriched);
    setFiltered(enriched);
  };

  useEffect(() => { loadClients(); }, [tenantId]);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(clients.filter(c =>
      c.name.toLowerCase().includes(q) || (c.phone ?? "").includes(q)
    ));
  }, [search, clients]);

  const onRefresh = async () => { setRefreshing(true); await loadClients(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      <View style={s.header}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={s.headerCrumb}>Base de datos</Text>
            <Text style={s.headerTitle}>Clientes</Text>
            <Text style={s.headerSub}>{clients.length} registrado{clients.length !== 1 ? "s" : ""}</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setNewModal(true)} activeOpacity={0.8}>
            <Ionicons name="person-add-outline" size={19} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={Colors.subtle} style={{ marginRight: 8 }} />
        <TextInput
          style={s.search} placeholder="Buscar por nombre o teléfono"
          placeholderTextColor={Colors.subtle} value={search} onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={Colors.subtle} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />}
      >
        {filtered.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={s.empty}>
            <Ionicons name="people-outline" size={44} color={Colors.subtle} style={{ marginBottom: 12 }} />
            <Text style={s.emptyTitle}>{search ? "Sin resultados" : "Sin clientes aún"}</Text>
            <Text style={s.emptySub}>
              {search ? "Prueba otro nombre o teléfono" : "Toca + para agregar tu primer cliente"}
            </Text>
          </Animated.View>
        ) : (
          filtered.map((c, i) => (
            <Animated.View key={c.id} entering={FadeInRight.delay(i * 50).duration(320)}>
              <TouchableOpacity
                style={[s.row, Shadow.sm]}
                onPress={() => setProfileClient(c)}
                activeOpacity={0.75}
              >
                <Avatar name={c.name} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{c.name}</Text>
                  <Text style={s.info} numberOfLines={1}>{c.phone ?? c.email ?? "Sin contacto"}</Text>
                  {(c.visitCount ?? 0) > 0 && (
                    <Text style={s.visitStats} numberOfLines={1}>
                      {c.visitCount} visita{c.visitCount !== 1 ? "s" : ""}
                      {c.lastVisit ? ` · última: ${fmtDate(c.lastVisit)}` : ""}
                    </Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {(c.no_shows ?? 0) > 0 ? (
                    <Text style={s.noShows}>{c.no_shows} falta{(c.no_shows ?? 0) > 1 ? "s" : ""}</Text>
                  ) : null}
                  <Ionicons name="chevron-forward" size={16} color={Colors.subtle} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {/* Profile modal */}
      {profileClient && tenantId && (
        <ClientProfileModal
          client={profileClient}
          tenantId={tenantId}
          onClose={() => setProfileClient(null)}
          onRefresh={loadClients}
        />
      )}

      {/* New client modal */}
      {tenantId && (
        <EditModal
          visible={newModal}
          client={null}
          tenantId={tenantId}
          onClose={() => setNewModal(false)}
          onSaved={() => loadClients()}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header:      { paddingTop: 18, paddingHorizontal: 24, paddingBottom: 16 },
  headerCrumb: { ...MonoLabel, fontSize: 9, marginBottom: 5 },
  headerTitle: { fontSize: 24, fontFamily: Fonts.bold, color: Colors.text, letterSpacing: -0.6 },
  headerSub:   { fontSize: 13, color: Colors.muted, fontFamily: Fonts.regular, marginTop: 2 },
  addBtn:      { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.ink, alignItems: "center", justifyContent: "center" },
  searchWrap:  { flexDirection: "row", alignItems: "center", backgroundColor: Colors.white, paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, borderBottomWidth: 1, borderBottomColor: Colors.border },
  search:      { flex: 1, fontSize: 14, fontFamily: Fonts.regular, color: Colors.text },
  row:         { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  name:        { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  info:        { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  noShows:     { fontSize: 11, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.red },
  visitStats:  { fontSize: 11, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 1 },
  empty:       { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, padding: 48, alignItems: "center", marginTop: 20, ...Shadow.sm },
  emptyTitle:  { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  emptySub:    { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center" },
});

// Profile styles
const p = StyleSheet.create({
  header:      { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 28, backgroundColor: Colors.ink, overflow: "hidden" },
  headerAccent:{ position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  headerRow:   { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  iconBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.10)", alignItems: "center", justifyContent: "center" },
  identity:    { alignItems: "center", gap: 6 },
  clientName:  { fontSize: 22, fontFamily: Fonts.bold, color: "white", letterSpacing: -0.4, marginTop: 6, textAlign: "center" },
  clientSince: { fontSize: 12, fontFamily: Fonts.regular, color: "rgba(255,255,255,.6)" },
  actions:     { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  actionBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,.10)", borderWidth: 1, borderColor: "rgba(255,255,255,.12)", borderRadius: Radius.full, paddingHorizontal: 14, paddingVertical: 8 },
  actionLabel: { fontSize: 12, fontFamily: Fonts.semibold, color: "white" },

  sectionLabel:{ ...MonoLabel, marginBottom: 10, marginTop: 20 },
  card:        { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 16 },

  statsCard:   { backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", padding: 16 },
  statBox:     { flex: 1, alignItems: "center", gap: 4 },
  statVal:     { fontSize: 20, fontFamily: Fonts.bold, fontVariant: ["tabular-nums"] },
  statLabel:   { ...MonoLabel, fontSize: 8.5, textAlign: "center" },
  statDiv:     { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  infoRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  infoIcon:    { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoText:    { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  infoDivider: { height: 1, backgroundColor: Colors.border, marginVertical: 8 },
  infoLabel:   { flex: 1, fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  infoValue:   { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted },
  cfInput:     { flex: 1, fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.text, textAlign: "right", paddingVertical: 2 },
  saveCfBtn:   { marginTop: 12, backgroundColor: Colors.blue, borderRadius: Radius.md, paddingVertical: 10, alignItems: "center" },
  saveCfBtnTxt:{ fontSize: 13, fontFamily: "SpaceGrotesk_700Bold", color: "white" },

  emptyCard:   { backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.xl, padding: 40, alignItems: "center" },
  emptyTitle:  { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  emptySub:    { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center" },

  apptRow:     { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, marginBottom: 8 },
  dateBlock:   { width: 40, alignItems: "center", backgroundColor: Colors.cream2, borderRadius: Radius.sm, paddingVertical: 8 },
  dateDay:     { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, lineHeight: 20 },
  dateMon:     { fontSize: 10, fontFamily: "JetBrainsMono_500Medium", color: Colors.subtle, textTransform: "uppercase" },
  apptService: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  apptTime:    { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  apptPrice:   { fontSize: 13, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text },
  statusPill:  { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:  { fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold" },
});

// Edit modal styles
const em = StyleSheet.create({
  header:     { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.white },
  headerRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.cream2, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center" },
  headerTitle:{ fontSize: 17, fontFamily: Fonts.bold, color: Colors.text, letterSpacing: -0.3 },
  field:      { marginBottom: 16 },
  fieldLabel: { ...MonoLabel, fontSize: 9.5, marginBottom: 8 },
  input:      { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: Fonts.regular, color: Colors.text },
  bottomBar:  { padding: 20, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.cream2 },
  btn:        { borderRadius: Radius.full, overflow: "hidden" },
  btnGrad: { paddingVertical: 16, alignItems: "center" },
  btnText:    { fontSize: 15, fontFamily: Fonts.bold, color: "white" },
});
