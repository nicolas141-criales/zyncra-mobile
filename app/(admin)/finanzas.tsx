import { useState, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Fonts, Gradients, MonoLabel, Radius, Shadow } from "@/constants/theme";
import { supabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "resumen" | "caja" | "ventas" | "reportes" | "rentabilidad";

interface SaleItem {
  quantity: number;
  unit_price: number;
  services: { name: string } | null;
}

interface Sale {
  id: string;
  total: number;
  payment_method: string;
  created_at: string;
  client_id: string | null;
  clients: { name: string } | null;
  pos_sale_items: SaleItem[];
}

interface CashSession {
  id: string;
  opened_at: string;
  opening_amount: number;
  closing_amount: number | null;
}

interface CashMovement {
  id: string;
  type: "ingreso" | "egreso";
  amount: number;
  description: string;
  created_at: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen",      label: "Resumen"      },
  { id: "caja",         label: "Caja"         },
  { id: "ventas",       label: "Ventas"       },
  { id: "reportes",     label: "Reportes"     },
  { id: "rentabilidad", label: "Rentabilidad" },
];

const PM_COLOR: Record<string, string> = {
  efectivo: "#10b981", tarjeta: "#6366f1", nequi: "#0027fe", daviplata: "#f59e0b",
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
}

function startOfPeriod(period: "7" | "30" | "90"): string {
  const d = new Date();
  d.setDate(d.getDate() - parseInt(period));
  return d.toISOString();
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const hhmm = d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return `hoy ${hhmm}`;
  if (diffDays === 1) return `ayer ${hhmm}`;
  return `${d.getDate()} ${d.toLocaleString("es-CO", { month: "short" })} ${hhmm}`;
}

function saleItemsLabel(items: SaleItem[]): string {
  const names = items
    .map(i => i.services?.name)
    .filter(Boolean) as string[];
  if (names.length === 0) return "Sin servicios";
  return names.join(" · ");
}

function groupByDay(sales: Sale[], days: number): { label: string; pct: number }[] {
  const buckets: Record<string, number> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = 0;
  }
  for (const s of sales) {
    const key = s.created_at.slice(0, 10);
    if (key in buckets) buckets[key] += s.total;
  }
  const entries = Object.entries(buckets);
  const maxVal = Math.max(...entries.map(([, v]) => v), 1);
  const dayLetters = ["D", "L", "M", "M", "J", "V", "S"];
  return entries.map(([dateStr, val]) => ({
    label: dayLetters[new Date(dateStr + "T12:00:00").getDay()],
    pct: Math.round((val / maxVal) * 100),
  }));
}

function groupByPaymentMethod(sales: Sale[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const s of sales) {
    result[s.payment_method] = (result[s.payment_method] ?? 0) + s.total;
  }
  return result;
}

function groupByService(sales: Sale[]): { name: string; val: number; pct: number }[] {
  const totals: Record<string, number> = {};
  for (const sale of sales) {
    for (const item of sale.pos_sale_items) {
      const name = item.services?.name ?? "Sin nombre";
      totals[name] = (totals[name] ?? 0) + item.quantity * item.unit_price;
    }
  }
  const sorted = Object.entries(totals)
    .map(([name, val]) => ({ name, val }))
    .sort((a, b) => b.val - a.val)
    .slice(0, 6);
  const maxVal = sorted[0]?.val ?? 1;
  return sorted.map(s => ({ ...s, pct: Math.round((s.val / maxVal) * 100) }));
}

// ── Loading placeholder ───────────────────────────────────────────────────────

function LoadingView() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
      <ActivityIndicator size="large" color={Colors.ink} />
      <Text style={{ fontSize: 13, fontFamily: Fonts.regular, color: Colors.subtle }}>Cargando datos…</Text>
    </View>
  );
}

// ── Resumen tab ──────────────────────────────────────────────────────────────

interface ResumenProps {
  sales: Sale[];
  session: CashSession | null;
  movements: CashMovement[];
  period: "7" | "30" | "90";
  loading: boolean;
}

function TabResumen({ sales, session, movements, period, loading }: ResumenProps) {
  if (loading) return <LoadingView />;

  const totalIngresos = sales.reduce((a, s) => a + s.total, 0);
  const avgSale = sales.length > 0 ? Math.round(totalIngresos / sales.length) : 0;
  const countSales = sales.length;

  const cajaIngresos = movements.filter(m => m.type === "ingreso").reduce((a, m) => a + m.amount, 0);
  const cajaEgresos = movements.filter(m => m.type === "egreso").reduce((a, m) => a + m.amount, 0);
  const cajaBalance = session ? (session.opening_amount + cajaIngresos - cajaEgresos) : 0;

  const barDays = parseInt(period) <= 12 ? parseInt(period) : 12;
  const barData = groupByDay(sales, 12);

  const pmTotals = groupByPaymentMethod(sales);
  const grandTotal = Object.values(pmTotals).reduce((a, b) => a + b, 0) || 1;

  const recentSales = sales.slice(0, 4);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* KPI grid */}
      <View style={s.kpiGrid}>
        {[
          { label: `Ingresos (${period}d)`, value: fmt(totalIngresos),  sub: `${countSales} ventas en el período` },
          { label: "Promedio / venta",       value: fmt(avgSale),        sub: `${countSales} transacciones`        },
          { label: `Ventas (${period}d)`,    value: String(countSales),  sub: "transacciones"                      },
          {
            label: "Caja actual",
            value: fmt(cajaBalance),
            sub: session ? "sesión en curso" : "sin sesión activa",
          },
        ].map((k, i) => (
          <View key={i} style={[s.kpiCard, Shadow.sm]}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={s.kpiValue}>{k.value}</Text>
            <Text style={s.kpiSub}>{k.sub}</Text>
          </View>
        ))}
      </View>

      {/* Mini bar chart */}
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={s.cardTitle}>Ingresos diarios</Text>
        <Text style={s.cardSub}>últimos 12 días</Text>
        <View style={s.bars}>
          {barData.map((b, i) => (
            <View key={i} style={s.barCol}>
              <View style={s.barTrack}>
                <LinearGradient
                  colors={Gradients.brand}
                  start={{ x: 0, y: 1 }} end={{ x: 0, y: 0 }}
                  style={[s.barFill, { height: `${b.pct || 2}%` as any }]}
                />
              </View>
              <Text style={s.barLabel}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Payment methods */}
      {Object.keys(pmTotals).length > 0 ? (
        <View style={[s.card, { marginBottom: 12 }]}>
          <Text style={s.cardTitle}>Medios de pago</Text>
          {(Object.entries(pmTotals) as [string, number][]).map(([pm, val]) => (
            <View key={pm} style={s.pmRow}>
              <View style={[s.pmDot, { backgroundColor: PM_COLOR[pm] ?? Colors.dim }]} />
              <Text style={s.pmName}>{pm.charAt(0).toUpperCase() + pm.slice(1)}</Text>
              <View style={s.pmBarTrack}>
                <View style={[s.pmBarFill, { width: `${Math.round(val / grandTotal * 100)}%` as any, backgroundColor: PM_COLOR[pm] ?? Colors.dim }]} />
              </View>
              <Text style={s.pmVal}>{fmt(val)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={[s.card, { marginBottom: 12 }]}>
          <Text style={s.cardTitle}>Medios de pago</Text>
          <Text style={[s.kpiSub, { marginTop: 8 }]}>Sin ventas en el período seleccionado.</Text>
        </View>
      )}

      {/* Recent sales */}
      <View style={[s.card, { marginBottom: 4 }]}>
        <Text style={s.cardTitle}>Últimas ventas</Text>
        {recentSales.length === 0 ? (
          <Text style={[s.kpiSub, { marginTop: 8 }]}>Sin ventas registradas.</Text>
        ) : recentSales.map((sale, i) => {
          const pm = sale.payment_method;
          const clientName = sale.clients?.name ?? "Cliente";
          const itemsLabel = saleItemsLabel(sale.pos_sale_items);
          return (
            <View key={sale.id} style={[s.saleRow, i < recentSales.length - 1 && s.saleRowBorder]}>
              <View style={[s.pmBadge, { backgroundColor: (PM_COLOR[pm] ?? Colors.dim) + "18" }]}>
                <Text style={[s.pmBadgeText, { color: PM_COLOR[pm] ?? Colors.dim }]}>{pm.slice(0, 3).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.saleName}>{clientName}</Text>
                <Text style={s.saleItems}>{itemsLabel}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.saleTotal}>{fmt(sale.total)}</Text>
                <Text style={s.saleDate}>{fmtTime(sale.created_at)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Caja tab ────────────────────────────────────────────────────────────────

interface CajaProps {
  session: CashSession | null;
  movements: CashMovement[];
  loading: boolean;
}

function TabCaja({ session, movements, loading }: CajaProps) {
  if (loading) return <LoadingView />;

  const cajaIngresos = movements.filter(m => m.type === "ingreso").reduce((a, m) => a + m.amount, 0);
  const cajaEgresos  = movements.filter(m => m.type === "egreso").reduce((a, m) => a + m.amount, 0);
  const balance      = session ? (session.opening_amount + cajaIngresos - cajaEgresos) : 0;

  const openedTime = session
    ? new Date(session.opened_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
    : "";

  const webAction = () => Alert.alert("Acción no disponible", "Usa el panel web para esta acción.");

  if (!session) {
    return (
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={[s.card, { alignItems: "center", paddingVertical: 32, marginBottom: 12 }]}>
          <Ionicons name="lock-open-outline" size={36} color={Colors.subtle} />
          <Text style={[s.cardTitle, { marginTop: 12, textAlign: "center" }]}>Sin sesión activa</Text>
          <Text style={[s.kpiSub, { textAlign: "center", marginTop: 4 }]}>
            Abre una sesión de caja desde el panel web para registrar movimientos.
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Session card */}
      <LinearGradient colors={Gradients.ink} style={s.sessionCard}>
        <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sessionAccent} />
        <View style={s.sessionHeader}>
          <View style={s.sessionDot} />
          <Text style={s.sessionStatus}>Sesión en curso</Text>
          <Text style={s.sessionTime}>desde {openedTime} · hoy</Text>
        </View>
        <Text style={s.sessionBalance}>{fmt(balance)}</Text>
        <Text style={s.sessionBalanceLabel}>saldo en caja</Text>
        <View style={s.sessionBreakdown}>
          <View style={s.sessionItem}>
            <Text style={[s.sessionItemLabel, { color: Colors.subtle }]}>Apertura</Text>
            <Text style={[s.sessionItemVal, { color: "rgba(255,255,255,0.6)" }]}>{fmt(session.opening_amount)}</Text>
          </View>
          <View style={s.sessionItem}>
            <Text style={[s.sessionItemLabel, { color: Colors.subtle }]}>Ingresos</Text>
            <Text style={[s.sessionItemVal, { color: "#10b981" }]}>{fmt(cajaIngresos)}</Text>
          </View>
          <View style={s.sessionItem}>
            <Text style={[s.sessionItemLabel, { color: Colors.subtle }]}>Egresos</Text>
            <Text style={[s.sessionItemVal, { color: "#ef4444" }]}>−{fmt(cajaEgresos)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Quick actions */}
      <View style={[s.quickRow]}>
        {[
          { icon: "add-circle-outline" as const, label: "Ingreso",    color: "#10b981" },
          { icon: "remove-circle-outline" as const, label: "Egreso",  color: "#ef4444" },
          { icon: "lock-closed-outline" as const, label: "Cerrar caja", color: Colors.subtle },
        ].map((a, i) => (
          <TouchableOpacity key={i} style={s.quickBtn} activeOpacity={0.7} onPress={webAction}>
            <View style={[s.quickIcon, { backgroundColor: a.color + "15" }]}>
              <Ionicons name={a.icon} size={20} color={a.color} />
            </View>
            <Text style={s.quickLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Movements */}
      <View style={[s.card, { marginBottom: 4 }]}>
        <Text style={s.cardTitle}>Movimientos de la sesión</Text>
        {movements.length === 0 ? (
          <Text style={[s.kpiSub, { marginTop: 8 }]}>Sin movimientos registrados.</Text>
        ) : movements.map((m, i) => (
          <View key={m.id} style={[s.moveRow, i < movements.length - 1 && s.saleRowBorder]}>
            <View style={[s.moveIcon, { backgroundColor: (m.type === "ingreso" ? "#10b981" : "#ef4444") + "15" }]}>
              <Ionicons
                name={m.type === "ingreso" ? "arrow-down-outline" : "arrow-up-outline"}
                size={16}
                color={m.type === "ingreso" ? "#10b981" : "#ef4444"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.movDesc}>{m.description}</Text>
              <Text style={s.movTime}>
                {new Date(m.created_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
            <Text style={[s.movAmount, { color: m.type === "ingreso" ? "#10b981" : "#ef4444" }]}>
              {m.type === "ingreso" ? "+" : "−"}{fmt(m.amount)}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Ventas tab ───────────────────────────────────────────────────────────────

interface VentasProps {
  sales: Sale[];
  period: "7" | "30" | "90";
  onPeriodChange: (p: "7" | "30" | "90") => void;
  loading: boolean;
}

function TabVentas({ sales, period, onPeriodChange, loading }: VentasProps) {
  const [pmFilter, setPmFilter] = useState("todos");

  if (loading) return <LoadingView />;

  const filtered = pmFilter === "todos"
    ? sales
    : sales.filter(s => s.payment_method === pmFilter);

  const total = filtered.reduce((a, s) => a + s.total, 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Period filter */}
      <View style={s.filterRow}>
        <View style={s.filterPills}>
          {(["7", "30", "90"] as const).map(d => (
            <TouchableOpacity key={d} style={[s.pill, period === d && s.pillActive]} onPress={() => onPeriodChange(d)} activeOpacity={0.7}>
              <Text style={[s.pillText, period === d && s.pillTextActive]}>
                {d === "7" ? "7 días" : d === "30" ? "30 días" : "90 días"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Method filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={s.filterPillsH}>
          {["todos", "efectivo", "nequi", "daviplata", "tarjeta"].map(pm => (
            <TouchableOpacity
              key={pm}
              style={[s.pmPill, pmFilter === pm && { backgroundColor: (PM_COLOR[pm] ?? Colors.ink) + "20", borderColor: PM_COLOR[pm] ?? Colors.ink }]}
              onPress={() => setPmFilter(pm)}
              activeOpacity={0.7}
            >
              <Text style={[s.pmPillText, pmFilter === pm && { color: PM_COLOR[pm] ?? Colors.ink, fontFamily: Fonts.bold }]}>
                {pm.charAt(0).toUpperCase() + pm.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Summary */}
      <View style={[s.summaryRow, { marginBottom: 12 }]}>
        <Text style={s.summaryText}>
          <Text style={s.summaryBold}>{filtered.length}</Text> ventas ·{" "}
          <Text style={s.summaryBold}>{fmt(total)}</Text>
        </Text>
      </View>

      {/* Sales list */}
      <View style={[s.card, { marginBottom: 4 }]}>
        {filtered.length === 0 ? (
          <Text style={[s.kpiSub, { textAlign: "center", paddingVertical: 20 }]}>Sin ventas para los filtros seleccionados.</Text>
        ) : filtered.map((sale, i) => {
          const pm = sale.payment_method;
          const clientName = sale.clients?.name ?? "Cliente";
          const itemsLabel = saleItemsLabel(sale.pos_sale_items);
          return (
            <View key={sale.id} style={[s.saleRow, i < filtered.length - 1 && s.saleRowBorder]}>
              <View style={[s.pmBadge, { backgroundColor: (PM_COLOR[pm] ?? Colors.dim) + "18" }]}>
                <Text style={[s.pmBadgeText, { color: PM_COLOR[pm] ?? Colors.dim }]}>
                  {pm.slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.saleName}>{clientName}</Text>
                <Text style={s.saleItems}>{itemsLabel}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.saleTotal}>{fmt(sale.total)}</Text>
                <Text style={s.saleDate}>{fmtTime(sale.created_at)}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

// ── Reportes tab ─────────────────────────────────────────────────────────────

interface ReportesProps {
  sales: Sale[];
  loading: boolean;
}

function TabReportes({ sales, loading }: ReportesProps) {
  if (loading) return <LoadingView />;

  const totalIngresos = sales.reduce((a, s) => a + s.total, 0);
  const avgTicket     = sales.length > 0 ? Math.round(totalIngresos / sales.length) : 0;
  const uniqueClients = new Set(sales.map(s => s.client_id).filter(Boolean)).size;

  const topServices = groupByService(sales);
  const pmTotals    = groupByPaymentMethod(sales);
  const grandTotal  = Object.values(pmTotals).reduce((a, b) => a + b, 0) || 1;

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Stats */}
      <View style={s.kpiGrid}>
        {[
          { label: "Ingresos totales", value: fmt(totalIngresos) },
          { label: "Ticket promedio",  value: fmt(avgTicket)     },
          { label: "Ventas registradas", value: String(sales.length) },
          { label: "Clientes únicos",  value: String(uniqueClients) },
        ].map((k, i) => (
          <View key={i} style={[s.kpiCard, Shadow.sm]}>
            <Text style={s.kpiLabel}>{k.label}</Text>
            <Text style={s.kpiValue}>{k.value}</Text>
          </View>
        ))}
      </View>

      {/* Top services */}
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={s.cardTitle}>Servicios más vendidos</Text>
        {topServices.length === 0 ? (
          <Text style={[s.kpiSub, { marginTop: 8 }]}>Sin datos de servicios en el período.</Text>
        ) : topServices.map((svc, i) => (
          <View key={i} style={[s.serviceRow, i < topServices.length - 1 && { marginBottom: 14 }]}>
            <View style={s.serviceTop}>
              <Text style={s.serviceName}>{svc.name}</Text>
              <Text style={s.serviceVal}>{fmt(svc.val)}</Text>
            </View>
            <View style={s.serviceTrack}>
              <LinearGradient
                colors={Gradients.brand}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[s.serviceFill, { width: `${svc.pct}%` as any }]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Payment breakdown */}
      <View style={[s.card, { marginBottom: 4 }]}>
        <Text style={s.cardTitle}>Desglose por método</Text>
        {Object.keys(pmTotals).length === 0 ? (
          <Text style={[s.kpiSub, { marginTop: 8 }]}>Sin ventas en el período seleccionado.</Text>
        ) : (Object.entries(pmTotals) as [string, number][]).map(([pm, val]) => (
          <View key={pm} style={[s.pmRow, { marginBottom: 10 }]}>
            <View style={[s.pmDot, { backgroundColor: PM_COLOR[pm] ?? Colors.dim }]} />
            <Text style={s.pmName}>{pm.charAt(0).toUpperCase() + pm.slice(1)}</Text>
            <View style={s.pmBarTrack}>
              <View style={[s.pmBarFill, { width: `${Math.round(val / grandTotal * 100)}%` as any, backgroundColor: PM_COLOR[pm] ?? Colors.dim }]} />
            </View>
            <Text style={s.pmVal}>{fmt(val)}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

// ── Rentabilidad tab ──────────────────────────────────────────────────────────

interface RentabilidadProps {
  sales: Sale[];
  loading: boolean;
}

function TabRentabilidad({ sales, loading }: RentabilidadProps) {
  if (loading) return <LoadingView />;

  const ingresos = sales.reduce((a, s) => a + s.total, 0);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Main income card */}
      <LinearGradient colors={Gradients.ink} style={[s.sessionCard, { marginBottom: 12 }]}>
        <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.sessionAccent} />
        <Text style={[s.sessionBalanceLabel, { marginBottom: 4 }]}>Ingresos del período</Text>
        <Text style={[s.sessionBalance, { color: "#10b981" }]}>{fmt(ingresos)}</Text>
        <View style={s.sessionBreakdown}>
          <View style={s.sessionItem}>
            <Text style={[s.sessionItemLabel, { color: Colors.subtle }]}>Ventas</Text>
            <Text style={[s.sessionItemVal, { color: "white" }]}>{sales.length}</Text>
          </View>
          <View style={s.sessionItem}>
            <Text style={[s.sessionItemLabel, { color: Colors.subtle }]}>Promedio</Text>
            <Text style={[s.sessionItemVal, { color: "#10b981" }]}>{fmt(sales.length > 0 ? Math.round(ingresos / sales.length) : 0)}</Text>
          </View>
          <View style={s.sessionItem}>
            <Text style={[s.sessionItemLabel, { color: Colors.subtle }]}>Total</Text>
            <Text style={[s.sessionItemVal, { color: "white" }]}>{fmt(ingresos)}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Placeholder for costs */}
      <View style={[s.card, { marginBottom: 12, alignItems: "center", paddingVertical: 24 }]}>
        <Ionicons name="bar-chart-outline" size={32} color={Colors.subtle} />
        <Text style={[s.cardTitle, { marginTop: 10, textAlign: "center" }]}>Análisis de costos</Text>
        <Text style={[s.kpiSub, { textAlign: "center", marginTop: 4, maxWidth: 260 }]}>
          Conecta tus costos en el panel web para ver el margen de rentabilidad y la composición de ingresos vs. egresos.
        </Text>
      </View>

      {/* Revenue by service as proxy for "profitability breakdown" */}
      {(() => {
        const topServices = groupByService(sales);
        if (topServices.length === 0) return null;
        return (
          <View style={[s.card, { marginBottom: 4 }]}>
            <Text style={s.cardTitle}>Ingresos por servicio</Text>
            {topServices.map((svc, i) => (
              <View key={i} style={[s.serviceRow, i < topServices.length - 1 && { marginBottom: 14 }]}>
                <View style={s.serviceTop}>
                  <Text style={s.serviceName}>{svc.name}</Text>
                  <Text style={s.serviceVal}>{fmt(svc.val)}</Text>
                </View>
                <View style={s.serviceTrack}>
                  <LinearGradient
                    colors={Gradients.brand}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[s.serviceFill, { width: `${svc.pct}%` as any }]}
                  />
                </View>
              </View>
            ))}
          </View>
        );
      })()}
    </ScrollView>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FinanzasScreen() {
  const router = useRouter();
  const [tab, setTab]         = useState<Tab>("resumen");
  const [period, setPeriod]   = useState<"7" | "30" | "90">("30");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [sales, setSales]         = useState<Sale[]>([]);
  const [session, setSession]     = useState<CashSession | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);

  // Resolve tenantId from auth → tenants table
  useEffect(() => {
    async function resolveTenant() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (data?.id) {
        setTenantId(data.id);
      }
    }
    resolveTenant();
  }, []);

  // Load data whenever tenantId or period changes
  useEffect(() => {
    if (!tenantId) return;
    loadData(tenantId, period);
  }, [tenantId, period]);

  async function loadData(tid: string, p: "7" | "30" | "90") {
    setLoading(true);
    const startDate = startOfPeriod(p);

    // Parallel fetches: sales + active session
    const [salesRes, sessionRes] = await Promise.all([
      supabase
        .from("pos_sales")
        .select("id, total, payment_method, created_at, client_id, clients(name), pos_sale_items(quantity, unit_price, services(name))")
        .eq("tenant_id", tid)
        .gte("created_at", startDate)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("cash_sessions")
        .select("id, opened_at, closing_amount, opening_amount")
        .eq("tenant_id", tid)
        .is("closed_at", null)
        .maybeSingle(),
    ]);

    setSales((salesRes.data ?? []) as Sale[]);

    const activeSession = sessionRes.data as CashSession | null;
    setSession(activeSession);

    // Fetch movements only if there is an active session
    if (activeSession?.id) {
      const { data: movData } = await supabase
        .from("cash_movements")
        .select("id, type, amount, description, created_at")
        .eq("session_id", activeSession.id)
        .order("created_at", { ascending: false })
        .limit(100);
      setMovements((movData ?? []) as CashMovement[]);
    } else {
      setMovements([]);
    }

    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.cream2 }} edges={["top"]}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={s.headerCrumb}>HUB FINANCIERO</Text>
          <Text style={s.headerTitle}>Finanzas</Text>
        </View>
        <LinearGradient colors={Gradients.brand} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.headerAccent} />
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.tabBar}
        style={s.tabBarScroll}
      >
        {TABS.map(t => (
          <TouchableOpacity
            key={t.id}
            style={[s.tabBtn, tab === t.id && s.tabBtnActive]}
            onPress={() => setTab(t.id)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabBtnText, tab === t.id && s.tabBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <View style={s.content}>
        {tab === "resumen"      && <TabResumen sales={sales} session={session} movements={movements} period={period} loading={loading} />}
        {tab === "caja"         && <TabCaja session={session} movements={movements} loading={loading} />}
        {tab === "ventas"       && <TabVentas sales={sales} period={period} onPeriodChange={p => setPeriod(p)} loading={loading} />}
        {tab === "reportes"     && <TabReportes sales={sales} loading={loading} />}
        {tab === "rentabilidad" && <TabRentabilidad sales={sales} loading={loading} />}
      </View>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Header
  header: {
    backgroundColor: Colors.ink,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
  },
  headerCrumb: { ...MonoLabel, fontSize: 9, color: "rgba(255,255,255,0.45)" },
  headerTitle: {
    fontSize: 22, fontFamily: Fonts.bold, color: Colors.white,
    letterSpacing: -0.5, marginTop: 2,
  },
  headerAccent: {
    position: "absolute", bottom: 0, left: 0, right: 0, height: 3,
  },

  // Tab bar
  tabBarScroll: { backgroundColor: Colors.white, borderBottomWidth: 1, borderColor: Colors.border },
  tabBar: { flexDirection: "row", padding: 6, gap: 4 },
  tabBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 8,
  },
  tabBtnActive: { backgroundColor: Colors.ink },
  tabBtnText: {
    fontSize: 13, fontFamily: Fonts.semibold, color: Colors.dim,
  },
  tabBtnTextActive: { color: Colors.white },

  // Content
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },

  // KPI
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  kpiCard: {
    flex: 1, minWidth: "45%",
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14,
  },
  kpiLabel: { ...MonoLabel, fontSize: 9.5, marginBottom: 8 },
  kpiValue: {
    fontSize: 18, fontFamily: Fonts.bold,
    color: Colors.text, letterSpacing: -0.4,
    fontVariant: ["tabular-nums"],
  },
  kpiSub: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.subtle, marginTop: 4 },

  // Card
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border,
    padding: 16, ...Shadow.sm,
  },
  cardTitle: {
    fontSize: 14, fontFamily: Fonts.bold, color: Colors.text,
    marginBottom: 4,
  },
  cardSub: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.subtle, marginBottom: 12 },

  // Bar chart
  bars: { flexDirection: "row", alignItems: "flex-end", height: 80, gap: 4, marginTop: 8 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  barTrack: { flex: 1, width: "100%", borderRadius: 4, overflow: "hidden", justifyContent: "flex-end" },
  barFill: { width: "100%", borderRadius: 4 },
  barLabel: { fontSize: 8, fontFamily: Fonts.mono, color: Colors.subtle },

  // Payment methods
  pmRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  pmDot: { width: 8, height: 8, borderRadius: 4 },
  pmName: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.text, width: 72 },
  pmBarTrack: { flex: 1, height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: "hidden" },
  pmBarFill: { height: "100%", borderRadius: 3 },
  pmVal: { fontSize: 11, fontFamily: Fonts.mono, color: Colors.dim, width: 80, textAlign: "right" },

  // Sale row
  saleRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingVertical: 10,
  },
  saleRowBorder: { borderBottomWidth: 1, borderColor: Colors.border },
  pmBadge: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  pmBadgeText: { fontSize: 9, fontFamily: Fonts.monoBold, letterSpacing: 0.5 },
  saleName: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.text },
  saleItems: { fontSize: 11, fontFamily: Fonts.regular, color: Colors.subtle, marginTop: 1 },
  saleTotal: {
    fontSize: 13, fontFamily: Fonts.bold, color: Colors.text,
    fontVariant: ["tabular-nums"],
  },
  saleDate: { fontSize: 10, fontFamily: Fonts.mono, color: Colors.subtle, marginTop: 1 },

  // Caja - session
  sessionCard: {
    borderRadius: Radius.lg, padding: 20, overflow: "hidden",
    marginBottom: 12,
  },
  sessionAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 3, borderRadius: Radius.lg },
  sessionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },
  sessionDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: "#10b981",
  },
  sessionStatus: { fontSize: 12, fontFamily: Fonts.semibold, color: "rgba(255,255,255,0.7)" },
  sessionTime: { fontSize: 11, fontFamily: Fonts.mono, color: "rgba(255,255,255,0.4)", marginLeft: "auto" },
  sessionBalance: {
    fontSize: 32, fontFamily: Fonts.bold, color: Colors.white,
    letterSpacing: -1, fontVariant: ["tabular-nums"],
  },
  sessionBalanceLabel: { fontSize: 11, fontFamily: Fonts.mono, color: "rgba(255,255,255,0.45)", letterSpacing: 1, textTransform: "uppercase", marginTop: 2 },
  sessionBreakdown: { flexDirection: "row", marginTop: 18, paddingTop: 16, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.10)" },
  sessionItem: { flex: 1, alignItems: "center" },
  sessionItemLabel: { fontSize: 9, fontFamily: Fonts.mono, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  sessionItemVal: { fontSize: 14, fontFamily: Fonts.bold, fontVariant: ["tabular-nums"] },

  // Quick actions
  quickRow: {
    flexDirection: "row", gap: 10, marginBottom: 12,
  },
  quickBtn: {
    flex: 1, alignItems: "center", backgroundColor: Colors.white,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    paddingVertical: 14, gap: 6, ...Shadow.sm,
  },
  quickIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.text },

  // Movement row
  moveRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  moveIcon: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  movDesc: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.text },
  movTime: { fontSize: 10, fontFamily: Fonts.mono, color: Colors.subtle, marginTop: 1 },
  movAmount: { fontSize: 13, fontFamily: Fonts.bold, fontVariant: ["tabular-nums"] },

  // Filter
  filterRow: { marginBottom: 10 },
  filterPills: { flexDirection: "row", backgroundColor: "rgba(20,15,30,0.04)", padding: 4, borderRadius: 12, alignSelf: "flex-start", gap: 2 },
  filterPillsH: { flexDirection: "row", gap: 6 },
  pill: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 8 },
  pillActive: { backgroundColor: Colors.ink },
  pillText: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.dim },
  pillTextActive: { color: Colors.white },
  pmPill: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    backgroundColor: "rgba(20,15,30,0.04)",
    borderWidth: 1.5, borderColor: "transparent",
  },
  pmPillText: { fontSize: 12, fontFamily: Fonts.semibold, color: Colors.dim },

  summaryRow: {},
  summaryText: { fontSize: 13, fontFamily: Fonts.regular, color: Colors.subtle },
  summaryBold: { fontFamily: Fonts.bold, color: Colors.text },

  // Service bar
  serviceRow: { marginBottom: 0 },
  serviceTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  serviceName: { fontSize: 13, fontFamily: Fonts.semibold, color: Colors.text, flex: 1 },
  serviceVal: { fontSize: 13, fontFamily: Fonts.bold, color: Colors.text, fontVariant: ["tabular-nums"] },
  serviceTrack: { height: 5, backgroundColor: Colors.border, borderRadius: 4, overflow: "hidden" },
  serviceFill: { height: "100%", borderRadius: 4 },

  // Margin bar
  marginBar: { height: 12, borderRadius: 6, overflow: "hidden", flexDirection: "row", marginVertical: 14 },
  marginFill: { height: "100%" },
  marginCost: { backgroundColor: Colors.border, height: "100%" },
  marginLegend: { flexDirection: "row", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontFamily: Fonts.regular, color: Colors.dim },

  // Professional
  profAvatar: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.border,
    alignItems: "center", justifyContent: "center",
  },
  profInitial: { fontSize: 14, fontFamily: Fonts.bold, color: Colors.dim },
});
