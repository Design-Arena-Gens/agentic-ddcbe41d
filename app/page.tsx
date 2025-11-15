"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Tooltip,
  Typography
} from "@mui/material";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import GraphicEqRoundedIcon from "@mui/icons-material/GraphicEqRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import PlayCircleFilledRoundedIcon from "@mui/icons-material/PlayCircleFilledRounded";
import CloudRoundedIcon from "@mui/icons-material/CloudRounded";
import LinkRoundedIcon from "@mui/icons-material/LinkRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import AudiotrackRoundedIcon from "@mui/icons-material/AudiotrackRounded";
import { useMaterialTheme } from "@/components/MaterialThemeProvider";

type SessionState = {
  sessionKey: string;
  username: string;
};

type PendingSession = {
  token: string;
  issuedAt: number;
} | null;

type HistoryEntry = {
  id: string;
  artist: string;
  track: string;
  album?: string;
  createdAt: number;
  timestamp: number;
  type: "scrobble" | "nowPlaying";
};

const SESSION_STORAGE_KEY = "aurora_lastfm_session";
const HISTORY_STORAGE_KEY = "aurora_scrobble_history";

export default function HomePage() {
  const { seedColor, setSeedColor, mode, setMode } = useMaterialTheme();
  const [session, setSession] = useState<SessionState | null>(null);
  const [pendingSession, setPendingSession] = useState<PendingSession>(null);
  const [scrobbleForm, setScrobbleForm] = useState({
    artist: "",
    track: "",
    album: "",
    duration: "",
    trackNumber: ""
  });
  const [timestampMode, setTimestampMode] = useState<"now" | "custom">("now");
  const [customTimestamp, setCustomTimestamp] = useState(
    () => new Date().toISOString().slice(0, 16)
  );
  const [isScrobbling, setIsScrobbling] = useState(false);
  const [isUpdatingNowPlaying, setIsUpdatingNowPlaying] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    message: string;
    severity: "success" | "error" | "info";
  } | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
    const storedHistory = window.localStorage.getItem(HISTORY_STORAGE_KEY);

    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as SessionState;
        if (parsed.sessionKey && parsed.username) {
          setSession(parsed);
        }
      } catch {
        // ignore malformed storage data
      }
    }

    if (storedHistory) {
      try {
        const parsed = JSON.parse(storedHistory) as HistoryEntry[];
        setHistory(parsed);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (session) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [session]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
  }, [history]);

  const isConnected = Boolean(session?.sessionKey);

  const connectionLabel = useMemo(() => {
    if (isConnected) {
      return `Connected as ${session?.username}`;
    }
    if (pendingSession?.token) {
      return "Authorization pending";
    }
    return "Not connected";
  }, [isConnected, session?.username, pendingSession?.token]);

  const scrobbleTimestamp = useMemo(() => {
    if (timestampMode === "now") {
      return Math.floor(Date.now() / 1000);
    }
    const parsed = Date.parse(customTimestamp);
    return Number.isNaN(parsed)
      ? Math.floor(Date.now() / 1000)
      : Math.floor(parsed / 1000);
  }, [timestampMode, customTimestamp]);

  const handleConnect = async () => {
    try {
      const response = await fetch("/api/auth/token");
      if (!response.ok) {
        throw new Error("Failed to obtain request token");
      }
      const data = (await response.json()) as { token: string; authUrl: string };
      setPendingSession({ token: data.token, issuedAt: Date.now() });
      window.open(data.authUrl, "_blank", "noopener");
      setSnackbar({
        message: "Authorize Aurora Scrobbler in the Last.fm window.",
        severity: "info"
      });
    } catch (error) {
      console.error(error);
      setSnackbar({
        message: "Unable to start Last.fm authentication.",
        severity: "error"
      });
    }
  };

  const handleCompleteConnection = async () => {
    if (!pendingSession?.token) {
      setSnackbar({
        message: "Start authentication first.",
        severity: "info"
      });
      return;
    }
    try {
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ token: pendingSession.token })
      });

      if (!response.ok) {
        throw new Error("Failed to obtain Last.fm session");
      }

      const data = (await response.json()) as {
        sessionKey: string;
        username: string;
      };

      setSession(data);
      setPendingSession(null);
      setSnackbar({
        message: `Connected to Last.fm as ${data.username}.`,
        severity: "success"
      });
    } catch (error) {
      console.error(error);
      setSnackbar({
        message: "Unable to complete Last.fm connection.",
        severity: "error"
      });
    }
  };

  const handleDisconnect = () => {
    setSession(null);
    setSnackbar({
      message: "Disconnected from Last.fm.",
      severity: "info"
    });
  };

  const validateForm = () => {
    return scrobbleForm.artist.trim().length > 0 && scrobbleForm.track.trim().length > 0;
  };

  const handleScrobble = async () => {
    if (!isConnected || !session) {
      setSnackbar({
        message: "Connect to Last.fm before scrobbling.",
        severity: "info"
      });
      return;
    }

    if (!validateForm()) {
      setSnackbar({
        message: "Track and artist are required.",
        severity: "info"
      });
      return;
    }

    setIsScrobbling(true);
    try {
      const response = await fetch("/api/scrobble", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          artist: scrobbleForm.artist,
          track: scrobbleForm.track,
          album: scrobbleForm.album || undefined,
          duration: scrobbleForm.duration || undefined,
          trackNumber: scrobbleForm.trackNumber || undefined,
          timestamp: scrobbleTimestamp,
          sessionKey: session.sessionKey
        })
      });

      if (!response.ok) {
        throw new Error("Failed to scrobble track");
      }

      addHistoryEntry("scrobble");

      setSnackbar({
        message: "Track scrobbled to Last.fm.",
        severity: "success"
      });
    } catch (error) {
      console.error(error);
      setSnackbar({
        message: "Scrobble failed. Try again.",
        severity: "error"
      });
    } finally {
      setIsScrobbling(false);
    }
  };

  const handleNowPlaying = async () => {
    if (!isConnected || !session) {
      setSnackbar({
        message: "Connect to Last.fm before updating Now Playing.",
        severity: "info"
      });
      return;
    }

    if (!validateForm()) {
      setSnackbar({
        message: "Track and artist are required.",
        severity: "info"
      });
      return;
    }

    setIsUpdatingNowPlaying(true);
    try {
      const response = await fetch("/api/now-playing", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          artist: scrobbleForm.artist,
          track: scrobbleForm.track,
          album: scrobbleForm.album || undefined,
          duration: scrobbleForm.duration || undefined,
          sessionKey: session.sessionKey
        })
      });

      if (!response.ok) {
        throw new Error("Failed to update now playing");
      }

      addHistoryEntry("nowPlaying");

      setSnackbar({
        message: "Now Playing updated on Last.fm.",
        severity: "success"
      });
    } catch (error) {
      console.error(error);
      setSnackbar({
        message: "Unable to update Now Playing.",
        severity: "error"
      });
    } finally {
      setIsUpdatingNowPlaying(false);
    }
  };

  const addHistoryEntry = (type: HistoryEntry["type"]) => {
    setHistory((prev) => {
      const entry: HistoryEntry = {
        id: createRandomId(),
        artist: scrobbleForm.artist,
        track: scrobbleForm.track,
        album: scrobbleForm.album || undefined,
        createdAt: Date.now(),
        timestamp: scrobbleTimestamp,
        type
      };
      const nextHistory = [entry, ...prev].slice(0, 50);
      return nextHistory;
    });
  };

  const clearHistory = () => {
    setHistory([]);
    setSnackbar({
      message: "History cleared.",
      severity: "info"
    });
  };

  return (
    <Box
      sx={{
        position: "relative",
        minHeight: "100vh",
        py: { xs: 6, md: 10 },
        background: (theme) =>
          `radial-gradient(circle at 20% -10%, ${theme.palette.primary.main}33, transparent 55%), radial-gradient(circle at 90% 10%, ${theme.palette.secondary.main}22, transparent 60%)`
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(160deg, rgba(14,10,25,0.92) 0%, rgba(12,4,24,0.88) 45%, rgba(6,3,12,0.9) 100%)",
          zIndex: 0
        }}
      />
      <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
        <Stack spacing={4}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={3}
          >
            <Box>
              <Chip
                icon={<GraphicEqRoundedIcon />}
                label="Material expressive scrobbler"
                color="secondary"
                sx={{ mb: 2 }}
              />
              <Typography variant="h2" component="h1" sx={{ mb: 1 }}>
                Aurora Scrobbler
              </Typography>
              <Typography variant="h6" sx={{ color: "text.secondary", maxWidth: 600 }}>
                Capture every moment of your listening with a vibrant, Material expressive
                interface designed for Last.fm superfans.
              </Typography>
            </Box>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                color={isConnected ? "success" : pendingSession ? "warning" : "default"}
                variant={isConnected ? "filled" : "outlined"}
                icon={
                  isConnected ? (
                    <CheckCircleRoundedIcon />
                  ) : pendingSession ? (
                    <AccessTimeRoundedIcon />
                  ) : (
                    <CloudRoundedIcon />
                  )
                }
                label={connectionLabel}
                sx={{ fontWeight: 600 }}
              />
            </Stack>
          </Stack>

          <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
              <Stack spacing={3}>
                <Card>
                  <Stack spacing={2}>
                    <Typography variant="h5" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <AudiotrackRoundedIcon fontSize="small" />
                      Scrobble a track
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Artist"
                          fullWidth
                          required
                          value={scrobbleForm.artist}
                          onChange={(event) =>
                            setScrobbleForm((prev) => ({ ...prev, artist: event.target.value }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Track"
                          fullWidth
                          required
                          value={scrobbleForm.track}
                          onChange={(event) =>
                            setScrobbleForm((prev) => ({ ...prev, track: event.target.value }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Album (optional)"
                          fullWidth
                          value={scrobbleForm.album}
                          onChange={(event) =>
                            setScrobbleForm((prev) => ({ ...prev, album: event.target.value }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Duration (sec)"
                          type="number"
                          fullWidth
                          value={scrobbleForm.duration}
                          onChange={(event) =>
                            setScrobbleForm((prev) => ({ ...prev, duration: event.target.value }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <TextField
                          label="Track #"
                          fullWidth
                          value={scrobbleForm.trackNumber}
                          onChange={(event) =>
                            setScrobbleForm((prev) => ({
                              ...prev,
                              trackNumber: event.target.value
                            }))
                          }
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={2}
                          alignItems={{ xs: "flex-start", sm: "center" }}
                        >
                          <FormControlLabel
                            control={
                              <Switch
                                checked={timestampMode === "custom"}
                                onChange={(event) =>
                                  setTimestampMode(event.target.checked ? "custom" : "now")
                                }
                              />
                            }
                            label="Scrobble at custom time"
                          />
                          {timestampMode === "custom" ? (
                            <TextField
                              type="datetime-local"
                              value={customTimestamp}
                              onChange={(event) => setCustomTimestamp(event.target.value)}
                              InputLabelProps={{ shrink: true }}
                              size="small"
                            />
                          ) : (
                            <Chip
                              variant="outlined"
                              icon={<AccessTimeRoundedIcon />}
                              label="Using current time"
                            />
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      spacing={2}
                      justifyContent="flex-end"
                    >
                      <Button
                        variant="outlined"
                        size="large"
                        onClick={handleNowPlaying}
                        disabled={isUpdatingNowPlaying}
                        startIcon={<PlayCircleFilledRoundedIcon />}
                      >
                        {isUpdatingNowPlaying ? "Updating..." : "Update Now Playing"}
                      </Button>
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleScrobble}
                        disabled={isScrobbling}
                      >
                        {isScrobbling ? "Scrobbling..." : "Scrobble to Last.fm"}
                      </Button>
                    </Stack>
                  </Stack>
                </Card>

                <Card>
                  <Stack spacing={3}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <HistoryRoundedIcon fontSize="small" />
                      <Typography variant="h6">Recent activity</Typography>
                      <Box flexGrow={1} />
                      <Button variant="text" size="small" onClick={clearHistory}>
                        Clear history
                      </Button>
                    </Stack>
                    {history.length === 0 ? (
                      <Typography color="text.secondary">
                        Scrobble tracks or update Now Playing to see your activity stream.
                      </Typography>
                    ) : (
                      <Stack spacing={2}>
                        {history.map((item) => (
                          <Stack
                            key={item.id}
                            direction="row"
                            spacing={2}
                            alignItems={{ xs: "flex-start", sm: "center" }}
                          >
                            <Chip
                              size="small"
                              color={item.type === "scrobble" ? "primary" : "secondary"}
                              label={item.type === "scrobble" ? "Scrobbled" : "Now playing"}
                            />
                            <Box flexGrow={1}>
                              <Typography fontWeight={600}>
                                {item.track} &mdash; {item.artist}
                              </Typography>
                              {item.album && (
                                <Typography variant="body2" color="text.secondary">
                                  {item.album}
                                </Typography>
                              )}
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {formatRelativeTime(item.createdAt)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Grid>
            <Grid item xs={12} md={5}>
              <Stack spacing={3}>
                <Card>
                  <Stack spacing={2}>
                    <Typography variant="h6">Last.fm connection</Typography>
                    <Typography color="text.secondary">
                      Authenticate with Last.fm to start scrobbling. Aurora stores your session key
                      locally so you stay signed in.
                    </Typography>
                    <Stack direction="row" spacing={2} flexWrap="wrap">
                      <Button
                        variant="contained"
                        onClick={handleConnect}
                        endIcon={<LinkRoundedIcon />}
                      >
                        Connect to Last.fm
                      </Button>
                      <Button variant="outlined" onClick={handleCompleteConnection}>
                        Complete connection
                      </Button>
                      {isConnected && (
                        <Button variant="text" color="secondary" onClick={handleDisconnect}>
                          Disconnect
                        </Button>
                      )}
                    </Stack>
                    <Divider sx={{ my: 1 }} />
                    <Stack spacing={1}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Status
                      </Typography>
                      <Typography fontWeight={600}>{connectionLabel}</Typography>
                      {pendingSession?.issuedAt && (
                        <Typography variant="body2" color="text.secondary">
                          Token generated {formatRelativeTime(pendingSession.issuedAt)}
                        </Typography>
                      )}
                      <Typography variant="body2" color="text.secondary">
                        After authorizing on Last.fm, return here and choose &ldquo;Complete
                        connection&rdquo; to finalize the session.
                      </Typography>
                    </Stack>
                  </Stack>
                </Card>

                <Card>
                  <Stack spacing={2}>
                    <Typography variant="h6">Material expressive mood</Typography>
                    <Typography color="text.secondary">
                      Personalize your palette to mirror your album art or mood. Aurora adapts the
                      theme instantly using Material expressive principles.
                    </Typography>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Tooltip title="Pick an accent tone">
                        <Box
                          component="input"
                          type="color"
                          value={seedColor}
                          onChange={(event: ChangeEvent<HTMLInputElement>) =>
                            setSeedColor(event.target.value)
                          }
                          sx={{
                            width: 56,
                            height: 56,
                            border: "none",
                            borderRadius: "18px",
                            padding: 0,
                            cursor: "pointer",
                            boxShadow: (theme) => theme.shadows[2]
                          }}
                        />
                      </Tooltip>
                      <Typography variant="body2" color="text.secondary">
                        Accent
                      </Typography>
                    </Stack>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={mode === "dark"}
                          onChange={(event) => setMode(event.target.checked ? "dark" : "light")}
                        />
                      }
                      label={
                        <Stack direction="row" spacing={1} alignItems="center">
                          {mode === "dark" ? (
                            <DarkModeRoundedIcon fontSize="small" />
                          ) : (
                            <LightModeRoundedIcon fontSize="small" />
                          )}
                          <Typography>{mode === "dark" ? "Dark mode" : "Light mode"}</Typography>
                        </Stack>
                      }
                    />
                  </Stack>
                </Card>

                <Card>
                  <Stack spacing={2}>
                    <Typography variant="h6">Tips for better scrobbles</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Fill in duration for accurate listening time analytics. Use the custom time
                      switch when logging past plays.
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Aurora keeps your session key and history on this device only. Clear history
                      anytime using the button above.
                    </Typography>
                  </Stack>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        </Stack>
      </Container>
      {snackbar ? (
        <Snackbar
          open
          autoHideDuration={6000}
          onClose={() => setSnackbar(null)}
          anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        >
          <Alert
            onClose={() => setSnackbar(null)}
            severity={snackbar.severity}
            variant="filled"
            sx={{ width: "100%" }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      ) : null}
    </Box>
  );
}

function formatRelativeTime(timestamp: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return "just now";
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ago`;
  }
  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hr${hours > 1 ? "s" : ""} ago`;
  }
  const days = Math.floor(seconds / 86400);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function createRandomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}
