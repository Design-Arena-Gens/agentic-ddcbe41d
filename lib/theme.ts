import { PaletteMode } from "@mui/material";
import { Theme, alpha, createTheme, darken, lighten } from "@mui/material/styles";

const fallbackLightBg = "#f3f3f9";
const fallbackDarkBg = "#070312";

export function createExpressiveTheme(seedColor: string, mode: PaletteMode): Theme {
  const normalizedSeed = validateColor(seedColor);
  const primaryLight = lightenSafe(normalizedSeed, 0.18);
  const primaryDark = darkenSafe(normalizedSeed, 0.22);

  const base = createTheme({
    palette: {
      mode,
      primary: {
        main: normalizedSeed,
        light: primaryLight,
        dark: primaryDark,
        contrastText: mode === "light" ? "#fff" : "#050208"
      },
      secondary: {
        main:
          mode === "light"
            ? darkenSafe(normalizedSeed, 0.32)
            : lightenSafe(normalizedSeed, 0.3),
        contrastText: mode === "light" ? "#0c0520" : "#f8f7ff"
      },
      background: {
        default: mode === "light" ? fallbackLightBg : fallbackDarkBg,
        paper:
          mode === "light"
            ? alpha("#ffffff", 0.9)
            : alpha(lightenSafe("#0b041a", 0.08), 0.85)
      },
      divider:
        mode === "light"
          ? alpha(darkenSafe(normalizedSeed, 0.4), 0.12)
          : alpha(lightenSafe(normalizedSeed, 0.45), 0.2)
    },
    typography: {
      fontFamily:
        "'Google Sans', 'Roboto', 'Inter', 'SF Pro Display', system-ui, sans-serif",
      h1: {
        fontWeight: 600,
        letterSpacing: "-0.02em"
      },
      h2: {
        fontWeight: 600,
        letterSpacing: "-0.02em"
      },
      h3: {
        fontWeight: 600
      },
      button: {
        textTransform: "none",
        fontWeight: 600
      }
    },
    shape: {
      borderRadius: 18
    }
  });

  return createTheme(base, {
    components: {
      MuiPaper: {
        defaultProps: {
          elevation: 0,
          variant: "elevation"
        },
        styleOverrides: {
          root: {
            backdropFilter: "blur(14px)",
            backgroundImage:
              mode === "light"
                ? "linear-gradient(135deg, rgba(255,255,255,0.82), rgba(247,245,255,0.6))"
                : "linear-gradient(135deg, rgba(24,12,55,0.65), rgba(10,4,35,0.55))",
            border: `1px solid ${alpha(
              mode === "light"
                ? darkenSafe(normalizedSeed, 0.45)
                : lightenSafe(normalizedSeed, 0.5),
              0.12
            )}`
          }
        }
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            paddingInline: "1.25rem",
            paddingBlock: "0.65rem",
            transition: "transform 0.2s ease, box-shadow 0.2s ease",
            fontWeight: 600
          },
          contained: ({ theme }: { theme: Theme }) => ({
            boxShadow: theme.shadows[3],
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: theme.shadows[6]
            }
          })
        }
      },
      MuiCard: {
        defaultProps: {
          elevation: 0
        },
        styleOverrides: {
          root: {
            borderRadius: 26,
            padding: "1.75rem"
          }
        }
      },
      MuiSwitch: {
        styleOverrides: {
          switchBase: {
            "&.Mui-checked": {
              transform: "translateX(18px)"
            }
          },
          track: {
            borderRadius: 999
          }
        }
      }
    },
    shadows: [
      "none",
      "0 1px 2px rgba(12, 5, 20, 0.08)",
      "0 2px 6px rgba(12, 5, 20, 0.1)",
      "0 4px 12px rgba(12, 5, 20, 0.12)",
      "0 6px 20px rgba(12, 5, 20, 0.14)",
      "0 10px 28px rgba(12, 5, 20, 0.16)",
      ...Array(19).fill("0 10px 34px rgba(12, 5, 20, 0.18)")
    ]
  });
}

function validateColor(color: string): string {
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
    return color;
  }
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) {
    return color
      .split("")
      .map((char) => (char === "#" ? "#" : char + char))
      .join("");
  }
  return "#6750a4";
}

function lightenSafe(color: string, amount: number) {
  try {
    return lighten(color, amount);
  } catch {
    return color;
  }
}

function darkenSafe(color: string, amount: number) {
  try {
    return darken(color, amount);
  } catch {
    return color;
  }
}
