import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, RefreshControl, Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Gradients, Radius, Shadow } from "@/constants/theme";

type Pro = { id: string; name: string; role: string; is_active: boolean };

function ProModal({ visible, pro, tenantId, onClose, onSaved }: {
  visible: boolean; pro: Pro | null; tenantId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = pro !== null;
  const [name, setName]       = useState("");
  const [role, setRole]       = useState("");
  const [active, setActive]   = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (visible) { setName(pro?.name ?? ""); setRole(pro?.role ?? ""); setActive(pro?.is_active ?? true); }
  }, [visible, pro]);

  const canSave = name.trim().length >= 2;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), role: role.trim() || "Profesional", is_active: active };
      if (isEdit) {
        await supabase.from("professionals").update(payload).eq("id", pro!.id);
      } else {
        await supabase.from("professionals").insert({ ...payload, tenant_id: tenantId });
      }
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert("Eliminar profesional", `¿Eliminar a ${pro?.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        await supabase.from("professionals").delete().eq("id", pro!.id);
        onSaved(); onClose();
      }},
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
        <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.mHeader}>
          <View style={s.mHeaderRow}>
            <TouchableOpacity onPress={onClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
            <Text style={s.mTitle}>{isEdit ? "Editar profesional" : "Nuevo profesional"}</Text>
            {isEdit
              ? <TouchableOpacity onPress={handleDelete} style={s.closeBtn}>
                  <Ionicons name="trash-outline" size={18} color="white" />
                </TouchableOpacity>
              : <View style={{ width: 40 }} />
            }
          </View>
        </LinearGradient>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            <Text style={s.fieldLabel}>Nombre *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ej: María López" placeholderTextColor={Colors.subtle} autoCapitalize="words" />

            <Text style={[s.fieldLabel, { marginTop: 16 }]}>Cargo / Especialidad</Text>
            <TextInput style={s.input} value={role} onChangeText={setRole} placeholder="Ej: Estilista, Barbero..." placeholderTextColor={Colors.subtle} autoCapitalize="words" />

            {isEdit && (
              <View style={[s.switchRow, Shadow.sm]}>
                <View>
                  <Text style={s.switchLabel}>Activo</Text>
                  <Text style={s.switchSub}>Recibe citas en la agenda</Text>
                </View>
                <Switch
                  value={active}
                  onValueChange={setActive}
                  trackColor={{ false: Colors.border, true: Colors.success + "aa" }}
                  thumbColor={active ? Colors.success : Colors.subtle}
                />
              </View>
            )}
          </ScrollView>
          <View style={s.bottomBar}>
            <TouchableOpacity style={[s.btn, !canSave && { opacity: 0.4 }]} onPress={handleSave} disabled={!canSave || saving} activeOpacity={0.85}>
              <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.btnGrad}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>{isEdit ? "Guardar cambios" : "Agregar profesional"}</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "white", fontSize: size * 0.35, fontFamily: "SpaceGrotesk_700Bold" }}>{initials}</Text>
    </LinearGradient>
  );
}

export default function TeamScreen() {
  const router = useRouter();
  const [pros, setPros]           = useState<Pro[]>([]);
  const [tenantId, setTenantId]   = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]         = useState<{ visible: boolean; pro: Pro | null }>({ visible: false, pro: null });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("tenants").select("id").eq("owner_id", user.id).single()
        .then(({ data }) => { if (data) setTenantId(data.id); });
    });
  }, []);

  const load = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("professionals")
      .select("id, name, role, is_active")
      .eq("tenant_id", tenantId).order("name");
    setPros(data ?? []);
  };

  useEffect(() => { load(); }, [tenantId]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Equipo</Text>
            <Text style={s.headerSub}>{pros.length} profesionale{pros.length !== 1 ? "s" : ""}</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setModal({ visible: true, pro: null })} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />}
      >
        {pros.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={[s.empty, Shadow.sm]}>
            <Ionicons name="people-outline" size={44} color={Colors.subtle} style={{ marginBottom: 12 }} />
            <Text style={s.emptyTitle}>Sin profesionales</Text>
            <Text style={s.emptySub}>Toca + para agregar miembros de tu equipo</Text>
          </Animated.View>
        ) : (
          pros.map((p, i) => (
            <Animated.View key={p.id} entering={FadeInRight.delay(i * 50).duration(320)}>
              <TouchableOpacity
                style={[s.row, Shadow.sm, !p.is_active && { opacity: 0.6 }]}
                onPress={() => setModal({ visible: true, pro: p })}
                activeOpacity={0.75}
              >
                <Avatar name={p.name} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.role}>{p.role}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  {!p.is_active && (
                    <View style={s.inactiveBadge}>
                      <Text style={s.inactiveBadgeText}>Inactivo</Text>
                    </View>
                  )}
                  <Ionicons name="chevron-forward" size={16} color={Colors.subtle} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {tenantId && (
        <ProModal
          visible={modal.visible}
          pro={modal.pro}
          tenantId={tenantId}
          onClose={() => setModal({ visible: false, pro: null })}
          onSaved={load}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:          { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 20 },
  headerRow:       { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  headerTitle:     { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: "white", letterSpacing: -0.4 },
  headerSub:       { fontSize: 12, color: "rgba(255,255,255,.75)", fontFamily: "SpaceGrotesk_400Regular", marginTop: 2 },
  addBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,.22)", alignItems: "center", justifyContent: "center" },
  row:             { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  name:            { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  role:            { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  inactiveBadge:   { backgroundColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  inactiveBadgeText:{ fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.muted },
  empty:           { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 48, alignItems: "center", marginTop: 20 },
  emptyTitle:      { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  emptySub:        { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center" },
  mHeader:         { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20 },
  mHeaderRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  mTitle:          { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
  fieldLabel:      { fontSize: 11, fontFamily: "SpaceGrotesk_700Bold", color: Colors.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  input:           { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "SpaceGrotesk_400Regular", color: Colors.text },
  switchRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white, borderRadius: Radius.md, padding: 16, marginTop: 16 },
  switchLabel:     { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  switchSub:       { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  bottomBar:       { padding: 20, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.cream2 },
  btn:             { borderRadius: Radius.full, overflow: "hidden" },
  btnGrad:         { paddingVertical: 16, alignItems: "center" },
  btnText:         { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
});
