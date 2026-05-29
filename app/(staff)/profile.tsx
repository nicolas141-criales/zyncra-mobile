import { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";
import { Colors, Gradients, Radius, Shadow } from "@/constants/theme";

type StaffInfo = { name: string; role: string; email: string | null; tenantName: string };

export default function StaffProfileScreen() {
  const router = useRouter();
  const [info, setInfo] = useState<StaffInfo | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: pro } = await supabase
        .from("professionals")
        .select("name, role, email, tenants(name)")
        .eq("user_id", user.id)
        .single();
      if (!pro) return;
      setInfo({
        name: pro.name,
        role: pro.role,
        email: pro.email ?? user.email ?? null,
        tenantName: (pro.tenants as any)?.name ?? "Tu negocio",
      });
    })();
  }, []);

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Salir", style: "destructive", onPress: async () => {
        await supabase.auth.signOut();
        router.replace("/(auth)/login");
      }},
    ]);
  };

  const initials = info ? info.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <View style={s.headerBlob} />
        <Animated.View entering={FadeInDown.duration(400)} style={{ alignItems: "center", position: "relative", zIndex: 1 }}>
          <View style={s.avatarRing}>
            <Text style={s.avatarText}>{initials}</Text>
          </View>
          <Text style={s.name}>{info?.name ?? "..."}</Text>
          <Text style={s.role}>{info?.role ?? ""}</Text>
          <View style={s.businessPill}>
            <Ionicons name="business-outline" size={12} color="rgba(255,255,255,.8)" />
            <Text style={s.businessText}>{info?.tenantName ?? ""}</Text>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        <Animated.View entering={FadeInDown.delay(100).duration(400)} style={[s.card, Shadow.sm]}>
          <Text style={s.cardTitle}>Información de cuenta</Text>
          <View style={s.row}>
            <View style={s.rowIcon}><Ionicons name="mail-outline" size={16} color={Colors.muted} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Correo electrónico</Text>
              <Text style={s.rowValue}>{info?.email ?? "—"}</Text>
            </View>
          </View>
          <View style={[s.row, { borderBottomWidth: 0 }]}>
            <View style={s.rowIcon}><Ionicons name="briefcase-outline" size={16} color={Colors.muted} /></View>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Cargo</Text>
              <Text style={s.rowValue}>{info?.role ?? "—"}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(400)} style={{ marginTop: 16 }}>
          <TouchableOpacity style={[s.logoutBtn, Shadow.sm]} onPress={handleLogout} activeOpacity={0.8}>
            <Ionicons name="log-out-outline" size={18} color={Colors.red} />
            <Text style={s.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: 32, paddingBottom: 40, paddingHorizontal: 24, overflow: "hidden" },
  headerBlob:   { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,255,255,.08)", top: -60, right: -40 },
  avatarRing:   { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,.22)", alignItems: "center", justifyContent: "center", marginBottom: 14, borderWidth: 2, borderColor: "rgba(255,255,255,.4)" },
  avatarText:   { fontSize: 28, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
  name:         { fontSize: 22, fontFamily: "SpaceGrotesk_700Bold", color: "white", letterSpacing: -0.5 },
  role:         { fontSize: 13, fontFamily: "SpaceGrotesk_500Medium", color: "rgba(255,255,255,.8)", marginTop: 4 },
  businessPill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,.14)", borderRadius: Radius.full, paddingHorizontal: 12, paddingVertical: 5, marginTop: 10 },
  businessText: { fontSize: 12, fontFamily: "SpaceGrotesk_500Medium", color: "rgba(255,255,255,.85)" },
  card:         { backgroundColor: Colors.white, borderRadius: Radius.lg, padding: 4, overflow: "hidden" },
  cardTitle:    { fontSize: 11, fontFamily: "SpaceGrotesk_700Bold", color: Colors.muted, textTransform: "uppercase", letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  row:          { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowIcon:      { width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.cream2, alignItems: "center", justifyContent: "center" },
  rowLabel:     { fontSize: 11, fontFamily: "SpaceGrotesk_500Medium", color: Colors.muted },
  rowValue:     { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text, marginTop: 2 },
  logoutBtn:    { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  logoutText:   { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.red },
});
