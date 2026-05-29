import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, RefreshControl, Switch, Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "@/lib/supabase";
import { Colors, Gradients, Radius, Shadow } from "@/constants/theme";

const EDGE_URL = "https://bwmwuzwhinnzkjicdzot.supabase.co/functions/v1/create-staff-user";

type Pro = { id: string; name: string; role: string; is_active: boolean; user_id: string | null; email: string | null; photo_url: string | null };

function ProModal({ visible, pro, tenantId, onClose, onSaved }: {
  visible: boolean; pro: Pro | null; tenantId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = pro !== null;
  const [name, setName]         = useState("");
  const [role, setRole]         = useState("");
  const [active, setActive]     = useState(true);
  const [saving, setSaving]     = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [accEmail, setAccEmail]     = useState("");
  const [accPass, setAccPass]       = useState("");
  const [accLoading, setAccLoading] = useState(false);
  const [accSuccess, setAccSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(pro?.name ?? "");
      setRole(pro?.role ?? "");
      setActive(pro?.is_active ?? true);
      setAccEmail(pro?.email ?? "");
      setAccPass("");
      setAccSuccess(false);
      setPhotoUri(null);
    }
  }, [visible, pro]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galeria.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setPhotoUri(result.assets[0].uri);
  };

  const uploadPhoto = (proId: string): Promise<string | null> => {
    if (!photoUri) return Promise.resolve(null);
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", photoUri);
      xhr.responseType = "blob";
      xhr.onload = async () => {
        const blob: Blob = xhr.response;
        const path = `${proId}.jpg`;
        const { error } = await supabase.storage
          .from("professionals")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (error) { resolve(null); return; }
        const { data } = supabase.storage.from("professionals").getPublicUrl(path);
        resolve(`${data.publicUrl}?t=${Date.now()}`);
      };
      xhr.onerror = () => resolve(null);
      xhr.send();
    });
  };

  const canSave = name.trim().length >= 2;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(), role: role.trim() || "Profesional", is_active: active,
      };
      if (isEdit) {
        if (photoUri) {
          const url = await uploadPhoto(pro!.id);
          if (url) payload.photo_url = url;
        }
        await supabase.from("professionals").update(payload).eq("id", pro!.id);
      } else {
        const { data: inserted } = await supabase
          .from("professionals").insert({ ...payload, tenant_id: tenantId }).select("id").single();
        if (inserted && photoUri) {
          const url = await uploadPhoto(inserted.id);
          if (url) await supabase.from("professionals").update({ photo_url: url }).eq("id", inserted.id);
        }
      }
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert("Eliminar profesional", `Eliminar a ${pro?.name}?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        await supabase.from("professionals").delete().eq("id", pro!.id);
        onSaved(); onClose();
      }},
    ]);
  };

  const handleCreateAccount = async () => {
    if (!accEmail.trim() || accPass.length < 6) {
      Alert.alert("Error", "Ingresa un correo valido y contrasena de al menos 6 caracteres.");
      return;
    }
    setAccLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(EDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ professional_id: pro!.id, email: accEmail.trim().toLowerCase(), password: accPass }),
      });
      const json = await res.json();
      if (!res.ok) { Alert.alert("Error", json.error ?? "Intenta de nuevo."); }
      else { setAccSuccess(true); onSaved(); }
    } catch {
      Alert.alert("Error", "Sin conexion. Intenta de nuevo.");
    } finally { setAccLoading(false); }
  };

  const hasAccount = !!(pro?.user_id || accSuccess);

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
            {/* Photo picker */}
            <TouchableOpacity style={s.photoPicker} onPress={pickPhoto} activeOpacity={0.8}>
              {(photoUri || pro?.photo_url) ? (
                <Image source={{ uri: photoUri ?? pro?.photo_url! }} style={s.photoImg} />
              ) : (
                <View style={s.photoPlaceholder}>
                  <Text style={s.photoInitials}>
                    {name.trim() ? name.trim().split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?"}
                  </Text>
                </View>
              )}
              <View style={s.photoEditBadge}>
                <Ionicons name="camera" size={14} color="white" />
              </View>
            </TouchableOpacity>
            <Text style={s.photoHint}>Toca para cambiar la foto</Text>

            <Text style={[s.fieldLabel, { marginTop: 20 }]}>Nombre *</Text>
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Ej: Maria Lopez" placeholderTextColor={Colors.subtle} autoCapitalize="words" />

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

            {isEdit && (
              <View style={{ marginTop: 28 }}>
                <Text style={[s.fieldLabel, { marginBottom: 12 }]}>Cuenta de acceso</Text>
                {hasAccount ? (
                  <View style={[s.accountCard, { borderColor: Colors.success + "55" }]}>
                    <View style={s.accountCardRow}>
                      <View style={[s.accountIcon, { backgroundColor: Colors.success + "18" }]}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={Colors.success} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.accountCardTitle, { color: Colors.success }]}>Cuenta activa</Text>
                        <Text style={s.accountCardSub}>{pro?.email ?? accEmail}</Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={s.accountCard}>
                    <View style={s.accountCardRow}>
                      <View style={[s.accountIcon, { backgroundColor: "#f59e0b18" }]}>
                        <Ionicons name="person-add-outline" size={18} color="#f59e0b" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.accountCardTitle}>Sin cuenta de acceso</Text>
                        <Text style={s.accountCardSub}>Crea una cuenta para que pueda ingresar</Text>
                      </View>
                    </View>
                    <Text style={[s.fieldLabel, { marginTop: 16 }]}>Correo</Text>
                    <TextInput style={s.input} value={accEmail} onChangeText={setAccEmail} placeholder="correo@ejemplo.com" placeholderTextColor={Colors.subtle} keyboardType="email-address" autoCapitalize="none" />
                    <Text style={[s.fieldLabel, { marginTop: 12 }]}>Contrasena inicial</Text>
                    <TextInput style={s.input} value={accPass} onChangeText={setAccPass} placeholder="Minimo 6 caracteres" placeholderTextColor={Colors.subtle} secureTextEntry />
                    <TouchableOpacity style={[s.accBtn, accLoading && { opacity: 0.6 }]} onPress={handleCreateAccount} disabled={accLoading} activeOpacity={0.8}>
                      {accLoading
                        ? <ActivityIndicator color="white" size="small" />
                        : <><Ionicons name="key-outline" size={16} color="white" /><Text style={s.accBtnText}>Crear cuenta de acceso</Text></>
                      }
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          <View style={s.bottomBar}>
            <TouchableOpacity style={[s.btn, !canSave && { opacity: 0.4 }]} onPress={handleSave} disabled={!canSave || saving} activeOpacity={0.85}>
              <View style={s.btnGrad}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>{isEdit ? "Guardar cambios" : "Agregar profesional"}</Text>}
              </View>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

function Avatar({ name, photoUrl, size = 52 }: { name: string; photoUrl?: string | null; size?: number }) {
  if (photoUrl) {
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, overflow: "hidden", borderWidth: 2, borderColor: Colors.border }}>
        <Image source={{ uri: photoUrl }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
      </View>
    );
  }
  const initials = name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: Colors.red + "18", borderWidth: 1.5, borderColor: Colors.red + "30", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: Colors.red, fontSize: size * 0.34, fontFamily: "SpaceGrotesk_700Bold" }}>{initials}</Text>
    </View>
  );
}

export default function TeamScreen() {
  const router = useRouter();
  const [pros, setPros]             = useState<Pro[]>([]);
  const [tenantId, setTenantId]     = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]           = useState<{ visible: boolean; pro: Pro | null }>({ visible: false, pro: null });

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
      .select("id, name, role, is_active, user_id, email, photo_url")
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
                style={[s.row, Shadow.sm, !p.is_active && { opacity: 0.55 }]}
                onPress={() => setModal({ visible: true, pro: p })}
                activeOpacity={0.75}
              >
                <Avatar name={p.name} photoUrl={p.photo_url} />
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{p.name}</Text>
                  <Text style={s.role}>{p.role}</Text>
                  <View style={{ flexDirection: "row", gap: 6, marginTop: 5 }}>
                    {p.user_id && (
                      <View style={s.activeBadge}>
                        <Ionicons name="shield-checkmark" size={10} color={Colors.success} />
                        <Text style={[s.badgeText, { color: Colors.success }]}>Cuenta activa</Text>
                      </View>
                    )}
                    {!p.is_active && (
                      <View style={s.inactiveBadge}>
                        <Text style={s.inactiveBadgeText}>Inactivo</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={Colors.subtle} />
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
  header:           { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 20 },
  headerRow:        { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  headerTitle:      { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: "white", letterSpacing: -0.4 },
  headerSub:        { fontSize: 12, color: "rgba(255,255,255,.75)", fontFamily: "SpaceGrotesk_400Regular", marginTop: 2 },
  addBtn:           { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,.22)", alignItems: "center", justifyContent: "center" },
  row:              { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  name:             { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  role:             { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  activeBadge:      { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.success + "14", borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3 },
  badgeText:        { fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold" },
  inactiveBadge:    { backgroundColor: Colors.border, borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3 },
  inactiveBadgeText:{ fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.muted },
  empty:            { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 48, alignItems: "center", marginTop: 20 },
  emptyTitle:       { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  emptySub:         { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center" },
  photoPicker:      { alignSelf: "center", marginBottom: 6 },
  photoImg:         { width: 88, height: 88, borderRadius: 44 },
  photoPlaceholder: { width: 88, height: 88, borderRadius: 44, backgroundColor: Colors.red + "18", borderWidth: 1.5, borderColor: Colors.red + "30", alignItems: "center", justifyContent: "center" },
  photoInitials:    { color: Colors.red, fontSize: 30, fontFamily: "SpaceGrotesk_700Bold" },
  photoEditBadge:   { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.red, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: Colors.cream2 },
  photoHint:        { textAlign: "center", fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginBottom: 4 },
  mHeader:          { paddingTop: 16, paddingHorizontal: 20, paddingBottom: 20 },
  mHeaderRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  closeBtn:         { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,.18)", alignItems: "center", justifyContent: "center" },
  mTitle:           { fontSize: 18, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
  fieldLabel:       { fontSize: 11, fontFamily: "SpaceGrotesk_700Bold", color: Colors.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  input:            { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "SpaceGrotesk_400Regular", color: Colors.text },
  switchRow:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.white, borderRadius: Radius.md, padding: 16, marginTop: 16 },
  switchLabel:      { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  switchSub:        { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  accountCard:      { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 16, borderWidth: 1.5, borderColor: Colors.border },
  accountCardRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  accountIcon:      { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  accountCardTitle: { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  accountCardSub:   { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  accBtn:           { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: Colors.red, borderRadius: Radius.md, paddingVertical: 13, marginTop: 4 },
  accBtnText:       { fontSize: 14, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
  bottomBar:        { padding: 20, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.cream2 },
  btn:              { borderRadius: Radius.full, overflow: "hidden" },
  btnGrad:          { paddingVertical: 16, alignItems: "center", backgroundColor: Colors.red },
  btnText:          { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
});
