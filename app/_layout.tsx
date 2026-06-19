import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { JetBrainsMono_500Medium, JetBrainsMono_700Bold } from "@expo-google-fonts/jetbrains-mono";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/theme";
import ZyncraIntro from "@/components/ZyncraIntro";
import { registerForPushNotifications, scheduleDailyBriefing } from "@/lib/notifications";

export default function RootLayout() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    registerForPushNotifications();
    scheduleDailyBriefing();
  }, []);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F4F9" }}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={showIntro ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(admin)" options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="(auth)"  options={{ animation: "fade", gestureEnabled: false }} />
          <Stack.Screen name="(staff)" options={{ animation: "fade", gestureEnabled: false }} />
        </Stack>
      {showIntro && <ZyncraIntro onDone={() => setShowIntro(false)} />}
    </GestureHandlerRootView>
  );
}
