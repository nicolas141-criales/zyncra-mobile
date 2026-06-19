import { Tabs } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Gradients, Shadow } from "@/constants/theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; label: string; icon: IoniconName; iconFocused: IoniconName }[] = [
  { name: "index",    label: "Panel",    icon: "home-outline",     iconFocused: "home" },
  { name: "agenda",   label: "Agenda",   icon: "calendar-outline", iconFocused: "calendar" },
  { name: "clients",  label: "Clientes", icon: "people-outline",   iconFocused: "people" },
  { name: "pos",      label: "Cobros",   icon: "card-outline",     iconFocused: "card" },
  { name: "settings", label: "Ajustes",  icon: "settings-outline", iconFocused: "settings" },
];

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const currentRouteName = state.routes[state.index].name;
  const isSubScreen = !TABS.some(t => t.name === currentRouteName);
  if (isSubScreen) return null;

  return (
    <View style={s.wrapper}>
      <View style={[s.bar, Shadow.md]}>
        {state.routes.filter(r => TABS.some(t => t.name === r.name)).map((route) => {
          const focused = state.routes[state.index].name === route.name;
          const tab = TABS.find(t => t.name === route.name) ?? TABS[0];

          return (
            <TouchableOpacity
              key={route.key}
              style={s.tab}
              onPress={() => navigation.navigate(route.name)}
              activeOpacity={0.7}
            >
              <View style={s.tabInner}>
                {focused ? (
                  <>
                    <View style={s.iconBoxActive}>
                      <LinearGradient
                        colors={Gradients.brand}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={s.activeDot}
                      />
                      <Ionicons name={tab.iconFocused} size={20} color="white" />
                    </View>
                    <Text style={s.labelFocused}>{tab.label}</Text>
                  </>
                ) : (
                  <>
                    <View style={s.iconBoxInactive}>
                      <Ionicons name={tab.icon} size={20} color="rgba(255,255,255,0.52)" />
                    </View>
                    <Text style={s.label}>{tab.label}</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:         { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: 24, paddingHorizontal: 14 },
  bar:             { backgroundColor: Colors.ink, borderRadius: 24, flexDirection: "row", paddingVertical: 10, paddingHorizontal: 6, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  tab:             { flex: 1, alignItems: "center" },
  tabInner:        { alignItems: "center", gap: 4 },
  iconBoxActive:   { width: 38, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.10)", overflow: "hidden" },
  activeDot:       { position: "absolute", top: 0, left: 8, right: 8, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  iconBoxInactive: { width: 38, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label:           { fontSize: 10, fontFamily: Fonts.semibold, color: "rgba(255,255,255,0.45)", textAlign: "center" },
  labelFocused:    { fontSize: 10, fontFamily: Fonts.bold, color: "white", textAlign: "center" },
});

export default function AdminLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index"         options={{ title: "Panel" }} />
      <Tabs.Screen name="agenda"        options={{ title: "Agenda" }} />
      <Tabs.Screen name="clients"       options={{ title: "Clientes" }} />
      <Tabs.Screen name="pos"           options={{ title: "Cobros" }} />
      <Tabs.Screen name="settings"      options={{ title: "Ajustes" }} />
      <Tabs.Screen name="services"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="team"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="business-info" options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="schedule"      options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="reminders"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="profile"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="billing"         options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="whatsapp"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="reviews-google"  options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="reviews-site"    options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="caja"            options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="commissions"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="invoices"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="custom-fields"   options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="reports"          options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="pos-history"     options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="finanzas"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="branding"        options={{ tabBarButton: () => null }} />
      <Tabs.Screen name="inventario"      options={{ tabBarButton: () => null }} />
    </Tabs>
  );
}
