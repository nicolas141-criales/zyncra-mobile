import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Gradients, Radius, Shadow } from "@/constants/theme";

const DAYS = [
  { key: "1", label: "Lunes" },
  { key: "2", label: "Martes" },
  { key: "3", label: "Miércoles" },
  { key: "4", label: "Jueves" },
  { key: "5", label: "Viernes" },
  { key: "6", label: "Sábado" },
  { key: "0", label: "Domingo" },
];

type DayConfig = { open: boolean; start: string; end: string };
type Schedule  = Record<string, DayConfig>;

const DEFAULT_DAY: DayConfig = { open: false, start: "09:00", end: "18:00" };

function buildDefault(): Schedule {
  const s: Schedule = {};
  DAYS.forEach(d => {
    s[d.key] = { open: d.key !== "0", start: "09:00", end: "18:00" };
  });
  return s;
}

function TimeInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      style={s.timeInput}
      value={value}
      onChangeText={t => {
        const clean = t.replace(/[^0-9:]/g, "");
        onChange(clean);
      }}
      placeholder="09:00"
      placeholderTextColor={Colors.subtle}
      keyboardType="numbers-and-punctuation"
      maxLength={5}
    />
  );
}

export default function ScheduleScreen() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [schedule, setSchedule] = useState<Schedule>(buildDefault());
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("tenants").select("id, settings").eq("owner_id", user.id).single()
        .then(({ data }) => {
          if (data) {
            setTenantId(data.id);
            const stored = (data.settings as any)?.schedule;
            if (stored) setSchedule({ ...buildDefault(), ...stored });
          }
          setLoading(false);
        });
    });
  }, []);

  const update = (dayKey: string, patch: Partial<DayConfig>) => {
    setSchedule(prev => ({ ...prev, [dayKey]: { ...(prev[dayKey] ?? DEFAULT_DAY), ...patch } }));
  };

  const handleSave = async () => {
    if (!tenantId) return;
    setSaving(true);
    const { data: current } = await supabase.from("tenants").select("settings").eq("id", tenantId).single();
    const settings = { ...(current?.settings ?? {}), schedule };
    await supabase.from("tenants").update({ settings }).eq("id", tenantId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Horario de atención</Text>
            <Text style={s.headerSub}>Días y horas disponibles</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={Colors.red} size="large" />
        </View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            <Animated.View entering={FadeInDown.duration(350)} style={{ gap: 10 }}>
              {DAYS.map((day, i) => {
                const cfg = schedule[day.key] ?? DEFAULT_DAY;
                return (
                  <Animated.View key={day.key} entering={FadeInDown.delay(i * 40).duration(300)}>
                    <View style={[s.dayCard, Shadow.sm]}>
                      <View style={s.dayTop}>
                        <View style={[s.dayDot, { backgroundColor: cfg.open ? Colors.success : Colors.border }]} />
                        <Text style={[s.dayName, !cfg.open && { color: Colors.muted }]}>{day.label}</Text>
                        <Switch
                          value={cfg.open}
                          onValueChange={v => update(day.key, { open: v })}
                          trackColor={{ false: Colors.border, true: Colors.success + "aa" }}
                          thumbColor={cfg.open ? Colors.success : Colors.subtle}
                        />
                      </View>
                      {cfg.open && (
                        <View style={s.timeRow}>
                          <View style={s.timeBlock}>
                            <Text style={s.timeLabel}>Apertura</Text>
                            <TimeInput value={cfg.start} onChange={v => update(day.key, { start: v })} />
                          </View>
                          <Ionicons name="arrow-forward" size={16} color={Colors.subtle} style={{ marginTop: 20 }} />
                          <View style={s.timeBlock}>
                            <Text style={s.timeLabel}>Cierre</Text>
                            <TimeInput value={cfg.end} onChange={v => update(day.key, { end: v })} />
                          </View>
                        </View>
                      )}
                    </View>
                  </Animated.View>
                );
              })}
            </Animated.View>

            {saved && (
              <Animated.View entering={FadeInDown.duration(300)} style={[s.savedBanner, Shadow.sm]}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={s.savedText}>Horario guardado</Text>
              </Animated.View>
            )}
          </ScrollView>

          <View style={s.bottomBar}>
            <TouchableOpacity style={s.btn} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
              <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnGrad}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>Guardar horario</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:      { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 20 },
  headerRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: "white", letterSpacing: -0.4 },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,.75)", fontFamily: "SpaceGrotesk_400Regular", marginTop: 2 },
  dayCard:     { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14 },
  dayTop:      { flexDirection: "row", alignItems: "center", gap: 10 },
  dayDot:      { width: 8, height: 8, borderRadius: 4 },
  dayName:     { flex: 1, fontSize: 15, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  timeRow:     { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.border },
  timeBlock:   { flex: 1 },
  timeLabel:   { fontSize: 10, fontFamily: "SpaceGrotesk_700Bold", color: Colors.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  timeInput:   { backgroundColor: Colors.cream2, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.sm, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, textAlign: "center" },
  savedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.success + "12", borderRadius: Radius.md, padding: 14, marginTop: 12 },
  savedText:   { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.success },
  bottomBar:   { padding: 20, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.cream2 },
  btn:         { borderRadius: Radius.full, overflow: "hidden" },
  btnGrad:     { paddingVertical: 16, alignItems: "center" },
  btnText:     { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
});
