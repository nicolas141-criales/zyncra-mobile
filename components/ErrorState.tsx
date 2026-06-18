import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Radius } from "@/constants/theme";

type Props = {
  message?: string;
  onRetry?: () => void;
};

export default function ErrorState({ message = "No se pudo cargar la información", onRetry }: Props) {
  return (
    <View style={s.container}>
      <Ionicons name="cloud-offline-outline" size={44} color={Colors.subtle} style={{ marginBottom: 12 }} />
      <Text style={s.title}>Error de conexión</Text>
      <Text style={s.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={s.btn} onPress={onRetry} activeOpacity={0.8}>
          <Ionicons name="refresh" size={16} color="white" style={{ marginRight: 6 }} />
          <Text style={s.btnText}>Reintentar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  title:     { fontSize: 16, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text, marginBottom: 6 },
  message:   { fontSize: 13, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, textAlign: "center", marginBottom: 20 },
  btn:       { flexDirection: "row", alignItems: "center", backgroundColor: Colors.red, borderRadius: Radius.md, paddingHorizontal: 20, paddingVertical: 12 },
  btnText:   { fontSize: 14, fontFamily: "SpaceGrotesk_700Bold", color: "white" },
});
