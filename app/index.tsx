import { useEffect } from "react";
import { Redirect } from "expo-router";
import { supabase } from "@/lib/supabase";
import { useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { Colors } from "@/constants/theme";

export default function Index() {
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
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.cream }}>
        <ActivityIndicator color={Colors.red} size="large" />
      </View>
    );
  }

  return <Redirect href={authed ? "/(admin)" : "/(auth)/login"} />;
}
