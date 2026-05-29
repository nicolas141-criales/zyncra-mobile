import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Gradients, Radius, Shadow } from "@/constants/theme";

type Service = {
  id: string;
  name: string;
  price: number;
  duration_min: number;
  description?: string;
};

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder: string; keyboardType?: "numeric" | "default"; multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={f.label}>{label}</Text>
      <TextInput
        style={[f.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.subtle}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        autoCapitalize={keyboardType === "numeric" ? "none" : "sentences"}
      />
    </View>
  );
}

const f = StyleSheet.create({
  label: { fontSize: 11, fontFamily: "SpaceGrotesk_700Bold", color: Colors.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  input: { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "SpaceGrotesk_400Regular", color: Colors.text },
});

function ServiceModal({ visible, service, tenantId, onClose, onSaved }: {
  visible: boolean; service: Service | null; tenantId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = service !== null;
  const [name, setName]         = useState("");
  const [price, setPrice]       = useState("");
  const [duration, setDuration] = useState("");
  const [desc, setDesc]         = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (visible) {
      setName(service?.name ?? "");
      setPrice(service?.price != null ? String(service.price) : "");
      setDuration(service?.duration_min != null ? String(service.duration_min) : "");
      setDesc(service?.description ?? "");
    }
  }, [visible, service]);

  const canSave = name.trim().length >= 2 && Number(price) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        price: Number(price),
        duration_min: Number(duration) || 30,
        description: desc.trim() || null,
      };
      if (isEdit) {
        await supabase.from("services").update(payload).eq("id", service!.id);
      } else {
        await supabase.from("services").insert({ ...payload, tenant_id: tenantId, duration_minutes: Number(duration) || 30 });
      }
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert("Eliminar servicio", `¿Eliminar "${service?.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        await supabase.from("services").delete().eq("id", service!.id);
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
            <Text style={s.mTitle}>{isEdit ? "Editar servicio" : "Nuevo servicio"}</Text>
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
            <Field label="Nombre del servicio *" value={name} onChangeText={setName} placeholder="Ej: Corte de cabello" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Precio *" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Duración (min)" value={duration} onChangeText={setDuration} placeholder="30" keyboardType="numeric" />
              </View>
            </View>
            <Field label="Descripción" value={desc} onChangeText={setDesc} placeholder="Opcional..." multiline />
          </ScrollView>
          <View style={s.bottomBar}>
            <TouchableOpacity style={[s.btn, !canSave && { opacity: 0.4 }]} onPress={handleSave} disabled={!canSave || saving} activeOpacity={0.85}>
              <View style={s.btnGrad}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>{isEdit ? "Guardar cambios" : "Crear servicio"}</Text>}
              </View>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ServicesScreen() {
  const router = useRouter();
  const [services, setServices]   = useState<Service[]>([]);
  const [tenantId, setTenantId]   = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]         = useState<{ visible: boolean; service: Service | null }>({ visible: false, service: null });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("tenants").select("id").eq("owner_id", user.id).single()
        .then(({ data }) => { if (data) setTenantId(data.id); });
    });
  }, []);

  const load = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("services")
      .select("id, name, price, duration_min, description")
      .eq("tenant_id", tenantId).order("name");
    setServices(data ?? []);
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
            <Text style={s.headerTitle}>Servicios</Text>
            <Text style={s.headerSub}>{services.length} en tu catálogo</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={() => setModal({ visible: true, service: null })} activeOpacity={0.8}>
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />}
      >
        {services.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={[s.empty, Shadow.sm]}>
            <Ionicons name="cut-outline" size={44} color={Colors.subtle} style={{ marginBottom: 12 }} />
            <Text style={s.emptyTitle}>Sin servicios</Text>
            <Text style={s.emptySub}>Toca + para agregar tu primer servicio</Text>
          </Animated.View>
        ) : (
          services.map((svc, i) => (
            <Animated.View key={svc.id} entering={FadeInRight.delay(i * 50).duration(320)}>
              <TouchableOpacity
                style={[s.row, Shadow.sm]}
                onPress={() => setModal({ visible: true, service: svc })}
                activeOpacity={0.75}
              >
                <View style={[s.iconBox, { backgroundColor: Colors.purple + "12" }]}>
                  <Ionicons name="cut-outline" size={18} color={Colors.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{svc.name}</Text>
                  <Text style={s.info}>{svc.duration_min} min</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.price}>${Math.round(svc.price).toLocaleString("es-CO")}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.subtle} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {tenantId && (
        <ServiceModal
          visible={modal.visible}
          service={modal.service}
          tenantId={tenantId}
          onClose={() => setModal({ visible: false, service: null })}
          onSaved={load}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:     { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 20 },
  headerRow:  { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  headerTitle:{ fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: "white", letterSpacing: -0.4 },
  headerSub:  { fontSize: 12, color: "rgba(255,255,255,.75)", fontFamily: "SpaceGrotesk_400Regular", marginTop: 2 },
  addBtn:     { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,.22)", alignItems: "center", justifyContent: "center" },
  row:        { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  iconBox:    { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  name:       { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  info:       { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  price:      { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text },
  empty:      { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 48, alignItems: "center", marginTop: 20 },
  emptyTitle: { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  emptySub:   { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center" },
  mHeader:    { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20 },
  mHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn:   { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  mTitle:     { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
  bottomBar:  { padding: 20, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.cream2 },
  btn:        { borderRadius: Radius.full, overflow: "hidden" },
  btnGrad: { paddingVertical: 16, alignItems: "center", backgroundColor: Colors.red },
  btnText:    { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
});
