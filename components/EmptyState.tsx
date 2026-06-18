import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius, Shadow } from "@/constants/theme";

type Props = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  title: string;
  subtitle?: string;
};

export default function EmptyState({ icon, title, subtitle }: Props) {
  return (
    <View style={[s.container, Shadow.sm]}>
      <Ionicons name={icon} size={44} color={Colors.subtle} style={{ marginBottom: 12 }} />
      <Text style={s.title}>{title}</Text>
      {subtitle ? <Text style={s.sub}>{subtitle}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: 48, alignItems: "center", marginTop: 20 },
  title:     { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  sub:       { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center" },
});
