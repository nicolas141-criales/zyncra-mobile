import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, RefreshControl,
} from "react-native";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";
import { Colors, Radius, Shadow } from "@/constants/theme";
import GradientHeader from "@/components/GradientHeader";
import BottomSaveBar from "@/components/BottomSaveBar";
import ModalHeader from "@/components/ModalHeader";
import EmptyState from "@/components/EmptyState";
import FormField from "@/components/FormField";

type Service = {
  id: string;
  name: string;
  price: number;
  duration_min: number;
  description?: string;
};

function ServiceModal({ visible, service, tenantId, onClose, onSaved }: {
  visible: boolean; service: Service | null; tenantId: string;
  onClose: () => void; onSaved: () => void;
}) {
  const isEdit = service !== null;
  const [name, setName]         = useState("");
  const [price, setPrice]       = useState("");
  const [duration, setDuration] = useState("");
  const [desc, setDesc]         = useState("");
  const [saving, setSaving]     = useState(false);

  useEffect(() => {
    if (visible) {
      setName(service?.name ?? "");
      setPrice(service?.price != null ? String(service.price) : "");
      setDuration(service?.duration_min != null ? String(service.duration_min) : "");
      setDesc(service?.description ?? "");
    }
  }, [visible, service]);

  const canSave = name.trim().length >= 2 && Number(price) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        price: Number(price),
        duration_min: Number(duration) || 30,
        description: desc.trim() || null,
      };
      if (isEdit) {
        await supabase.from("services").update(payload).eq("id", service!.id);
      } else {
        await supabase.from("services").insert({ ...payload, tenant_id: tenantId, duration_minutes: Number(duration) || 30 });
      }
      onSaved(); onClose();
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    Alert.alert("Eliminar servicio", `¿Eliminar "${service?.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Eliminar", style: "destructive", onPress: async () => {
        await supabase.from("services").delete().eq("id", service!.id);
        onSaved(); onClose();
      }},
    ]);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
        <ModalHeader
          title={isEdit ? "Editar servicio" : "Nuevo servicio"}
          onClose={onClose}
          rightAction={isEdit ? { icon: "trash-outline", onPress: handleDelete } : undefined}
        />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
            <FormField label="Nombre del servicio *" value={name} onChangeText={setName} placeholder="Ej: Corte de cabello" />
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <FormField label="Precio *" value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Duración (min)" value={duration} onChangeText={setDuration} placeholder="30" keyboardType="numeric" />
              </View>
            </View>
            <FormField label="Descripción" value={desc} onChangeText={setDesc} placeholder="Opcional..." multiline />
          </ScrollView>
          <BottomSaveBar label={isEdit ? "Guardar cambios" : "Crear servicio"} saving={saving} disabled={!canSave} onPress={handleSave} />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

export default function ServicesScreen() {
  const router = useRouter();
  const { tenantId } = useAuth();
  const [services, setServices]   = useState<Service[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal]         = useState<{ visible: boolean; service: Service | null }>({ visible: false, service: null });

  const load = async () => {
    if (!tenantId) return;
    const { data } = await supabase.from("services")
      .select("id, name, price, duration_min, description")
      .eq("tenant_id", tenantId).order("name");
    setServices(data ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!tenantId) return;
      const { data } = await supabase.from("services")
        .select("id, name, price, duration_min, description")
        .eq("tenant_id", tenantId).order("name");
      if (!cancelled) setServices(data ?? []);
    })();
    return () => { cancelled = true; };
  }, [tenantId]);
  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }}>
      <GradientHeader
        title="Servicios"
        subtitle={`${services.length} en tu catálogo`}
        onBack={() => router.back()}
        rightAction={{ icon: "add", onPress: () => setModal({ visible: true, service: null }) }}
      />

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 110 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.red} />}
      >
        {services.length === 0 ? (
          <EmptyState icon="cut-outline" title="Sin servicios" subtitle="Toca + para agregar tu primer servicio" />
        ) : (
          services.map((svc, i) => (
            <Animated.View key={svc.id} entering={i < 10 ? FadeInRight.delay(i * 50).duration(320) : undefined}>
              <TouchableOpacity
                style={[s.row, Shadow.sm]}
                onPress={() => setModal({ visible: true, service: svc })}
                activeOpacity={0.75}
              >
                <View style={[s.iconBox, { backgroundColor: Colors.purple + "12" }]}>
                  <Ionicons name="cut-outline" size={18} color={Colors.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name} numberOfLines={1}>{svc.name}</Text>
                  <Text style={s.info}>{svc.duration_min} min</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.price}>${Math.round(svc.price).toLocaleString("es-CO")}</Text>
                  <Ionicons name="chevron-forward" size={14} color={Colors.subtle} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            </Animated.View>
          ))
        )}
      </ScrollView>

      {tenantId && (
        <ServiceModal
          visible={modal.visible}
          service={modal.service}
          tenantId={tenantId}
          onClose={() => setModal({ visible: false, service: null })}
          onSaved={load}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  row:     { backgroundColor: Colors.white, borderRadius: Radius.md, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 10 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  name:    { fontSize: 14, fontFamily: "SpaceGrotesk_600SemiBold", color: Colors.text },
  info:    { fontSize: 12, fontFamily: "SpaceGrotesk_400Regular", color: Colors.muted, marginTop: 2 },
  price:   { fontSize: 15, fontFamily: "SpaceGrotesk_700Bold", color: Colors.text },
});
