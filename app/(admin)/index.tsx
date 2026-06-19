import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Fonts, Gradients, MonoLabel, Radius, Shadow } from "@/constants/theme";
import { refreshAllReminders } from "@/lib/notifications";
import NewApptModal from "@/components/NewApptModal";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

const fmtMoney = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M`
  : n >= 1000    ? `$${(n / 1000).toFixed(0)}k`
  : `$${n}`;

type Appt = {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  clients: { name: string } | null;
  services: { name: string } | null;
};

const STATUS_COLOR: Record<string, string> = {
  confirmed: Colors.success,
  pending:   "#f59e0b",
  cancelled: Colors.red,
  completed: Colors.blue,
};
const STATUS_LABEL: Record<string, string> = {
  confirmed: "Confirmada",
  pending:   "Pendiente",
  cancelled: "Cancelada",
  completed: "Completada",
};

// ─── Stat chip ────────────────────────────────────────────────────────────────

function StatChip({ icon, value, label, color, delay }: {
  icon: IoniconName; value: string; label: string; color: string; delay: number;
}) {
  return (
    <Animated.View entering={FadeInUp.delay(delay).duration(350).springify()} style={[sc.chip, Shadow.sm]}>
      <View style={sc.topRow}>
        <Text style={sc.label} numberOfLines={1}>{label}</Text>
        <Ionicons name={icon} size={13} color={color} />
      </View>
      <Text style={sc.value}>{value}</Text>
    </Animated.View>
  );
}

const sc = StyleSheet.create({
  chip:    { flex: 1, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, paddingVertical: 14, paddingHorizontal: 14, gap: 8 },
  topRow:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 4 },
  label:   { ...MonoLabel, fontSize: 9, flexShrink: 1 },
  value:   { fontSize: 24, fontFamily: Fonts.bold, color: Colors.text, letterSpacing: -1, fontVariant: ["tabular-nums"] },
});

// ─── Appointment row ──────────────────────────────────────────────────────────

function ApptRow({ a, i, onPress }: { a: Appt; i: number; onPress: () => void }) {
  const time  = a.appointment_time.substring(0, 5);
  const color = STATUS_COLOR[a.status] ?? Colors.subtle;
  const label = STATUS_LABEL[a.status] ?? a.status;
  const now   = new Date();
  const apptDt = new Date(`${a.appointment_date}T${a.appointment_time}`);
  const isNext = apptDt > now && (a.status === "confirmed" || a.status === "pending");

  return (
    <Animated.View entering={FadeInRight.delay(i * 60).duration(320)}>
      <TouchableOpacity style={[ar.row, Shadow.sm]} onPress={onPress} activeOpacity={0.8}>
        {/* status left accent */}
        <View style={[ar.accent, { backgroundColor: color }]} />

        <View style={[ar.timePill, { backgroundColor: color + "12" }]}>
          <Text style={[ar.time, { color }]}>{time}</Text>
        </View>

        <View style={{ flex: 1, gap: 2 }}>
          <Text style={ar.client} numberOfLines={1}>{a.clients?.name ?? "Sin cliente"}</Text>
          <Text style={ar.service} numberOfLines={1}>{a.services?.name ?? "Sin servicio"}</Text>
        </View>

        <View style={{ alignItems: "flex-end", gap: 4 }}>
          {isNext && (
            <View style={ar.nextBadge}>
              <Text style={ar.nextText}>Próxima</Text>
            </View>
          )}
          <View style={[ar.badge, { backgroundColor: color + "15" }]}>
            <Text style={[ar.badgeText, { color }]}>{label}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const ar = StyleSheet.create({
  row:       { backgroundColor: Colors.white, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10, overflow: "hidden" },
  accent:    { width: 4, alignSelf: "stretch" },
  timePill:  { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7, minWidth: 48, alignItems: "center" },
  time:      { fontSize: 13, fontFamily: "SpaceGrotesk_700Bold" },
  client:    { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  service:   { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted },
  badge:     { borderRadius: Radius.full, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold" },
  nextBadge: { backgroundColor: "#fff7ed", borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  nextText:  { fontSize: 9, fontFamily: "SpaceGrotesk_700Bold", color: "#c2410c" },
});

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardScreen() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState("Tu negocio");
  const [tenantId, setTenantId]     = useState<string | null>(null);
  const [appts, setAppts]           = useState<Appt[]>([]);
  const [metrics, setMetrics]       = useState({ total: 0, confirmed: 0, clients: 0, revenueDay: 0, revenueMonth: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [showNew, setShowNew]       = useState(false);

  const load = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tenant } = await supabase
      .from("tenants").select("id, name").eq("owner_id", user.id).single();
    if (!tenant) return;
    setTenantName(tenant.name);
    setTenantId(tenant.id);

    const now        = new Date();
    const dateStr    = now.toISOString().split("T")[0];
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

    const [{ data: todayAppts }, { count: clientCount }, { data: sales }] = await Promise.all([
      supabase.from("appointments")
        .select("id, appointment_date, appointment_time, status, clients(name), services(name, price)")
        .eq("tenant_id", tenant.id)
        .eq("appointment_date", dateStr)
        .order("appointment_time"),
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("tenant_id", tenant.id),
      supabase.from("pos_sales").select("total, created_at").eq("tenant_id", tenant.id).gte("created_at", monthStart),
    ]);

    const all      = (todayAppts as Appt[]) ?? [];
    const allSales = sales ?? [];
    const revenueDay   = allSales.filter(s => s.created_at?.slice(0, 10) === dateStr).reduce((acc, s) => acc + Number(s.total ?? 0), 0);
    const revenueMonth = allSales.reduce((acc, s) => acc + Number(s.total ?? 0), 0);

    setAppts(all);
    setMetrics({ total: all.length, confirmed: all.filter(a => a.status === "confirmed").length, clients: clientCount ?? 0, revenueDay, revenueMonth });
  };

  useEffect(() => { load(); refreshAllReminders(); }, []);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const todayLabel = new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  const pendingCount = appts.filter(a => a.status === "pending" || a.status === "confirmed").length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />}
      >
        {/* ── Header: tinta sobre lienzo, crumb mono ── */}
        <Animated.View entering={FadeInDown.duration(400)} style={s.header}>
          <View style={{ flex: 1 }}>
            <Text style={s.crumb}>{todayLabel}</Text>
            <Text style={s.bizName} numberOfLines={1}>{tenantName}</Text>
            <Text style={s.greeting}>{greeting()} 👋</Text>
          </View>
          <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatarRing}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>{tenantName.slice(0, 2).toUpperCase()}</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        <View style={{ paddingHorizontal: 20, paddingTop: 4, gap: 12 }}>

          {/* ── Revenue hero card: superficie ink + firma de gradiente ── */}
          <Animated.View entering={FadeInDown.delay(120).duration(400)}>
            <View style={[s.revenueCard, Shadow.md]}>
              <LinearGradient colors={Gradients.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.revenueGrad}>
                <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.revenueAccent} />
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <View>
                    <Text style={s.revenueLabel}>Ingresos del mes</Text>
                    <Text style={s.revenueValue}>{fmtMoney(metrics.revenueMonth)}</Text>
                    <View style={s.revenueSub}>
                      <View style={[s.revenueDot, { backgroundColor: metrics.revenueDay > 0 ? Colors.success : Colors.subtle }]} />
                      <Text style={s.revenueSubText}>
                        {metrics.revenueDay > 0 ? `${fmtMoney(metrics.revenueDay)} hoy` : "Sin cobros hoy"}
                      </Text>
                    </View>
                  </View>
                  <View style={s.revenueBadge}>
                    <Ionicons name="trending-up-outline" size={18} color="white" />
                  </View>
                </View>

                {/* mini breakdown bar */}
                {pendingCount > 0 && (
                  <View style={s.projectedRow}>
                    <Ionicons name="time-outline" size={12} color="rgba(255,255,255,.5)" />
                    <Text style={s.projectedText}>{pendingCount} cita{pendingCount !== 1 ? "s" : ""} pendiente{pendingCount !== 1 ? "s" : ""} por cobrar</Text>
                  </View>
                )}
              </LinearGradient>
            </View>
          </Animated.View>

          {/* ── Stat chips ── */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <StatChip icon="calendar-outline"        value={String(metrics.total)}     label="Citas hoy"    color={Colors.red}     delay={160} />
            <StatChip icon="checkmark-circle-outline" value={String(metrics.confirmed)} label="Confirmadas"  color={Colors.success} delay={220} />
            <StatChip icon="people-outline"           value={String(metrics.clients)}   label="Clientes"     color={Colors.purple}  delay={280} />
          </View>

          {/* ── Quick access ── */}
          <Animated.View entering={FadeInDown.delay(300).duration(380)}>
            <TouchableOpacity
              style={s.reportsBtn}
              onPress={() => router.navigate("/(admin)/reports" as any)}
              activeOpacity={0.85}
            >
              <View style={s.reportsBtnIcon}>
                <Ionicons name="bar-chart-outline" size={16} color={Colors.red} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.reportsBtnTitle}>Ver Reportes</Text>
                <Text style={s.reportsBtnSub}>Ingresos, servicios, equipo</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.subtle} />
            </TouchableOpacity>
          </Animated.View>

          {/* ── Today's agenda ── */}
          <Animated.View entering={FadeInDown.delay(360).duration(380)} style={{ marginTop: 8 }}>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Agenda de hoy</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TouchableOpacity style={s.newCitaBtn} onPress={() => setShowNew(true)} activeOpacity={0.8}>
                  <Ionicons name="add" size={14} color="white" />
                  <Text style={s.newCitaBtnText}>Nueva cita</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.navigate("/agenda" as any)} activeOpacity={0.7}>
                  <Text style={s.sectionLink}>Ver todo →</Text>
                </TouchableOpacity>
              </View>
            </View>

            {appts.length === 0 ? (
              <View style={[s.empty, Shadow.sm]}>
                <LinearGradient colors={["#f8f7f5", Colors.cream2]} style={s.emptyInner}>
                  <View style={s.emptyIcon}>
                    <Ionicons name="calendar-outline" size={28} color={Colors.subtle} />
                  </View>
                  <Text style={s.emptyTitle}>Sin citas para hoy</Text>
                  <Text style={s.emptySub}>Agenda la primera cita del día</Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => setShowNew(true)} activeOpacity={0.8}>
                    <Ionicons name="add" size={15} color="white" />
                    <Text style={s.emptyBtnText}>Agendar cita</Text>
                  </TouchableOpacity>
                </LinearGradient>
              </View>
            ) : (
              appts.map((a, i) => (
                <ApptRow
                  key={a.id}
                  a={a}
                  i={i}
                  onPress={() => router.navigate("/agenda" as any)}
                />
              ))
            )}
          </Animated.View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {tenantId && (
        <NewApptModal
          visible={showNew}
          onClose={() => setShowNew(false)}
          tenantId={tenantId}
          initialDate={new Date()}
          onSuccess={load}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:        { flexDirection: "row", alignItems: "center", gap: 14, paddingTop: 18, paddingHorizontal: 24, paddingBottom: 18 },
  crumb:         { ...MonoLabel, fontSize: 9, marginBottom: 5 },
  bizName:       { fontSize: 26, fontFamily: Fonts.bold, color: Colors.text, letterSpacing: -0.8 },
  greeting:      { fontSize: 13, fontFamily: Fonts.regular, color: Colors.muted, marginTop: 2 },
  avatarRing:    { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  avatar:        { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.ink, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "white" },
  avatarText:    { fontSize: 12, fontFamily: Fonts.bold, color: "white", letterSpacing: 0.5 },

  revenueCard:   { borderRadius: Radius.xl, overflow: "hidden" },
  revenueGrad:   { padding: 20, paddingTop: 23, overflow: "hidden" },
  revenueAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3 },
  revenueLabel:  { ...MonoLabel, fontSize: 9.5, color: "rgba(255,255,255,.55)", marginBottom: 8 },
  revenueValue:  { fontSize: 36, fontFamily: Fonts.bold, color: "white", letterSpacing: -1.5, fontVariant: ["tabular-nums"] },
  revenueSub:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6 },
  revenueDot:    { width: 7, height: 7, borderRadius: 4 },
  revenueSubText:{ fontSize: 12, fontFamily: "SpaceGrotesk_600SemiBold", color: "rgba(255,255,255,.6)" },
  revenueBadge:  { width: 44, height: 44, borderRadius: 14, backgroundColor: "rgba(255,255,255,.1)", alignItems: "center", justifyContent: "center" },
  projectedRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,.08)" },
  projectedText: { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: "rgba(255,255,255,.45)" },

  sectionHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionTitle:     { fontSize: 16, fontFamily: Fonts.bold, color: Colors.text, letterSpacing: -0.3 },
  sectionLink:      { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.red },
  newCitaBtn:       { flexDirection: "row", alignItems: "center", gap: 4, borderRadius: Radius.full, paddingVertical: 6, paddingHorizontal: 12, backgroundColor: Colors.ink },
  newCitaBtnText:   { fontSize: 12, fontFamily: Fonts.bold, color: "white" },

  reportsBtn:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: Colors.white, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: 14, ...Shadow.sm },
  reportsBtnIcon:   { width: 36, height: 36, borderRadius: 11, backgroundColor: Colors.red + "14", alignItems: "center", justifyContent: "center" },
  reportsBtnTitle:  { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  reportsBtnSub:    { fontSize: 11, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 1 },

  empty:         { borderRadius: Radius.xl, overflow: "hidden" },
  emptyInner:    { padding: 36, alignItems: "center" },
  emptyIcon:     { width: 60, height: 60, borderRadius: 20, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border, alignItems: "center", justifyContent: "center", marginBottom: 14, ...Shadow.sm },
  emptyTitle:    { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  emptySub:      { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center", lineHeight: 19, marginBottom: 20 },
  emptyBtn:      { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: Radius.full, paddingVertical: 11, paddingHorizontal: 20, backgroundColor: Colors.red },
  emptyBtnText:  { fontSize: 13, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
});
