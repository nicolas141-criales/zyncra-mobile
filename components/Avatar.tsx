import { View, Text, Image, StyleSheet } from "react-native";
import { Colors } from "@/constants/theme";

type Props = {
  name: string;
  size?: number;
  photoUrl?: string | null;
  color?: string;
};

export default function Avatar({ name, size = 44, photoUrl, color = Colors.blue }: Props) {
  if (photoUrl) {
    return <Image source={{ uri: photoUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} />;
  }

  const initials = name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color + "14",
        borderWidth: 1.5,
        borderColor: color + "30",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ color, fontSize: size * 0.33, fontFamily: "SpaceGrotesk_700Bold" }}>
        {initials}
      </Text>
    </View>
  );
}
