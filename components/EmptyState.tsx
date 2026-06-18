import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Radius, Shadow } from "@/constants/theme";
import { useTheme } from "@/lib/theme";

type Props = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
};

export default function EmptyState({ icon, title, subtitle }: Props) {
  const { t } = useTheme();
  return (
    <View style={[s.container, Shadow.sm, { backgroundColor: t.bgAlt }]}>
      <Ionicons name={icon} size={44} color={t.subtle} style={{ marginBottom: 12 }} />
      <Text style={[s.title, { color: t.text }]}>{title}</Text>
      {subtitle ? <Text style={[s.sub, { color: t.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { borderRadius: Radius.xl, padding: 48, alignItems: "center", marginTop: 20 },
  title:     { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", marginBottom: 6 },
  sub:       { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", textAlign: "center" },
});
