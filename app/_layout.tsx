import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts, SpaceGrotesk_400Regular, SpaceGrotesk_600SemiBold, SpaceGrotesk_700Bold } from "@expo-google-fonts/space-grotesk";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/theme";
import { ThemeProvider, useTheme } from "@/lib/theme";
import ZyncraIntro from "@/components/ZyncraIntro";
import { registerForPushNotifications, scheduleDailyBriefing } from "@/lib/notifications";

function AppContent() {
  const [showIntro, setShowIntro] = useState(true);
  const { t } = useTheme();

  useEffect(() => {
    registerForPushNotifications();
    scheduleDailyBriefing();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style={showIntro ? "light" : t.statusBar} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(admin)" options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="(auth)"  options={{ animation: "fade", gestureEnabled: false }} />
        <Stack.Screen name="(staff)" options={{ animation: "fade", gestureEnabled: false }} />
      </Stack>
      {showIntro && <ZyncraIntro onDone={() => setShowIntro(false)} />}
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#F4F4F9" }}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
