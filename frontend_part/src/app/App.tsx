import { useState, useEffect, useRef, useCallback } from "react";
import {
  ChevronDown, Sparkles, ShoppingBag, Bookmark,
  Camera, Upload, Search, ArrowLeft, TrendingUp,
  Eye, CheckCircle, MessageCircle, MapPin, BarChart2,
  Users, Star, Zap, Plus, Pencil, X
} from "lucide-react";
import loginHeroImage from "../imports/saree_image.jpg";
import { apiFetch, apiUrl, parseJsonSafe } from "../lib/api";

type Screen = "login" | "dashboard" | "customer" | "catalog" | "camera" | "processing" | "result" | "comparison";

type ComparisonTrial = {
  id: string;
  name: string;
  price: string;
  color?: string;
  image: string;
  createdAt: string;
};

type CustomerProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  address: string;
  countryCode: string;
  state: string;
  occasion?: string;
  recentTrails: Array<{ id: string; name: string; price: string; addedAt: string; image?: string }>;
  purchasedItems: Array<{ id: string; name: string; price: string; addedAt: string }>;
  createdAt: string;
  lastSeen: string;
};

const statusMessages = [
  "Mapping fabric physics and aligning pleats perfectly...",
  "Analysing drape fall and silk texture gradients...",
  "Calibrating border embroidery to body contours...",
  "Rendering light interaction across zari weave...",
  "Finalising your virtual drape...",
];

// ─── Shared style constants ───────────────────────────────────────────────────
const BURGUNDY = "#4A0E17";
const CREAM = "#FDFBF7";
const GOLD = "#D4AF37";

const KAMBI_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='68' height='34' viewBox='0 0 68 34'%3E%3Cg fill='none' stroke='%23C9A227' stroke-width='1.6'%3E%3Cpath d='M0 17 L17 3 L34 17 L17 31 Z'/%3E%3Ccircle cx='17' cy='17' r='3.4' fill='%23C9A227' stroke='none'/%3E%3Cpath d='M34 17 L51 3 L68 17 L51 31 Z'/%3E%3Ccircle cx='51' cy='17' r='3.4' fill='%23C9A227' stroke='none'/%3E%3C/g%3E%3C/svg%3E";

const COLORS = {
  mulberry: "#5C1A2B",
  mulberryDark: "#3A0F1C",
  zari: "#C9A227",
  zariLight: "#E8C766",
  ivory: "#F6F0E4",
  ivoryDim: "#EDE4D2",
  ink: "#2B2018",
  inkSoft: "#6B5D51",
  teal: "#1F4B4A",
  error: "#A23B2E",
};

const CLUSTERS = ["Kanchipuram", "Banaras", "Mysore", "Pochampally"];

const ROLE_CONFIG = {
  vendor: {
    tabLabel: "Vendor",
    eyebrow: "Vendor Portal",
    tagline: "For the weavers, agents, and finishing units behind every silk saree in the catalog.",
  },
  customer: {
    tabLabel: "Customer",
    eyebrow: "Customer Login",
    tagline: "Browse the collection, track orders, and revisit the drapes you've saved.",
    heading: "Sign in to your account",
    subheading: "Track orders and manage your saved sarees.",
    identifierLabel: "Email or Phone Number",
    identifierPlaceholder: "e.g. you@email.com or 98765 43210",
    identifierError: "Enter your email or phone number.",
    registerText: "New here?",
    registerLink: "Create an account",
  },
};


const inputShellStyle = (hasError: boolean) => ({
  borderBottom: `1.5px solid ${hasError ? COLORS.error : "#D9CBB3"}`,
});

export default function App() {
  const [screen, setScreen] = useState<Screen>("login");
  const [authTab, setAuthTab] = useState<"signin" | "create">("signin");
  
  // Auth Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [currentUser, setCurrentUser] = useState<{ email: string; displayName: string; role: "vendor" | "customer" } | null>(null);
  const [role, setRole] = useState<"vendor" | "customer">("vendor");
  const [vendorMode, setVendorMode] = useState<"existing" | "new">("existing");
  const [identifier, setIdentifier] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Catalog State
  const [sareesList, setSareesList] = useState<any[]>([]);
  const [activeFilter, setActiveFilter] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [selectedSaree, setSelectedSaree] = useState<any>(null);
  const [vendorToolsOpen, setVendorToolsOpen] = useState(false);
  const [vendorEditorOpen, setVendorEditorOpen] = useState(false);
  const [customer360Open, setCustomer360Open] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [occasionToolsOpen, setOccasionToolsOpen] = useState(false);
  const [occasions, setOccasions] = useState<Array<{ id: string; name: string; date: string }>>([]);
  const [trialOccasion, setTrialOccasion] = useState("");
  const [occasionName, setOccasionName] = useState("");
  const [occasionDate, setOccasionDate] = useState("");
  const [catalogSaving, setCatalogSaving] = useState(false);
  const [catalogSaveError, setCatalogSaveError] = useState("");
  const [vendorForm, setVendorForm] = useState({
    name: "",
    barcode: "",
    price: "",
    cost: "",
    color: "",
    silkPurity: "",
    description: "",
    image: "",
    availability: "true",
    tag: "New",
  });
  const [editingSareeId, setEditingSareeId] = useState<string | null>(null);
  const [vendorCustomerForm, setVendorCustomerForm] = useState({
    name: "",
    phone: "",
    email: "",
    dob: "",
    gender: "",
    address: "",
    countryCode: "+91",
    state: "",
  });

  // Customer capture state
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("new");
  const [customerLookup, setCustomerLookup] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerDOB, setCustomerDOB] = useState("");
  const [customerGender, setCustomerGender] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCountryCode, setCustomerCountryCode] = useState("+91");
  const [customerState, setCustomerState] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [customerError, setCustomerError] = useState("");
  const [customerSuccess, setCustomerSuccess] = useState("");

  // History / Sessions State
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [, setCustomerRevision] = useState(0);

  // Camera State
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraRequestRef = useRef(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturedBlob, setCapturedBlob] = useState<Blob | File | null>(null);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState("");

  // AI try-on Result States
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultUsage, setResultUsage] = useState<any>(null);
  const [comparisonTrials, setComparisonTrials] = useState<ComparisonTrial[]>([]);
  const [preferredTrialId, setPreferredTrialId] = useState<string | null>(null);

  // UI state
  const [sliderPos, setSliderPos] = useState(48);
  const [progress, setProgress] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);
  const [time, setTime] = useState(new Date());
  const [branch] = useState("MG Road Flagship");
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("trailme_user");
    localStorage.removeItem("trailme_customers");
    localStorage.removeItem("trailme_catalog");
    setCurrentUser(null);
    setSelectedCustomer(null);
    setScreen("login");
  }, []);

  // Live clock
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch catalog on start
  useEffect(() => {
    const savedCatalog = localStorage.getItem("trailme_catalog");
    if (savedCatalog) {
      try {
        const parsed = JSON.parse(savedCatalog);
        if (Array.isArray(parsed)) {
          setSareesList(parsed);
          if (parsed[0]) setSelectedSaree(parsed[0]);
          return;
        }
      } catch (err) {
        console.error("Error loading saved catalog:", err);
      }
    }

    apiFetch("/api/catalog")
      .then((res) => res.ok ? parseJsonSafe(res) : Promise.reject())
      .then((data) => {
        if (Array.isArray(data)) {
          const mapped = data.map((item) => ({
            id: item.id,
            name: item.name,
            price: item.price,
            tag: item.tag,
            color: item.color,
            img: apiUrl(`/catalog-images/${item.img_filename}`),
            rating: item.rating,
            trials: item.trials,
            barcode: item.barcode || "",
            cost: item.cost || item.price,
            silkPurity: item.silk_purity || item.silkPurity || "",
            description: item.description || "",
            available: item.available ?? true,
          }));
          setSareesList(mapped);
          localStorage.setItem("trailme_catalog", JSON.stringify(mapped));
          if (mapped.length > 0) {
            setSelectedSaree(mapped[0]);
          }
        }
      })
      .catch((err) => console.error("Error loading catalog:", err));
  }, []);

  // Check persisted auth session
  useEffect(() => {
    apiFetch("/api/auth/me")
      .then(async (res) => res.ok ? parseJsonSafe(res) : Promise.reject())
      .then(({ user }) => {
        const restored = {
          email: user.email,
          displayName: user.display_name,
          role: user.role as "vendor" | "customer",
        };
        setCurrentUser(restored);
        setRole(user.role as "vendor" | "customer");
        setScreen(user.role === "vendor" ? "dashboard" : "catalog");
      })
      .catch(() => handleLogout());
  }, [handleLogout]);

  const persistCatalog = useCallback((items: any[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("trailme_catalog", JSON.stringify(items));
    }
  }, []);

  useEffect(() => {
    if (currentUser?.role !== "vendor") return;
    apiFetch("/api/vendor/catalog")
      .then((res) => res.ok ? parseJsonSafe(res) : [])
      .then((saved) => {
        if (!Array.isArray(saved) || saved.length === 0) return;
        setSareesList((existing) => {
          const savedById = new Map(saved.map((item) => [item.id, item]));
          return [...saved, ...existing.filter((item) => !savedById.has(item.id))];
        });
      })
      .catch((err) => console.error("Unable to load saved vendor catalog", err));

    apiFetch("/api/vendor/customers")
      .then((res) => res.ok ? parseJsonSafe(res) : [])
      .then((saved) => {
        if (!Array.isArray(saved)) return;
        localStorage.setItem("trailme_customers", JSON.stringify(saved));
        setCustomerRevision((revision) => revision + 1);
      })
      .catch((err) => console.error("Unable to load saved customers", err));

    apiFetch("/api/vendor/occasions")
      .then((res) => res.ok ? parseJsonSafe(res) : [])
      .then((saved) => Array.isArray(saved) && setOccasions(saved))
      .catch((err) => console.error("Unable to load occasions", err));
  }, [currentUser]);

  const resetVendorForm = () => {
    setEditingSareeId(null);
    setVendorEditorOpen(false);
    setCatalogSaveError("");
    setVendorForm({ name: "", barcode: "", price: "", cost: "", color: "", silkPurity: "", description: "", image: "", availability: "true", tag: "New" });
  };

  const openSareeEditor = (saree?: any) => {
    setCustomer360Open(false);
    if (saree) {
      setEditingSareeId(saree.id);
      setVendorForm({
        name: saree.name || "", barcode: saree.barcode || "", price: String(saree.price || ""),
        cost: String(saree.cost || ""), color: saree.color || "", silkPurity: saree.silkPurity || "",
        description: saree.description || "", image: saree.img || "", availability: String(saree.available ?? true), tag: saree.tag || "New",
      });
    } else {
      resetVendorForm();
    }
    setVendorEditorOpen(true);
    setVendorToolsOpen(true);
  };

  const saveSaree = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorForm.name.trim() || !vendorForm.price.trim()) return;
    setCatalogSaveError("");
    setCatalogSaving(true);
    const id = editingSareeId || `SAREE-${Date.now()}`;
    const item = {
      id, name: vendorForm.name.trim(), barcode: vendorForm.barcode.trim(), price: vendorForm.price.trim(),
      cost: vendorForm.cost.trim(), color: vendorForm.color.trim() || "Not specified", silkPurity: vendorForm.silkPurity.trim(),
      description: vendorForm.description.trim(), img: vendorForm.image || sareesList[0]?.img || loginHeroImage,
      available: vendorForm.availability === "true", tag: vendorForm.tag.trim() || "New", rating: 0, trials: 0,
    };
    try {
      if (currentUser?.role !== "vendor") throw new Error("Sign in as a vendor to save catalog items.");
      const response = await apiFetch(`/api/vendor/catalog/${encodeURIComponent(id)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: item }),
      });
      if (!response.ok) {
        const data = await parseJsonSafe(response);
        throw new Error(data.detail || "Unable to save catalog item");
      }
      const next = editingSareeId ? sareesList.map((s) => s.id === id ? { ...s, ...item } : s) : [item, ...sareesList];
      setSareesList(next);
      persistCatalog(next);
      setSelectedSaree(item);
      resetVendorForm();
    } catch (err: any) {
      setCatalogSaveError(err.message || "Unable to save catalog item");
    } finally {
      setCatalogSaving(false);
    }
  };

  const handleSareeImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (currentUser?.role === "vendor") {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await apiFetch("/api/vendor/catalog/image", { method: "POST", body: formData });
        const data = await parseJsonSafe(response);
        if (!response.ok) throw new Error(data.detail || "Unable to upload image");
        setVendorForm((form) => ({ ...form, image: apiUrl(data.url) }));
        return;
      } catch (err: any) {
        setCatalogSaveError(err.message || "Unable to upload image");
      }
    }
    const reader = new FileReader();
    reader.onload = () => setVendorForm((form) => ({ ...form, image: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const deleteSaree = async () => {
    if (!editingSareeId) return;
    try {
      const response = await apiFetch(`/api/vendor/catalog/${encodeURIComponent(editingSareeId)}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete catalog item");
      const next = sareesList.filter((item) => item.id !== editingSareeId);
      setSareesList(next);
      persistCatalog(next);
      setSelectedSaree(next[0] || null);
      resetVendorForm();
    } catch (err: any) {
      setCatalogSaveError(err.message || "Unable to delete catalog item");
    }
  };

  const loadCustomers = useCallback((): CustomerProfile[] => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem("trailme_customers");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, []);

  const persistCustomers = useCallback((customers: CustomerProfile[]) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("trailme_customers", JSON.stringify(customers));
      setCustomerRevision((revision) => revision + 1);
      if (currentUser?.role === "vendor") {
        customers.forEach((customer) => {
          apiFetch(`/api/vendor/customers/${encodeURIComponent(customer.id)}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: customer }),
          }).catch((err) => console.error("Unable to save customer", err));
        });
      }
    }
  }, [currentUser]);

  const findCustomerByLookup = useCallback((lookup: string) => {
    const normalized = lookup.trim().toLowerCase();
    if (!normalized) return null;
    const customers = loadCustomers();
    return customers.find((customer) => {
      const haystack = [customer.id, customer.name, customer.phone, customer.email]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    }) || null;
  }, [loadCustomers]);

  const updateCustomerActivity = useCallback((customerId: string | undefined, action: "trial" | "purchase", item: any) => {
    if (!customerId || !item) return;
    const customers = loadCustomers();
    const index = customers.findIndex((customer) => customer.id === customerId);
    if (index === -1) return;
    const now = new Date().toISOString();
    const nextCustomers = [...customers];
    const nextCustomer = { ...nextCustomers[index] };
    if (action === "trial") {
      nextCustomer.recentTrails = [
        { id: item.id, name: item.name, price: item.price, image: item.img, addedAt: now },
        ...nextCustomer.recentTrails,
      ].slice(0, 8);
    } else {
      nextCustomer.purchasedItems = [
        { id: item.id, name: item.name, price: item.price, addedAt: now },
        ...nextCustomer.purchasedItems,
      ].slice(0, 8);
    }
    nextCustomer.lastSeen = now;
    nextCustomers[index] = nextCustomer;
    persistCustomers(nextCustomers);
    setSelectedCustomer(nextCustomer);
  }, [loadCustomers, persistCustomers]);

  const createCustomer = useCallback((name: string, phone: string, email: string, dob: string, gender: string, address: string, countryCode: string, state: string, occasion = "") => {
    const customers = loadCustomers();
    const nextId = `CUST-${String(customers.length + 1).padStart(4, "0")}`;
    const profile: CustomerProfile = {
      id: nextId,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim(),
      dob: dob.trim(),
      gender: gender.trim(),
      address: address.trim(),
      countryCode: countryCode.trim(),
      state: state.trim(),
      occasion: occasion.trim(),
      recentTrails: [],
      purchasedItems: [],
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
    };
    const nextCustomers = [profile, ...customers];
    persistCustomers(nextCustomers);
    setSelectedCustomer(profile);
    return profile;
  }, [loadCustomers, persistCustomers]);

  // Fetch Dashboard Sessions
  const fetchSessions = useCallback(() => {
    setLoadingSessions(true);
    apiFetch("/api/dashboard/sessions")
      .then((res) => res.ok ? parseJsonSafe(res) : Promise.reject())
      .then((data) => {
        if (Array.isArray(data)) {
          setSessions(data);
        }
      })
      .catch((err) => console.error("Error fetching sessions:", err))
      .finally(() => setLoadingSessions(false));
  }, []);

  useEffect(() => {
    if (screen === "dashboard") {
      fetchSessions();
    }
  }, [screen, fetchSessions]);

  // Camera stream management. Keep stream ownership outside React state so a
  // rapid navigation/retry cannot leave an older getUserMedia request running.
  const stopCamera = useCallback(() => {
    cameraRequestRef.current += 1;

    const activeStream = streamRef.current;
    if (activeStream) {
      activeStream.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    setStream(null);
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    const requestId = cameraRequestRef.current + 1;
    cameraRequestRef.current = requestId;
    stopCamera();
    cameraRequestRef.current = requestId;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("This browser requires a secure HTTPS connection to use the camera.");
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "user" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      // The user may have navigated away or started a newer request while the
      // browser was waiting for permission. Do not attach that stale stream.
      if (cameraRequestRef.current !== requestId) {
        s.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = s;
      setStream(s);
    } catch (err: any) {
      if (cameraRequestRef.current !== requestId) return;
      console.warn("Camera access denied or unavailable. Use Gallery Upload fallback.", err);
      setCameraActive(false);
      const message = err?.name === "NotAllowedError"
        ? "Camera permission was blocked. Allow camera access in your browser and try again."
        : err?.name === "NotFoundError"
          ? "No camera was detected on this device."
          : err?.message || "Camera could not be started. You can still upload a photo.";
      setCameraError(message);
    }
  }, [stopCamera]);

  useEffect(() => {
    if (screen === "camera") {
      startCamera();
      setSessionId(crypto.randomUUID());
      setCapturedBlob(null);
      setCapturedUrl(null);
      setCameraError("");
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [screen, startCamera, stopCamera]);

  useEffect(() => {
    if (screen !== "camera" || !stream || !videoRef.current) return;
    const video = videoRef.current;
    let cancelled = false;

    const playStream = async () => {
      try {
        await video.play();
        if (!cancelled && video.srcObject === stream) setCameraActive(true);
      } catch (err: any) {
        // Changing srcObject intentionally interrupts any pending play request.
        if (!cancelled && err?.name !== "AbortError") {
          setCameraActive(false);
          setCameraError("The camera could not start playing. Please try enabling it again.");
        }
      }
    };

    video.srcObject = stream;
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      void playStream();
    } else {
      video.addEventListener("loadedmetadata", playStream, { once: true });
    }

    return () => {
      cancelled = true;
      video.removeEventListener("loadedmetadata", playStream);
    };
  }, [screen, stream]);

  // Capture frame
  const capturePhoto = () => {
    if (!videoRef.current || videoRef.current.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setCameraError("The camera is still loading. Please wait a moment and try again.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1); // Maintain mirror direction
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) {
          setCapturedBlob(blob);
          setCapturedUrl(URL.createObjectURL(blob));
          stopCamera();
        }
      }, "image/jpeg", 0.95);
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCapturedBlob(file);
      setCapturedUrl(URL.createObjectURL(file));
      stopCamera();
    }
  };

  // Submit try-on request
  const handleTryOnSubmit = async () => {
    if (!capturedBlob || !selectedSaree || isGenerating) return;
    setIsGenerating(true);
    setResultUrl(null);
    setScreen("processing");

    try {
      // 1. Select outfit
      const selectRes = await apiFetch("/api/session/select-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, product_id: selectedSaree.id }),
      });
      if (!selectRes.ok) throw new Error("Failed to link saree with session");

      // 2. Upload person
      const formData = new FormData();
      formData.append("session_id", sessionId);
      formData.append("slot", "person");
      formData.append("file", capturedBlob, "person.jpg");

      const uploadRes = await apiFetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (!uploadRes.ok) throw new Error("Upload failed. Please retry with a clear, full-body photo.");

      // 3. Generate AI try-on
      const genRes = await apiFetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      const genData = await parseJsonSafe(genRes);
      if (!genRes.ok) throw new Error("Try-on generation failed. Please retry with a clear, full-body photo.");

      setResultUrl(apiUrl(`/api/results/${sessionId}`));
      setResultUsage(genData.usage);
      const finishedTrial = {
        id: sessionId,
        name: selectedSaree.name,
        price: selectedSaree.price,
        color: selectedSaree.color,
        image: apiUrl(`/api/results/${sessionId}`),
        createdAt: new Date().toISOString(),
      };
      setComparisonTrials((trials) => [finishedTrial, ...trials.filter((trial) => trial.id !== sessionId)].slice(0, 6));
      updateCustomerActivity(selectedCustomer?.id, "trial", { ...selectedSaree, img: finishedTrial.image });
    } catch (err: any) {
      console.error("Try-on error:", err);
      alert("Try-on failed. Please retry with a clear, full-body photo.");
      setScreen("camera");
    } finally {
      setIsGenerating(false);
    }
  };

  // Progress Bar Simulation with real API lock
  useEffect(() => {
    if (screen !== "processing") return;
    setProgress(0);
    setStatusIdx(0);
    let p = 0;
    const tick = setInterval(() => {
      if (p < 95) {
        p += 1.5;
        setProgress(p);
        setStatusIdx(Math.floor((p / 100) * statusMessages.length) % statusMessages.length);
      }
    }, 60);
    return () => clearInterval(tick);
  }, [screen]);

  // Complete animation when resultUrl is available
  useEffect(() => {
    if (screen === "processing" && resultUrl) {
      setProgress(100);
      const timer = setTimeout(() => {
        setScreen("result");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [resultUrl, screen]);

  const resetFields = () => {
    setIdentifier("");
    setPassword("");
    setVendorName("");
    setBusinessName("");
    setRegEmail("");
    setRegPhone("");
    setRegPassword("");
    setRegConfirm("");
    setErrors({});
    setSubmitted(null);
  };

  const switchVendorMode = (nextMode: "existing" | "new") => {
    if (nextMode === vendorMode) return;
    setVendorMode(nextMode);
    resetFields();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      identifier: identifier.trim() === "",
      password: password.trim() === "",
    };
    setErrors(nextErrors);
    if (nextErrors.identifier || nextErrors.password) return;
    try {
      const res = await apiFetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ identifier, password }) });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.detail || "Unable to sign in");
      const user = { email: data.user.email, displayName: data.user.display_name, role: data.user.role as "vendor" | "customer" };
      setCurrentUser(user);
      setRole(user.role);
      localStorage.setItem("trailme_user", JSON.stringify(user));
      setScreen(user.role === "vendor" ? "dashboard" : "catalog");
      setSubmitted("login");
      setAuthError("");
    } catch (err: any) {
      setAuthError(err.message || "Unable to sign in");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = {
      businessName: businessName.trim() === "",
      regEmail: regEmail.trim() === "",
      regPhone: regPhone.trim() === "",
      regPassword: regPassword.trim() === "",
      regConfirm: regConfirm.trim() === "" || regConfirm !== regPassword,
    };
    setErrors(nextErrors);
    const hasError = Object.values(nextErrors).some(Boolean);
    if (hasError) return;
    try {
      const res = await apiFetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: regEmail, password: regPassword, display_name: businessName, role: "vendor", phone: regPhone, business_name: businessName }) });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.detail || "Unable to create vendor account");
      const user = { email: data.user.email, displayName: data.user.display_name, role: "vendor" as const };
      setCurrentUser(user);
      localStorage.setItem("trailme_user", JSON.stringify(user));
      setRole("vendor");
      setScreen("dashboard");
      setSubmitted("register");
      setAuthError("");
    } catch (err: any) {
      setAuthError(err.message || "Unable to create vendor account");
    }
  };

  const isVendor = role === "vendor";
  const isNewVendor = isVendor && vendorMode === "new";
  const copy = isVendor
    ? isNewVendor
      ? {
          heading: "Create your vendor account",
          subheading: "Register your business to start listing on Varnam.",
        }
      : {
          heading: "Sign in to your vendor account",
          subheading: "Manage your catalog, orders, and payouts.",
          identifierLabel: "Vendor ID or Email",
          identifierPlaceholder: "e.g. VEND-1042 or you@business.com",
          identifierError: "Enter your Vendor ID or registered email.",
          registerText: "Don't have a vendor account yet?",
          registerLink: "Register your business",
        }
    : ROLE_CONFIG.customer;

  // Compare slider drag handler
  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderContainerRef.current || !isDragging.current) return;
    const rect = sliderContainerRef.current.getBoundingClientRect();
    const pos = Math.max(4, Math.min(96, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(pos);
  }, []);

  const timeStr = time.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const uniqueTags = ["All", ...Array.from(new Set(sareesList.map((s) => s.tag)))];
  const priceAsNumber = (price: unknown) => Number(String(price ?? "").replace(/[^0-9.]/g, "")) || 0;
  const filteredSarees = sareesList.filter((s) => {
    const matchesTag = activeFilter === "All" || s.tag === activeFilter;
    const price = priceAsNumber(s.price);
    return matchesTag && (!minPrice || price >= Number(minPrice)) && (!maxPrice || price <= Number(maxPrice));
  });

  // ─── SCREEN 1: LOGIN (User-facing) ─────────────────────────────────────────
  const renderLogin = () => (
    <div className="size-full flex" style={{ background: CREAM }}>
      {/* Left – hero panel */}
      <div className="relative w-1/2 h-full overflow-hidden flex-shrink-0">
        <img
          src={loginHeroImage}
          alt="TrailMe saree collection"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(160deg, ${BURGUNDY}cc 0%, ${BURGUNDY}88 50%, ${BURGUNDY}30 100%)`,
          }}
        />

        <div className="relative z-10 flex flex-col justify-between h-full p-10">
          <div>
            <div
              className="text-4xl font-bold tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif", color: CREAM }}
            >
              TrailMe
            </div>
            <div
              className="mt-1 text-xs tracking-[0.25em] uppercase"
              style={{ color: `${GOLD}cc`, fontWeight: 500 }}
            >
              Virtual Saree Try-On
            </div>
          </div>

          <div>
            <div
              className="text-3xl leading-snug font-semibold"
              style={{ fontFamily: "'Playfair Display', serif", color: CREAM }}
            >
              See Yourself in Silk
            </div>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: `${CREAM}cc` }}>
              Instant, photoreal virtual trials — no showroom visit required.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <div className="h-px w-8" style={{ background: GOLD }} />
              <div
                className="text-xs tracking-[0.2em] uppercase"
                style={{ color: `${GOLD}bb` }}
              >
                For Saree Lovers
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right – auth panel */}
      <div className="w-1/2 h-full flex flex-col justify-center px-14 py-12 overflow-y-auto">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Work+Sans:wght@400;500;600&display=swap');
          .vp-shimmer { position: relative; overflow: hidden; }
          .vp-shimmer::after {
            content: "";
            position: absolute;
            top: 0; left: -120%;
            width: 60%; height: 100%;
            background: linear-gradient(120deg, transparent, rgba(232,199,102,0.35), transparent);
            transform: skewX(-20deg);
            transition: left 0.6s ease;
          }
          .vp-shimmer:hover::after { left: 140%; }
          .vp-focus:focus-visible {
            outline: 2px solid ${COLORS.teal};
            outline-offset: 3px;
            border-radius: 2px;
          }
        `}</style>

        <div className="flex gap-5 mb-8 text-[13.5px]" role="radiogroup" aria-label="Vendor account status">
          {[
            { key: "existing", label: "Existing vendor" },
            { key: "new", label: "New vendor" },
          ].map((opt) => (
            <label key={opt.key} className="flex items-center gap-2 cursor-pointer" style={{ color: COLORS.inkSoft }}>
              <input
                type="radio"
                name="vendorMode"
                checked={vendorMode === opt.key}
                onChange={() => switchVendorMode(opt.key as "existing" | "new")}
                className="w-[14px] h-[14px] cursor-pointer"
                style={{ accentColor: COLORS.mulberry }}
              />
              <span style={{ color: vendorMode === opt.key ? COLORS.ink : COLORS.inkSoft, fontWeight: vendorMode === opt.key ? 600 : 400 }}>
                {opt.label}
              </span>
            </label>
          ))}
        </div>

        <h1
          className="mb-2"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 600, fontSize: "34px", color: COLORS.ink }}
        >
          {copy.heading}
        </h1>
        <p className="mb-7 text-[15px]" style={{ color: COLORS.inkSoft, lineHeight: 1.5 }}>
          {copy.subheading}
        </p>

        {authError && (
          <div className="rounded-md p-3 mb-5 text-sm" style={{ background: "#fbe9e7", color: COLORS.error, border: `1px solid ${COLORS.error}40` }}>
            {authError}
          </div>
        )}

        {submitted === "login" && (
          <div className="rounded-md p-3 mb-5 text-sm" style={{ background: COLORS.ivoryDim, color: COLORS.ink, border: `1px solid ${COLORS.zari}` }}>
            Signed in as {role} (demo only — no backend connected).
          </div>
        )}
        {submitted === "register" && (
          <div className="rounded-md p-3 mb-5 text-sm" style={{ background: COLORS.ivoryDim, color: COLORS.ink, border: `1px solid ${COLORS.zari}` }}>
            Vendor account created (demo only — no backend connected).
          </div>
        )}

        {isNewVendor ? (
          <form onSubmit={handleRegisterSubmit} noValidate>
            <div className="mb-5">
              <label htmlFor="businessName" className="block text-[12.5px] uppercase mb-2 font-semibold" style={{ letterSpacing: "0.06em", color: COLORS.inkSoft }}>
                Business Name
              </label>
              <div className="relative" style={inputShellStyle(Boolean(errors.businessName))}>
                <input
                  id="businessName"
                  type="text"
                  placeholder="e.g. Sundari Silks Weaving Co."
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="vp-focus w-full bg-transparent outline-none text-[15.5px] py-2.5 pr-1"
                  style={{ color: COLORS.ink }}
                />
              </div>
              {errors.businessName && <p className="text-[12.5px] mt-1.5" style={{ color: COLORS.error }}>Enter your business name.</p>}
            </div>

            <div className="mb-5">
              <label htmlFor="regEmail" className="block text-[12.5px] uppercase mb-2 font-semibold" style={{ letterSpacing: "0.06em", color: COLORS.inkSoft }}>
                Email
              </label>
              <div className="relative" style={inputShellStyle(Boolean(errors.regEmail))}>
                <input
                  id="regEmail"
                  type="email"
                  autoComplete="email"
                  placeholder="you@business.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="vp-focus w-full bg-transparent outline-none text-[15.5px] py-2.5 pr-1"
                  style={{ color: COLORS.ink }}
                />
              </div>
              {errors.regEmail && <p className="text-[12.5px] mt-1.5" style={{ color: COLORS.error }}>Enter your email address.</p>}
            </div>

            <div className="mb-5">
              <label htmlFor="regPhone" className="block text-[12.5px] uppercase mb-2 font-semibold" style={{ letterSpacing: "0.06em", color: COLORS.inkSoft }}>
                Phone Number
              </label>
              <div className="relative" style={inputShellStyle(Boolean(errors.regPhone))}>
                <input
                  id="regPhone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="98765 43210"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  className="vp-focus w-full bg-transparent outline-none text-[15.5px] py-2.5 pr-1"
                  style={{ color: COLORS.ink }}
                />
              </div>
              {errors.regPhone && <p className="text-[12.5px] mt-1.5" style={{ color: COLORS.error }}>Enter your phone number.</p>}
            </div>

            <div className="mb-5">
              <label htmlFor="regPassword" className="block text-[12.5px] uppercase mb-2 font-semibold" style={{ letterSpacing: "0.06em", color: COLORS.inkSoft }}>
                Password
              </label>
              <div className="relative" style={inputShellStyle(Boolean(errors.regPassword))}>
                <input
                  id="regPassword"
                  type={showRegPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Create a password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="vp-focus w-full bg-transparent outline-none text-[15.5px] py-2.5 pr-14"
                  style={{ color: COLORS.ink }}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword((s) => !s)}
                  className="vp-focus absolute right-0.5 top-1/2 -translate-y-1/2 text-[12.5px] px-1 py-1 bg-transparent border-none cursor-pointer"
                  style={{ color: COLORS.inkSoft }}
                >
                  {showRegPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.regPassword && <p className="text-[12.5px] mt-1.5" style={{ color: COLORS.error }}>Create a password.</p>}
            </div>

            <div className="mb-7">
              <label htmlFor="regConfirm" className="block text-[12.5px] uppercase mb-2 font-semibold" style={{ letterSpacing: "0.06em", color: COLORS.inkSoft }}>
                Confirm Password
              </label>
              <div className="relative" style={inputShellStyle(Boolean(errors.regConfirm))}>
                <input
                  id="regConfirm"
                  type={showRegPassword ? "text" : "password"}
                  autoComplete="new-password"
                  placeholder="Re-enter your password"
                  value={regConfirm}
                  onChange={(e) => setRegConfirm(e.target.value)}
                  className="vp-focus w-full bg-transparent outline-none text-[15.5px] py-2.5 pr-1"
                  style={{ color: COLORS.ink }}
                />
              </div>
              {errors.regConfirm && <p className="text-[12.5px] mt-1.5" style={{ color: COLORS.error }}>Passwords must match.</p>}
            </div>

            <button
              type="submit"
              className="vp-shimmer vp-focus w-full py-3.5 rounded-[3px] text-[15px] font-semibold border-none cursor-pointer"
              style={{ background: COLORS.mulberry, color: COLORS.ivory, letterSpacing: "0.03em" }}
            >
              Create vendor account
            </button>

            <p className="text-center text-sm mt-6" style={{ color: COLORS.inkSoft }}>
              Already registered?{' '}
              <a href="#" onClick={(e)=>{e.preventDefault();switchVendorMode("existing");}} className="vp-focus font-medium border-b border-transparent hover:border-current" style={{ color: COLORS.teal }}>
                Sign in instead
              </a>
            </p>
          </form>
        ) : (
          <form onSubmit={handleLoginSubmit} noValidate>
            {isVendor && (
              <div className="mb-5">
                <label htmlFor="vendorName" className="block text-[12.5px] uppercase mb-2 font-semibold" style={{ letterSpacing: "0.06em", color: COLORS.inkSoft }}>
                  Vendor Name
                </label>
                <div className="relative" style={inputShellStyle(false)}>
                  <input
                    id="vendorName"
                    type="text"
                    autoComplete="organization"
                    placeholder="e.g. Suryam Silks"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="vp-focus w-full bg-transparent outline-none text-[15.5px] py-2.5 pr-1"
                    style={{ color: COLORS.ink }}
                  />
                </div>
              </div>
            )}

            <div className="mb-5">
              <label htmlFor="identifier" className="block text-[12.5px] uppercase mb-2 font-semibold" style={{ letterSpacing: "0.06em", color: COLORS.inkSoft }}>
                {copy.identifierLabel}
              </label>
              <div className="relative" style={inputShellStyle(Boolean(errors.identifier))}>
                <input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder={copy.identifierPlaceholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="vp-focus w-full bg-transparent outline-none text-[15.5px] py-2.5 pr-1"
                  style={{ color: COLORS.ink }}
                />
              </div>
              {errors.identifier && <p className="text-[12.5px] mt-1.5" style={{ color: COLORS.error }}>{copy.identifierError}</p>}
            </div>

            <div className="mb-5">
              <label htmlFor="password" className="block text-[12.5px] uppercase mb-2 font-semibold" style={{ letterSpacing: "0.06em", color: COLORS.inkSoft }}>
                Password
              </label>
              <div className="relative" style={inputShellStyle(Boolean(errors.password))}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="vp-focus w-full bg-transparent outline-none text-[15.5px] py-2.5 pr-14"
                  style={{ color: COLORS.ink }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="vp-focus absolute right-0.5 top-1/2 -translate-y-1/2 text-[12.5px] px-1 py-1 bg-transparent border-none cursor-pointer"
                  style={{ color: COLORS.inkSoft }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {errors.password && <p className="text-[12.5px] mt-1.5" style={{ color: COLORS.error }}>Enter your password.</p>}
            </div>

            <div className="flex items-center justify-between mb-7 text-[13.5px]">
              <label className="flex items-center gap-2 cursor-pointer" style={{ color: COLORS.inkSoft }}>
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-[15px] h-[15px] cursor-pointer"
                  style={{ accentColor: COLORS.mulberry }}
                />
                Remember me
              </label>
              <a href="#" onClick={(e)=>e.preventDefault()} className="vp-focus font-medium border-b border-transparent hover:border-current" style={{ color: COLORS.teal }}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="vp-shimmer vp-focus w-full py-3.5 rounded-[3px] text-[15px] font-semibold border-none cursor-pointer"
              style={{ background: COLORS.mulberry, color: COLORS.ivory, letterSpacing: "0.03em" }}
            >
              Sign in as Vendor
            </button>

            <p className="text-center text-sm mt-6" style={{ color: COLORS.inkSoft }}>
              {copy.registerText}{' '}
              <a href="#" onClick={(e)=>{e.preventDefault();switchVendorMode("new");}} className="vp-focus font-medium border-b border-transparent hover:border-current" style={{ color: COLORS.teal }}>
                {copy.registerLink} &rarr;
              </a>
            </p>
          </form>
        )}

        <div className="mt-8 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: BURGUNDY }}>
            <CheckCircle size={12} color={CREAM} />
          </div>
          <span className="text-xs" style={{ color: "#7a6a5a" }}>
            Privacy-first: your photos never leave your device
          </span>
        </div>
      </div>
    </div>
  );

  // ─── SCREEN 2: DASHBOARD ─────────────────────────────────────────────────────
  const renderDashboard = () => (
    <div className="size-full flex flex-col" style={{ background: CREAM }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-8 py-4 flex-shrink-0"
        style={{ borderBottom: `1px solid rgba(74,14,23,0.1)` }}
      >
        <div className="flex items-center gap-3">
          <div
            className="text-2xl font-bold"
            style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}
          >
            TrailMe
          </div>
          <span className="text-xs text-slate-400 mt-1.5">
            Hello, {currentUser?.displayName || "Guest"}
          </span>
        </div>

        <div className="flex items-center gap-6">
          {currentUser?.role === "vendor" && (
            <button
              onClick={() => setVendorToolsOpen((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-80"
              style={{ background: GOLD, color: "#1a0a0e" }}
            >
              <ShoppingBag size={13} />
              Vendor Tools
            </button>
          )}
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all hover:opacity-80"
            style={{ background: "#f5f0e8", color: BURGUNDY }}
          >
            <MapPin size={13} />
            {branch}
            <ChevronDown size={13} />
          </button>

          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold tabular-nums"
            style={{ background: BURGUNDY, color: CREAM }}
          >
            <span>{timeStr}</span>
          </div>

          <button
            onClick={handleLogout}
            className="text-xs transition-all hover:opacity-75 px-4 py-2 rounded-full font-semibold"
            style={{ background: "#f5f0e8", color: BURGUNDY }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 overflow-hidden flex gap-6 p-8">
        
        {/* Left Banner & Table Column */}
        <div className="flex-1 flex flex-col gap-6 overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          
          {/* Banner Card */}
          <div
            className="h-52 relative rounded-2xl overflow-hidden flex flex-col justify-between p-6 flex-shrink-0"
            style={{
              background: `linear-gradient(145deg, ${BURGUNDY} 0%, #6b1a2a 60%, #3d0c14 100%)`,
            }}
          >
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, ${GOLD} 0px, transparent 1px, transparent 20px, ${GOLD} 21px, transparent 22px)`,
              }}
            />
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                  style={{ background: `${GOLD}25`, color: GOLD }}
                >
                  <Zap size={11} fill={GOLD} />
                  AI-Powered Platform Active
                </div>
                <div
                  className="text-3xl font-bold leading-tight"
                  style={{ fontFamily: "'Playfair Display', serif", color: CREAM }}
                >
                  See Yourself in Silk.
                </div>
                <p className="mt-1 text-xs max-w-xs" style={{ color: `${CREAM}80` }}>
                  Showroom trials reimagined: photoreal virtual draping on demand.
                </p>
              </div>

                <button
                onClick={() => {
                  setCustomerError("");
                  setCustomerSuccess("");
                  setCustomerLookup("");
                  setCustomerName("");
                  setCustomerPhone("");
                  setCustomerEmail("");
                  setCustomerDOB("");
                  setCustomerGender("");
                  setCustomerAddress("");
                  setCustomerCountryCode("+91");
                  setCustomerState("");
                  setCustomerMode("new");
                  setSelectedCustomer(null);
                  if (currentUser?.role === "vendor") {
                    setScreen("customer");
                  } else {
                    setScreen("catalog");
                  }
                }}
                className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-xs transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: GOLD, color: "#1a0a0e" }}
              >
                <Sparkles size={13} />
                New Trial Session
              </button>
            </div>

            <div className="relative z-10 flex gap-6">
              {[
                { label: "Avg. Session", value: "4.2 min" },
                { label: "Satisfaction", value: "96%" },
                { label: "Repeat Trials", value: "3.8×" },
              ].map((stat) => (
                <div key={stat.label}>
                  <span
                    className="text-lg font-bold"
                    style={{ fontFamily: "'Playfair Display', serif", color: GOLD }}
                  >
                    {stat.value}
                  </span>
                  <span className="text-[10px] ml-1.5" style={{ color: `${CREAM}60` }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {(vendorEditorOpen || customer360Open || occasionToolsOpen) && (
            <div className="rounded-2xl p-6 flex-1 overflow-y-auto" style={{ background: "#fff", border: `1px solid rgba(74,14,23,0.08)` }}>
              {vendorEditorOpen && (
                <form onSubmit={saveSaree} className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <div className="text-xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}>{editingSareeId ? "Update saree" : "Add a saree"}</div>
                      <div className="text-sm mt-1" style={{ color: "#7a6a5a" }}>Keep your inventory details up to date.</div>
                    </div>
                    <button type="button" onClick={resetVendorForm} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#f5f0e8" }}><X size={17} color={BURGUNDY} /></button>
                  </div>
                  {catalogSaveError && <div className="mb-4 rounded-xl px-4 py-3 text-sm" style={{ background: `${COLORS.error}10`, color: COLORS.error }}>{catalogSaveError}</div>}
                  <div className="grid grid-cols-2 gap-4">
                    {([['name','Saree name'], ['barcode','Barcode'], ['price','Price (₹)'], ['color','Colour'], ['silkPurity','Silk purity'], ['tag','Collection tag']] as const).map(([key, label]) => <div key={key}><label className="block text-xs font-semibold mb-1.5" style={{ color: BURGUNDY }}>{label}</label><input required={key === 'name' || key === 'price'} value={vendorForm[key]} onChange={(e) => setVendorForm((f) => ({ ...f, [key]: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,.1)" }} /></div>)}
                    <div><label className="block text-xs font-semibold mb-1.5" style={{ color: BURGUNDY }}>Availability</label><select value={vendorForm.availability} onChange={(e) => setVendorForm((f) => ({ ...f, availability: e.target.value }))} className="w-full rounded-xl px-4 py-3 text-sm" style={{ background: "#f5f0e8" }}><option value="true">Available</option><option value="false">Unavailable</option></select></div>
                    <div><label className="block text-xs font-semibold mb-1.5" style={{ color: BURGUNDY }}>Saree image</label><input type="file" accept="image/*" onChange={handleSareeImage} className="w-full rounded-xl px-3 py-2.5 text-sm" style={{ background: "#f5f0e8" }} /></div>
                  </div>
                  <div className="mt-4"><label className="block text-xs font-semibold mb-1.5" style={{ color: BURGUNDY }}>Description</label><textarea value={vendorForm.description} onChange={(e) => setVendorForm((f) => ({ ...f, description: e.target.value }))} rows={4} className="w-full rounded-xl px-4 py-3 text-sm outline-none" style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,.1)" }} /></div>
                  <div className="mt-6 flex gap-3"><button type="submit" disabled={catalogSaving} className="px-6 py-3 rounded-full text-sm font-semibold disabled:opacity-60" style={{ background: GOLD, color: "#1a0a0e" }}>{catalogSaving ? "Saving..." : editingSareeId ? "Save changes" : "Add saree"}</button>{editingSareeId && <button type="button" onClick={deleteSaree} className="px-6 py-3 rounded-full text-sm font-semibold" style={{ background: "#fff", color: COLORS.error, border: `1px solid ${COLORS.error}40` }}>Delete</button>}</div>
                </form>
              )}
              {occasionToolsOpen && !vendorEditorOpen && !customer360Open && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-6"><div><div className="text-xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}>Occasions</div><div className="text-sm mt-1" style={{ color: "#7a6a5a" }}>Create seasonal or event collections for your catalog.</div></div><button onClick={() => setOccasionToolsOpen(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#f5f0e8" }}><X size={17} color={BURGUNDY} /></button></div>
                  <form onSubmit={async (e) => { e.preventDefault(); if (!occasionName.trim()) return; const id = `OCC-${Date.now()}`; const item = { id, name: occasionName.trim(), date: occasionDate }; const res = await apiFetch(`/api/vendor/occasions/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: item }) }); if (res.ok) { setOccasions((all) => [item, ...all]); setOccasionName(""); setOccasionDate(""); } }} className="flex flex-wrap items-end gap-3 mb-6"><div><label className="block text-xs font-semibold mb-1.5" style={{ color: BURGUNDY }}>Occasion name</label><input required value={occasionName} onChange={(e) => setOccasionName(e.target.value)} placeholder="Diwali collection" className="rounded-xl px-4 py-3 text-sm" style={{ background: "#f5f0e8" }} /></div><div><label className="block text-xs font-semibold mb-1.5" style={{ color: BURGUNDY }}>Date</label><input type="date" value={occasionDate} onChange={(e) => setOccasionDate(e.target.value)} className="rounded-xl px-4 py-3 text-sm" style={{ background: "#f5f0e8" }} /></div><button className="px-5 py-3 rounded-full text-sm font-semibold" style={{ background: GOLD, color: "#1a0a0e" }}>Add occasion</button></form>
                  <div className="grid grid-cols-2 gap-3">{occasions.length ? occasions.map((occasion) => <div key={occasion.id} className="rounded-xl p-4 flex justify-between" style={{ background: "#fdf7ec" }}><div><div className="font-semibold" style={{ color: BURGUNDY }}>{occasion.name}</div><div className="text-xs" style={{ color: "#7a6a5a" }}>{occasion.date || "No date set"}</div></div><button onClick={async () => { const res = await apiFetch(`/api/vendor/occasions/${occasion.id}`, { method: "DELETE" }); if (res.ok) setOccasions((all) => all.filter((item) => item.id !== occasion.id)); }} className="text-xs" style={{ color: COLORS.error }}>Delete</button></div>) : <div className="text-sm" style={{ color: "#7a6a5a" }}>No occasions added yet.</div>}</div>
                </div>
              )}
              {customer360Open && !vendorEditorOpen && (
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-6"><div><div className="text-xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}>Customer 360</div><div className="text-sm mt-1" style={{ color: "#7a6a5a" }}>Recent saree trials by customer.</div></div><button onClick={() => setCustomer360Open(false)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "#f5f0e8" }}><X size={17} color={BURGUNDY} /></button></div>
                  <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-5" style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,.12)" }}>
                    <Search size={16} color={BURGUNDY} />
                    <input value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="Search name, phone, email, ID, location, occasion or tried saree…" className="flex-1 text-sm bg-transparent outline-none" style={{ color: "#1a0a0e" }} />
                    {customerSearch && <button onClick={() => setCustomerSearch("")} aria-label="Clear customer search"><X size={15} color={BURGUNDY} /></button>}
                  </div>
                  {(() => { const query = customerSearch.trim().toLowerCase(); const customers = loadCustomers().filter((customer) => !query || [customer.id, customer.name, customer.phone, customer.email, customer.address, customer.state, customer.gender, customer.occasion, ...customer.recentTrails.flatMap((item) => [item.name, item.price])].filter(Boolean).join(" ").toLowerCase().includes(query)); return customers.length === 0 ? <div className="rounded-xl p-8 text-center text-sm" style={{ background: "#fdf7ec", color: "#7a6a5a" }}>{query ? "No customer details match this search." : "No customer profiles yet."}</div> : <div className="grid grid-cols-2 gap-4">{customers.map((customer) => <div key={customer.id} className="rounded-xl p-5" style={{ background: "#fdf7ec" }}><div className="font-semibold" style={{ color: BURGUNDY }}>{customer.name}</div><div className="text-xs mt-1 mb-4" style={{ color: "#7a6a5a" }}>{customer.phone} · {customer.id}</div><div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: BURGUNDY }}>Completed try-ons</div>{customer.recentTrails.length ? <div className="grid grid-cols-2 gap-2">{customer.recentTrails.slice(0, 4).map((item, index) => <div key={`${item.id}-${index}`} className="rounded-lg overflow-hidden border" style={{ borderColor: "rgba(74,14,23,.08)" }}>{item.image && <img src={item.image} alt={`${item.name} try-on`} className="w-full h-24 object-cover object-top" />}<div className="p-2 text-xs" style={{ color: "#5b463f" }}><div className="font-semibold truncate">{item.name}</div><div>{item.price}</div></div></div>)}</div> : <div className="text-sm" style={{ color: "#7a6a5a" }}>No completed try-ons.</div>}</div>)}</div>; })()}
                </div>
              )}
            </div>
          )}

          {/* Session history is now available only through Customer 360. */}
          <div
            className="hidden"
            style={{ background: "#fff", border: `1px solid rgba(74,14,23,0.08)` }}
          >
            <div className="flex justify-between items-center mb-4">
              <div
                className="text-lg font-semibold"
                style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}
              >
                Recent Try-On Sessions
              </div>
              <button
                onClick={fetchSessions}
                className="text-xs transition-all hover:opacity-75"
                style={{ color: GOLD, fontWeight: 600 }}
              >
                Refresh Log
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ borderBottom: `1px solid rgba(74,14,23,0.08)` }}>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Session</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Outfit</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Photos</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Tokens</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Sale Status</th>
                    <th className="pb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingSessions ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-sm text-slate-400">
                        Loading session logs...
                      </td>
                    </tr>
                  ) : sessions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-sm text-slate-400">
                        No trial sessions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    sessions.map((sess) => (
                      <tr key={sess.session_id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 text-xs font-mono font-medium text-slate-700">
                          {sess.session_id.substring(0, 13)}...
                        </td>
                        <td className="py-3 text-xs font-semibold" style={{ color: BURGUNDY }}>
                          {sess.product_id}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-1.5">
                            {/* Person Thumbnail */}
                            {sess.storage?.inputs?.person?.path && (
                              <div className="group relative w-8 h-10 rounded border overflow-hidden bg-slate-100">
                                <img
                                  src={`/${sess.storage.inputs.person.path}`}
                                  className="w-full h-full object-cover"
                                  alt="Person"
                                />
                                <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white transition-opacity">
                                  User
                                </span>
                              </div>
                            )}
                            {/* Outfit Thumbnail */}
                            {sess.storage?.inputs?.outfit?.path && (
                              <div className="group relative w-8 h-10 rounded border overflow-hidden bg-slate-100">
                                <img
                                  src={`/${sess.storage.inputs.outfit.path}`}
                                  className="w-full h-full object-cover"
                                  alt="Outfit"
                                />
                                <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-white transition-opacity">
                                  Saree
                                </span>
                              </div>
                            )}
                            {/* Output Thumbnail */}
                            {sess.storage?.output?.path ? (
                              <div
                                onClick={() => {
                                  setSessionId(sess.session_id);
                                  const sareeObj = sareesList.find((s) => s.id === sess.product_id) || selectedSaree;
                                  setSelectedSaree(sareeObj);
                                  setResultUrl(`/${sess.storage.output.path}`);
                                  setCapturedUrl(`/${sess.storage.inputs.person.path}`);
                                  setScreen("result");
                                }}
                                className="group relative w-8 h-10 rounded border border-amber-300 overflow-hidden bg-slate-100 cursor-pointer hover:ring-1 hover:ring-amber-500"
                              >
                                <img
                                  src={`/${sess.storage.output.path}`}
                                  className="w-full h-full object-cover"
                                  alt="Output"
                                />
                                <span className="absolute inset-0 bg-amber-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-amber-200 transition-opacity">
                                  View
                                </span>
                              </div>
                            ) : (
                              <div className="w-8 h-10 rounded border border-dashed flex items-center justify-center text-[8px] text-slate-400 bg-slate-50">
                                ...
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-600 font-medium">
                          {sess.token_usage?.total_tokens?.toLocaleString() || 0}
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                              sess.sale_status === "purchased"
                                ? "bg-green-50 text-green-700 border border-green-200"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {sess.sale_status === "purchased" ? "Purchased" : "No Action"}
                          </span>
                        </td>
                        <td className="py-3 text-[10px] text-slate-500">
                          {new Date(sess.created_at).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right – KPI sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4">
          {currentUser?.role === "vendor" && vendorToolsOpen && (
            <div className="rounded-2xl p-4" style={{ background: "#fff", border: `1px solid rgba(74,14,23,0.08)` }}>
              <div className="text-sm font-semibold mb-3" style={{ color: BURGUNDY }}>
                Vendor inventory tools
              </div>
              <div className="space-y-2 text-sm" style={{ color: "#5b463f" }}>
                <button onClick={() => openSareeEditor()} className="w-full text-left rounded-xl p-3 transition-opacity hover:opacity-80" style={{ background: "#fdf7ec" }}>
                  <div className="font-semibold mb-1 flex items-center gap-2"><Plus size={14} /> Add / Update saree</div>
                  <div className="text-xs">Add an image, barcode, price, colour, silk purity, availability, and description.</div>
                </button>
                <button onClick={() => setCustomer360Open((open) => !open)} className="w-full text-left rounded-xl p-3 transition-opacity hover:opacity-80" style={{ background: "#fdf7ec" }}>
                  <div className="font-semibold mb-1 flex items-center gap-2"><Users size={14} /> Customer 360</div>
                  <div className="text-xs">Show each customer's recently tried sarees.</div>
                </button>
              </div>
            </div>
          )}
          {false && currentUser?.role === "vendor" && vendorToolsOpen && vendorEditorOpen && (
            <form onSubmit={saveSaree} className="rounded-2xl p-4 space-y-3" style={{ background: "#fff", border: `1px solid rgba(74,14,23,0.08)` }}>
              <div className="flex justify-between items-center"><div className="text-sm font-semibold" style={{ color: BURGUNDY }}>{editingSareeId ? "Update saree" : "Add saree"}</div><button type="button" onClick={resetVendorForm}><X size={15} color={BURGUNDY} /></button></div>
              {([['name','Saree name'], ['barcode','Barcode'], ['price','Price (₹)'], ['color','Colour'], ['silkPurity','Silk purity'], ['tag','Collection tag']] as const).map(([key, label]) => <input key={key} required={key === 'name' || key === 'price'} value={vendorForm[key]} onChange={(e) => setVendorForm((f) => ({ ...f, [key]: e.target.value }))} placeholder={label} className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,.1)" }} />)}
              <input type="file" accept="image/*" onChange={handleSareeImage} className="w-full text-xs" />
              <select value={vendorForm.availability} onChange={(e) => setVendorForm((f) => ({ ...f, availability: e.target.value }))} className="w-full rounded-lg px-3 py-2 text-xs" style={{ background: "#f5f0e8" }}><option value="true">Available</option><option value="false">Unavailable</option></select>
              <textarea value={vendorForm.description} onChange={(e) => setVendorForm((f) => ({ ...f, description: e.target.value }))} placeholder="Description" rows={3} className="w-full rounded-lg px-3 py-2 text-xs outline-none" style={{ background: "#f5f0e8" }} />
              <button type="submit" className="w-full rounded-full py-2 text-xs font-semibold" style={{ background: GOLD, color: "#1a0a0e" }}>{editingSareeId ? "Save changes" : "Add saree"}</button>
            </form>
          )}
          {false && currentUser?.role === "vendor" && customer360Open && (
            <div className="rounded-2xl p-4 max-h-72 overflow-y-auto" style={{ background: "#fff", border: `1px solid rgba(74,14,23,0.08)` }}>
              <div className="text-sm font-semibold mb-3" style={{ color: BURGUNDY }}>Customer 360</div>
              {loadCustomers().length === 0 ? <div className="text-xs" style={{ color: "#7a6a5a" }}>No customer profiles yet.</div> : loadCustomers().map((customer) => <div key={customer.id} className="mb-3 last:mb-0 rounded-xl p-3" style={{ background: "#fdf7ec" }}><div className="text-xs font-semibold" style={{ color: BURGUNDY }}>{customer.name}</div><div className="text-[11px] mb-2" style={{ color: "#7a6a5a" }}>{customer.phone}</div>{customer.recentTrails.length ? customer.recentTrails.slice(0, 3).map((item, index) => <div key={`${item.id}-${index}`} className="text-[11px] py-1" style={{ color: "#5b463f" }}>{item.name} · {item.price}</div>) : <div className="text-[11px]" style={{ color: "#7a6a5a" }}>No recent try-ons.</div>}</div>)}
            </div>
          )}
          {/* KPI 1 */}
          <div
            className="rounded-2xl p-6 flex-1 flex flex-col justify-between"
            style={{ background: "#fff", border: `1px solid rgba(74,14,23,0.08)` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: "#7a6a5a" }}>
                  Trials Today
                </div>
                <div
                  className="text-4xl font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}
                >
                  {sessions.length}
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${BURGUNDY}10` }}
              >
                <Users size={18} color={BURGUNDY} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <TrendingUp size={13} color="#22c55e" />
              <span className="text-xs font-medium" style={{ color: "#22c55e" }}>
                Active Session Logged
              </span>
            </div>
          </div>

          {/* KPI 2 */}
          <div
            className="rounded-2xl p-6 flex-1 flex flex-col justify-between"
            style={{ background: "#fff", border: `1px solid rgba(74,14,23,0.08)` }}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs font-semibold tracking-wide uppercase mb-1" style={{ color: "#7a6a5a" }}>
                  Drape-to-Sale
                </div>
                <div
                  className="text-4xl font-bold"
                  style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}
                >
                  {sessions.length > 0
                    ? `${Math.round((sessions.filter((s) => s.sale_status === "purchased").length / sessions.length) * 100)}%`
                    : "0%"}
                </div>
              </div>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: `${GOLD}18` }}
              >
                <BarChart2 size={18} color={GOLD} />
              </div>
            </div>
            <div
              className="mt-3 h-1.5 rounded-full overflow-hidden"
              style={{ background: "#f5f0e8" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: sessions.length > 0
                    ? `${(sessions.filter((s) => s.sale_status === "purchased").length / sessions.length) * 100}%`
                    : "0%",
                  background: GOLD,
                }}
              />
            </div>
          </div>

          {/* KPI 3 – top tried */}
          <div
            className="rounded-2xl overflow-hidden flex-1 relative border"
            style={{ background: "#fff", borderColor: "rgba(74,14,23,0.08)" }}
          >
            <img
              src={sareesList[1]?.img || "https://images.unsplash.com/photo-1610313462169-3a5e5d5d3423?w=400&h=200&fit=crop&auto=format"}
              alt="Banarasi Saree"
              className="w-full h-28 object-cover object-top"
            />
            <div className="p-4">
              <div className="text-xs font-semibold tracking-wide uppercase mb-0.5" style={{ color: "#7a6a5a" }}>
                Top Tried This Week
              </div>
              <div className="text-sm font-semibold" style={{ color: BURGUNDY }}>
                {sareesList[1]?.name || "Banarasi Pure Zari"}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <Star size={11} fill={GOLD} color={GOLD} />
                <span className="text-xs" style={{ color: "#7a6a5a" }}>
                  {sareesList[1]?.trials || 142} trials · {sareesList[1]?.price || "₹38,500"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // ─── SCREEN 3: CUSTOMER CAPTURE ───────────────────────────────────────────
  const renderCustomerCapture = () => (
    <div className="size-full flex flex-col" style={{ background: CREAM }}>
      <header
        className="flex items-center gap-4 px-8 py-5 flex-shrink-0"
        style={{ borderBottom: `1px solid rgba(74,14,23,0.1)` }}
      >
        <button
          onClick={() => setScreen(currentUser?.role === "vendor" ? "dashboard" : "catalog")}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-75"
          style={{ background: "#f5f0e8" }}
        >
          <ArrowLeft size={16} color={BURGUNDY} />
        </button>
        <div>
          <div className="text-xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}>
            Customer Details
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#7a6a5a" }}>
            Choose an existing customer or register a new one before the trial begins.
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl mx-auto rounded-3xl p-8" style={{ background: "#fff", border: `1px solid rgba(74,14,23,0.08)` }}>
          <div className="flex items-center gap-3 mb-6">
            {(["existing", "new"] as const).map((option) => (
              <button
                key={option}
                onClick={() => {
                  setCustomerMode(option);
                  setCustomerError("");
                  setCustomerSuccess("");
                }}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all"
                style={{
                  background: customerMode === option ? BURGUNDY : "#f5f0e8",
                  color: customerMode === option ? CREAM : BURGUNDY,
                }}
              >
                {option === "existing" ? "Existing Customer" : "New Customer"}
              </button>
            ))}
          </div>

          {customerError && (
            <div className="mb-5 rounded-xl px-4 py-3 text-sm" style={{ background: `${COLORS.error}10`, color: COLORS.error }}>
              {customerError}
            </div>
          )}
          {customerSuccess && (
            <div className="mb-5 rounded-xl px-4 py-3 text-sm" style={{ background: `${COLORS.teal}10`, color: COLORS.teal }}>
              {customerSuccess}
            </div>
          )}

          {customerMode === "existing" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const match = findCustomerByLookup(customerLookup);
                if (!match) {
                  setCustomerError("No customer found for that phone number. Try again or create a new profile.");
                  return;
                }
                setCustomerError("");
                setCustomerSuccess(`Continuing with ${match.name} (${match.id}).`);
                setSelectedCustomer(match);
                setScreen("catalog");
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={customerLookup}
                  onChange={(e) => setCustomerLookup(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                />
              </div>
              <button
                type="submit"
                className="px-5 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.01]"
                style={{ background: BURGUNDY, color: CREAM }}
              >
                Continue to trial
              </button>
            </form>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!customerName.trim() || !customerPhone.trim() || !customerAddress.trim()) {
                  setCustomerError("Please enter the customer name, phone number, and address.");
                  return;
                }
                const profile = createCustomer(
                  customerName,
                  customerPhone,
                  customerEmail,
                  customerDOB,
                  customerGender,
                  customerAddress,
                  customerCountryCode,
                  customerState,
                  trialOccasion,
                );
                if (currentUser?.role === "vendor" && trialOccasion.trim() && !occasions.some((occasion) => occasion.name.toLowerCase() === trialOccasion.trim().toLowerCase())) {
                  const occasion = { id: `OCC-${Date.now()}`, name: trialOccasion.trim(), date: "" };
                  apiFetch(`/api/vendor/occasions/${occasion.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: occasion }) })
                    .then((res) => res.ok && setOccasions((all) => [occasion, ...all]));
                }
                setCustomerError("");
                setCustomerSuccess(`Created ${profile.name} with ID ${profile.id}.`);
                setScreen("catalog");
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                  Customer Name
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Priya Menon"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="98765 43210"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                    Email
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={customerDOB}
                    onChange={(e) => setCustomerDOB(e.target.value)}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                    Gender
                  </label>
                  <input
                    type="text"
                    value={customerGender}
                    onChange={(e) => setCustomerGender(e.target.value)}
                    placeholder="Female"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                    State
                  </label>
                  <input
                    type="text"
                    value={customerState}
                    onChange={(e) => setCustomerState(e.target.value)}
                    placeholder="Tamil Nadu"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                  Trial Occasion
                </label>
                <input
                  list="vendor-occasions"
                  value={trialOccasion}
                  onChange={(e) => setTrialOccasion(e.target.value)}
                  placeholder="Select or enter a new occasion, e.g. Wedding"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                />
                <datalist id="vendor-occasions">{occasions.map((occasion) => <option key={occasion.id} value={occasion.name} />)}</datalist>
                <p className="text-xs mt-1" style={{ color: "#7a6a5a" }}>You may select a saved occasion or type a new one to add it for this vendor.</p>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                  Address
                </label>
                <textarea
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="House number, street, locality"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  rows={3}
                  style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                    Country Code
                  </label>
                  <input
                    type="text"
                    value={customerCountryCode}
                    onChange={(e) => setCustomerCountryCode(e.target.value)}
                    placeholder="+91"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="98765 43210"
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                    style={{ background: "#f5f0e8", border: "1px solid rgba(74,14,23,0.08)", color: "#1a0a0e" }}
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-5 py-3 rounded-full text-sm font-semibold transition-all hover:scale-[1.01]"
                style={{ background: BURGUNDY, color: CREAM }}
              >
                Create customer & continue
              </button>
            </form>
          )}

          {selectedCustomer && (
            <div className="mt-8 rounded-2xl p-4" style={{ background: "#f5f0e8", border: `1px solid rgba(74,14,23,0.08)` }}>
              <div className="text-sm font-semibold mb-2" style={{ color: BURGUNDY }}>
                Active customer profile
              </div>
              <div className="text-sm" style={{ color: "#1a0a0e" }}>
                {selectedCustomer.name} · {selectedCustomer.id}
              </div>
              <div className="text-xs mt-1" style={{ color: "#7a6a5a" }}>
                Recent trials: {selectedCustomer.recentTrails.length} · Purchased items: {selectedCustomer.purchasedItems.length}
              </div>
              {selectedCustomer.purchasedItems.length > 0 && (
                <div className="mt-4">
                  <div className="text-[12px] font-semibold uppercase tracking-wide mb-2" style={{ color: BURGUNDY }}>
                    Recent purchases
                  </div>
                  <div className="space-y-2">
                    {selectedCustomer.purchasedItems.slice(0, 3).map((item, index) => (
                      <div key={`${item.id}-${index}`} className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "#fff", border: "1px solid rgba(74,14,23,0.08)" }}>
                        <div>
                          <div className="text-sm font-semibold" style={{ color: "#1a0a0e" }}>{item.name}</div>
                          <div className="text-xs" style={{ color: "#7a6a5a" }}>{item.price}</div>
                        </div>
                        <div className="text-[11px]" style={{ color: "#7a6a5a" }}>{new Date(item.addedAt).toLocaleDateString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  setCustomerError("");
                  setCustomerSuccess("");
                  setScreen("catalog");
                }}
                className="mt-4 px-4 py-2.5 rounded-full text-sm font-semibold transition-all hover:scale-[1.01]"
                style={{ background: GOLD, color: "#1a0a0e" }}
              >
                Add more
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ─── SCREEN 3: CATALOG ───────────────────────────────────────────────────────
  const renderCatalog = () => (
    <div className="size-full flex flex-col" style={{ background: CREAM }}>
      {/* Header */}
      <header
        className="flex items-center gap-4 px-8 py-5 flex-shrink-0"
        style={{ borderBottom: `1px solid rgba(74,14,23,0.1)` }}
      >
        <button
          onClick={() => setScreen(currentUser?.role === "vendor" ? "dashboard" : "catalog")}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:opacity-75"
          style={{ background: "#f5f0e8" }}
        >
          <ArrowLeft size={16} color={BURGUNDY} />
        </button>
        <div
          className="text-xl font-semibold"
          style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}
        >
          Saree Catalog
        </div>

        {/* Search */}
        {selectedCustomer && (
          <div className="ml-4 flex items-center gap-2 px-3 py-2 rounded-full" style={{ background: "#f5f0e8", border: `1px solid rgba(74,14,23,0.12)` }}>
            <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: BURGUNDY }}>
              Customer
            </span>
            <span className="text-sm font-semibold" style={{ color: "#1a0a0e" }}>
              {selectedCustomer.name} · {selectedCustomer.id}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          <div
            className="flex items-center gap-3 px-4 py-2.5 rounded-full"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(12px)",
              border: `1px solid rgba(74,14,23,0.12)`,
              width: 260,
            }}
          >
            <Search size={14} color="#7a6a5a" />
            <input
              placeholder="Search by name, weave, colour…"
              className="flex-1 text-sm bg-transparent outline-none"
              style={{ color: "#1a0a0e" }}
            />
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-80"
            style={{ background: BURGUNDY, color: CREAM }}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Filter chips */}
      <div
        className="flex items-center gap-2 px-8 py-4 overflow-x-auto flex-shrink-0"
        style={{ scrollbarWidth: "none" }}
      >
        {uniqueTags.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all duration-200 hover:opacity-80"
            style={{
              background: activeFilter === f ? BURGUNDY : "#fff",
              color: activeFilter === f ? CREAM : "#7a6a5a",
              border: `1px solid ${activeFilter === f ? BURGUNDY : "rgba(74,14,23,0.12)"}`,
            }}
          >
            {f}
          </button>
        ))}
        <div className="ml-3 flex items-center gap-2 rounded-full px-3 py-1.5 whitespace-nowrap" style={{ background: "#fff", border: "1px solid rgba(74,14,23,0.12)" }}>
          <span className="text-xs font-semibold" style={{ color: BURGUNDY }}>Price range</span>
          <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min ₹" aria-label="Minimum price" className="w-16 text-xs bg-transparent outline-none" style={{ color: "#1a0a0e" }} />
          <span className="text-xs" style={{ color: "#7a6a5a" }}>–</span>
          <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ₹" aria-label="Maximum price" className="w-16 text-xs bg-transparent outline-none" style={{ color: "#1a0a0e" }} />
          {(minPrice || maxPrice) && <button onClick={() => { setMinPrice(""); setMaxPrice(""); }} className="text-xs font-semibold" style={{ color: BURGUNDY }}>Clear</button>}
        </div>
      </div>

      {/* Grid */}
      <div
        className="flex-1 overflow-y-auto px-8 pb-8"
        style={{ scrollbarWidth: "none" }}
      >
        <div className="grid grid-cols-3 gap-5">
          {filteredSarees.map((saree) => (
            <div
              key={saree.id}
              className="rounded-2xl overflow-hidden group cursor-pointer transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "#fff",
                border: `1px solid rgba(74,14,23,0.08)`,
                boxShadow: "0 2px 12px rgba(74,14,23,0.04)",
              }}
              onClick={() => {
                setSelectedSaree(saree);
                setScreen("camera");
              }}
            >
              {/* Image */}
              <div className="relative overflow-hidden bg-slate-100" style={{ height: 240 }}>
                <img
                  src={saree.img}
                  alt={saree.name}
                  className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                />
                {/* Tag badge */}
                <div
                  className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium"
                  style={{ background: `${BURGUNDY}ee`, color: CREAM }}
                >
                  {saree.tag}
                </div>
                {/* Try Virtually pill */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSaree(saree);
                    setScreen("camera");
                  }}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 hover:scale-105"
                  style={{ background: GOLD, color: "#1a0a0e" }}
                >
                  <Sparkles size={11} />
                  Try Virtually
                </button>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="text-sm font-semibold mb-0.5" style={{ color: "#1a0a0e" }}>
                  {saree.name}
                </div>
                <div className="text-xs mb-3" style={{ color: "#7a6a5a" }}>
                  {saree.color}
                </div>
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm" style={{ color: BURGUNDY }}>
                    {saree.price}
                  </div>
                  <div className="flex items-center gap-1">
                    <Star size={11} fill={GOLD} color={GOLD} />
                    <span className="text-xs" style={{ color: "#7a6a5a" }}>
                      {saree.rating} · {saree.trials} trials
                    </span>
                  </div>
                </div>
                {currentUser?.role === "vendor" && (
                  <button onClick={(e) => { e.stopPropagation(); openSareeEditor(saree); setScreen("dashboard"); }} className="mt-3 flex items-center gap-1 text-xs font-semibold" style={{ color: BURGUNDY }}>
                    <Pencil size={12} /> Edit inventory details
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredSarees.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-4xl mb-3">🧵</div>
            <div className="text-sm" style={{ color: "#7a6a5a" }}>
              No sarees match this filter.
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ─── SCREEN 4: CAMERA CAPTURE ────────────────────────────────────────────────
  const renderCamera = () => (
    <div className="size-full flex" style={{ background: "#0e0509" }}>
      {/* Left – viewfinder */}
      <div className="flex-[3] relative overflow-hidden">
        {/* Background vignette */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(ellipse at center, #1a0d10 0%, #050205 100%)",
          }}
        />

        {/* Video feed or preview photo */}
        {capturedUrl ? (
          <img
            src={capturedUrl}
            alt="Captured customer silhouette"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover scale-x-[-1]"
          />
        )}

        {/* Fallback layout if no camera is active */}
        {!cameraActive && !capturedUrl && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">
            <div className="w-16 h-16 rounded-full bg-slate-800/40 flex items-center justify-center mb-4">
              <Camera size={32} color={GOLD} />
            </div>
            <p className="text-white text-sm font-semibold mb-2">Webcam loading or unavailable</p>
            <p className="text-white/60 text-xs max-w-xs">
              {cameraError || "Please grant camera access or choose a portrait photo from your device gallery."}
            </p>
            <button onClick={startCamera} className="mt-4 px-4 py-2 rounded-full text-xs font-semibold" style={{ background: GOLD, color: "#1a0a0e" }}>Enable Camera</button>
          </div>
        )}

        {/* Grid lines (only on live camera stream) */}
        {!capturedUrl && (
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            {[33, 67].map((p) => (
              <div key={p}>
                <div className="absolute top-0 bottom-0" style={{ left: `${p}%`, width: 1, background: GOLD }} />
                <div className="absolute left-0 right-0" style={{ top: `${p}%`, height: 1, background: GOLD }} />
              </div>
            ))}
          </div>
        )}

        {/* Gold human silhouette guideline overlay */}
        {!capturedUrl && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <svg
              viewBox="0 0 200 480"
              className="h-[75%] opacity-40"
              fill="none"
            >
              <ellipse cx="100" cy="44" rx="28" ry="34" stroke={GOLD} strokeWidth="2.5" />
              <rect x="88" y="76" width="24" height="18" rx="6" stroke={GOLD} strokeWidth="2.5" />
              <path d="M68 94 Q40 102 32 140 L52 148 Q58 118 88 110 L112 110 Q142 118 148 148 L168 140 Q160 102 132 94 Z" stroke={GOLD} strokeWidth="2.5" />
              <path d="M68 110 L62 230 Q62 240 68 244 L132 244 Q138 240 138 230 L132 110" stroke={GOLD} strokeWidth="2.5" />
              <path d="M52 148 L36 230 L46 232 L62 168" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M148 148 L164 230 L154 232 L138 168" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M84 244 L78 380 Q78 390 86 392 L100 392 L100 244" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M116 244 L122 380 Q122 390 114 392 L100 392 L100 244" stroke={GOLD} strokeWidth="2.5" strokeLinecap="round" />
              <path d="M86 392 Q80 400 72 402 L92 402 Z" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
              <path d="M114 392 Q120 400 128 402 L108 402 Z" stroke={GOLD} strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        )}

        {/* Corner brackets */}
        {[
          "top-6 left-6 border-t-2 border-l-2",
          "top-6 right-6 border-t-2 border-r-2",
          "bottom-6 left-6 border-b-2 border-l-2",
          "bottom-6 right-6 border-b-2 border-r-2",
        ].map((cls, i) => (
          <div
            key={i}
            className={`absolute w-8 h-8 ${cls}`}
            style={{ borderColor: GOLD, opacity: 0.7 }}
          />
        ))}

        {/* Step label */}
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: `${BURGUNDY}cc`, color: CREAM, backdropFilter: "blur(8px)" }}
        >
          Step 1 of 2 — Drape Positioning
        </div>
      </div>

      {/* Right – control dock */}
      <div
        className="flex-[2] flex flex-col justify-between p-8"
        style={{ background: CREAM }}
      >
        <div>
          <button
            onClick={() => setScreen("catalog")}
            className="flex items-center gap-2 mb-8 text-sm transition-opacity hover:opacity-70"
            style={{ color: BURGUNDY }}
          >
            <ArrowLeft size={15} />
            Back to Catalog
          </button>

          {/* Selected saree preview */}
          {selectedSaree && (
            <div
              className="flex gap-3 p-3 rounded-xl mb-8 border"
              style={{ background: "#f5f0e8", borderColor: "rgba(74,14,23,0.1)" }}
            >
              <img
                src={selectedSaree.img}
                alt={selectedSaree.name}
                className="w-12 h-16 object-cover object-top rounded-lg flex-shrink-0 bg-slate-100"
              />
              <div className="flex flex-col justify-center">
                <div className="text-sm font-semibold" style={{ color: BURGUNDY }}>
                  {selectedSaree.name}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#7a6a5a" }}>
                  {selectedSaree.price}
                </div>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div
            className="text-xl font-semibold mb-4"
            style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}
          >
            Position Customer
          </div>
          {[
            "Align shoulders with the upper guideline",
            "Ensure hips fall within the marker boundary",
            "Ensure even, diffused lighting on the subject",
            "Stand with arms slightly out for better pleating",
          ].map((tip, i) => (
            <div key={i} className="flex items-start gap-2.5 mb-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: `${GOLD}25`, color: GOLD }}
              >
                {i + 1}
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#4a3a2a" }}>
                {tip}
              </p>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          {capturedUrl ? (
            <div className="w-full flex flex-col gap-2">
              <button
                onClick={handleTryOnSubmit}
                disabled={isGenerating}
                className="w-full py-4 rounded-full text-sm font-semibold tracking-wide transition-all duration-200 hover:scale-[1.02] disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                style={{ background: GOLD, color: "#1a0a0e", opacity: isGenerating ? 0.65 : 1 }}
              >
                <Sparkles size={14} />
                {isGenerating ? "Generating Try-On…" : "Generate Try-On drape"}
              </button>
              <button
                onClick={() => {
                  setCapturedUrl(null);
                  setCapturedBlob(null);
                  startCamera();
                }}
                className="w-full py-3 rounded-full text-xs font-semibold tracking-wide transition-all border hover:bg-slate-50"
                style={{ borderColor: BURGUNDY, color: BURGUNDY }}
              >
                Retake Photo
              </button>
            </div>
          ) : (
            <>
              {cameraError && <div className="w-full rounded-xl px-3 py-2 text-xs text-center" style={{ background: "#fdf1ed", color: COLORS.error }}>{cameraError}</div>}
              {/* Shutter button */}
              <button
                onClick={capturePhoto}
                disabled={!cameraActive}
                className="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{
                  background: "#fff",
                  boxShadow: "0 0 0 4px rgba(74,14,23,0.15), 0 8px 32px rgba(74,14,23,0.2)",
                }}
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center"
                  style={{ background: BURGUNDY }}
                >
                  <Camera size={24} color={CREAM} />
                </div>
              </button>

              <label
                className="flex items-center gap-2 text-sm cursor-pointer transition-opacity hover:opacity-70"
                style={{ color: "#7a6a5a" }}
              >
                <Upload size={14} />
                Choose from Device Gallery
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleGallerySelect}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ─── SCREEN 5: AI PROCESSING ─────────────────────────────────────────────────
  const renderProcessing = () => (
    <div
      className="size-full flex flex-col items-center justify-center"
      style={{
        background: `radial-gradient(ellipse at 30% 40%, #6b1a2a 0%, ${BURGUNDY} 40%, #1a040a 100%)`,
      }}
    >
      {/* Central graphic */}
      <div className="relative mb-10 w-72 h-80">
        {/* Left half – wireframe mesh */}
        <div
          className="absolute left-0 top-0 w-1/2 h-full overflow-hidden rounded-l-2xl"
          style={{ border: `1px solid ${GOLD}30` }}
        >
          <div className="w-full h-full flex items-center justify-center relative">
            <svg viewBox="0 0 120 300" className="h-full opacity-50">
              {Array.from({ length: 8 }, (_, i) => (
                <line
                  key={`v${i}`}
                  x1={i * 17 + 5}
                  y1="0"
                  x2={i * 17 + 5}
                  y2="300"
                  stroke={GOLD}
                  strokeWidth="0.5"
                />
              ))}
              {Array.from({ length: 15 }, (_, i) => (
                <line
                  key={`h${i}`}
                  x1="0"
                  y1={i * 21 + 5}
                  x2="120"
                  y2={i * 21 + 5}
                  stroke={GOLD}
                  strokeWidth="0.5"
                />
              ))}
              <path
                d="M60 20 Q80 30 75 80 Q70 130 65 160 Q60 190 58 240 Q56 270 50 290"
                stroke={GOLD}
                strokeWidth="1.5"
                fill="none"
                opacity="0.6"
              />
              <path
                d="M60 20 Q40 30 45 80 Q50 130 55 160 Q60 190 62 240 Q64 270 70 290"
                stroke={GOLD}
                strokeWidth="1.5"
                fill="none"
                opacity="0.6"
              />
            </svg>
          </div>
        </div>

        {/* Right half – gold silk shimmer */}
        <div
          className="absolute right-0 top-0 w-1/2 h-full overflow-hidden rounded-r-2xl"
          style={{
            background: `linear-gradient(135deg, #b8941f 0%, ${GOLD} 30%, #e8c84a 50%, ${GOLD} 70%, #b8941f 100%)`,
            backgroundSize: "200% 200%",
            animation: "shimmer 2s linear infinite",
            border: `1px solid ${GOLD}50`,
          }}
        />

        {/* Central divider with glow */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: "50%",
            width: 2,
            background: `linear-gradient(to bottom, transparent, ${GOLD}, ${GOLD}, transparent)`,
            boxShadow: `0 0 12px ${GOLD}`,
          }}
        />

        {/* Scanning line animation */}
        <div
          className="absolute left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(to right, transparent, ${GOLD}80, transparent)`,
            animation: "scanLine 1.8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Progress bar */}
      <div
        className="w-80 h-1.5 rounded-full overflow-hidden mb-5"
        style={{ background: `${GOLD}20` }}
      >
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{
            width: `${progress}%`,
            background: `linear-gradient(to right, #b8941f, ${GOLD}, #e8c84a)`,
          }}
        />
      </div>

      <div
        className="text-xs font-semibold tracking-[0.15em] uppercase mb-3"
        style={{ color: `${GOLD}80` }}
      >
        {Math.round(progress)}% Drape Processing
      </div>

      <p
        className="text-sm italic text-center max-w-xs transition-all duration-500"
        style={{ color: `${CREAM}90` }}
      >
        {statusMessages[statusIdx]}
      </p>

      {/* Shimmer styles */}
      <style>{`
        @keyframes shimmer {
          0% { background-position: 0% 0%; }
          100% { background-position: 200% 200%; }
        }
        @keyframes scanLine {
          0% { top: 5%; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 95%; opacity: 0; }
        }
      `}</style>
    </div>
  );

  // ─── SCREEN 6: TRY-ON RESULT ─────────────────────────────────────────────────
  const renderComparison = () => (
    <div className="size-full overflow-y-auto p-8" style={{ background: CREAM }}>
      <div className="max-w-6xl mx-auto">
        <button onClick={() => setScreen("result")} className="flex items-center gap-2 mb-7 text-sm" style={{ color: BURGUNDY }}><ArrowLeft size={15} /> Back to latest try-on</button>
        <div className="text-3xl font-semibold" style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}>Compare your try-ons</div>
        <p className="text-sm mt-2 mb-7" style={{ color: "#7a6a5a" }}>Review the virtual drape and colour side by side, then select the look that suits you best.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {comparisonTrials.map((trial) => (
            <div key={trial.id} className="rounded-2xl overflow-hidden" style={{ background: "#fff", border: preferredTrialId === trial.id ? "2px solid #D4AF37" : "1px solid rgba(74,14,23,.10)" }}>
              <img src={trial.image} alt={trial.name + " virtual try-on"} className="w-full h-80 object-cover object-top bg-slate-100" />
              <div className="p-4"><div className="font-semibold" style={{ color: BURGUNDY }}>{trial.name}</div><div className="text-sm mb-3" style={{ color: "#7a6a5a" }}>{trial.color || "Saree try-on"} · {trial.price}</div><div className="grid grid-cols-3 gap-2 mb-4 text-center text-[11px]"><div className="rounded-lg py-2" style={{ background: "#f5f0e8", color: BURGUNDY }}>Drape<br /><b>Review</b></div><div className="rounded-lg py-2" style={{ background: "#f5f0e8", color: BURGUNDY }}>Colour<br /><b>Compare</b></div><div className="rounded-lg py-2" style={{ background: "#f5f0e8", color: BURGUNDY }}>Overall<br /><b>Fit</b></div></div><button onClick={() => setPreferredTrialId(trial.id)} className="w-full py-2.5 rounded-full text-sm font-semibold" style={{ background: preferredTrialId === trial.id ? GOLD : BURGUNDY, color: preferredTrialId === trial.id ? "#1a0a0e" : CREAM }}>{preferredTrialId === trial.id ? "✓ Best for me" : "Choose as best fit"}</button></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="size-full flex" style={{ background: "#0e0509" }}>
      {/* Left – compare view */}
      <div
        ref={sliderContainerRef}
        className="flex-[7] relative overflow-hidden cursor-ew-resize select-none"
        onMouseDown={() => { isDragging.current = true; }}
        onTouchMove={(e) => {
          isDragging.current = true;
          handleSliderMove(e.touches[0].clientX);
        }}
        onTouchEnd={() => { isDragging.current = false; }}
      >
        {/* Original photo (right side / bottom layer) */}
        {capturedUrl && (
          <img
            src={capturedUrl}
            alt="Customer original portrait"
            className="absolute inset-0 w-full h-full object-contain"
          />
        )}

        {/* AI result (left side / clip) */}
        {resultUrl && (
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img
              src={resultUrl}
              alt="AI Saree drape output"
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* AI badge */}
            <div
              className="absolute top-6 left-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: `${GOLD}ee`, color: "#1a0a0e" }}
            >
              <Sparkles size={11} />
              AI Try-On
            </div>
          </div>
        )}

        {/* Original label */}
        <div
          className="absolute top-6 right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
          style={{ background: `${CREAM}dd`, color: BURGUNDY }}
        >
          <Eye size={11} />
          Original Photo
        </div>

        {/* Divider line */}
        <div
          className="absolute top-0 bottom-0 w-0.5"
          style={{
            left: `${sliderPos}%`,
            background: `linear-gradient(to bottom, transparent 0%, ${CREAM} 10%, ${CREAM} 90%, transparent 100%)`,
            transform: "translateX(-50%)",
          }}
        />

        {/* Drag handle */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${sliderPos}%` }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{
              background: CREAM,
              boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
              border: `2px solid ${GOLD}`,
            }}
          >
            <div className="flex gap-0.5">
              {[[-1], [1]].map(([dir], i) => (
                <div
                  key={i}
                  className="w-0.5 h-4 rounded-full"
                  style={{
                    background: BURGUNDY,
                    transform: `scaleX(${dir})`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right – action panel */}
      <div
        className="flex-[3] flex flex-col justify-between p-7"
        style={{ background: CREAM, borderLeft: `1px solid rgba(74,14,23,0.1)` }}
      >
        <div>
          <button
            onClick={() => setScreen("catalog")}
            className="flex items-center gap-2 mb-6 text-sm transition-opacity hover:opacity-60"
            style={{ color: "#7a6a5a" }}
          >
            <ArrowLeft size={14} />
            Back to Catalog
          </button>

          {/* Saree info */}
          {selectedSaree && (
            <>
              <div
                className="text-xl font-semibold leading-snug mb-1"
                style={{ fontFamily: "'Playfair Display', serif", color: BURGUNDY }}
              >
                {selectedSaree.name}
              </div>
              <div className="text-sm mb-1" style={{ color: "#7a6a5a" }}>
                {selectedSaree.color}
              </div>
              <div className="text-lg font-semibold mb-5" style={{ color: "#1a0a0e" }}>
                {selectedSaree.price}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-1.5 mb-6">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={13} fill={GOLD} color={GOLD} />
                ))}
                <span className="text-xs ml-1" style={{ color: "#7a6a5a" }}>
                  {selectedSaree.rating} · {selectedSaree.trials} trials
                </span>
              </div>
            </>
          )}

          {/* Token usage details */}
          <div
            className="rounded-xl p-4 mb-6 border text-xs"
            style={{ background: "#f5f0e8", borderColor: "rgba(74,14,23,0.08)" }}
          >
            <div
              className="font-semibold uppercase tracking-wide mb-2"
              style={{ color: BURGUNDY }}
            >
              Session Meta (API Usage)
            </div>
            <div className="flex justify-between mb-1">
              <span>Input Tokens:</span>
              <span className="font-semibold">{resultUsage?.input_tokens?.toLocaleString() || "1,400"}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Output Tokens:</span>
              <span className="font-semibold">{resultUsage?.output_tokens?.toLocaleString() || "900"}</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1 font-semibold" style={{ color: BURGUNDY }}>
              <span>Total Tokens:</span>
              <span>{resultUsage?.total_tokens?.toLocaleString() || "2,300"}</span>
            </div>
          </div>

          {/* Secondary actions */}
          <div className="flex gap-3">
            <button
              onClick={() => alert("Try-On Drape Saved to Favorites!")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80 border"
              style={{
                background: "#fff",
                borderColor: "rgba(74,14,23,0.15)",
                color: BURGUNDY,
              }}
            >
              <Bookmark size={14} />
              Save to Profile
            </button>
            <button
              onClick={() => alert("Sharing trial link via WhatsApp...")}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80 border"
              style={{
                background: "#fff",
                borderColor: "rgba(74,14,23,0.15)",
                color: BURGUNDY,
              }}
            >
              <MessageCircle size={14} />
              WhatsApp
            </button>
          </div>
        </div>

        {/* Primary CTA */}
        <div>
          <button
            onClick={() => setScreen("comparison")}
            disabled={comparisonTrials.length === 0}
            className="mb-3 w-full py-3 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            style={{ background: "#fff", border: `1px solid ${BURGUNDY}`, color: BURGUNDY }}
          >
            <BarChart2 size={16} /> Compare Try-Ons ({comparisonTrials.length})
          </button>
          <button
            onClick={async () => {
              if (!selectedSaree) return;
              const response = await apiFetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ product_id: selectedSaree.id, session_id: sessionId || null, customer_id: selectedCustomer?.id || null }) });
              if (!response.ok) { alert("Unable to create checkout order. Please try again."); return; }
              updateCustomerActivity(selectedCustomer?.id, "purchase", selectedSaree);
              alert("Checkout order created successfully.");
            }}
            className="w-full py-4 rounded-full font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: GOLD, color: "#1a0a0e" }}
          >
            <ShoppingBag size={16} />
            Add to Checkout
          </button>
          <button
            onClick={() => setScreen("catalog")}
            className="mt-3 w-full py-3 rounded-full font-medium text-sm flex items-center justify-center gap-2 transition-all hover:opacity-80 border"
            style={{
              background: "transparent",
              borderColor: BURGUNDY,
              color: BURGUNDY,
            }}
          >
            Try Another Saree
          </button>
        </div>
      </div>
    </div>
  );

  // ─── Root render ─────────────────────────────────────────────────────────────
  return (
    <div
      className="size-full overflow-hidden"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      onMouseMove={(e) => handleSliderMove(e.clientX)}
      onMouseUp={() => { isDragging.current = false; }}
    >
      {screen === "login" && renderLogin()}
      {screen === "dashboard" && renderDashboard()}
      {screen === "customer" && renderCustomerCapture()}
      {screen === "catalog" && renderCatalog()}
      {screen === "camera" && renderCamera()}
      {screen === "processing" && renderProcessing()}
      {screen === "result" && renderResult()}
      {screen === "comparison" && renderComparison()}
    </div>
  );
}
