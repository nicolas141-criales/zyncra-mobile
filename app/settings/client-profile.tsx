import { useEffect, useState, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Linking, Alert, Modal,
  TextInput, KeyboardAvoidingView, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Gradients, Radius, Shadow } from "@/constants/theme";

type Client = {
  id: string; name: string; phone?: string; email?: string;
  no_shows?: number; created_at?: string;
};

type Appt = {
  id: string; date: string; time: string; status: string;
  notes?: string;
  services: { name: string; price: number } | null;
};

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: "Pendiente",   color: "#f59e0b", bg: "#fef9eb" },
  confirmed: { label: "Confirmada",  color: Colors.blue, bg: "#eff2ff" },
  completed: { label: "Completada",  color: Colors.success, bg: "#f0fdf4" },
  cancelled: { label: "Cancelada",   color: Colors.subtle, bg: Colors.cream2 },
  no_show:   { label: "No asistió",  color: Colors.red, bg: "#fff0f0" },
};

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];

function fmtDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${dt.getFullYear()}`;
}

function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).filter(Boolean).join("").slice(0, 2).toUpperCase();
  return (
    <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "white", fontSize: size * 0.33, fontFamily: "SpaceGrotesk_700Bold" }}>{initials}</Text>
    </LinearGradient>
  );
}

function StatBox({ value, label, color = Colors.text }: { value: string; label: string; color?: string }) {
  return (
    <View style={s.statBox}>
      <Text style={[s.statVal, { color }]}>{value}</Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

function EditModal({ visible, client, onClose, onSaved }: {
  visible: boolean; client: Client | null; onClose: () => void; onSaved: (c: Client) => void;
}) {
  const [name, setName]   = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && client) {
      setName(client.name); setPhone(client.phone ?? ""); setEmail(client.email ?? "");
    }
  }, [visible, client]);

  const canSave = name.trim().length >= 2 && phone.trim().length >= 6;

  const handleSave = async () => {
    if (!client || !canSave) return;
    setSaving(true);
    const payload = { name: name.trim(), phone: phone.trim(), email: email.trim() || null };
    await supabase.from("clients").update(payload).eq("id", client.id);
    setSaving(false);
    onSaved({ ...client, ...payload });
    onClose();
  };

  const handleDelete = () => {
    if (!client) return;
    Alert.alert("Eliminar cliente", `¿Eliminar a ${client.name}? Esta acción no se puede deshacer.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        await supabase.from("clients").delete().eq("id", client.id);
        onClose();
        onSaved({ ...client, name: "__deleted__" });
      }},
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
        <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={em.header}>
          <View style={em.headerRow}>
            <TouchableOpacity onPress={onClose} style={em.iconBtn}>
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
            <Text style={em.headerTitle}>Editar cliente</Text>
            <TouchableOpacity onPress={handleDelete} style={em.iconBtn}>
              <Ionicons name="trash-outline" size={18} color="white" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            {[
              { label: "Nombre completo *", value: name, set: setName, placeholder: "Ej: Juan García", cap: "words" as const },
              { label: "Teléfono *", value: phone, set: setPhone, placeholder: "3001234567", kb: "phone-pad" as const },
              { label: "Correo electrónico", value: email, set: setEmail, placeholder: "juan@email.com", kb: "email-address" as const },
            ].map(f => (
              <View key={f.label} style={em.field}>
                <Text style={em.fieldLabel}>{f.label}</Text>
                <TextInput
                  style={em.input} value={f.value} onChangeText={f.set}
                  placeholder={f.placeholder} placeholderTextColor={Colors.subtle}
                  keyboardType={f.kb ?? "default"} autoCapitalize={f.cap ?? "none"}
                />
              </View>
            ))}
          </ScrollView>

          <View style={em.bottomBar}>
            <TouchableOpacity
              style={[em.btn, !canSave && { opacity: 0.4 }]}
              onPress={handleSave} disabled={!canSave || saving} activeOpacity={0.85}
            >
              <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={em.btnGrad}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={em.btnText}>Guardar cambios</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ClientProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [client, setClient]   = useState<Client | null>(null);
  const [appts, setAppts]     = useState<Appt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const [{ data: c }, { data: a }] = await Promise.all([
      supabase.from("clients").select("id,name,phone,email,no_shows,created_at").eq("id", id).single(),
      supabase.from("appointments")
        .select("id,date,time,status,notes,services(name,price)")
        .eq("client_id", id)
        .order("date", { ascending: false })
        .limit(30),
    ]);
    if (c) setClient(c);
    setAppts((a ?? []) as Appt[]);
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleEditSaved = (updated: Client) => {
    if (updated.name === "__deleted__") { router.back(); return; }
    setClient(updated);
  };

  if (loading || !client) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={Colors.red} size="large" />
      </SafeAreaView>
    );
  }

  const completed  = appts.filter(a => a.status === "completed");
  const noShows    = appts.filter(a => a.status === "no_show").length;
  const totalSpent = completed.reduce((s, a) => s + Number(a.services?.price ?? 0), 0);
  const since      = client.created_at ? fmtDate(client.created_at.slice(0, 10)) : "—";

  const fmtMoney = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      {/* Header */}
      <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.iconBtn}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setEditOpen(true)} style={s.iconBtn}>
            <Ionicons name="create-outline" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Identity */}
        <View style={s.identity}>
          <Avatar name={client.name} size={72} />
          <Text style={s.clientName}>{client.name}</Text>
          <Text style={s.clientSince}>Cliente desde {since}</Text>

          {/* Quick actions */}
          <View style={s.actions}>
            {client.phone && (
              <>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => Linking.openURL(`tel:${client.phone}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="call-outline" size={18} color="white" />
                  <Text style={s.actionLabel}>Llamar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.actionBtn}
                  onPress={() => Linking.openURL(`https://wa.me/${client.phone?.replace(/\D/g, "")}`)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="white" />
                  <Text style={s.actionLabel}>WhatsApp</Text>
                </TouchableOpacity>
              </>
            )}
            {client.email && (
              <TouchableOpacity
                style={s.actionBtn}
                onPress={() => Linking.openURL(`mailto:${client.email}`)}
                activeOpacity={0.8}
              >
                <Ionicons name="mail-outline" size={18} color="white" />
                <Text style={s.actionLabel}>Correo</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(0).duration(340)}>
          <View style={[s.statsCard, Shadow.sm]}>
            <StatBox value={String(appts.length)} label="Citas totales" />
            <View style={s.statDivider} />
            <StatBox value={String(completed.length)} label="Completadas" color={Colors.success} />
            <View style={s.statDivider} />
            <StatBox value={String(noShows)} label="No asistió" color={noShows > 0 ? Colors.red : Colors.text} />
            <View style={s.statDivider} />
            <StatBox value={fmtMoney(totalSpent)} label="Gastado" color={Colors.purple} />
          </View>
        </Animated.View>

        {/* Contact info */}
        <Animated.View entering={FadeInDown.delay(60).duration(340)}>
          <Text style={s.sectionLabel}>Contacto</Text>
          <View style={[s.card, Shadow.sm]}>
            {client.phone && (
              <View style={s.infoRow}>
                <View style={[s.infoIcon, { backgroundColor: Colors.success + "15" }]}>
                  <Ionicons name="call-outline" size={15} color={Colors.success} />
                </View>
                <Text style={s.infoText}>{client.phone}</Text>
              </View>
            )}
            {client.phone && client.email && <View style={s.infoDivider} />}
            {client.email && (
              <View style={s.infoRow}>
                <View style={[s.infoIcon, { backgroundColor: Colors.blue + "15" }]}>
                  <Ionicons name="mail-outline" size={15} color={Colors.blue} />
                </View>
                <Text style={s.infoText}>{client.email}</Text>
              </View>
            )}
            {!client.phone && !client.email && (
              <Text style={{ color: Colors.subtle, fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", padding: 4 }}>
                Sin datos de contacto
              </Text>
            )}
          </View>
        </Animated.View>

        {/* Appointment history */}
        <Animated.View entering={FadeInDown.delay(120).duration(340)}>
          <Text style={[s.sectionLabel, { marginTop: 24 }]}>
            Historial de citas
            {appts.length > 0 && <Text style={{ color: Colors.subtle }}> · {appts.length}</Text>}
          </Text>

          {appts.length === 0 ? (
            <View style={[s.emptyCard, Shadow.sm]}>
              <Ionicons name="calendar-outline" size={36} color={Colors.subtle} style={{ marginBottom: 10 }} />
              <Text style={s.emptyTitle}>Sin citas registradas</Text>
              <Text style={s.emptySub}>Las citas de este cliente aparecerán aquí</Text>
            </View>
          ) : (
            appts.map((a, i) => {
              const meta = STATUS_META[a.status] ?? STATUS_META.pending;
              return (
                <Animated.View key={a.id} entering={FadeInRight.delay(i * 40).duration(280)}>
                  <View style={[s.apptRow, Shadow.sm]}>
                    {/* Date block */}
                    <View style={s.dateBlock}>
                      <Text style={s.dateDay}>{new Date(a.date + "T00:00:00").getDate()}</Text>
                      <Text style={s.dateMon}>{MONTHS[new Date(a.date + "T00:00:00").getMonth()]}</Text>
                    </View>

                    {/* Info */}
                    <View style={{ flex: 1 }}>
                      <Text style={s.apptService} numberOfLines={1}>
                        {a.services?.name ?? "Servicio"}
                      </Text>
                      <Text style={s.apptTime}>{a.time?.slice(0, 5) ?? "—"}</Text>
                    </View>

                    {/* Right */}
                    <View style={{ alignItems: "flex-end", gap: 6 }}>
                      {a.services?.price ? (
                        <Text style={s.apptPrice}>${Number(a.services.price).toLocaleString("es-CO")}</Text>
                      ) : null}
                      <View style={[s.statusPill, { backgroundColor: meta.bg }]}>
                        <Text style={[s.statusText, { color: meta.color }]}>{meta.label}</Text>
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
        onClose={() => setEditOpen(false)}
        onSaved={handleEditSaved}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  header:       { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 28 },
  headerRow:    { flexDirection: "row", justifyContent: "space-between", marginBottom: 20 },
  iconBtn:      { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },

  identity:     { alignItems: "center", gap: 8 },
  clientName:   { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: "white", letterSpacing: -0.4, textAlign: "center", marginTop: 4 },
  clientSince:  { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: "rgba(255,255,255,.75)" },

  actions:      { flexDirection: "row", gap: 10, marginTop: 8 },
  actionBtn:    { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,.2)", borderRadius: Radius.full, paddingHorizontal: 16, paddingVertical: 9 },
  actionLabel:  { fontSize: 13, fontFamily: "SpaceGrotesk_600SemiBold", color: "white" },

  sectionLabel: { fontSize: 11, fontFamily: "SpaceGrotesk_700Bold", color: Colors.subtle, textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 10, marginTop: 20 },

  statsCard:    { backgroundColor: Colors.white, borderRadius: Radius.lg, flexDirection: "row", padding: 16 },
  statBox:      { flex: 1, alignItems: "center", gap: 4 },
  statVal:      { fontSize: 20, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text },
  statLabel:    { fontSize: 10, fontFamily: "SpaceGrotesk_500Medium", color: Colors.subtle, textAlign: "center" },
  statDivider:  { width: 1, backgroundColor: Colors.border, marginVertical: 4 },

  card:         { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 16 },
  infoRow:      { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  infoIcon:     { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoText:     { fontSize: 14, fontFamily: "SpaceGrotesk_500Medium", color: Colors.text },
  infoDivider:  { height: 1, backgroundColor: Colors.border, marginVertical: 8 },

  emptyCard:    { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 40, alignItems: "center" },
  emptyTitle:   { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  emptySub:     { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center" },

  apptRow:      { backgroundColor: Colors.white, borderRadius: Radius.md, flexDirection: "row", alignItems: "center", gap: 14, padding: 14, marginBottom: 8 },
  dateBlock:    { width: 40, alignItems: "center", backgroundColor: Colors.cream2, borderRadius: Radius.sm, paddingVertical: 8 },
  dateDay:      { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, lineHeight: 20 },
  dateMon:      { fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.subtle, textTransform: "uppercase" },
  apptService:  { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  apptTime:     { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  apptPrice:    { fontSize: 13, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text },
  statusPill:   { borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  statusText:   { fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold" },
});

const em = StyleSheet.create({
  header:     { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20 },
  headerRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconBtn:    { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  headerTitle:{ fontSize: 18, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
  field:      { marginBottom: 16 },
  fieldLabel: { fontSize: 11, fontFamily: "SpaceGrotesk_700Bold", color: Colors.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  input:      { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "SpaceGrotesk_400Regular", color: Colors.text },
  bottomBar:  { padding: 20, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.cream2 },
  btn:        { borderRadius: Radius.full, overflow: "hidden" },
  btnGrad:    { paddingVertical: 16, alignItems: "center" },
  btnText:    { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
});
