import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/theme";
import { useTheme } from "@/lib/theme";

export default function Index() {
  const { t } = useTheme();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: t.bg }}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  return <Redirect href={authed ? "/(admin)" : "/(auth)/login"} />;
}
