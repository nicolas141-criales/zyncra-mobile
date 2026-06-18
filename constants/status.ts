import { Ionicons } from "@expo/vector-icons";
import { Colors } from "./theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

export const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: IoniconName }> = {
  pending:   { label: "Pendiente",  color: "#f59e0b",      bg: "#fef9eb",      icon: "time-outline" },
  confirmed: { label: "Confirmada", color: Colors.blue,    bg: "#eff2ff",      icon: "checkmark-circle-outline" },
  completed: { label: "Completada", color: Colors.success, bg: "#f0fdf4",      icon: "checkmark-done-circle-outline" },
  cancelled: { label: "Cancelada",  color: Colors.subtle,  bg: Colors.cream2,  icon: "close-circle-outline" },
  no_show:   { label: "No asistió", color: Colors.red,     bg: "#fff0f0",      icon: "alert-circle-outline" },
};

export const STATUS_OPTIONS = Object.entries(STATUS_META).map(([status, meta]) => ({
  status,
  label: meta.label,
  color: meta.color,
  icon: meta.icon,
}));
