import { View, Text, TextInput, StyleSheet } from "react-native";
import { Colors, Radius } from "@/constants/theme";
import { useTheme } from "@/lib/theme";

type Props = {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: "phone-pad" | "email-address" | "numeric" | "default";
  multiline?: boolean;
};

export default function FormField({ label, value, onChangeText, placeholder, keyboardType, multiline }: Props) {
  const { t } = useTheme();
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: t.muted }]}>{label}</Text>
      <TextInput
        style={[s.input, { backgroundColor: t.bgAlt, borderColor: t.border, color: t.text }, multiline && { height: 80, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.subtle}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        autoCapitalize={keyboardType === "phone-pad" || keyboardType === "email-address" ? "none" : "sentences"}
      />
    </View>
  );
}

const s = StyleSheet.create({
  field: { marginBottom: 16 },
  label: { fontSize: 11, fontFamily: "SpaceGrotesk_700Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  input: { borderWidth: 1.5, borderRadius: Radius.md, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, fontFamily: "SpaceGrotesk_400Regular" },
});
