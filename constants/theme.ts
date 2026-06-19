export const Colors = {
  red:     "#fb0f05",
  blue:    "#0027fe",
  purple:  "#0027fe",           // mapped to blue — no more purple in brand
  // Backgrounds
  cream:   "#FFFFFF",           // was: #fdfcfa
  cream2:  "#F4F4F9",           // was: #f5f4f2
  bg:      "#FFFFFF",
  bgElev:  "#F4F4F9",
  // Borders
  border:  "rgba(20,15,30,0.08)",       // was: #e8e6e2
  borderStrong: "rgba(20,15,30,0.16)",
  // Text
  text:    "#14111C",           // was: #111118
  dim:     "#564E66",
  muted:   "#564E66",           // was: #6b6b80
  subtle:  "#8E879B",           // was: #a0a0b0
  white:   "#ffffff",
  success: "#10b981",           // was: #16a34a
  card:    "#ffffff",
};

export const Gradients = {
  brand:     ["#fb0f05", "#0027fe"] as const,
  brandH:    ["#fb0f05", "#0027fe"] as const,
  brandSoft: ["rgba(251,15,5,0.10)", "rgba(0,39,254,0.05)"] as const,
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
  red: {
    shadowColor: "#fb0f05",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const Glass = {
  card: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.6)",
  },
  cardStrong: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.75)",
  },
  dark: {
    backgroundColor: "rgba(20,17,28,0.35)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  blur: {
    tint: "light" as const,
    intensity: 60,
  },
  blurStrong: {
    tint: "light" as const,
    intensity: 85,
  },
};
