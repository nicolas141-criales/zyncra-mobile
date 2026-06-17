import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { Colors, Gradients, Radius, Shadow, Glass } from "@/constants/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function SettingRow({
  icon, color, label, sub, onPress, danger,
}: {
  icon: IoniconName; color?: string; label: string; sub?: string; onPress?: () => void; danger?: boolean;
}) {
  const iconColor = danger ? Colors.red : (color ?? Colors.purple);
  const iconBg    = danger ? Colors.red + "12" : (color ?? Colors.purple) + "12";
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[s.rowLabel, danger && { color: Colors.red }]}>{label}</Text>
        {sub && <Text style={s.rowSub}>{sub}</Text>}
      </View>
      {!danger && <Ionicons name="chevron-forward" size={16} color={Colors.subtle} />}
    </TouchableOpacity>
  );
}

type Tenant = { name: string; phone?: string };

export default function SettingsScreen() {
  const router = useRouter();
  const [tenant, setTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from("tenants").select("name, phone").eq("owner_id", user.id).single()
        .then(({ data }) => { if (data) setTenant(data); });
    });
  }, []);

  const handleLogout = () => {
    Alert.alert("Cerrar sesión", "¿Seguro que quieres salir?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Salir", style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const SECTIONS = [
    {
      title: "Tu negocio",
      items: [
        { icon: "storefront-outline" as IoniconName,  color: Colors.red,     label: "Mi Tienda",                sub: "Personalización y link de reservas",          route: "/settings/store" },
        { icon: "time-outline" as IoniconName,        color: "#f59e0b",      label: "Horario de atención",      sub: "Días y horas disponibles",                    route: "/settings/schedule" },
        { icon: "cut-outline" as IoniconName,         color: Colors.purple,  label: "Servicios",                sub: "Gestiona tu catálogo de precios",             route: "/settings/services" },
        { icon: "people-outline" as IoniconName,      color: Colors.blue,    label: "Equipo de trabajo",        sub: "Profesionales y permisos",                    route: "/settings/team" },
      ],
    },
    {
      title: "Comunicación",
      items: [
        { icon: "notifications-outline" as IoniconName, color: Colors.success, label: "Recordatorios",          sub: "Alertas automáticas a clientes",      route: "/settings/reminders" },
      ],
    },
    {
      title: "Marketing",
      items: [
        { icon: "logo-whatsapp" as IoniconName,        color: "#25D366",      label: "Campañas WhatsApp",       sub: "Mensajes masivos personalizados",      route: "/(admin)/whatsapp" },
        { icon: "star-outline" as IoniconName,         color: "#f59e0b",      label: "Reseñas Google",           sub: "Solicita reseñas a tus clientes",      route: "/(admin)/reviews-google" },
        { icon: "chatbubbles-outline" as IoniconName,  color: Colors.purple,  label: "Reseñas del sitio",        sub: "Modera las opiniones de tu negocio",   route: "/(admin)/reviews-site" },
      ],
    },
    {
      title: "Finanzas",
      items: [
        { icon: "wallet-outline" as IoniconName,      color: Colors.success, label: "Caja",                sub: "Control de ingresos y egresos",   route: "/(admin)/caja" },
        { icon: "ribbon-outline" as IoniconName,      color: "#f59e0b",      label: "Comisiones",          sub: "Paga a tu equipo de trabajo",     route: "/(admin)/commissions" },
        { icon: "document-text-outline" as IoniconName, color: Colors.blue,  label: "Factura Electrónica", sub: "Emite facturas DIAN vía Factus",  route: "/(admin)/invoices" },
      ],
    },
    {
      title: "Herramientas",
      items: [
        { icon: "bar-chart-outline" as IoniconName,   color: Colors.red,     label: "Reportes",              sub: "Ingresos, servicios y rendimiento", route: "/(admin)/reports" },
        { icon: "options-outline" as IoniconName,     color: "#8b5cf6",      label: "Campos Personalizados", sub: "Datos extra para clientes y citas", route: "/(admin)/custom-fields" },
      ],
    },
    {
      title: "Cuenta",
      items: [
        { icon: "person-outline" as IoniconName,      color: Colors.purple,  label: "Mi perfil",         sub: "Datos personales y contraseña", route: "/settings/profile" },
        { icon: "card-outline" as IoniconName,        color: Colors.blue,    label: "Plan y facturación", sub: "Plan actual: Trial",            route: "/settings/billing" },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
        <Text style={s.headerTitle}>Ajustes</Text>
        <Text style={s.headerSub}>Configura tu negocio</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 110 }}>
        {SECTIONS.map((sec, si) => (
          <Animated.View key={si} entering={FadeInDown.delay(si * 80).duration(400)}>
            <Text style={s.sectionTitle}>{sec.title}</Text>
            <View style={[s.group, Shadow.sm]}>
              {sec.items.map((item, ii) => (
                <View key={ii}>
                  <SettingRow
                    icon={item.icon}
                    color={item.color}
                    label={item.label}
                    sub={item.sub}
                    onPress={item.route ? () => router.push(item.route as any) : undefined}
                  />
                  {ii < sec.items.length - 1 && <View style={s.divider} />}
                </View>
              ))}
            </View>
          </Animated.View>
        ))}

        <Animated.View entering={FadeInDown.delay(320).duration(400)}>
          <View style={[s.group, Shadow.sm]}>
            <SettingRow icon="log-out-outline" label="Cerrar sesión" onPress={handleLogout} danger />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(400)} style={{ alignItems: "center", marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: Colors.subtle, fontFamily: "SpaceGrotesk_400Regular" }}>
            Zyncra · v1.0.0 · Hecho en Colombia 🇨🇴
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:       { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 20 },
  headerTitle:  { fontSize: 24, fontFamily: "SpaceGrotesk_700Bold", color: "white", letterSpacing: -0.5 },
  headerSub:    { fontSize: 13, color: "rgba(255,255,255,.75)", fontFamily: "SpaceGrotesk_400Regular", marginTop: 2 },
  sectionTitle: { fontSize: 12, fontFamily: "SpaceGrotesk_700Bold", color: Colors.subtle, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 20 },
  group:        { ...Glass.cardStrong, borderRadius: Radius.lg, overflow: "hidden" },
  row:          { flexDirection: "row", alignItems: "center", gap: 14, padding: 16 },
  rowIcon:      { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  rowLabel:     { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  rowSub:       { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  divider:      { height: 1, backgroundColor: Colors.border, marginLeft: 70 },
});
