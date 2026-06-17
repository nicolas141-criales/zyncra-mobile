import { Tabs } from "expo-router";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { Colors, Shadow, Glass } from "@/constants/theme";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; label: string; icon: IoniconName; iconFocused: IoniconName }[] = [
  { name: "agenda",  label: "Mi Agenda", icon: "calendar-outline", iconFocused: "calendar" },
  { name: "clients", label: "Clientes",  icon: "people-outline",   iconFocused: "people" },
  { name: "profile", label: "Mi Perfil", icon: "person-outline",   iconFocused: "person" },
];

function StaffTabBar({ state, navigation }: BottomTabBarProps) {
  return (
    <View style={s.wrapper}>
      <BlurView tint={Glass.blurStrong.tint} intensity={Glass.blurStrong.intensity} style={[s.bar, Shadow.md]}>
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
                    <View style={s.iconBox}>
                      <Ionicons name={tab.iconFocused} size={20} color="white" />
                    </View>
                    <Text style={s.labelFocused}>{tab.label}</Text>
                  </>
                ) : (
                  <>
                    <View style={s.iconBoxInactive}>
                      <Ionicons name={tab.icon} size={20} color={Colors.subtle} />
                    </View>
                    <Text style={s.label}>{tab.label}</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </BlurView>
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:         { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: 24, paddingHorizontal: 12 },
  bar:             { backgroundColor: "rgba(255,255,255,0.55)", borderRadius: 22, flexDirection: "row", paddingVertical: 10, paddingHorizontal: 4, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.6)" },
  tab:             { flex: 1, alignItems: "center" },
  tabInner:        { alignItems: "center", gap: 4 },
  iconBox:         { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: Colors.red },
  iconBoxInactive: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  label:           { fontSize: 10, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.subtle, textAlign: "center" },
  labelFocused:    { fontSize: 10, fontFamily: "SpaceGrotesk_700Bold", color: Colors.red, textAlign: "center" },
});

export default function StaffLayout() {
  return (
    <Tabs tabBar={(props) => <StaffTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="agenda"  options={{ title: "Mi Agenda" }} />
      <Tabs.Screen name="clients" options={{ title: "Clientes" }} />
      <Tabs.Screen name="profile" options={{ title: "Mi Perfil" }} />
    </Tabs>
  );
}
