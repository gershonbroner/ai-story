import { useEffect, useMemo, useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Stack,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  Alert,
  Chip,
  Divider,
  Box,
  CircularProgress,
  CssBaseline,
} from "@mui/material";
import Grid from "@mui/material/Grid"; // או: import { Grid } from "@mui/material"
import { createTheme, ThemeProvider } from "@mui/material/styles";
import SearchIcon from "@mui/icons-material/Search";
import SendIcon from "@mui/icons-material/Send";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";

// ---------- Types ----------
type Story = {
  id: number;
  prompt: string;
  story: string;
  created_at: string;
};

const API_BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";

// ---------- Small helpers ----------
const fmt = (iso: string) => new Date(iso).toLocaleString();

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [generated, setGenerated] = useState<Story | null>(null);
  const [query, setQuery] = useState("");

  // ---- Theme (quick, clean) ----
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: "light",
          primary: { main: "#6d28d9" }, // purple-600 vibe
          secondary: { main: "#0ea5e9" },
        },
        shape: { borderRadius: 14 },
        typography: {
          fontFamily:
            "Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
        },
        components: {
          MuiCard: {
            styleOverrides: {
              root: { boxShadow: "0 8px 30px rgba(0,0,0,0.06)" },
            },
          },
          MuiButton: { defaultProps: { disableElevation: true } },
        },
      }),
    []
  );

  // ---- Load recent stories ----
  const loadStories = async () => {
    try {
      setFetching(true);
      const res = await fetch(`${API_BASE}/api/story`);
      if (!res.ok) throw new Error("Failed to load stories");
      const data: Story[] = await res.json();
      setStories(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, []);

  // ---- Generate new story ----
  const onGenerate = async () => {
    const p = prompt.trim();
    if (!p) return;
    setLoading(true);
    setError(null);
    setGenerated(null);
    try {
      const res = await fetch(`${API_BASE}/api/story`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Server error");
      }
      const data: Story = await res.json();
      setGenerated(data);
      setStories((prev) => [data, ...prev]);
      setPrompt("");
    } catch (e: any) {
      setError(e.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter(
      (s) =>
        s.prompt.toLowerCase().includes(q) || s.story.toLowerCase().includes(q)
    );
  }, [stories, query]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // ignore
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar
        position="sticky"
        color="inherit"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            AI Story Generator
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            onClick={loadStories}
            disabled={fetching}
          >
            {fetching ? "טוען..." : "רענן"}
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="md" sx={{ py: 4 }}>
        {/* Composer */}
        <Card>
          <CardHeader
            title="צור סיפור חדש"
            subheader="הקלד נושא, שלח, וקבל סיפור שנשמר בבסיס הנתונים"
          />
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                fullWidth
                label="על איזה נושא לכתוב סיפור?"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onGenerate()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                size="large"
                onClick={onGenerate}
                disabled={loading || !prompt.trim()}
                endIcon={
                  loading ? <CircularProgress size={18} /> : <SendIcon />
                }
              >
                {loading ? "יוצר" : "צור סיפור"}
              </Button>
            </Stack>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Latest generated */}
        {generated && (
          <Card sx={{ mt: 3, borderLeft: 4, borderColor: "primary.main" }}>
            <CardHeader
              title="סיפור שנוצר עכשיו"
              action={
                <Stack direction="row" spacing={1}>
                  <Chip label={fmt(generated.created_at)} size="small" />
                  <IconButton
                    onClick={() => handleCopy(generated.story)}
                    aria-label="העתק"
                  >
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Stack>
              }
              subheader={`נושא: ${generated.prompt}`}
            />
            <CardContent>
              <Typography whiteSpace="pre-wrap">{generated.story}</Typography>
            </CardContent>
          </Card>
        )}

        {/* Divider with search */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ mt: 4, mb: 2 }}
          alignItems="center"
        >
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            סיפורים אחרונים
          </Typography>
          <TextField
            size="small"
            placeholder="חיפוש לפי נושא/תוכן"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </Stack>
        <Divider />

        {/* Stories list */}
        <Box sx={{ mt: 2 }}>
          {fetching && (
            <Stack spacing={2}>
              <SkeletonRow />
              <SkeletonRow />
            </Stack>
          )}

          {!fetching && filtered.length === 0 && (
            <Alert severity="info">אין סיפורים עדיין, נסה ליצור אחד חדש.</Alert>
          )}

          <Grid container spacing={2}>
            {filtered.map((s) => (
              <Grid size={12} key={s.id}>
                <Card variant="outlined">
                  <CardHeader
                    title={
                      <Typography variant="subtitle1" fontWeight={700}>
                        נושא: {s.prompt}
                      </Typography>
                    }
                    subheader={
                      <Typography variant="caption">
                        נוצר: {fmt(s.created_at)}
                      </Typography>
                    }
                    action={
                      <IconButton
                        onClick={() => handleCopy(s.story)}
                        aria-label="העתק"
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    }
                  />
                  <CardContent>
                    <Typography whiteSpace="pre-wrap" color="text.secondary">
                      {s.story}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Container>
    </ThemeProvider>
  );
}

function SkeletonRow() {
  return (
    <Card>
      <CardContent>
        <Stack spacing={1}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: "30%",
                height: 16,
                bgcolor: "action.hover",
                borderRadius: 1,
              }}
            />
            <Box
              sx={{
                width: 120,
                height: 14,
                bgcolor: "action.hover",
                borderRadius: 1,
              }}
            />
          </Box>
          <Box
            sx={{
              width: "100%",
              height: 12,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          />
          <Box
            sx={{
              width: "92%",
              height: 12,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          />
          <Box
            sx={{
              width: "85%",
              height: 12,
              bgcolor: "action.hover",
              borderRadius: 1,
            }}
          />
        </Stack>
      </CardContent>
    </Card>
  );
}
