import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Linking } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Fonts, Gradients, Radius, Shadow } from "@/constants/theme";
import { useTheme } from "@/lib/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type TenantPlan = {
  name: string;
  plan: string;
  created_at: string;
  plan_expires_at: string | null;
};

const SALES_WA = "573188886055";

const PLAN_META: Record<string, { label: string; color: string; icon: IoniconName }> = {
  trial:      { label: "Trial gratuito", color: "#f59e0b",   icon: "hourglass-outline"   },
  starter:    { label: "Starter",        color: "#22D3EE",   icon: "leaf-outline"         },
  growth:     { label: "Growth",         color: "#A855F7",   icon: "trending-up-outline"  },
  pro:        { label: "Pro",            color: Colors.blue, icon: "flash-outline"        },
  enterprise: { label: "Enterprise",     color: Colors.red,  icon: "business-outline"     },
};

const PLAN_CARDS = [
  {
    slug: "starter",
    name: "Starter",
    price: "59.900",
    sub: "Para comenzar tu negocio",
    color: "#22D3EE",
    features: [
      "1 colaborador",
      "Agenda online de citas",
      "Hasta 100 confirmaciones WhatsApp",
      "CRM y POS básico",
      "Módulo financiero",
      "Soporte por WhatsApp",
    ],
  },
  {
    slug: "growth",
    name: "Growth",
    price: "119.900",
    sub: "El más popular en Colombia",
    color: "#A855F7",
    popular: true,
    features: [
      "2 a 5 colaboradores",
      "Confirmaciones WhatsApp ilimitadas",
      "IA Hanna Básica (agendamiento y cancelaciones)",
      "100 mensajes WhatsApp Marketing/mes",
      "Proveedores, comisiones e inventario",
      "Soporte por WhatsApp",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    price: "229.900",
    sub: "Para equipos en crecimiento",
    color: Colors.blue,
    features: [
      "6 a 15 colaboradores",
      "Confirmaciones WhatsApp ilimitadas",
      "IA Hanna Pro — personalizada y analítica",
      "300 mensajes WhatsApp Marketing/mes",
      "Hasta 3 sucursales",
      "Soporte por WhatsApp",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    price: "449.900",
    sub: "Para cadenas y multi-sede",
    color: Colors.red,
    features: [
      "15+ colaboradores / ilimitados",
      "Confirmaciones WhatsApp ilimitadas",
      "IA Hanna Avanzada — marketing y ventas",
      "700 mensajes WhatsApp Marketing/mes",
      "Multi-sucursal ilimitada",
      "API pública",
      "Account Manager dedicado",
    ],
  },
];

function daysLeft(createdAt: string, expiresAt: string | null): number {
  if (expiresAt) {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  }
  const trialEnd = new Date(createdAt);
  trialEnd.setDate(trialEnd.getDate() + 14);
  return Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000));
}

function openWhatsApp(msg: string) {
  Linking.openURL(`https://wa.me/${SALES_WA}?text=${encodeURIComponent(msg)}`);
}

export default function BillingScreen() {
  const router = useRouter();
  const { t } = useTheme();
  const { tenantId } = useAuth();
  const [tenant, setTenant] = useState<TenantPlan | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    let cancelled = false;
    supabase
      .from("tenants")
      .select("name, plan, created_at, plan_expires_at")
      .eq("id", tenantId)
      .single()
      .then(({ data }) => { if (!cancelled && data) setTenant(data as TenantPlan); });
    return () => { cancelled = true; };
  }, [tenantId]);

  const planSlug = (tenant?.plan ?? "trial").toLowerCase();
  const planMeta = PLAN_META[planSlug] ?? PLAN_META.trial;
  const isTrial  = planSlug === "trial";
  const remaining = tenant ? daysLeft(tenant.created_at, tenant.plan_expires_at) : 0;
  const currentCard = PLAN_CARDS.find(p => p.slug === planSlug);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>

        {/* Header */}
        <LinearGradient colors={Gradients.ink} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.header}>
          <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.headerAccent} />
          <View style={s.headerBlob} />
          <View style={s.headerRow}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
              <Ionicons name="arrow-back" size={20} color="white" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Plan y facturación</Text>
              <Text style={s.headerSub}>{tenant?.name ?? "Tu negocio"}</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={s.planBadge}>
            <View style={[s.planBadgeIcon, { backgroundColor: planMeta.color + "30" }]}>
              <Ionicons name={planMeta.icon} size={22} color={planMeta.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.planBadgeLabel}>Plan actual</Text>
              <Text style={s.planBadgeName}>{planMeta.label}</Text>
            </View>
            {isTrial ? (
              <View style={s.pill}>
                <Text style={s.pillText}>{remaining}d restantes</Text>
              </View>
            ) : (
              <View style={[s.pill, { backgroundColor: Colors.success + "22" }]}>
                <Ionicons name="checkmark-circle" size={13} color={Colors.success} />
                <Text style={[s.pillText, { color: Colors.success }]}>Activo</Text>
              </View>
            )}
          </Animated.View>
        </LinearGradient>

        <View style={{ padding: 20, gap: 24 }}>

          {/* Trial expiry warnings */}
          {isTrial && remaining <= 5 && remaining > 0 && (
            <Animated.View entering={FadeInDown.duration(350)} style={[s.warnCard, Shadow.sm]}>
              <Ionicons name="warning-outline" size={18} color="#f59e0b" />
              <Text style={s.warnText}>
                Tu trial vence en{" "}
                <Text style={{ fontFamily: Fonts.bold }}>{remaining} día{remaining !== 1 ? "s" : ""}</Text>.
                {" "}Activa un plan para no perder el acceso.
              </Text>
            </Animated.View>
          )}
          {isTrial && remaining === 0 && (
            <Animated.View entering={FadeInDown.duration(350)} style={[s.warnCard, { borderColor: Colors.red + "33", backgroundColor: Colors.red + "08" }, Shadow.sm]}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.red} />
              <Text style={[s.warnText, { color: Colors.red }]}>Tu trial ha expirado. Activa un plan para seguir usando Zyncra.</Text>
            </Animated.View>
          )}

          {/* Current plan features */}
          {currentCard && (
            <Animated.View entering={FadeInDown.delay(60).duration(400)}>
              <Text style={[s.sectionLabel, { color: t.muted }]}>Tu plan incluye</Text>
              <View style={[s.card, { backgroundColor: t.card, borderColor: currentCard.color + "33" }]}>
                {currentCard.features.map((feat, i) => (
                  <View key={i} style={s.featRow}>
                    <View style={[s.featDot, { backgroundColor: currentCard.color + "22" }]}>
                      <Ionicons name="checkmark" size={12} color={currentCard.color} />
                    </View>
                    <Text style={[s.featText, { color: t.text }]}>{feat}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* All plans */}
          <Animated.View entering={FadeInDown.delay(160).duration(400)}>
            <Text style={[s.sectionLabel, { color: t.muted }]}>
              {isTrial ? "Elige tu plan" : "Todos los planes"}
            </Text>
            <View style={{ gap: 14 }}>
              {PLAN_CARDS.map((plan, idx) => {
                const isCurrent = plan.slug === planSlug;
                const msg = isCurrent
                  ? `Hola, tengo una consulta sobre mi plan ${plan.name} de Zyncra (negocio: ${tenant?.name ?? ""}).`
                  : `Hola, quiero ${isCurrent ? "info" : "cambiar mi plan a"} ${plan.name} de Zyncra (negocio: ${tenant?.name ?? ""}).`;

                return (
                  <Animated.View key={plan.slug} entering={FadeInDown.delay(160 + idx * 60).duration(350)}>
                    <View style={[
                      s.planCard,
                      Shadow.sm,
                      { backgroundColor: t.card, borderColor: isCurrent ? plan.color + "55" : t.border },
                      isCurrent && { borderWidth: 1.5 },
                    ]}>
                      {plan.popular && !isCurrent && (
                        <View style={[s.popularBadge, { backgroundColor: plan.color }]}>
                          <Text style={s.popularText}>Más popular</Text>
                        </View>
                      )}
                      {isCurrent && (
                        <View style={[s.popularBadge, { backgroundColor: plan.color }]}>
                          <Ionicons name="checkmark-circle" size={11} color="white" />
                          <Text style={s.popularText}>Plan actual</Text>
                        </View>
                      )}

                      <View style={s.planCardHeader}>
                        <View style={[s.planIcon, { backgroundColor: plan.color + "18" }]}>
                          <Ionicons name={PLAN_META[plan.slug]?.icon ?? "flash-outline"} size={18} color={plan.color} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[s.planName, { color: t.text }]}>{plan.name}</Text>
                          <Text style={[s.planSub, { color: t.muted }]}>{plan.sub}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={[s.planPrice, { color: t.text }]}>${plan.price}</Text>
                          <Text style={[s.planPeriod, { color: t.muted }]}>COP/mes</Text>
                        </View>
                      </View>

                      <View style={[s.planDivider, { backgroundColor: t.border }]} />

                      <View style={{ gap: 8 }}>
                        {plan.features.slice(0, 5).map((feat, i) => (
                          <View key={i} style={s.featRow}>
                            <View style={[s.featDot, { backgroundColor: plan.color + "18" }]}>
                              <Ionicons name="checkmark" size={11} color={plan.color} />
                            </View>
                            <Text style={[s.featText, { color: t.muted }]}>{feat}</Text>
                          </View>
                        ))}
                        {plan.features.length > 5 && (
                          <Text style={[s.moreFeats, { color: plan.color }]}>+{plan.features.length - 5} más incluidos</Text>
                        )}
                      </View>

                      {plan.slug === "enterprise" ? (
                        <TouchableOpacity
                          style={[s.ctaBtn, { backgroundColor: plan.color + "14", borderColor: plan.color + "33" }]}
                          onPress={() => openWhatsApp(msg)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={15} color={plan.color} />
                          <Text style={[s.ctaBtnText, { color: plan.color }]}>Hablar con ventas</Text>
                        </TouchableOpacity>
                      ) : isCurrent ? (
                        <View style={[s.ctaBtn, { backgroundColor: plan.color + "10", borderColor: plan.color + "22" }]}>
                          <Ionicons name="checkmark-circle-outline" size={15} color={plan.color} />
                          <Text style={[s.ctaBtnText, { color: plan.color }]}>Tu plan actual</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={[s.ctaBtn, { backgroundColor: plan.color + "14", borderColor: plan.color + "33" }]}
                          onPress={() => openWhatsApp(msg)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="logo-whatsapp" size={15} color={plan.color} />
                          <Text style={[s.ctaBtnText, { color: plan.color }]}>Cambiar a {plan.name}</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>

          {/* FAQ */}
          <Animated.View entering={FadeInDown.delay(400).duration(400)}>
            <Text style={[s.sectionLabel, { color: t.muted }]}>Preguntas frecuentes</Text>
            <View style={{ gap: 10 }}>
              {[
                { q: "¿Qué pasa si mi trial expira?", a: "Tu información se guarda de forma segura. Activa un plan en cualquier momento para recuperar el acceso completo." },
                { q: "¿Cómo se realiza el pago?", a: "Aceptamos transferencia bancaria, Nequi, Daviplata y tarjeta. Te guiamos por WhatsApp." },
                { q: "¿Puedo cancelar en cualquier momento?", a: "Sí. Sin contratos ni cláusulas de permanencia." },
              ].map((item, i) => (
                <View key={i} style={[s.faqCard, { backgroundColor: t.card, borderColor: t.border }]}>
                  <Text style={[s.faqQ, { color: t.text }]}>{item.q}</Text>
                  <Text style={[s.faqA, { color: t.muted }]}>{item.a}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  header:          { paddingTop: 16, paddingHorizontal: 24, paddingBottom: 28, overflow: "hidden" },
  headerAccent:    { position: "absolute", top: 0, left: 0, right: 0, height: 3, zIndex: 1 },
  headerBlob:      { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,.07)", top: -70, right: -50 },
  headerRow:       { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  backBtn:         { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,.10)", alignItems: "center", justifyContent: "center" },
  headerTitle:     { fontSize: 20, fontFamily: Fonts.bold, color: "white", letterSpacing: -0.4 },
  headerSub:       { fontSize: 12, color: "rgba(255,255,255,.7)", fontFamily: Fonts.regular, marginTop: 2 },
  planBadge:       { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "rgba(255,255,255,.12)", borderRadius: Radius.lg, padding: 14 },
  planBadgeIcon:   { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  planBadgeLabel:  { fontSize: 11, fontFamily: Fonts.semibold, color: "rgba(255,255,255,.7)" },
  planBadgeName:   { fontSize: 18, fontFamily: Fonts.bold, color: "white", letterSpacing: -0.3 },
  pill:            { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(255,255,255,.18)", borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  pillText:        { fontSize: 11, fontFamily: Fonts.bold, color: "white" },
  warnCard:        { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#fffbeb", borderRadius: Radius.md, padding: 14, borderWidth: 1, borderColor: "#f59e0b33" },
  warnText:        { flex: 1, fontSize: 13, fontFamily: Fonts.semibold, color: "#92400e", lineHeight: 19 },
  sectionLabel:    { fontSize: 11, fontFamily: Fonts.mono, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  card:            { borderWidth: 1, borderRadius: Radius.lg, padding: 18, gap: 10 },
  featRow:         { flexDirection: "row", alignItems: "center", gap: 10 },
  featDot:         { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  featText:        { fontSize: 13, fontFamily: Fonts.semibold, flex: 1, lineHeight: 18 },
  moreFeats:       { fontSize: 12, fontFamily: Fonts.semibold, paddingLeft: 32 },
  planCard:        { borderWidth: 1, borderRadius: Radius.xl, padding: 18, overflow: "hidden", gap: 14 },
  popularBadge:    { position: "absolute", top: 0, right: 0, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 5, borderBottomLeftRadius: Radius.md },
  popularText:     { fontSize: 10, fontFamily: Fonts.bold, color: "white" },
  planCardHeader:  { flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 6 },
  planIcon:        { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  planName:        { fontSize: 17, fontFamily: Fonts.bold, letterSpacing: -0.3 },
  planSub:         { fontSize: 12, fontFamily: Fonts.regular, marginTop: 2 },
  planPrice:       { fontSize: 20, fontFamily: Fonts.bold, letterSpacing: -0.5 },
  planPeriod:      { fontSize: 11, fontFamily: Fonts.regular, textAlign: "right" },
  planDivider:     { height: StyleSheet.hairlineWidth },
  ctaBtn:          { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderRadius: Radius.full, paddingVertical: 11 },
  ctaBtnText:      { fontSize: 13, fontFamily: Fonts.bold },
  faqCard:         { borderWidth: 1, borderRadius: Radius.md, padding: 16 },
  faqQ:            { fontSize: 13, fontFamily: Fonts.bold, marginBottom: 6 },
  faqA:            { fontSize: 13, fontFamily: Fonts.regular, lineHeight: 19 },
});
