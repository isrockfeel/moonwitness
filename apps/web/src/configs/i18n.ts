export type Locale = "en" | "id";

export interface TranslationDictionary {
  brand: {
    tagline: string;
    subtagline: string;
  };
  navigation: {
    dashboard: string;
    episodes: string;
    dock: string;
    collections: string;
    storyStudio: string;
    posterLab: string;
    research: string;
    idLab: string;
    paas: string;
    vpn: string;
    crew: string;
    missionLog: string;
    settings: string;
  };
  auth: {
    enterShadow: string;
    restrictedGate: string;
    unauthorizedTitle: string;
    unauthorizedDesc: string;
    loginRequired: string;
    backToSafety: string;
  };
  actions: {
    enter: string;
    logout: string;
    cancel: string;
    confirm: string;
  };
}

export const dictionaries: Record<Locale, TranslationDictionary> = {
  en: {
    brand: {
      tagline: "Empire of the light",
      subtagline: "Different people. Same sky.",
    },
    navigation: {
      dashboard: "Mission Control",
      episodes: "Episode Pipeline",
      dock: "Dock Evidence",
      collections: "Vault Collections",
      storyStudio: "Story Forge",
      posterLab: "Poster Lab",
      research: "Field Research",
      idLab: "ID Lab & Avatars",
      paas: "PaaS Platform",
      vpn: "VPN Tunnel / Mesh",
      crew: "Empire Crew",
      missionLog: "Audit Mission Log",
      settings: "Shadow Auth Gate",
    },
    auth: {
      enterShadow: "Enter the Shadow",
      restrictedGate: "RESTRICTED // LEVEL 04",
      unauthorizedTitle: "ACCESS DENIED // 401 UNAUTHORIZED",
      unauthorizedDesc: "You need active witness credentials to access underground command channels.",
      loginRequired: "AUTHENTICATION REQUIRED",
      backToSafety: "RETURN TO PUBLIC DOCK",
    },
    actions: {
      enter: "ENTER THE SHADOW",
      logout: "TERMINATE SESSION",
      cancel: "CANCEL",
      confirm: "CONFIRM",
    },
  },
  id: {
    brand: {
      tagline: "Kekaisaran Cahaya",
      subtagline: "Manusia berbeda. Langit yang sama.",
    },
    navigation: {
      dashboard: "Pusat Misi",
      episodes: "Jalur Episode",
      dock: "Bukti Dermaga",
      collections: "Koleksi Kubah",
      storyStudio: "Bengkel Cerita",
      posterLab: "Laboratorium Poster",
      research: "Riset Lapangan",
      idLab: "Lab Identitas & Avatar",
      paas: "Platform PaaS",
      vpn: "Terowongan VPN / Mesh",
      crew: "Kru Kekaisaran",
      missionLog: "Log Audit Misi",
      settings: "Gerbang Otentikasi Shadow",
    },
    auth: {
      enterShadow: "Masuk ke Shadow",
      restrictedGate: "TERBATAS // LEVEL 04",
      unauthorizedTitle: "AKSES DITOLAK // 401 TANPA OTORISASI",
      unauthorizedDesc: "Kredensial saksi aktif diperlukan untuk mengakses terminal kendali bawah tanah.",
      loginRequired: "OTENTIKASI DIPERLUKAN",
      backToSafety: "KEMBALI KE DERMAGA PUBLIK",
    },
    actions: {
      enter: "MASUK SHADOW",
      logout: "AKHIRI SESI",
      cancel: "BATAL",
      confirm: "KONFIRMASI",
    },
  },
};
