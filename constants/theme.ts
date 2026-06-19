// ── Zyncra Mobile — design system espejo del panel admin web ──
// Tipos: Space Grotesk (UI) · JetBrains Mono (datos/etiquetas)
// Una sola firma de gradiente por vista; tinta sobre lienzo claro.

export const Colors = {
  red:     "#fb0f05",
  blue:    "#0027fe",
  purple:  "#0027fe",           // mapped to blue — no more purple in brand
  // Backgrounds
  cream:   "#FFFFFF",
  cream2:  "#F4F4F9",           // lienzo del panel
  bg:      "#FFFFFF",
  bgElev:  "#F4F4F9",
  // Dark surface (sidebar / tab bar / hero)
  ink:     "#0C0C14",
  inkSoft: "#15151F",
  // Borders
  border:  "rgba(20,15,30,0.08)",
  borderStrong: "rgba(20,15,30,0.16)",
  // Text
  text:    "#14111C",
  dim:     "#564E66",
  muted:   "#564E66",
  subtle:  "#8E879B",
  white:   "#ffffff",
  success: "#10b981",
  warning: "#f59e0b",
  card:    "#ffffff",
};

export const Gradients = {
  brand:     ["#fb0f05", "#0027fe"] as const,
  brandH:    ["#fb0f05", "#0027fe"] as const,
  brandSoft: ["rgba(251,15,5,0.10)", "rgba(0,39,254,0.05)"] as const,
  ink:       ["#15151F", "#0C0C14"] as const,
};

export const Fonts = {
  regular:  "SpaceGrotesk_400Regular",
  medium:   "SpaceGrotesk_600SemiBold",
  semibold: "SpaceGrotesk_600SemiBold",
  bold:     "SpaceGrotesk_700Bold",
  mono:     "JetBrainsMono_500Medium",
  monoBold: "JetBrainsMono_700Bold",
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 999,
};

export const Shadow = {
  sm: {
    shadowColor: "#14111C",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#14111C",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: "#14111C",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
  red: {
    shadowColor: "#fb0f05",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
};

// ── Presets compartidos (espejo de admin.module.css) ──

// Etiqueta mono uppercase: .statLabel / .headerCrumb del panel web
export const MonoLabel = {
  fontFamily: Fonts.mono,
  fontSize: 10,
  letterSpacing: 1.2,
  textTransform: "uppercase" as const,
  color: Colors.subtle,
};

// Card blanca con hairline: .listCard / .statCard del panel web
export const Card = {
  backgroundColor: Colors.white,
  borderRadius: Radius.lg,
  borderWidth: 1,
  borderColor: Colors.border,
  ...Shadow.sm,
};

// Header de pantalla: lienzo claro, título en tinta (reemplaza el gradiente full-bleed)
export const ScreenHeader = {
  title: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: Colors.text,
    letterSpacing: -0.6,
  },
  crumb: {
    ...MonoLabel,
    fontSize: 9,
    marginBottom: 4,
  },
  sub: {
    fontSize: 13,
    fontFamily: Fonts.regular,
    color: Colors.muted,
    marginTop: 2,
  },
};
