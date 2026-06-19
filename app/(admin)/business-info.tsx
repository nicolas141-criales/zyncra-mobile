import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Gradients, Radius, Shadow } from "@/constants/theme";

function Field({ label, value, onChangeText, placeholder, keyboardType, multiline }: {
  label: string; value: string; onChangeText: (t: string) => void;
  placeholder: string; keyboardType?: "phone-pad" | "email-address" | "default"; multiline?: boolean;
}) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={[s.input, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.subtle}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        autoCapitalize={keyboardType === "phone-pad" ? "none" : "sentences"}
      />
    </View>
  );
}

export default function BusinessInfoScreen() {
  const router = useRouter();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [name, setName]         = useState("");
  const [phone, setPhone]       = useState("");
  const [address, setAddress]   = useState("");
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("tenants").select("id, name, phone, address").eq("owner_id", user.id).single()
        .then(({ data }) => {
          if (data) {
            setTenantId(data.id);
            setName(data.name ?? "");
            setPhone(data.phone ?? "");
            setAddress(data.address ?? "");
          }
          setLoading(false);
        });
    });
  }, []);

  const canSave = name.trim().length >= 2;

  const handleSave = async () => {
    if (!canSave || !tenantId) return;
    setSaving(true);
    await supabase.from("tenants").update({
      name: name.trim(),
      phone: phone.trim() || null,
      address: address.trim() || null,
    }).eq("id", tenantId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      <LinearGradient colors={Gradients.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 1 }} />
        <View style={s.headerRow}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons name="arrow-back" size={20} color="white" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Info del negocio</Text>
            <Text style={s.headerSub}>Nombre, teléfono y dirección</Text>
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
            <Animated.View entering={FadeInDown.duration(350)}>
              <Field label="Nombre del negocio *" value={name} onChangeText={setName} placeholder="Ej: Salón Bella" />
              <Field label="Teléfono / WhatsApp" value={phone} onChangeText={setPhone} placeholder="Ej: 3001234567" keyboardType="phone-pad" />
              <Field label="Dirección" value={address} onChangeText={setAddress} placeholder="Ej: Cra 15 #45-20, Bogotá" />
            </Animated.View>

            {saved && (
              <Animated.View entering={FadeInDown.duration(300)} style={[s.savedBanner, Shadow.sm]}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
                <Text style={s.savedText}>Cambios guardados</Text>
              </Animated.View>
            )}
          </ScrollView>

          <View style={s.bottomBar}>
            <TouchableOpacity style={[s.btn, !canSave && { opacity: 0.4 }]} onPress={handleSave} disabled={!canSave || saving} activeOpacity={0.85}>
              <View style={s.btnGrad}>
                {saving ? <ActivityIndicator color="white" /> : <Text style={s.btnText}>Guardar cambios</Text>}
              </View>
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
  backBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.10)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: "white", letterSpacing: -0.4 },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,.75)", fontFamily: "SpaceGrotesk_400Regular", marginTop: 2 },
  field:       { marginBottom: 16 },
  fieldLabel:  { fontSize: 11, fontFamily: "JetBrainsMono_500Medium", color: Colors.muted, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  input:       { backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "SpaceGrotesk_400Regular", color: Colors.text },
  savedBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: Colors.success + "12", borderRadius: Radius.md, padding: 14, marginTop: 8 },
  savedText:   { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.success },
  bottomBar:   { padding: 20, paddingBottom: 34, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.cream2 },
  btn:         { borderRadius: Radius.full, overflow: "hidden" },
  btnGrad: { paddingVertical: 16, alignItems: "center", backgroundColor: Colors.red },
  btnText:     { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
});
